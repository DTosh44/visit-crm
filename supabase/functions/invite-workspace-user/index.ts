import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Content-Type':'application/json'}
const answer=(status:number,value:unknown)=>new Response(JSON.stringify(value),{status,headers:cors})
const roles=['Administrator','Membership manager','Content editor','Finance user','Marketing / PR','Travel Trade','Viewer / Reporting']

Deno.serve(async(request)=>{
  if(request.method==='OPTIONS')return new Response('ok',{headers:cors})
  if(request.method!=='POST')return answer(405,{error:'Method not allowed'})
  try{
    const url=Deno.env.get('SUPABASE_URL'),serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),anonKey=Deno.env.get('SUPABASE_ANON_KEY')
    if(!url||!serviceKey||!anonKey)return answer(503,{error:'Workspace invitations are not configured'})
    const caller=createClient(url,anonKey,{global:{headers:{Authorization:request.headers.get('Authorization')??''}}})
    const admin=createClient(url,serviceKey)
    const {data:{user}}=await caller.auth.getUser()
    if(!user)return answer(401,{error:'Sign in to invite workspace users'})
    const body=await request.json().catch(()=>({})) as {name?:string;email?:string;role?:string;tenantId?:string}
    const name=String(body.name??'').trim().slice(0,160),email=String(body.email??'').trim().toLowerCase(),role=String(body.role??''),tenantId=String(body.tenantId??'')
    if(!name||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!tenantId||!roles.includes(role))return answer(400,{error:'Name, valid email, workspace and role are required'})
    const {data:profile}=await admin.from('profiles').select('role,active').eq('user_id',user.id).eq('tenant_id',tenantId).maybeSingle()
    if(!profile?.active||profile.role!=='Administrator')return answer(403,{error:'Administrator access required'})
    const redirectTo=Deno.env.get('WORKSPACE_BASE_URL')||undefined
    const {data,error}=await admin.auth.admin.inviteUserByEmail(email,{data:{full_name:name},redirectTo})
    if(error)return answer(400,{error:error.message.includes('already been registered')?'This email already has an account. Ask the user to sign in, or use a different address.':error.message})
    const {error:profileError}=await admin.from('profiles').upsert({user_id:data.user.id,tenant_id:tenantId,full_name:name,email,role,active:true},{onConflict:'user_id,tenant_id'})
    if(profileError){await admin.auth.admin.deleteUser(data.user.id);throw profileError}
    await admin.from('audit_log').insert({tenant_id:tenantId,actor_id:user.id,action:'invite',entity_type:'workspace_user',entity_id:data.user.id,detail:{email,role}})
    return answer(200,{userId:data.user.id})
  }catch(cause){return answer(500,{error:cause instanceof Error?cause.message:'Invitation failed'})}
})
