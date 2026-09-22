import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const message=(status:number,title:string,detail:string)=>new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><body style="font-family:system-ui;max-width:34rem;margin:12vh auto;padding:1.5rem;color:#35253c"><h1>${title}</h1><p>${detail}</p></body></html>`,{status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})
Deno.serve(async(request)=>{
  const secret=Deno.env.get('COMMUNICATION_UNSUBSCRIBE_SECRET')
  if(!secret)return message(503,'Unsubscribe unavailable','Please contact the destination team to update your preferences.')
  const token=new URL(request.url).searchParams.get('token')??''
  const [payload,signature]=token.split('.')
  if(!payload||!signature)return message(400,'Invalid link','This unsubscribe link is invalid.')
  try{
    const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify'])
    const bytes=Uint8Array.from(atob(signature.replaceAll('-','+').replaceAll('_','/')+'='.repeat((4-signature.length%4)%4)),(character)=>character.charCodeAt(0))
    if(!await crypto.subtle.verify('HMAC',key,bytes,new TextEncoder().encode(payload)))return message(400,'Invalid link','This unsubscribe link is invalid.')
    const decoded=JSON.parse(atob(payload.replaceAll('-','+').replaceAll('_','/')+'='.repeat((4-payload.length%4)%4))) as {tenantId:string;communicationId:string;contactId:string;expires:number}
    if(!decoded.tenantId||!decoded.communicationId||!decoded.contactId||decoded.expires<Date.now())return message(400,'Expired link','Please contact the destination team to update your preferences.')
    const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const {data,error}=await admin.rpc('unsubscribe_communication',{p_tenant:decoded.tenantId,p_communication:decoded.communicationId,p_contact:decoded.contactId})
    if(error||!data)return message(500,'Could not unsubscribe','Please contact the destination team to update your preferences.')
    return message(200,'You are unsubscribed','You will no longer receive marketing emails from this destination. Essential service communications may still be sent where appropriate.')
  }catch{return message(400,'Invalid link','This unsubscribe link is invalid.')}
})
