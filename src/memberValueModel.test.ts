import { describe, expect, it } from 'vitest'
import { initialData } from './data'
import { initialPlatformData } from './platformData'
import { inPeriod, memberExposure, memberValueRows, membershipPeriod, valueTotals } from './memberValueModel'

describe('member value calculations',()=>{
  it('uses each organisation membership dates rather than a fixed reporting cutoff',()=>{
    const org=initialData.organisations.find((item)=>item.id==='org-003')!
    const period=membershipPeriod(org)!
    expect(period).toEqual({start:'2025-10-01',end:'2026-09-30'})
    expect(inPeriod('2026-09-29',period)).toBe(true)
    expect(inPeriod('2026-09-30',period)).toBe(false)
    expect(membershipPeriod(org,-1)).toEqual({start:'2024-10-01',end:'2025-09-30'})
  })
  it('links benefits, campaigns, FAMs and media to source records without inventing revenue',()=>{
    const completed={...initialPlatformData,famTrips:initialPlatformData.famTrips.map((trip)=>({...trip,startDate:'2026-05-01',endDate:'2026-05-03',outcome:'Buyers attended and received product information.'}))}
    const rows=memberValueRows(initialData,completed)
    expect(rows.find((item)=>item.benefitId)?.source).toBe('Membership benefit usage')
    expect(rows.find((item)=>item.campaignId)?.source).toBe('Campaign participation')
    expect(rows.find((item)=>item.id==='fam-fam-001-org-001')?.estimatedValue).toBe(0)
    expect(rows.find((item)=>item.id==='coverage-coverage-001-org-001')?.actualValue).toBeUndefined()
    expect(valueTotals(rows).actual).toBe(0)
  })
  it('does not duplicate participation when an evidenced value entry exists',()=>{
    const platform={...initialPlatformData,memberValue:[{id:'manual-opportunity',organisationId:'org-003',opportunityId:'member-opp-001',date:'2026-09-22',category:'Marketing' as const,activity:'Partner feature',quantity:1,estimatedValue:50,evidence:'Approved rate card'}],memberOpportunities:initialPlatformData.memberOpportunities.map((item)=>item.id==='member-opp-001'?{...item,applications:item.applications.map((app)=>({...app,participated:true}))}:item)}
    const rows=memberValueRows(initialData,platform)
    expect(rows.filter((item)=>item.opportunityId==='member-opp-001'&&item.organisationId==='org-003')).toHaveLength(1)
    expect(valueTotals(rows.filter((item)=>item.id==='manual-opportunity')).estimated).toBe(50)
  })
  it('keeps estimates and known amounts separate and avoids duplicate campaign lines',()=>{
    const campaign=initialPlatformData.campaigns[0]
    const platform={...initialPlatformData,memberValue:[{id:'campaign-value',organisationId:'org-001',campaignId:campaign.id,date:campaign.startDate,type:'Campaign participation' as const,category:'Marketing' as const,activity:campaign.name,quantity:1,estimatedValue:120,actualValue:40,source:'Rate card',calculation:'manual' as const,evidence:'Signed delivery report'}]}
    const rows=memberValueRows(initialData,platform)
    expect(rows.filter((item)=>item.campaignId===campaign.id&&item.organisationId==='org-001')).toHaveLength(1)
    expect(valueTotals(rows.filter((item)=>item.id==='campaign-value'))).toMatchObject({estimated:120,actual:40})
  })
  it('keeps cumulative listing exposure separate from dated monetary value',()=>{
    const exposure=memberExposure(initialData,'org-001')
    expect(exposure.views).toBe(initialData.listings.filter((item)=>item.organisationId==='org-001').reduce((sum,item)=>sum+item.views,0))
    expect(exposure).not.toHaveProperty('estimatedValue')
  })
})
