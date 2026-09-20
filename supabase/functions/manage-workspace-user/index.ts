import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (request) => {
  const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'}
  if(request.method==='OPTIONS')return new Response('ok',{headers:cors})
  const url=Deno.env.get('SUPABASE_URL')!;const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);const caller=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:request.headers.get('Authorization')??''}}})
  const {data:{user}}=await caller.auth.getUser();const {action,userId,tenantId,changes}=await request.json()
  const {data:profile}=user?await admin.from('profiles').select('role').eq('user_id',user.id).eq('tenant_id',tenantId).maybeSingle():{data:null}
  if(profile?.role!=='Administrator')return new Response(JSON.stringify({error:'Administrator access required'}),{status:403,headers:{...cors,'Content-Type':'application/json'}})
  if(action==='remove'){await admin.auth.admin.deleteUser(userId)}else await admin.from('profiles').update(changes).eq('user_id',userId).eq('tenant_id',tenantId)
  return new Response(JSON.stringify({ok:true}),{headers:{...cors,'Content-Type':'application/json'}})
})
