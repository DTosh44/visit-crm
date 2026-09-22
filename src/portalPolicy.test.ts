import { describe, expect, it } from 'vitest'
import { canPortalAccess, pickFields, type PortalGrant, type PortalOperation, type PortalTarget } from './portalPolicy'

const grant:PortalGrant={tenantId:'tenant-a',organisationId:'org-a',contactId:'contact-a',role:'Member admin',active:true}
const target:PortalTarget={tenantId:'tenant-a',organisationId:'org-a',entity:'listing',id:'listing-a'}

describe('portal server access rules',()=>{
  it('denies every operation when a record ID resolves to another organisation or tenant',()=>{
    const operations:PortalOperation[]=['read','propose','save_event_draft','submit_event','manage_contact','set_primary','express_interest','apply','confirm','withdraw']
    for(const operation of operations){
      expect(canPortalAccess(grant,{...target,organisationId:'org-b'},operation)).toBe(false)
      expect(canPortalAccess(grant,{...target,tenantId:'tenant-b'},operation)).toBe(false)
    }
  })
  it('denies revoked accounts and prevents viewers from mutating records',()=>{
    expect(canPortalAccess({...grant,active:false},target,'read')).toBe(false)
    expect(canPortalAccess({...grant,role:'Member viewer'},target,'propose')).toBe(false)
    expect(canPortalAccess({...grant,role:'Billing contact'},target,'propose')).toBe(false)
  })
  it('limits contact management and participation confirmation to member admins',()=>{
    const contact={...target,entity:'contact' as const,id:'contact-b'}
    expect(canPortalAccess(grant,contact,'manage_contact')).toBe(true)
    expect(canPortalAccess({...grant,role:'Member editor'},contact,'manage_contact')).toBe(false)
    const opportunity={...target,entity:'opportunity' as const,status:'Open',eligibleTiers:['Tier 1'],tier:'Tier 1'}
    expect(canPortalAccess(grant,opportunity,'confirm')).toBe(true)
    expect(canPortalAccess({...grant,role:'Member editor'},opportunity,'confirm')).toBe(false)
    expect(canPortalAccess(grant,{...opportunity,tier:'Tier 2'},'apply')).toBe(false)
  })
  it('never copies internal-only fields into change proposals',()=>{
    expect(pickFields({description:'New copy',internalNotes:'Private',organisationId:'org-b'},['description'])).toEqual({description:'New copy'})
  })
})
