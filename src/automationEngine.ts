import type { CRMData, MembershipStatus, PipelineStage } from './types'
import type { AutomationAction, AutomationCondition, AutomationRule, AutomationTrigger, PlatformData } from './platformTypes'

export interface AutomationEvent { key:string; trigger:AutomationTrigger; recordId:string; recordLabel:string; organisationId?:string; at:string }
export const triggerLabels:Record<AutomationTrigger,string>={organisation_created:'Organisation created',contact_created:'Contact created',lead_created:'Lead created',pipeline_stage_changed:'Pipeline stage changed',membership_created:'Membership created',renewal_approaching:'Membership approaching renewal',membership_expired:'Membership expired',invoice_due:'Invoice due',invoice_overdue:'Invoice overdue',agreement_expiring:'Agreement approaching expiry',task_completed:'Task completed',event_created:'Event created',opportunity_created:'Opportunity created',risk_changed:'Member satisfaction/risk changed',date_based:'Date and time',scheduled_recurring:'Scheduled recurring'}
export const fieldLabels:Record<AutomationCondition['field'],string>={membership_tier:'Membership tier',organisation_type:'Organisation type',area:'Area / location',pipeline_stage:'Pipeline stage',member_status:'Member / non-member',membership_status:'Membership status',satisfaction_status:'Satisfaction / risk',tags:'Tags',owner:'Owner',invoice_status:'Invoice status',renewal_date:'Renewal date',last_engagement_date:'Last engagement date',contact_preference:'Contact preference'}
export const actionLabels:Record<AutomationAction['type'],string>={create_task:'Create task',assign_task:'Assign task',queue_email:'Queue communication',add_tag:'Add tag',remove_tag:'Remove tag',update_field:'Update organisation field',change_pipeline_stage:'Change pipeline stage',update_member_status:'Update member status',create_reminder:'Create reminder',add_to_campaign:'Add to campaign',add_to_audience:'Add contact to audience',notify:'Notify CRM user',add_activity:'Create activity / note'}
const dayMs=86400000
const date=(value:string)=>new Date(`${value.slice(0,10)}T12:00:00Z`).getTime()
const daysBetween=(a:string,b:string)=>Math.round((date(a)-date(b))/dayMs)
const event=(trigger:AutomationTrigger,recordId:string,recordLabel:string,at:string,organisationId?:string,suffix=''):AutomationEvent=>({key:`${trigger}:${recordId}${suffix?`:${suffix}`:''}`,trigger,recordId,recordLabel,organisationId,at})

export function detectAutomationEvents(previous:CRMData,current:CRMData,now=new Date()):AutomationEvent[]{
  const at=now.toISOString(), events:AutomationEvent[]=[]
  const previousOrgs=new Map(previous.organisations.map((item)=>[item.id,item]))
  for(const item of current.organisations){const before=previousOrgs.get(item.id)
    if(!before)events.push(event('organisation_created',item.id,item.name,at,item.id))
    if((!before&&item.status==='Active')||(before&&before.status!==item.status&&item.status==='Active'))events.push(event('membership_created',item.id,item.name,at,item.id,item.membershipStart||item.status))
    if(before&&before.status!==item.status&&item.status==='Lapsed')events.push(event('membership_expired',item.id,item.name,at,item.id,item.status))
    if(before&&before.health!==item.health)events.push(event('risk_changed',item.id,item.name,at,item.id,item.health))
  }
  const previousContacts=new Set(previous.contacts.map((item)=>item.id))
  for(const item of current.contacts)if(!previousContacts.has(item.id))events.push(event('contact_created',item.id,item.name,at,item.organisationId))
  const previousOpportunities=new Map(previous.opportunities.map((item)=>[item.id,item]))
  for(const item of current.opportunities){const before=previousOpportunities.get(item.id)
    if(!before){events.push(event('lead_created',item.id,item.organisationName,at));events.push(event('opportunity_created',item.id,item.organisationName,at))}
    else if(before.stage!==item.stage)events.push(event('pipeline_stage_changed',item.id,item.organisationName,at,undefined,item.stage))
  }
  const previousTasks=new Map(previous.tasks.map((item)=>[item.id,item]))
  for(const item of current.tasks){const before=previousTasks.get(item.id);if(before&&!before.completed&&item.completed)events.push(event('task_completed',item.id,item.title,at,item.organisationId))}
  const previousEvents=new Set(previous.events.map((item)=>item.id))
  for(const item of current.events)if(!previousEvents.has(item.id))events.push(event('event_created',item.id,item.title,at,item.organisationId))
  return events
}

