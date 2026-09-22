import type { BusinessEnquiry, BusinessEnquiryStage, PlatformData, VenueCapability } from './platformTypes'
import type { CRMData, Listing } from './types'

export const businessBuyerTypes=['Corporate','Agency','Association','Professional conference organiser','Event planner','Incentive planner','Venue finder'] as const
export const businessStages:BusinessEnquiryStage[]=['New','Qualifying','Venue matching','Shared with partners','Proposal','Decision pending','Won','Lost']

export function normaliseBusinessEnquiry(enquiry:BusinessEnquiry):BusinessEnquiry{
  const stage=enquiry.stage==='Matching venues'?'Venue matching':enquiry.stage==='Issued'?'Venue matching':enquiry.stage==='Responses received'?'Proposal':enquiry.stage
  return {...enquiry,stage,name:enquiry.name??enquiry.client,meetingRequirements:enquiry.meetingRequirements??enquiry.requirements,cateringRequirements:enquiry.cateringRequirements??'',accessibilityRequirements:enquiry.accessibilityRequirements??'',accommodationListingIds:enquiry.accommodationListingIds??[],distributions:enquiry.distributions??[],budgetKnown:enquiry.budgetKnown??enquiry.budget>0,notes:enquiry.notes??''}
}

export function validateBusinessEnquiry(enquiry:BusinessEnquiry,crm:CRMData):string|undefined{
  if(!enquiry.organisationId||!crm.organisations.some((item)=>item.id===enquiry.organisationId))return 'Link the enquiry to a shared CRM organisation.'
  if(enquiry.contactId&&crm.contacts.find((item)=>item.id===enquiry.contactId)?.organisationId!==enquiry.organisationId)return 'The buyer contact must belong to the selected organisation.'
  if(enquiry.distributions?.some((item)=>item.listingId&&crm.listings.find((listing)=>listing.id===item.listingId)?.organisationId!==item.organisationId))return 'A selected venue must belong to its partner organisation.'
  if(enquiry.eventStartDate&&enquiry.eventEndDate&&enquiry.eventEndDate<enquiry.eventStartDate)return 'The end date must follow the start date.'
  if(enquiry.stage==='Won'&&(!enquiry.winningVenueId||!enquiry.wonAt))return 'A won enquiry needs a winning venue and confirmation date.'
  if(enquiry.stage==='Won'&&!enquiry.distributions?.some((item)=>item.listingId===enquiry.winningVenueId&&item.sharedAt))return 'The winning venue must be a partner with a recorded share date.'
  if(enquiry.stage==='Lost'&&!enquiry.lostReason?.trim())return 'Record a reason before marking the enquiry lost.'
  if(['Shared with partners','Proposal','Decision pending','Won'].includes(enquiry.stage)&&!enquiry.distributions?.some((item)=>item.sharedAt))return 'Record a partner share date before advancing this enquiry.'
  if(['Proposal','Decision pending','Won'].includes(enquiry.stage)&&!enquiry.distributions?.some((item)=>item.response==='Proposal submitted'))return 'Record a partner proposal before advancing this enquiry.'
  return undefined
}

export function suitableBusinessVenues(enquiry:BusinessEnquiry,listings:Listing[],capabilities:VenueCapability[]){
  return listings.filter((listing)=>listing.status==='Published').flatMap((listing)=>{
    const capability=capabilities.find((item)=>item.listingId===listing.id)
    const designated=capability||[...listing.searchTags,...(listing.visitorTaxonomy??[])].some((tag)=>/business events|conference|meeting venue|mice/i.test(tag))
    if(!designated||capability&&enquiry.delegates>0&&capability.maxDelegates<enquiry.delegates)return []
    const score=(capability?3:1)+(enquiry.location&&listing.town.toLowerCase().includes(enquiry.location.toLowerCase())?1:0)+(capability&&enquiry.bedrooms>0&&capability.bedrooms>=enquiry.bedrooms?1:0)
    return [{listing,capability,score}]
  }).sort((a,b)=>b.score-a.score||a.listing.name.localeCompare(b.listing.name))
}

export function businessEventsReport(platform:PlatformData,crm:CRMData){
  const enquiries=platform.businessEnquiries.map(normaliseBusinessEnquiry)
  const confirmed=enquiries.filter((item)=>item.stage==='Won'&&item.wonAt&&item.winningVenueId&&item.distributions?.some((distribution)=>distribution.listingId===item.winningVenueId&&distribution.sharedAt))
  const shared=enquiries.filter((item)=>item.distributions?.some((distribution)=>distribution.sharedAt))
  const group=(field:'source'|'eventType')=>[...new Set(enquiries.map((item)=>item[field]).filter(Boolean))].map((name)=>({name,count:enquiries.filter((item)=>item[field]===name).length})).sort((a,b)=>b.count-a.count)
  const memberIds=new Set([...enquiries.flatMap((item)=>(item.distributions??[]).filter((distribution)=>distribution.sharedAt).map((distribution)=>distribution.organisationId)),...(platform.businessShowcases??[]).filter((item)=>item.endDate<=new Date().toISOString().slice(0,10)&&item.outcome.trim()).flatMap((item)=>item.organisationIds)])
  return {leads:enquiries.length,open:enquiries.filter((item)=>!['Won','Lost'].includes(item.stage)).length,pipeline:enquiries.filter((item)=>!['Won','Lost'].includes(item.stage)&&item.budgetKnown).reduce((sum,item)=>sum+item.budget,0),shared:shared.length,won:confirmed.length,confirmedEventValue:confirmed.reduce((sum,item)=>sum+(item.eventValue??0),0),confirmedDelegates:confirmed.reduce((sum,item)=>sum+item.delegates,0),confirmedDelegateNights:confirmed.reduce((sum,item)=>sum+(item.delegateNights??0),0),estimatedImpact:confirmed.reduce((sum,item)=>sum+(item.economicImpactEstimate??0),0),memberParticipation:[...memberIds].filter((id)=>crm.organisations.some((org)=>org.id===id)).length,bySource:group('source'),byType:group('eventType')}
}
