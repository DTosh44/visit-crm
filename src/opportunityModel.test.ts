import { describe, expect, it } from 'vitest'
import { canMoveApplication, normaliseOpportunity, opportunityCapacity, opportunityEligible } from './opportunityModel'
import { initialPlatformData } from './platformData'

const base=normaliseOpportunity(initialPlatformData.memberOpportunities[0])
const org={id:'org-001',tier:'Tier 1',town:'Valechester',type:'Attraction',status:'Active'}

describe('member opportunity rules',()=>{
  it('normalises legacy records without dropping applications',()=>{
    expect(base.owner).toBe('Workspace team')
    expect(base.applications).toHaveLength(1)
    expect(base.links).toEqual([])
  })
  it('enforces tier, membership, geography, category, invitation and dates',()=>{
    const item={...base,openingDate:'2026-09-01',closingDate:'2026-10-12',eligibleGeographies:['Valechester'],eligibleCategories:['Attraction']}
    expect(opportunityEligible(item,org,'2026-09-22')).toBe(true)
    expect(opportunityEligible(item,{...org,tier:'Tier 4'},'2026-09-22')).toBe(false)
    expect(opportunityEligible(item,{...org,status:'Non-member'},'2026-09-22')).toBe(false)
    expect(opportunityEligible(item,{...org,town:'Elsewhere'},'2026-09-22')).toBe(false)
    expect(opportunityEligible(item,{...org,type:'Hotel'},'2026-09-22')).toBe(false)
    expect(opportunityEligible({...item,invitationOnly:true},org,'2026-09-22')).toBe(false)
    expect(opportunityEligible({...item,invitationOnly:true,invitedOrganisationIds:[org.id]},org,'2026-09-22')).toBe(true)
    expect(opportunityEligible(item,org,'2026-10-13')).toBe(false)
  })
  it('reserves capacity for approved applicants and allows their confirmation',()=>{
    const approved={...base.applications[0],status:'Approved' as const}
    const full={...base,capacity:1,applications:[approved]}
    expect(opportunityCapacity(full)).toMatchObject({placesAvailable:0,approved:1,confirmed:0})
    expect(canMoveApplication(full,approved,'Confirmed')).toBe(true)
    expect(canMoveApplication(full,{...approved,status:'Applied'},'Approved')).toBe(false)
    expect(canMoveApplication(full,approved,'Withdrawn')).toBe(true)
    expect(canMoveApplication(full,{...approved,participated:true},'Withdrawn')).toBe(false)
    expect(opportunityCapacity({...full,capacity:0}).placesAvailable).toBeNull()
  })
  it('prevents duplicate portal transitions while allowing re-application after withdrawal',()=>{
    const applied={...base.applications[0],status:'Applied' as const}
    expect(canMoveApplication(base,applied,'Applied')).toBe(false)
    expect(canMoveApplication(base,{...applied,status:'Withdrawn'},'Applied')).toBe(true)
    expect(canMoveApplication(base,applied,'Rejected')).toBe(true)
    expect(canMoveApplication(base,applied,'Invited')).toBe(false)
  })
})
