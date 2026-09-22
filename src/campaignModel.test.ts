import { describe, expect, it } from 'vitest'
import { campaignFinance, campaignKpiActual, campaignKpiProgress, campaignWebsiteChannels, campaignWebsiteResults, normaliseCampaign } from './campaignModel'
import { initialData } from './data'
import { initialPlatformData } from './platformData'

describe('campaign management calculations',()=>{
  it('migrates legacy campaigns without losing partners or results',()=>{
    const source=initialPlatformData.campaigns[1]
    const campaign=normaliseCampaign({...source,status:'Complete'})
    expect(campaign.status).toBe('Completed')
    expect(campaign.partners?.map((item)=>item.organisationId)).toEqual(source.organisationIds)
    expect(campaign.referrals).toBe(source.referrals)
  })
  it('tracks planned spend, actual spend and funding without overwriting historical spend',()=>{
    const campaign={...normaliseCampaign(initialPlatformData.campaigns[0]),externalFunding:500,partners:[{organisationId:'org-001',contribution:250,participationType:'Featured',status:'Active' as const,notes:''}],expenses:[{id:'expense-1',description:'Media',channel:'Paid social',planned:2000,actual:1000,date:'2026-09-22'}],resultValue:8000,resultValueEvidence:'Confirmed bookings report'}
    expect(campaignFinance(campaign)).toMatchObject({planned:2000,spend:5820,contributions:250,funding:500,totalFunding:12500,remaining:6680,unfunded:11750})
    expect(campaignFinance(campaign).roi).toBeCloseTo((8000-5820)/5820)
    expect(campaignFinance({...campaign,resultValueEvidence:''}).roi).toBeNull()
  })
  it('only attributes tagged first-party events to the campaign',()=>{
    const campaign=normaliseCampaign(initialPlatformData.campaigns[0])
    const crm={...initialData,analyticsEvents:[{id:'1',type:'page_view' as const,path:'/winter',title:'Winter',visitorId:'a',source:'search',campaign:campaign.id,occurredAt:'2026-09-22T10:00:00Z'},{id:'2',type:'form_submit' as const,path:'/winter',title:'Winter',visitorId:'a',source:'search',campaign:'another-campaign',occurredAt:'2026-09-22T10:05:00Z'}]}
    expect(campaignWebsiteResults(campaign,crm)).toEqual({visits:1,leads:0,referrals:0,bookings:0})
    expect(campaignWebsiteChannels(campaign,crm)).toEqual([{source:'search',visits:1,leads:0,referrals:0,bookings:0}])
    expect(campaignKpiActual('website_visits',campaign,crm)).toBe(1)
    expect(campaignKpiProgress(10,1)).toBe(10)
    expect(campaignKpiProgress(0,1)).toBe(0)
  })
})
