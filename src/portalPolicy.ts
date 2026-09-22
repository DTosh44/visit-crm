export type PortalRole='Member admin'|'Member editor'|'Member viewer'|'Billing contact'
export type PortalEntity='organisation'|'listing'|'event'|'contact'|'opportunity'
export interface PortalGrant { tenantId:string; organisationId:string; contactId:string; role:PortalRole; active:boolean }
export interface PortalTarget { tenantId:string; organisationId:string; entity:PortalEntity; id:string; contactId?:string; status?:string; eligibleTiers?:string[]; tier?:string }
export type PortalOperation='read'|'propose'|'save_event_draft'|'submit_event'|'manage_contact'|'set_primary'|'express_interest'|'apply'|'confirm'|'withdraw'

export function canPortalAccess(grant:PortalGrant|undefined,target:PortalTarget,operation:PortalOperation){
  if(!grant?.active||!grant.organisationId||grant.tenantId!==target.tenantId||grant.organisationId!==target.organisationId)return false
  if(operation==='read')return true
  if(grant.role==='Member viewer'||grant.role==='Billing contact')return false
  if(operation==='set_primary'||operation==='manage_contact')return grant.role==='Member admin'&&target.entity==='contact'
  if(operation==='propose')return ['organisation','listing'].includes(target.entity)
  if(operation==='save_event_draft'||operation==='submit_event')return target.entity==='event'&&(!target.status||['Draft','Rejected'].includes(target.status))
  if(['express_interest','apply','confirm','withdraw'].includes(operation)){
    if(target.entity!=='opportunity')return false
    if(['express_interest','apply'].includes(operation)&&Boolean(target.eligibleTiers?.length)&&!target.eligibleTiers?.includes(target.tier??''))return false
    if(['express_interest','apply'].includes(operation)&&target.status!=='Open')return false
    if(['confirm','withdraw'].includes(operation)&&!['Open','Closed','In progress'].includes(target.status??''))return false
    return operation!=='confirm'||grant.role==='Member admin'
  }
  return false
}

export const organisationProposalFields=['name','phone','email','address','town','website','socialLinks','description','accessibility','facilities','logoUrl','images'] as const
export const listingProposalFields=['name','category','shortDescription','description','image','media','facilities','accessibility','openingHours','bookingUrl','website','phone','email'] as const
export const eventProposalFields=['title','category','format','description','startDate','endDate','startTime','endTime','venueName','address','town','postcode','price','bookingUrl','contactName','contactEmail','image','accessibility','recurrence','recurrenceUntil'] as const
export function pickFields(source:Record<string,unknown>,allowed:readonly string[]){return Object.fromEntries(allowed.filter((key)=>Object.hasOwn(source,key)).map((key)=>[key,source[key]]))}
