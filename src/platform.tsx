/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { supabase, useAuth } from './auth'
import { initialPlatformData } from './platformData'
import type { AutomationRun, PlatformCollection, PlatformData } from './platformTypes'
import { tenant } from './tenant'
import { useCRM } from './store'
import type { CRMData } from './types'
import { applyAutomationActions, detectAutomationEvents, matchesAutomationConditions, nextRunFor, scheduledAutomationEvents, type AutomationEvent } from './automationEngine'

const STORAGE_KEY=`visitmade-platform-v2-${tenant.id}`
const LEGACY_STORAGE_KEY='visitmade-platform-v1'

type RecordFor<K extends PlatformCollection>=PlatformData[K] extends Array<infer R>?R:never
interface PlatformContextValue{
  data:PlatformData
  ready:boolean
  loadError?:string
  addRecord:<K extends PlatformCollection>(collection:K,record:RecordFor<K>)=>void
  updateRecord:<K extends PlatformCollection>(collection:K,id:string,changes:Partial<RecordFor<K>>)=>void
  removeRecord:<K extends PlatformCollection>(collection:K,id:string)=>void
  updateSettings:(changes:Partial<PlatformData['engagementSettings']>)=>void
  resetPlatform:()=>void
}

const PlatformContext=createContext<PlatformContextValue|null>(null)
function normaliseData(saved:Partial<PlatformData>):PlatformData{return{...initialPlatformData,...saved,automations:(saved.automations??[]).filter((item)=>!['auto-001','auto-002','auto-003'].includes(item.id)).map((item)=>({...item,createdAt:item.createdAt??new Date().toISOString(),owner:item.owner??'Workspace administrator',runs:item.runs??0})),automationRuns:saved.automationRuns??[],automationNotifications:saved.automationNotifications??[]}}
function readData(){try{const saved=localStorage.getItem(STORAGE_KEY)??(tenant.id==='00000000-0000-4000-8000-000000000001'?localStorage.getItem(LEGACY_STORAGE_KEY):null);return saved?normaliseData(JSON.parse(saved) as Partial<PlatformData>):initialPlatformData}catch{return initialPlatformData}}

