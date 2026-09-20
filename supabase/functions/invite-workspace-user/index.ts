import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (request) => {
  const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'}
  if(request.method==='OPTIONS')return new Response('ok',{headers:cors})
  const url=Deno.env.get('SUPABASE_URL')!;const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const authHeader=request.headers.get('Authorization')??''
  const caller=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authHeader}}})
  const admin=createClient(url,serviceKey)
  const {data:{user}}=await caller.auth.getUser()
  if(!user)return new Response(JSON.stringify({error:'Unauthorised'}),{status:401,headers:{...cors,'Content-Type':'application/json'}})
  const {name,email,role,tenantId}=await request.json()
  const {data:profile}=await admin.from('profiles').select('role').eq('user_id',user.id).eq('tenant_id',tenantId).maybeSingle()
  if(profile?.role!=='Administrator')return new Response(JSON.stringify({error:'Administrator access required'}),{status:403,headers:{...cors,'Content-Type':'application/json'}})
  const {data,error}=await admin.auth.admin.inviteUserByEmail(email,{data:{full_name:name}})
  if(error)return new Response(JSON.stringify({error:error.message}),{status:400,headers:{...cors,'Content-Type':'application/json'}})
  await admin.from('profiles').upsert({user_id:data.user.id,tenant_id:tenantId,full_name:name,email,role,active:true})
  return new Response(JSON.stringify({userId:data.user.id}),{headers:{...cors,'Content-Type':'application/json'}})
})