export function nextRunFor(rule:AutomationRule,from=new Date()):string|undefined{
  if(!rule.active||!rule.scheduleAt||!['date_based','scheduled_recurring'].includes(rule.trigger))return undefined
  const start=new Date(rule.scheduleAt)
  if(Number.isNaN(start.getTime()))return undefined
  if(rule.trigger==='date_based')return start>from?start.toISOString():undefined
  if(!rule.interval)return undefined
  const next=new Date(start)
  while(next<=from){if(rule.interval==='daily')next.setUTCDate(next.getUTCDate()+1);else if(rule.interval==='weekly')next.setUTCDate(next.getUTCDate()+7);else next.setUTCMonth(next.getUTCMonth()+1)}
  return next.toISOString()
}

export function scheduledAutomationEvents(rule:AutomationRule,crm:CRMData,now=new Date()):AutomationEvent[]{
  if(!rule.active)return[]
  const at=now.toISOString(),today=at.slice(0,10)
  if(rule.trigger==='date_based'||rule.trigger==='scheduled_recurring'){
    if(!rule.scheduleAt)return[]
    const start=new Date(rule.scheduleAt)
    if(Number.isNaN(start.getTime())||start>now)return[]
    const targets=crm.organisations.length?crm.organisations.map((item)=>({id:item.id,name:item.name})): [{id:'workspace',name:'Destination workspace'}]
    if(rule.trigger==='date_based')return targets.map((item)=>event(rule.trigger,item.id,item.name,at,item.id==='workspace'?undefined:item.id,rule.scheduleAt))
    const next=nextRunFor(rule,new Date(now.getTime()-dayMs*40))
    if(!next)return[]
    const slot=new Date(next)
    while(slot<=now){const candidate=slot.toISOString();if(rule.interval==='daily')slot.setUTCDate(slot.getUTCDate()+1);else if(rule.interval==='weekly')slot.setUTCDate(slot.getUTCDate()+7);else slot.setUTCMonth(slot.getUTCMonth()+1);if(slot>now)return targets.map((item)=>event(rule.trigger,item.id,item.name,at,item.id==='workspace'?undefined:item.id,candidate))}
    return[]
  }
  if(rule.trigger==='renewal_approaching')return crm.organisations.filter((item)=>item.renewalDate&&daysBetween(item.renewalDate,today)>=0&&daysBetween(item.renewalDate,today)<=90).map((item)=>event(rule.trigger,item.id,item.name,at,item.id,today))
  if(rule.trigger==='membership_expired')return crm.organisations.filter((item)=>item.renewalDate&&item.renewalDate<today&&item.status!=='Lapsed'&&item.status!=='Non-member').map((item)=>event(rule.trigger,item.id,item.name,at,item.id,item.renewalDate))
  if(rule.trigger==='invoice_due')return crm.invoices.filter((item)=>item.dueDate===today&&item.status==='Sent').map((item)=>event(rule.trigger,item.id,item.number,at,item.organisationId,today))
  if(rule.trigger==='invoice_overdue')return crm.invoices.filter((item)=>item.dueDate<today&&['Sent','Overdue'].includes(item.status)).map((item)=>event(rule.trigger,item.id,item.number,at,item.organisationId,today))
  if(rule.trigger==='agreement_expiring')return crm.agreements.filter((item)=>item.validUntil&&daysBetween(item.validUntil,today)>=0&&daysBetween(item.validUntil,today)<=30&&item.status==='Signed').map((item)=>event(rule.trigger,item.id,item.number,at,item.organisationId,today))
  return[]
}

