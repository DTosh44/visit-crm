import { describe, expect, it } from 'vitest'
import { businessEventsReport, normaliseBusinessEnquiry, suitableBusinessVenues, validateBusinessEnquiry } from './businessEventsModel'
import { initialData } from './data'
import { initialPlatformData } from './platformData'
import type { BusinessEnquiry } from './platformTypes'

const enquiry=():BusinessEnquiry=>({id:'mice-test',name:'Annual summit',organisationId:'org-001',contactId:'con-001',client:'Annual summit',organisation:'',contact:'',eventType:'Conference',eventStartDate:'2027-05-10',eventEndDate:'2027-05-12',preferredDates:'2027-05-10',delegates:140,bedrooms:70,roomNights:140,requirements:'Plenary and breakouts',budget:50000,budgetKnown:true,location:'',source:'Website',economicValue:0,stage:'New',owner:'Alex',nextAction:'Qualify',invitedVenueIds:[],distributions:[],responses:[]})

describe('business events records',()=>{
  it('migrates legacy stages without inventing a documented partner share',()=>{
    const legacy={...enquiry(),stage:'Issued' as const}
    expect(normaliseBusinessEnquiry(legacy).stage).toBe('Venue matching')
    expect(normaliseBusinessEnquiry(legacy).distributions).toEqual([])
  })
  it('checks CRM ownership links and requires evidence for win/loss',()=>{
    expect(validateBusinessEnquiry({...enquiry(),contactId:'con-003'},initialData)).toMatch(/contact must belong/)
    expect(validateBusinessEnquiry({...enquiry(),stage:'Won'},initialData)).toMatch(/winning venue/)
    expect(validateBusinessEnquiry({...enquiry(),stage:'Lost'},initialData)).toMatch(/reason/)
    expect(validateBusinessEnquiry({...enquiry(),stage:'Shared with partners'},initialData)).toMatch(/share date/)
    expect(validateBusinessEnquiry({...enquiry(),stage:'Proposal',distributions:[{organisationId:'org-003',listingId:'list-004',sharedAt:'2026-09-22',response:'Awaiting',availability:'',proposalStatus:'',notes:''}]},initialData)).toMatch(/proposal/)
  })
  it('matches only published designated venues within recorded capacity',()=>{
    const matches=suitableBusinessVenues(enquiry(),initialData.listings,initialPlatformData.venueCapabilities)
    expect(matches.some((item)=>item.listing.id==='list-004')).toBe(true)
    expect(suitableBusinessVenues({...enquiry(),delegates:500},initialData.listings,initialPlatformData.venueCapabilities).some((item)=>item.listing.id==='list-004')).toBe(false)
  })
  it('separates known pipeline, confirmed value, estimates and evidenced participation',()=>{
    const shared={...enquiry(),stage:'Shared with partners' as const,distributions:[{organisationId:'org-003',listingId:'list-004',sharedAt:'2026-09-22',response:'Awaiting' as const,availability:'',proposalStatus:'',notes:''}]}
    const unconfirmed={...enquiry(),id:'unconfirmed',stage:'Won' as const,eventValue:90000,economicImpactEstimate:150000}
    const won={...shared,id:'won',stage:'Won' as const,winningVenueId:'list-004',wonAt:'2026-09-23',eventValue:80000,economicImpactEstimate:120000,delegateNights:180}
    const report=businessEventsReport({...initialPlatformData,businessEnquiries:[shared,unconfirmed,won]},initialData)
    expect(report).toMatchObject({leads:3,open:1,pipeline:50000,shared:2,won:1,confirmedEventValue:80000,estimatedImpact:120000,confirmedDelegateNights:180})
  })
})
