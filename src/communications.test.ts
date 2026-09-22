import { describe, expect, it } from 'vitest'
import { initialData } from './data'
import { initialPlatformData } from './platformData'
import { allowedFor, deliveryTotals, renderCommunication, resolveAudience } from './communications'
import type { CommunicationAudience, PlatformData } from './platformTypes'

const all:CommunicationAudience={mode:'all',filters:[],organisationIds:[],contactIds:[]}
const withOptIn=():PlatformData=>({...initialPlatformData,communicationPreferences:initialData.contacts.map((contact)=>({id:`p-${contact.id}`,contactId:contact.id,service:true,marketing:true,trade:false,events:false,research:false,lawfulBasis:'Consent',note:''}))})

describe('CRM communications',()=>{
  it('excludes marketing contacts without opt-in and all unsubscribed contacts',()=>{
    expect(resolveAudience(all,'Newsletter',initialData,initialPlatformData)).toHaveLength(0)
    const platform=withOptIn();const first=initialData.contacts[0]
    platform.communicationPreferences[0].unsubscribed=true
    expect(resolveAudience(all,'Newsletter',initialData,platform).some((item)=>item.contactId===first.id)).toBe(false)
    expect(allowedFor(first,'Member update',platform.communicationPreferences)).toBe(false)
  })
  it('matches selected organisations, role, tier and contact preference with a live count',()=>{
    const platform=withOptIn();const org=initialData.organisations[0]
    const audience:CommunicationAudience={mode:'selected',organisationIds:[org.id],contactIds:[],filters:[{field:'tier',value:org.tier}]}
    const recipients=resolveAudience(audience,'Email campaign',initialData,platform)
    expect(recipients.length).toBeGreaterThan(0)
    expect(recipients.every((item)=>item.organisationId===org.id)).toBe(true)
    expect(resolveAudience({...audience,filters:[{field:'role',value:'Impossible role'}]},'Email campaign',initialData,platform)).toHaveLength(0)
  })
  it('deduplicates recipient email and uses preferred email',()=>{
    const platform=withOptIn();const contact=initialData.contacts[0]
    platform.communicationPreferences[0].preferredEmail='alt@example.org'
    const crm={...initialData,contacts:[contact,{...initialData.contacts[1],email:'alt@example.org'}]}
    const recipients=resolveAudience(all,'Newsletter',crm,platform)
    expect(recipients).toHaveLength(1)
    expect(recipients[0].email).toBe('alt@example.org')
  })
  it('escapes content and rejects unsafe CTA URLs while resolving merge fields',()=>{
    const html=renderCommunication({body:'Hello {{first_name}} <script>alert(1)</script>',ctaLabel:'Read more',ctaUrl:'javascript:alert(1)'},initialData.contacts[0],initialData.organisations[0])
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain(initialData.contacts[0].name.split(' ')[0])
    expect(html).not.toContain('<a href=')
  })
  it('reports delivery, bounce, open and click data from receipts only',()=>{
    expect(deliveryTotals({id:'one',name:'One',subject:'One',body:'Body',status:'Sent',recipientCount:100,createdAt:'2026-01-01',recipients:[{contactId:'a',email:'a@example.org',status:'Delivered',opens:2,clicks:1,unsubscribedAt:'2026-01-02'},{contactId:'b',email:'b@example.org',status:'Bounced',opens:0,clicks:0}]})).toEqual({delivered:1,bounced:1,opens:2,clicks:1,failed:0,unsubscribed:1})
  })
})