function fieldValue(field:AutomationCondition['field'],e:AutomationEvent,crm:CRMData,platform:PlatformData):string{
  const org=crm.organisations.find((item)=>item.id===e.organisationId),opp=crm.opportunities.find((item)=>item.id===e.recordId),invoice=crm.invoices.find((item)=>item.id===e.recordId),contact=crm.contacts.find((item)=>item.id===e.recordId)??crm.contacts.find((item)=>item.organisationId===e.organisationId&&item.primary)
  switch(field){
    case 'membership_tier':return org?.tier??opp?.proposedLevel??''
    case 'organisation_type':return org?.type??''
    case 'area':return org?.town??''
    case 'pipeline_stage':return opp?.stage??''
    case 'member_status':return org?(['Active','Renewing'].includes(org.status)?'Member':'Non-member'):''
    case 'membership_status':return org?.status??''
    case 'satisfaction_status':return org?.health??''
    case 'tags':return [...(org?.tags??[]),...(contact?.tags??[])].join(', ')
    case 'owner':return org?.owner??opp?.owner??''
    case 'invoice_status':return invoice?.status??''
    case 'renewal_date':return org?.renewalDate??''
    case 'last_engagement_date':return org?.lastActivity?.slice(0,10)??''
    case 'contact_preference':{const preference=platform.communicationPreferences.find((item)=>item.contactId===contact?.id);return preference?Object.entries(preference).filter(([key,value])=>['service','marketing','trade','events','research'].includes(key)&&value===true).map(([key])=>key).join(', '):'service'}
  }
}
export function matchesAutomationConditions(rule:AutomationRule,e:AutomationEvent,crm:CRMData,platform:PlatformData,now=new Date()):boolean{
  return rule.conditions.every(({field,operator,value})=>{const actual=fieldValue(field,e,crm,platform).toLowerCase(),expected=value.trim().toLowerCase();if(!expected)return false
    if(operator==='equals')return actual===expected
    if(operator==='not_equals')return actual!==expected
    if(operator==='contains')return actual.split(',').some((part)=>part.trim().includes(expected))||actual.includes(expected)
    if(operator==='before')return Boolean(actual)&&actual<expected
    if(operator==='after')return Boolean(actual)&&actual>expected
    if(operator==='within_days')return Boolean(actual)&&!Number.isNaN(Number(expected))&&daysBetween(actual,now.toISOString().slice(0,10))>=0&&daysBetween(actual,now.toISOString().slice(0,10))<=Number(expected)
    return false
  })
}

const memberStatuses:MembershipStatus[]=['Active','Renewing','Prospect','Free listing','Lapsed','Non-member']
const pipelineStages:PipelineStage[]=['New lead','Qualified','Proposal','Decision','Won']
export function validateAutomation(rule:AutomationRule):string|undefined{
  if(!rule.name.trim())return'Give the automation a name.'
  if(!rule.description.trim())return'Add a description explaining what this automation does.'
  if(!rule.owner.trim())return'Choose an owner.'
  if(!rule.actions.length)return'Add at least one action.'
  if(rule.conditions.some((item)=>!item.value.trim()))return'Complete every condition value.'
  if(rule.actions.some((item)=>!item.value.trim()))return'Complete every action value.'
  if(['date_based','scheduled_recurring'].includes(rule.trigger)&&(!rule.scheduleAt||Number.isNaN(new Date(rule.scheduleAt).getTime())))return'Choose a valid schedule date and time.'
  if(rule.trigger==='scheduled_recurring'&&!rule.interval)return'Choose a repeat interval.'
  if(rule.actions.some((item)=>item.type==='update_field'&&!['owner','nextAction','notes','town','type'].includes(item.field??'')))return'Choose an allowed organisation field.'
  if(rule.actions.some((item)=>item.type==='change_pipeline_stage'&&!pipelineStages.includes(item.value as PipelineStage)))return'Choose a valid pipeline stage.'
  if(rule.actions.some((item)=>item.type==='change_pipeline_stage')&&!['lead_created','opportunity_created','pipeline_stage_changed'].includes(rule.trigger))return'Pipeline-stage actions require a lead or pipeline trigger.'
  if(rule.actions.some((item)=>item.type==='update_member_status'&&!memberStatuses.includes(item.value as MembershipStatus)))return'Choose a valid member status.'
}

