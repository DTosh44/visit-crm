import type { MemberOpportunity, OpportunityApplication, OpportunityApplicationStatus } from './platformTypes'

export const opportunityTypes=['Marketing campaign','Social media promotion','Newsletter feature','Press opportunity','Influencer opportunity','Travel trade activity','Trade show','Familiarisation visit','Business event lead','Training','Networking event','Research participation','Advertising','Paid co-op campaign'] as const
export const opportunityStatuses=['Draft','Open','Closed','In progress','Completed','Cancelled'] as const
export interface OpportunityOrganisation {id:string;tier:string;town:string;type:string;status:string}

export function normaliseOpportunity(item:MemberOpportunity):MemberOpportunity{return {...item,type:item.type??item.category,owner:item.owner??'Workspace team',eligibleGeographies:item.eligibleGeographies??[],eligibleCategories:item.eligibleCategories??[],eligibilityCriteria:item.eligibilityCriteria??'',requiresMembership:item.requiresMembership??true,invitationOnly:item.invitationOnly??false,invitedOrganisationIds:item.invitedOrganisationIds??[],subsidisedValue:item.subsidisedValue??0,openingDate:item.openingDate??'',activityStartDate:item.activityStartDate??'',activityEndDate:item.activityEndDate??'',links:item.links??[],applications:(item.applications??[]).map((application)=>({...application,participated:application.participated??false,outcome:application.outcome??'',valueDelivered:application.valueDelivered??0}))}}
export function opportunityCapacity(item:MemberOpportunity){
  const confirmed=item.applications.filter((entry)=>entry.status==='Confirmed').length
  const approved=item.applications.filter((entry)=>entry.status==='Approved').length
  const pending=item.applications.filter((entry)=>['Invited','Interested','Applied','Information requested'].includes(entry.status)).length
  const waitlisted=item.applications.filter((entry)=>entry.status==='Waitlisted').length
  return {capacity:item.capacity,confirmed,approved,pending,waitlisted,placesAvailable:item.capacity>0?Math.max(0,item.capacity-confirmed-approved):null}
}
export function opportunityEligible(item:MemberOpportunity,org:OpportunityOrganisation,now:string){
  if(item.status!=='Open'||item.openingDate&&item.openingDate>now||item.closingDate&&item.closingDate<now)return false
  if(item.requiresMembership!==false&&['Non-member','Prospect','Lapsed'].includes(org.status))return false
  if(item.eligibleLevels.length&&!item.eligibleLevels.includes(org.tier))return false
  if(item.eligibleGeographies?.length&&!item.eligibleGeographies.some((place)=>org.town.toLowerCase()===place.toLowerCase()))return false
  if(item.eligibleCategories?.length&&!item.eligibleCategories.some((category)=>org.type.toLowerCase()===category.toLowerCase()))return false
  if(item.invitationOnly&&!item.invitedOrganisationIds?.includes(org.id))return false
  return true
}
export function canMoveApplication(item:MemberOpportunity,application:OpportunityApplication|undefined,next:OpportunityApplicationStatus){
  const status=application?.status
  const seats=opportunityCapacity(item).placesAvailable
  if(next==='Confirmed')return status==='Approved'
  if(next==='Approved')return Boolean(status&&['Applied','Interested','Waitlisted','Information requested'].includes(status)&&seats!==0)
  if(next==='Withdrawn')return Boolean(!application?.participated&&status&&['Invited','Interested','Applied','Approved','Confirmed','Waitlisted','Information requested'].includes(status))
  if(next==='Applied')return !status||['Invited','Interested','Information requested','Withdrawn'].includes(status)
  if(next==='Interested')return !status||['Invited','Withdrawn'].includes(status)
  if(next==='Waitlisted')return Boolean(status&&['Applied','Interested','Approved'].includes(status))
  if(next==='Rejected')return Boolean(status&&['Applied','Interested','Waitlisted','Information requested'].includes(status))
  if(next==='Information requested')return Boolean(status&&['Applied','Interested'].includes(status))
  return false
}
