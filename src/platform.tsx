/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase, useAuth } from './auth'
import { initialPlatformData } from './platformData'
import type { PlatformCollection, PlatformData } from './platformTypes'
import { tenant } from './tenant'
import { useCRM } from './store'

const STORAGE_KEY='visitmade-platform-v1'

type RecordFor<K extends PlatformCollection>=PlatformData[K] extends Array<infer R>?R:never
interface PlatformContextValue{
  data:PlatformData
  addRecord:<K extends PlatformCollection>(collection:K,record:RecordFor<K>)=>void
  updateRecord:<K extends PlatformCollection>(collection:K,id:string,changes:Partial<RecordFor<K>>)=>void
  removeRecord:<K extends PlatformCollection>(collection:K,id:string)=>void
  updateSettings:(changes:Partial<PlatformData['engagementSettings']>)=>void
  runAutomation:(id:string)=>void
  resetPlatform:()=>void
}

const PlatformContext=createContext<PlatformContextValue|null>(null)
function readData(){try{const saved=localStorage.getItem(STORAGE_KEY);return saved?{...initialPlatformData,...JSON.parse(saved) as Partial<PlatformData>}:initialPlatformData}catch{return initialPlatformData}}

export function PlatformProvider({children}:{children:ReactNode}){
  const [data,setData]=useState<PlatformData>(readData)
  const {user}=useAuth()
  const {createTask,addActivity}=useCRM()
  useEffect(()=>{
    if(!supabase||!user)return
    void supabase.from('platform_states').select('data').eq('tenant_id',tenant.id).maybeSingle().then(({data:row})=>{if(row?.data)setData((current)=>({...current,...row.data as Partial<PlatformData>}))})
  },[user])
  useEffect(()=>{
    localStorage.setItem(STORAGE_KEY,JSON.stringify(data))
    if(supabase&&user){void supabase.from('platform_states').upsert({tenant_id:tenant.id,data,updated_by:user.id,updated_at:new Date().toISOString()},{onConflict:'tenant_id'});void supabase.from('public_surveys').upsert(data.surveys.map((survey)=>({id:survey.id,tenant_id:tenant.id,slug:survey.slug,definition:survey,status:survey.status,opening_date:survey.openingDate||null,closing_date:survey.closingDate||null,updated_at:new Date().toISOString()})),{onConflict:'tenant_id,id'})}
  },[data,user])
  const value=useMemo<PlatformContextValue>(()=>({
    data,
    addRecord:(collection,record)=>{setData((current)=>({...current,[collection]:[...(current[collection] as unknown[]),record]} as PlatformData));if(supabase&&collection==='surveyResponses'){const response=record as PlatformData['surveyResponses'][number];void supabase.from('survey_responses').insert({tenant_id:tenant.id,survey_id:response.surveyId,organisation_id:response.organisationId??null,contact_id:response.contactId??null,answers:response.answers,submitted_at:response.submittedAt})}},
    updateRecord:(collection,id,changes)=>setData((current)=>({...current,[collection]:(current[collection] as Array<{id:string}>).map((record)=>record.id===id?{...record,...changes}:record)} as PlatformData)),
    removeRecord:(collection,id)=>setData((current)=>({...current,[collection]:(current[collection] as Array<{id:string}>).filter((record)=>record.id!==id)} as PlatformData)),
    updateSettings:(changes)=>setData((current)=>({...current,engagementSettings:{...current.engagementSettings,...changes}})),
    runAutomation:(automationId)=>{
      const rule=data.automations.find((item)=>item.id===automationId)
      if(!rule||!rule.active)return
      try{
        rule.actions.forEach((action)=>{
          if(action.type==='create_task')createTask({title:action.value,dueDate:new Date(Date.now()+86400000).toISOString().slice(0,10),priority:'Medium',category:'General'})
          if(action.type==='add_activity')addActivity(undefined,rule.name,action.value)
        })
        setData((current)=>({...current,automations:current.automations.map((item)=>item.id===automationId?{...item,lastRun:new Date().toISOString(),runs:item.runs+1,error:undefined}:item)}))
      }catch(error){setData((current)=>({...current,automations:current.automations.map((item)=>item.id===automationId?{...item,error:error instanceof Error?error.message:'Automation failed'}:item)}))}
    },
    resetPlatform:()=>setData(initialPlatformData),
  }),[addActivity,createTask,data])
  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>
}

export function usePlatform(){const context=useContext(PlatformContext);if(!context)throw new Error('usePlatform must be used inside PlatformProvider');return context}
export function makePlatformId(prefix:string){return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`}
export function engagementScore(input:{lastActivity:string;benefitsUsed:number;portal:boolean;listingCompleteness:number;campaigns:number;referrals:number;overdueInvoices:number},weights:Record<string,number>){
  const days=Math.max(0,Math.floor((Date.now()-new Date(input.lastActivity).getTime())/86400000))
  const components={contactRecency:Math.max(0,1-days/120),benefitsUsed:Math.min(1,input.benefitsUsed/2),portalActivity:input.portal?1:.2,listingCompleteness:Math.min(1,input.listingCompleteness/100),campaignParticipation:Math.min(1,input.campaigns/2),websiteReferrals:Math.min(1,input.referrals/100),invoices:input.overdueInvoices?0:1}
  const total=Object.entries(weights).reduce((sum,[key,weight])=>sum+(components[key as keyof typeof components]??0)*weight,0)
  const maximum=Object.values(weights).reduce((sum,value)=>sum+value,0)||100
  return Math.round(total/maximum*100)
}