export function PlatformProvider({children}:{children:ReactNode}){
  const [data,setData]=useState<PlatformData>(readData)
  const [loadedFor,setLoadedFor]=useState<string|null>(null)
  const [loadError,setLoadError]=useState<string>()
  const {user}=useAuth()
  const ready=!supabase||Boolean(user&&loadedFor===user.id)
  const crm=useCRM()
  const dataRef=useRef(data),crmRef=useRef(crm.data),previousCRM=useRef<CRMData|null>(null)
  const previousRemoteRevision=useRef(crm.remoteAutomationRevision)
  const suppressedCRM=useRef<WeakSet<CRMData>>(new WeakSet()),inFlight=useRef(new Set<string>())
  const executionQueue=useRef<Promise<void>>(Promise.resolve())
  useEffect(()=>{dataRef.current=data},[data])
  useEffect(()=>{crmRef.current=crm.data},[crm.data])
  useEffect(()=>{
    if(!supabase||!user)return
    let active=true
    void supabase.from('platform_states').select('data').eq('tenant_id',tenant.id).maybeSingle().then(({data:row,error})=>{if(!active)return;if(error){setLoadError(`Automations could not load: ${error.message}`);return}if(row?.data)setData(normaliseData(row.data as Partial<PlatformData>));setLoadError(undefined);setLoadedFor(user.id)})
    return()=>{active=false}
  },[user])
  useEffect(()=>{
    localStorage.setItem(STORAGE_KEY,JSON.stringify(data))
    if(supabase&&user&&ready){void supabase.from('platform_states').upsert({tenant_id:tenant.id,data,updated_by:user.id,updated_at:new Date().toISOString()},{onConflict:'tenant_id'});void supabase.from('public_surveys').upsert(data.surveys.map((survey)=>({id:survey.id,tenant_id:tenant.id,slug:survey.slug,definition:survey,status:survey.status,opening_date:survey.openingDate||null,closing_date:survey.closingDate||null,updated_at:new Date().toISOString()})),{onConflict:'tenant_id,id'})}
  },[data,user,ready])
  useEffect(()=>{
    if(!supabase||!user||!ready)return
    const client=supabase
    const channel=client.channel(`platform-${tenant.id}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'platform_states',filter:`tenant_id=eq.${tenant.id}`},(payload)=>{const record=payload.new as {data?:Partial<PlatformData>;updated_by?:string|null};if(record.data&&record.updated_by!==user.id)setData(normaliseData(record.data))}).subscribe()
    return()=>{void client.removeChannel(channel)}
  },[user,ready])
  const execute=useCallback((ruleId:string,e:AutomationEvent)=>{
    const perform=async()=>{
    if(!user||!ready||!crm.ready)return
    const rule=dataRef.current.automations.find((item)=>item.id===ruleId)
    if(!rule?.active||rule.trigger!==e.trigger||!matchesAutomationConditions(rule,e,crmRef.current,dataRef.current))return
    const eventKey=`${rule.id}:${e.key}`
    if(inFlight.current.has(eventKey)||dataRef.current.automationRuns.some((run)=>run.eventKey===eventKey&&run.status==='success'))return
    inFlight.current.add(eventKey)
    const runId=`run-${crypto.randomUUID()}`
    let claim=false
    try{
      if(supabase){const {error}=await supabase.from('automation_runs').insert({id:runId,tenant_id:tenant.id,automation_id:rule.id,event_key:e.key,trigger:e.trigger,record_id:e.recordId,record_label:e.recordLabel,status:'running',started_at:e.at});if(error){if(error.code==='23505')return;throw new Error(`Automation run could not be claimed: ${error.message}`)}claim=true}
      const result=applyAutomationActions(rule,e,crmRef.current,dataRef.current,runId)
      const run:AutomationRun={id:runId,ruleId:rule.id,ruleName:rule.name,eventKey,trigger:e.trigger,recordId:e.recordId,recordLabel:e.recordLabel,organisationId:e.organisationId,startedAt:e.at,status:'success',actions:result.actions}
      const updated={...result.platform,automations:result.platform.automations.map((item)=>item.id===rule.id?{...item,lastRun:e.at,nextRun:nextRunFor(item,new Date(e.at)),runs:item.runs+1,error:undefined}:item),automationRuns:[run,...result.platform.automationRuns].slice(0,1000)}
      if(supabase){const {error}=await supabase.rpc('complete_automation_run',{p_tenant:tenant.id,p_run_id:runId,p_workspace:result.crm,p_platform:updated,p_actions:result.actions});if(error)throw new Error(`Automation actions could not be saved: ${error.message}`)}
      crmRef.current=result.crm;suppressedCRM.current.add(result.crm);crm.applyAutomationUpdate(()=>result.crm)
      dataRef.current=updated;setData(updated)
    }catch(error){const message=error instanceof Error?error.message:'Automation failed';const run:AutomationRun={id:runId,ruleId:rule.id,ruleName:rule.name,eventKey,trigger:e.trigger,recordId:e.recordId,recordLabel:e.recordLabel,organisationId:e.organisationId,startedAt:e.at,status:'failed',actions:[],error:message};const updated={...dataRef.current,automations:dataRef.current.automations.map((item)=>item.id===rule.id?{...item,error:message}:item),automationRuns:[run,...dataRef.current.automationRuns].slice(0,1000)};dataRef.current=updated;setData(updated);if(supabase&&claim)void supabase.from('automation_runs').update({status:'failed',error:message}).eq('tenant_id',tenant.id).eq('id',runId)}
    finally{inFlight.current.delete(eventKey)}
    }
    const queued=executionQueue.current.then(perform)
    executionQueue.current=queued.catch(()=>undefined)
    return queued
  },[crm,ready,user])
  useEffect(()=>{
    if(!ready||!crm.ready||!user){previousCRM.current=crm.data;return}
    const previous=previousCRM.current;previousCRM.current=crm.data
    const remoteAutomationChange=previousRemoteRevision.current!==crm.remoteAutomationRevision
    previousRemoteRevision.current=crm.remoteAutomationRevision
    if(!previous||remoteAutomationChange||suppressedCRM.current.has(crm.data))return
    const events=detectAutomationEvents(previous,crm.data)
    for(const e of events)for(const rule of dataRef.current.automations.filter((item)=>item.active&&item.trigger===e.trigger))void execute(rule.id,e)
  },[crm.data,crm.ready,crm.remoteAutomationRevision,ready,user,execute])
  useEffect(()=>{
    if(!ready||!crm.ready||!user)return
    const tick=()=>{const now=new Date();for(const rule of dataRef.current.automations.filter((item)=>item.active)){for(const e of scheduledAutomationEvents(rule,crmRef.current,now))void execute(rule.id,e)}}
    tick();const timer=window.setInterval(tick,60_000);window.addEventListener('focus',tick);return()=>{window.clearInterval(timer);window.removeEventListener('focus',tick)}
  },[ready,crm.ready,user,execute])
  const value=useMemo<PlatformContextValue>(()=>({
    data,ready,loadError,
    addRecord:(collection,record)=>{setData((current)=>({...current,[collection]:[...(current[collection] as unknown[]),record]} as PlatformData));if(supabase&&collection==='surveyResponses'){const response=record as PlatformData['surveyResponses'][number];void supabase.from('survey_responses').insert({tenant_id:tenant.id,survey_id:response.surveyId,organisation_id:response.organisationId??null,contact_id:response.contactId??null,answers:response.answers,submitted_at:response.submittedAt})}},
    updateRecord:(collection,id,changes)=>setData((current)=>({...current,[collection]:(current[collection] as Array<{id:string}>).map((record)=>record.id===id?{...record,...changes}:record)} as PlatformData)),
    removeRecord:(collection,id)=>setData((current)=>({...current,[collection]:(current[collection] as Array<{id:string}>).filter((record)=>record.id!==id)} as PlatformData)),
    updateSettings:(changes)=>setData((current)=>({...current,engagementSettings:{...current.engagementSettings,...changes}})),
    resetPlatform:()=>setData(initialPlatformData),
  }),[data,ready,loadError])
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