export function applyAutomationActions(rule:AutomationRule,e:AutomationEvent,crm:CRMData,platform:PlatformData,runId:string):{crm:CRMData;platform:PlatformData;actions:string[]}{
  const problem=validateAutomation(rule);if(problem)throw new Error(problem)
  let nextCRM={...crm},nextPlatform={...platform};const performed:string[]=[]
  const org=()=>{if(!e.organisationId||!nextCRM.organisations.some((item)=>item.id===e.organisationId))throw new Error('This action requires an organisation record.');return e.organisationId}
  rule.actions.forEach((action,index)=>{const id=`${runId}-${index}`,value=action.value.trim()
    switch(action.type){
      case 'create_task':case 'create_reminder':nextCRM={...nextCRM,tasks:[{id,title:value,organisationId:e.organisationId,dueDate:new Date(Date.now()+dayMs).toISOString().slice(0,10),priority:'Medium',assignee:rule.owner,category:action.type==='create_reminder'?'Follow-up':'General',completed:false},...nextCRM.tasks]};break
      case 'assign_task':{const organisationId=org(),target=nextCRM.tasks.find((item)=>!item.completed&&item.organisationId===organisationId);if(!target)throw new Error('No open task was found to assign.');nextCRM={...nextCRM,tasks:nextCRM.tasks.map((item)=>item.id===target.id?{...item,assignee:value}:item)};break}
      case 'queue_email':{const contact=nextCRM.contacts.find((item)=>item.id===e.recordId&&e.trigger==='contact_created')??nextCRM.contacts.find((item)=>item.organisationId===e.organisationId&&item.primary)??nextCRM.contacts.find((item)=>item.organisationId===e.organisationId);if(!contact?.email)throw new Error('No contact email is available for this record.');const pref=nextPlatform.communicationPreferences.find((item)=>item.contactId===contact.id);if(pref&&!pref.service)throw new Error('The contact has opted out of service communications.');nextPlatform={...nextPlatform,communications:[{id,name:`Automation: ${rule.name}`,contactId:contact.id,subject:value,body:value,status:'Queued',recipientCount:1,createdAt:e.at},...nextPlatform.communications]};break}
      case 'add_tag':case 'remove_tag':{const contact=nextCRM.contacts.find((item)=>item.id===e.recordId&&e.trigger==='contact_created');if(contact){nextCRM={...nextCRM,contacts:nextCRM.contacts.map((item)=>item.id===contact.id?{...item,tags:action.type==='add_tag'?Array.from(new Set([...(item.tags??[]),value])):(item.tags??[]).filter((tag)=>tag!==value)}:item)}}else{const organisationId=org();nextCRM={...nextCRM,organisations:nextCRM.organisations.map((item)=>item.id===organisationId?{...item,tags:action.type==='add_tag'?Array.from(new Set([...item.tags,value])):item.tags.filter((tag)=>tag!==value)}:item)}}break}
      case 'update_field':{const organisationId=org(),field=action.field as 'owner'|'nextAction'|'notes'|'town'|'type';nextCRM={...nextCRM,organisations:nextCRM.organisations.map((item)=>item.id===organisationId?{...item,[field]:value}:item)};break}
      case 'change_pipeline_stage':{if(!nextCRM.opportunities.some((item)=>item.id===e.recordId))throw new Error('This action requires a pipeline record.');nextCRM={...nextCRM,opportunities:nextCRM.opportunities.map((item)=>item.id===e.recordId?{...item,stage:value as PipelineStage,stageEnteredAt:e.at,daysInStage:0}:item)};break}
      case 'update_member_status':{const organisationId=org();nextCRM={...nextCRM,organisations:nextCRM.organisations.map((item)=>item.id===organisationId?{...item,status:value as MembershipStatus}:item)};break}
      case 'add_to_campaign':{const organisationId=org();if(!nextPlatform.campaigns.some((item)=>item.id===value))throw new Error('Choose an existing campaign.');nextPlatform={...nextPlatform,campaigns:nextPlatform.campaigns.map((item)=>item.id===value?{...item,organisationIds:Array.from(new Set([...item.organisationIds,organisationId]))}:item)};break}
      case 'add_to_audience':{const contact=nextCRM.contacts.find((item)=>item.id===e.recordId&&e.trigger==='contact_created')??nextCRM.contacts.find((item)=>item.organisationId===e.organisationId&&item.primary);if(!contact)throw new Error('No contact was found for this audience action.');if(!nextPlatform.segments.some((item)=>item.id===value))throw new Error('Choose an existing audience.');nextPlatform={...nextPlatform,segments:nextPlatform.segments.map((item)=>item.id===value?{...item,contactIds:Array.from(new Set([...(item.contactIds??[]),contact.id])),updatedAt:e.at}:item)};break}
      case 'notify':nextPlatform={...nextPlatform,automationNotifications:[{id,user:action.field||rule.owner,title:rule.name,detail:value,createdAt:e.at,read:false},...nextPlatform.automationNotifications]};break
      case 'add_activity':nextCRM={...nextCRM,activities:[{id,organisationId:e.organisationId,type:'note',title:rule.name,detail:value,timestamp:e.at,user:`Automation · ${rule.owner}`},...nextCRM.activities]};break
    }
    performed.push(`${actionLabels[action.type]}: ${value}`)
  })
  return{crm:nextCRM,platform:nextPlatform,actions:performed}
}
