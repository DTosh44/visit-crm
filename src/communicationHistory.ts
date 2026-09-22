import { useEffect, useState } from 'react'
import { supabase } from './auth'
import { tenant } from './tenant'
import type { CommunicationRecord } from './platformTypes'

export interface CommunicationHistoryItem { id:string; subject:string; status:string; at:string }
export function useCommunicationHistory(scope:'contact'|'organisation',id:string,local:CommunicationRecord[]){
  const [remote,setRemote]=useState<{key:string;rows:CommunicationHistoryItem[]}|null>(null)
  const key=`${scope}:${id}`
  useEffect(()=>{
    if(!supabase||!id)return
    let active=true
    const refresh=async()=>{
      const column=scope==='contact'?'contact_id':'organisation_id'
      const {data:deliveries}=await supabase!.from('communication_deliveries').select('communication_id,status,sent_at,delivered_at').eq('tenant_id',tenant.id).eq(column,id)
      if(!active||!deliveries)return
      const ids=Array.from(new Set(deliveries.map((item)=>item.communication_id)))
      if(!ids.length){setRemote({key,rows:[]});return}
      const {data:jobs}=await supabase!.from('communication_jobs').select('id,payload,status,scheduled_at,sent_at,created_at').eq('tenant_id',tenant.id).in('id',ids)
      if(!active||!jobs)return
      setRemote({key,rows:jobs.map((job)=>({id:job.id,subject:(job.payload as CommunicationRecord).subject,status:deliveries.filter((item)=>item.communication_id===job.id).map((item)=>item.status).join(', '),at:job.sent_at??job.scheduled_at??job.created_at})).sort((a,b)=>b.at.localeCompare(a.at))})
    }
    void refresh();const timer=window.setInterval(()=>void refresh(),15000)
    return()=>{active=false;window.clearInterval(timer)}
  },[scope,id,key])
  if(supabase)return remote?.key===key?remote.rows:[]
  return local.filter((item)=>item.status!=='Draft'&&item.recipients?.some((recipient)=>scope==='contact'?recipient.contactId===id:recipient.organisationId===id)).map((item)=>({id:item.id,subject:item.subject,status:item.recipients?.filter((recipient)=>scope==='contact'?recipient.contactId===id:recipient.organisationId===id).map((recipient)=>recipient.status).join(', ')??item.status,at:item.sentAt??item.scheduledAt??item.createdAt}))
}
