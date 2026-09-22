import { createClient } from 'npm:@supabase/supabase-js@2'
import { applyAutomationActions, matchesAutomationConditions, nextRunFor, scheduledAutomationEvents } from '../../../src/automationEngine.ts'
import type { CRMData } from '../../../src/types.ts'
import type { AutomationRun, PlatformData } from '../../../src/platformTypes.ts'

// Invoke every minute from Supabase Cron (or another scheduler). Both the
// browser and this worker claim the same tenant/rule/event unique key.
Deno.serve(async(request)=>{
  const secret=Deno.env.get('AUTOMATION_CRON_SECRET')
  if(!secret)return new Response('Automation scheduler is not configured',{status:503})
  if(request.headers.get('x-cron-secret')!==secret)return new Response('Forbidden',{status:403})
  const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if(!url||!key)return new Response('Supabase credentials are not configured',{status:503})
  const db=createClient(url,key)
  const {data:states,error:loadError}=await db.from('workspace_states').select('tenant_id,data')
  if(loadError)return new Response(loadError.message,{status:500})
  let completed=0,failed=0
  for(const state of states??[]){
    const tenantId=String(state.tenant_id)
    const {data:platformRow,error:platformError}=await db.from('platform_states').select('data').eq('tenant_id',tenantId).maybeSingle()
    if(platformError||!platformRow?.data)continue
    let crm=state.data as CRMData,platform=platformRow.data as PlatformData
    platform={...platform,automationRuns:platform.automationRuns??[],automationNotifications:platform.automationNotifications??[]}
    const now=new Date()
    for(const rule of platform.automations??[]){
      if(!rule.active)continue
      for(const event of scheduledAutomationEvents(rule,crm,now)){
        if(!matchesAutomationConditions(rule,event,crm,platform,now))continue
        const runId=`run-${crypto.randomUUID()}`
        const {error:claimError}=await db.from('automation_runs').insert({id:runId,tenant_id:tenantId,automation_id:rule.id,event_key:event.key,trigger:event.trigger,record_id:event.recordId,record_label:event.recordLabel,status:'running',started_at:event.at})
        if(claimError){if(claimError.code!=='23505')failed++;continue}
        try{
          const result=applyAutomationActions(rule,event,crm,platform,runId)
          const run:AutomationRun={id:runId,ruleId:rule.id,ruleName:rule.name,eventKey:`${rule.id}:${event.key}`,trigger:event.trigger,recordId:event.recordId,recordLabel:event.recordLabel,organisationId:event.organisationId,startedAt:event.at,status:'success',actions:result.actions}
          const nextPlatform={...result.platform,automations:result.platform.automations.map((item)=>item.id===rule.id?{...item,lastRun:event.at,nextRun:nextRunFor(item,now),runs:item.runs+1,error:undefined}:item),automationRuns:[run,...result.platform.automationRuns].slice(0,1000)}
          const {error:commitError}=await db.rpc('complete_automation_run',{p_tenant:tenantId,p_run_id:runId,p_workspace:result.crm,p_platform:nextPlatform,p_actions:result.actions})
          if(commitError)throw commitError
          crm=result.crm;platform=nextPlatform;completed++
        }catch(error){
          const message=error instanceof Error?error.message:String(error)
          await db.from('automation_runs').update({status:'failed',error:message}).eq('tenant_id',tenantId).eq('id',runId)
          const run:AutomationRun={id:runId,ruleId:rule.id,ruleName:rule.name,eventKey:`${rule.id}:${event.key}`,trigger:event.trigger,recordId:event.recordId,recordLabel:event.recordLabel,organisationId:event.organisationId,startedAt:event.at,status:'failed',actions:[],error:message}
          platform={...platform,automations:platform.automations.map((item)=>item.id===rule.id?{...item,error:message}:item),automationRuns:[run,...platform.automationRuns].slice(0,1000)}
          await db.from('platform_states').update({data:platform,updated_by:null,updated_at:new Date().toISOString()}).eq('tenant_id',tenantId)
          failed++
        }
      }
    }
  }
  return Response.json({completed,failed})
})
