import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { allowedFor, marketingTypes, renderCommunication, resolveAudience } from '../../../src/communications.ts'
import type { CommunicationRecord, PlatformData } from '../../../src/platformTypes.ts'
import type { CRMData } from '../../../src/types.ts'

const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type, x-cron-secret','Content-Type':'application/json'}
const answer=(status:number,value:unknown)=>new Response(JSON.stringify(value),{status,headers:cors})
const allowedRoles=['Administrator','Membership manager','Marketing / PR','Travel Trade']
const apiKey=Deno.env.get('RESEND_API_KEY')
const fromEmail=Deno.env.get('COMMUNICATION_FROM_EMAIL')
const unsubscribeSecret=Deno.env.get('COMMUNICATION_UNSUBSCRIBE_SECRET')
const supabaseUrl=Deno.env.get('SUPABASE_URL')!
const admin=createClient(supabaseUrl,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const validRecord=(record:CommunicationRecord)=>Boolean(record&&record.id&&record.name?.trim()&&record.subject?.trim()&&record.body?.trim()&&record.fromName?.trim()&&record.replyTo?.trim()&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.replyTo)&&!/[\r\n<>]/.test(record.fromName)&&!/[\r\n]/.test(record.subject)&&record.audience)
async function unsubscribeUrl(tenantId:string,communicationId:string,contactId:string,createdAt:string){
  if(!unsubscribeSecret)throw new Error('COMMUNICATION_UNSUBSCRIBE_SECRET is required for marketing sends')
  const payload=btoa(JSON.stringify({tenantId,communicationId,contactId,expires:new Date(createdAt).getTime()+31536000000})).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(unsubscribeSecret),{name:'HMAC',hash:'SHA-256'},false,['sign'])
  const signature=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(payload))
  const signed=btoa(String.fromCharCode(...new Uint8Array(signature))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')
  return `${supabaseUrl}/functions/v1/unsubscribe-communication?token=${payload}.${signed}`
}
async function sendEmail(record:CommunicationRecord,email:string,contact:{name:string},org:{name:string;tier:string;renewalDate:string}|undefined,key:string,recipient?:{tenantId:string;communicationId:string;contactId:string}){
  const unsubscribe=recipient&&marketingTypes.includes(record.type??'Email campaign')?await unsubscribeUrl(recipient.tenantId,recipient.communicationId,recipient.contactId,record.createdAt):''
  const html=renderCommunication(record,contact as CRMData['contacts'][number],org as CRMData['organisations'][number])+(unsubscribe?`<p style="font-size:12px;color:#666">No longer want these updates? <a href="${unsubscribe}">Unsubscribe</a>.</p>`:'')
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify({from:`${record.fromName} <${fromEmail}>`,to:[email],reply_to:record.replyTo,subject:record.subject,html,text:record.body})})
  const result=await response.json().catch(()=>({})) as {id?:string;message?:string}
  if(!response.ok||!result.id)throw new Error(result.message??`Provider rejected send (${response.status})`)
  return result.id
}
async function processJob(tenantId:string,id:string){
  const {data:claim,error:claimError}=await admin.rpc('claim_communication_job',{p_tenant:tenantId,p_id:id})
  if(claimError)throw claimError
  if(!claim)return
  const {data:job,error}=await admin.from('communication_jobs').select('payload').eq('tenant_id',tenantId).eq('id',id).single()
  if(error)throw error
  const record=job.payload as CommunicationRecord
  const {data:workspace}=await admin.from('workspace_states').select('data').eq('tenant_id',tenantId).single()
  const {data:platform}=await admin.from('platform_states').select('data').eq('tenant_id',tenantId).single()
  const crm=workspace?.data as CRMData
  const preferences=(platform?.data as PlatformData)?.communicationPreferences??[]
  const {data:deliveries}=await admin.from('communication_deliveries').select('*').eq('tenant_id',tenantId).eq('communication_id',id)
  let failures=(deliveries??[]).filter((row)=>row.status==='Failed'||row.status==='Bounced').length
  let accepted=(deliveries??[]).filter((row)=>['Sent to provider','Delivered'].includes(row.status)).length
  const queued=(deliveries??[]).filter((row)=>row.status==='Queued')
  for(const row of queued.slice(0,25)){
    if(row.status!=='Queued')continue
    const contact=crm.contacts.find((item)=>item.id===row.contact_id)
    const org=crm.organisations.find((item)=>item.id===row.organisation_id)
    if(!contact||!allowedFor(contact,record.type??'Email campaign',preferences)){failures++;await admin.from('communication_deliveries').update({status:'Failed',error:contact?'Contact preferences now exclude this send':'Contact no longer exists'}).eq('tenant_id',tenantId).eq('communication_id',id).eq('contact_id',row.contact_id);continue}
    let providerId:string|undefined
    try{providerId=await sendEmail(record,row.email,contact,org,`${tenantId}/${id}/${row.contact_id}`,{tenantId,communicationId:id,contactId:row.contact_id});const {error:receiptError}=await admin.from('communication_deliveries').update({status:'Sent to provider',provider_id:providerId,sent_at:new Date().toISOString()}).eq('tenant_id',tenantId).eq('communication_id',id).eq('contact_id',row.contact_id);if(receiptError)throw receiptError;accepted++}catch(cause){if(providerId)throw cause;failures++;await admin.from('communication_deliveries').update({status:'Failed',error:cause instanceof Error?cause.message:'Provider error'}).eq('tenant_id',tenantId).eq('communication_id',id).eq('contact_id',row.contact_id)}
  }
  if(queued.length>25){await admin.from('communication_jobs').update({status:'Sending',error:failures?`${failures} recipient(s) failed`:null}).eq('tenant_id',tenantId).eq('id',id);return}
  await admin.from('communication_jobs').update({status:accepted?'Sent':'Failed',sent_at:accepted?new Date().toISOString():null,error:failures?`${failures} recipient(s) failed` : null}).eq('tenant_id',tenantId).eq('id',id)
}

