import { describe, expect, it } from 'vitest'
import { initialData } from './data'
import { initialPlatformData } from './platformData'
import { applyAutomationActions, detectAutomationEvents, matchesAutomationConditions, scheduledAutomationEvents } from './automationEngine'
import type { AutomationRule } from './platformTypes'

const rule=(changes:Partial<AutomationRule>={}):AutomationRule=>({id:'rule-test',name:'Test workflow',description:'Test the workflow.',trigger:'organisation_created',conditions:[],actions:[{type:'create_task',value:'Welcome call'}],active:true,createdAt:'2026-09-22T10:00:00Z',owner:'Alex Morgan',runs:0,...changes})
const crm=()=>structuredClone(initialData)
const platform=()=>structuredClone(initialPlatformData)

describe('automation engine',()=>{
  it('detects CRM creation, stage and completion events',()=>{
    const before=crm(),after=crm()
    after.contacts.push({...after.contacts[0],id:'new-contact',name:'New contact'})
    after.opportunities[0].stage='Proposal'
    after.tasks[0].completed=true
    const events=detectAutomationEvents(before,after,new Date('2026-09-22T12:00:00Z'))
    expect(events.map((item)=>item.trigger)).toEqual(expect.arrayContaining(['contact_created','pipeline_stage_changed','task_completed']))
    expect(events.find((item)=>item.trigger==='contact_created')?.recordId).toBe('new-contact')
  })

  it('evaluates multiple CRM conditions with AND semantics',()=>{
    const data=crm(),e={key:'organisation_created:org-001',trigger:'organisation_created' as const,recordId:'org-001',recordLabel:'Valechester Castle',organisationId:'org-001',at:'2026-09-22T12:00:00Z'}
    const matching=rule({conditions:[{field:'membership_tier',operator:'equals',value:data.organisations[0].tier},{field:'organisation_type',operator:'equals',value:data.organisations[0].type}]})
    expect(matchesAutomationConditions(matching,e,data,platform())).toBe(true)
    expect(matchesAutomationConditions({...matching,conditions:[...matching.conditions,{field:'tags',operator:'contains',value:'not-a-tag'}]},e,data,platform())).toBe(false)
  })

  it('executes ordered actions against the linked CRM record without mutating the source',()=>{
    const data=crm(),support=platform(),e={key:'organisation_created:org-001',trigger:'organisation_created' as const,recordId:'org-001',recordLabel:'Valechester Castle',organisationId:'org-001',at:'2026-09-22T12:00:00Z'}
    const result=applyAutomationActions(rule({actions:[{type:'create_task',value:'Welcome call'},{type:'add_tag',value:'Onboarding'},{type:'queue_email',value:'Welcome to VisitMade'},{type:'add_to_audience',value:'segment-001'},{type:'notify',value:'New member',field:'Alex Morgan'}]}),e,data,support,'run-test')
    expect(result.crm.tasks[0].title).toBe('Welcome call')
    expect(result.crm.organisations[0].tags).toContain('Onboarding')
    expect(result.platform.communications[0]).toMatchObject({status:'Queued',recipientCount:1,contactId:data.contacts.find((item)=>item.organisationId==='org-001'&&item.primary)?.id})
    expect(result.platform.automationNotifications[0].user).toBe('Alex Morgan')
    expect(result.platform.segments[0].contactIds).toContain(data.contacts.find((item)=>item.organisationId==='org-001'&&item.primary)?.id)
    expect(data.tasks).not.toEqual(result.crm.tasks)
    expect(data.organisations[0].tags).not.toContain('Onboarding')
  })

  it('does not commit partial results when a later action fails',()=>{
    const data=crm(),support=platform(),e={key:'organisation_created:org-001',trigger:'organisation_created' as const,recordId:'org-001',recordLabel:'Valechester Castle',organisationId:'org-001',at:'2026-09-22T12:00:00Z'}
    expect(()=>applyAutomationActions(rule({actions:[{type:'add_tag',value:'Temporary'},{type:'add_to_campaign',value:'missing-campaign'}]}),e,data,support,'run-fail')).toThrow('Choose an existing campaign')
    expect(data.organisations[0].tags).not.toContain('Temporary')
  })

  it('produces stable scheduled event keys so a due slot can be deduplicated',()=>{
    const scheduled=rule({trigger:'scheduled_recurring',scheduleAt:'2026-09-20T09:00:00Z',interval:'daily'})
    const first=scheduledAutomationEvents(scheduled,crm(),new Date('2026-09-22T10:00:00Z'))
    const second=scheduledAutomationEvents(scheduled,crm(),new Date('2026-09-22T15:00:00Z'))
    expect(first.length).toBeGreaterThan(0)
    expect(first.map((item)=>item.key)).toEqual(second.map((item)=>item.key))
  })
})
