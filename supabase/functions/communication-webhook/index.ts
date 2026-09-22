import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const secret=Deno.env.get('RESEND_WEBHOOK_SECRET')
const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
async function validSignature(request:Request,body:string){
  if(!secret)return false
  const id=request.headers.get('svix-id')??'',timestamp=request.headers.get('svix-timestamp')??'',signatures=request.headers.get('svix-signature')??''
  if(!id||!timestamp||Math.abs(Date.now()/1000-Number(timestamp))>300)return false
  const decoded=Uint8Array.from(atob(secret.replace(/^whsec_/,'')),(character)=>character.charCodeAt(0))
  const key=await crypto.subtle.importKey('raw',decoded,{name:'HMAC',hash:'SHA-256'},false,['sign'])
  const signature=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`${id}.${timestamp}.${body}`))
  const expected=btoa(String.fromCharCode(...new Uint8Array(signature)))
  return signatures.split(' ').some((item)=>item===`v1,${expected}`)
}
Deno.serve(async(request)=>{
  if(request.method!=='POST')return new Response('Method not allowed',{status:405})
  const body=await request.text()
  if(!await validSignature(request,body))return new Response('Invalid signature',{status:401})
  try{
    const event=JSON.parse(body) as {type:string;data:{email_id?:string};created_at?:string}
    const providerId=event.data?.email_id
    if(!providerId)return new Response('ok')
    const id=request.headers.get('svix-id')!
    const {error:receiptError}=await admin.from('communication_webhook_events').insert({id,provider_id:providerId,event_type:event.type})
    if(receiptError){if(receiptError.code==='23505')return new Response('ok');throw receiptError}
    const {data:delivery}=await admin.from('communication_deliveries').select('*').eq('provider_id',providerId).maybeSingle()
    if(!delivery)return new Response('ok')
    const changes:Record<string,unknown>={}
    if(event.type==='email.delivered'){changes.status='Delivered';changes.delivered_at=event.created_at??new Date().toISOString()}
    if(event.type==='email.bounced'||event.type==='email.complained'){changes.status='Bounced';changes.bounced_at=event.created_at??new Date().toISOString()}
    if(event.type==='email.failed')changes.status='Failed'
    if(event.type==='email.opened')changes.opens=Number(delivery.opens)+1
    if(event.type==='email.clicked')changes.clicks=Number(delivery.clicks)+1
    if(Object.keys(changes).length)await admin.from('communication_deliveries').update(changes).eq('tenant_id',delivery.tenant_id).eq('communication_id',delivery.communication_id).eq('contact_id',delivery.contact_id)
    return new Response('ok')
  }catch(cause){return new Response(cause instanceof Error?cause.message:'Webhook failure',{status:500})}
})