Deno.serve(async(request)=>{
  if(request.method==='OPTIONS')return new Response('ok',{headers:cors})
  if(request.method!=='POST')return answer(405,{error:'Method not allowed'})
  if(!apiKey||!fromEmail)return answer(503,{error:'Email provider is not configured. Set RESEND_API_KEY and COMMUNICATION_FROM_EMAIL.'})
  try{
    if(request.headers.get('x-cron-secret')&&request.headers.get('x-cron-secret')===Deno.env.get('COMMUNICATION_CRON_SECRET')){
      const {data:due,error}=await admin.from('communication_jobs').select('tenant_id,id').or(`and(status.eq.Scheduled,scheduled_at.lte.${new Date().toISOString()}),and(status.eq.Sending,claimed_at.lt.${new Date(Date.now()-60000).toISOString()})`).order('scheduled_at',{ascending:true}).limit(2)
      if(error)throw error
      for(const job of due??[])await processJob(job.tenant_id,job.id)
      await admin.from('communication_jobs').update({status:'Failed',error:'Delivery needs manual review after an interrupted send; automatic retry was stopped to prevent duplicates.'}).eq('status','Sending').lt('first_claimed_at',new Date(Date.now()-23*3600000).toISOString())
      return answer(200,{processed:due?.length??0})
    }
    const caller=createClient(supabaseUrl,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:request.headers.get('Authorization')??''}}})
    const {data:{user}}=await caller.auth.getUser()
    if(!user)return answer(401,{error:'Sign in to send communications'})
    const {tenantId,record,action,testEmail}=await request.json() as {tenantId:string;record:CommunicationRecord;action:'send'|'schedule'|'test';testEmail?:string}
    const {data:profile}=await admin.from('profiles').select('role,active,full_name').eq('tenant_id',tenantId).eq('user_id',user.id).maybeSingle()
    if(!profile?.active||!allowedRoles.includes(profile.role))return answer(403,{error:'Communications permission required'})
    if(!validRecord(record))return answer(400,{error:'Name, subject, content, sender, reply-to and audience are required'})
    if(action==='test'){
      if(!testEmail||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail))return answer(400,{error:'A valid test email is required'})
      await sendEmail(record,testEmail,{name:user.email??'Test'},undefined,`${tenantId}/${record.id}/test/${crypto.randomUUID()}`)
      return answer(200,{accepted:true})
    }
    if(action!=='send'&&action!=='schedule')return answer(400,{error:'Unknown action'})
    if(action==='schedule'&&(!record.scheduledAt||new Date(record.scheduledAt).getTime()<=Date.now()))return answer(400,{error:'Choose a future schedule date'})
    if(marketingTypes.includes(record.type??'Email campaign')&&!unsubscribeSecret)return answer(503,{error:'Marketing sends require COMMUNICATION_UNSUBSCRIBE_SECRET'})
    const [{data:workspace,error:workspaceError},{data:platform,error:platformError}]=await Promise.all([admin.from('workspace_states').select('data').eq('tenant_id',tenantId).single(),admin.from('platform_states').select('data').eq('tenant_id',tenantId).single()])
    if(workspaceError||platformError)throw workspaceError??platformError
    const recipients=resolveAudience(record.audience!,record.type??'Email campaign',workspace.data as CRMData,platform.data as PlatformData)
    if(!recipients.length)return answer(400,{error:'No eligible recipients. Check filters and contact preferences.'})
    const payload={...record,createdBy:profile.full_name,createdAt:new Date().toISOString(),recipientCount:recipients.length,recipients:undefined}
    const {error:insertError}=await admin.from('communication_jobs').insert({tenant_id:tenantId,id:record.id,payload,status:'Scheduled',scheduled_at:action==='schedule'?record.scheduledAt:new Date().toISOString(),created_by:user.id})
    if(insertError){if(insertError.code==='23505')return answer(409,{error:'This communication has already been submitted'});throw insertError}
    const {error:recipientError}=await admin.from('communication_deliveries').insert(recipients.map((item)=>({tenant_id:tenantId,communication_id:record.id,contact_id:item.contactId,organisation_id:item.organisationId,email:item.email,status:'Queued'})))
    if(recipientError){await admin.from('communication_jobs').delete().eq('tenant_id',tenantId).eq('id',record.id);throw recipientError}
    if(action==='send')await processJob(tenantId,record.id)
    return answer(200,{accepted:true,recipientCount:recipients.length})
  }catch(cause){return answer(500,{error:cause instanceof Error?cause.message:'Communication dispatch failed'})}
})
