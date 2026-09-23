import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Content-Type':'application/json'}
const answer=(status:number,value:unknown)=>new Response(JSON.stringify(value),{status,headers:cors})
const roles=['Administrator','Membership manager','Content editor','Finance user','Marketing / PR','Travel Trade','Viewer / Reporting']

Deno.serve(async(request)=>{
  if(request.method==='OPTIONS')return new Response('ok',{headers:cors})
  if(request.method!=='POST')return answer(405,{error:'Method not allowed'})
  try{
    const url=Deno.env.get('SUPABASE_URL'),serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),anonKey=Deno.env.get('SUPABASE_ANON_KEY')
    if(!url||!serviceKey||!anonKey)return answer(503,{error:'User administration is not configured'})
    const admin=createClient(url,serviceKey)
    const caller=createClient(url,anonKey,{global:{headers:{Authorization:request.headers.get('Authorization')??''}}})
    const {data:{user}}=await caller.auth.getUser()
    if(!user)return answer(401,{error:'Sign in to manage workspace users'})
    const body=await request.json().catch(()=>({})) as {action?:string;userId?:string;tenantId?:string;changes?:Record<string,unknown>}
    const action=String(body.action??''),userId=String(body.userId??''),tenantId=String(body.tenantId??'')
    if(!userId||!tenantId||!['update','remove'].includes(action))return answer(400,{error:'A valid action, user and workspace are required'})
    const {data:callerProfile}=await admin.from('profiles').select('role,active').eq('user_id',user.id).eq('tenant_id',tenantId).maybeSingle()
    if(!callerProfile?.active||callerProfile.role!=='Administrator')return answer(403,{error:'Administrator access required'})
    const {data:target,error:targetError}=await admin.from('profiles').select('role,active').eq('user_id',userId).eq('tenant_id',tenantId).maybeSingle()
    if(targetError)throw targetError
    if(!target)return answer(404,{error:'Workspace user not found'})
    if(userId===user.id&&(action==='remove'||body.changes?.active===false||(body.changes?.role&&body.changes.role!=='Administrator')))return answer(400,{error:'You cannot remove, suspend or demote your own administrator account'})
    const removingAdmin=target.active&&target.role==='Administrator'&&(action==='remove'||body.changes?.active===false||(body.changes?.role&&body.changes.role!=='Administrator'))
    if(removingAdmin){const {count,error}=await admin.from('profiles').select('*',{count:'exact',head:true}).eq('tenant_id',tenantId).eq('role','Administrator').eq('active',true);if(error)throw error;if((count??0)<=1)return answer(400,{error:'Every workspace must keep at least one active administrator'})}
    if(action==='remove'){
      const {error}=await admin.from('profiles').delete().eq('user_id',userId).eq('tenant_id',tenantId)
      if(error)throw error
      await admin.from('audit_log').insert({tenant_id:tenantId,actor_id:user.id,action:'remove',entity_type:'workspace_user',entity_id:userId,detail:{role:target.role}})
      return answer(200,{ok:true})
    }
    const changes:Record<string,unknown>={}
    if(typeof body.changes?.full_name==='string'&&body.changes.full_name.trim())changes.full_name=body.changes.full_name.trim().slice(0,160)
    if(typeof body.changes?.role==='string'){if(!roles.includes(body.changes.role))return answer(400,{error:'Invalid workspace role'});changes.role=body.changes.role}
    if(typeof body.changes?.active==='boolean')changes.active=body.changes.active
    if(!Object.keys(changes).length)return answer(400,{error:'No valid changes were supplied'})
    changes.updated_at=new Date().toISOString()
    const {error:updateError}=await admin.from('profiles').update(changes).eq('user_id',userId).eq('tenant_id',tenantId)
    if(updateError)throw updateError
    await admin.from('audit_log').insert({tenant_id:tenantId,actor_id:user.id,action:'update',entity_type:'workspace_user',entity_id:userId,detail:changes})
    return answer(200,{ok:true})
  }catch(cause){return answer(500,{error:cause instanceof Error?cause.message:'User administration failed'})}
})
