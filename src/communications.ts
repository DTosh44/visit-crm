import type { CRMData, Contact, Organisation } from './types'
import type { CommunicationAudience, CommunicationPreference, CommunicationRecord, CommunicationRecipient, CommunicationType, PlatformData } from './platformTypes'

export const communicationTypes:CommunicationType[]=['Email campaign','Individual email','Member update','Newsletter','Renewal','Event / opportunity']
export const marketingTypes:CommunicationType[]=['Email campaign','Newsletter','Event / opportunity']
export const emptyAudience:CommunicationAudience={mode:'all',filters:[],organisationIds:[],contactIds:[]}
export const audienceFields=[['member','Member / non-member'],['tier','Membership tier'],['membershipStatus','Membership status'],['organisationType','Organisation type'],['geography','Geography'],['tag','Tag'],['role','Contact role'],['preference','Contact preference'],['pipelineStage','Pipeline stage'],['risk','Satisfaction / risk'],['event','Event / opportunity involvement']] as const

export function preferenceFor(contactId:string,preferences:CommunicationPreference[]){return preferences.find((item)=>item.contactId===contactId)}
export function allowedFor(contact:Contact,type:CommunicationType,preferences:CommunicationPreference[]){
  const preference=preferenceFor(contact.id,preferences)
  if(preference?.unsubscribed)return false
  if(marketingTypes.includes(type))return Boolean(preference?.marketing)
  return preference?.service!==false
}
function matches(contact:Contact,org:Organisation|undefined,field:string,value:string,crm:CRMData,platform:PlatformData,preferences:CommunicationPreference[]){
  const pref=preferenceFor(contact.id,preferences)
  const test=value.toLowerCase()
  switch(field){
    case 'member':return value==='Member'?Boolean(org&&org.status!=='Non-member'&&org.status!=='Prospect'):!org||['Non-member','Prospect'].includes(org.status)
    case 'tier':return org?.tier===value
    case 'membershipStatus':return org?.status===value
    case 'organisationType':return org?.type===value
    case 'geography':return Boolean(org&&[org.town,org.address].join(' ').toLowerCase().includes(test))
    case 'tag':return [...(contact.tags??[]),...(org?.tags??[])].some((item)=>item.toLowerCase()===test)
    case 'role':return contact.roles.some((item)=>item.toLowerCase()===test)
    case 'preference':return Boolean(pref?.[value as keyof CommunicationPreference])
    case 'pipelineStage':return crm.opportunities.some((item)=>item.stage===value&&(item.organisationName===org?.name||item.contactName===contact.name))
    case 'risk':return org?.health===value
    case 'event':return platform.memberOpportunities.some((item)=>item.id===value&&item.applications.some((app)=>app.contactId===contact.id||app.organisationId===org?.id))||crm.events.some((item)=>item.id===value&&item.organisationId===org?.id)
    default:return false
  }
}
export function resolveAudience(audience:CommunicationAudience,type:CommunicationType,crm:CRMData,platform:PlatformData):CommunicationRecipient[]{
  const seen=new Set<string>()
  return crm.contacts.filter((contact)=>{
    const org=crm.organisations.find((item)=>item.id===contact.organisationId)
    const selected=audience.contactIds.includes(contact.id)||Boolean(org&&audience.organisationIds.includes(org.id))
    if(audience.mode==='selected'&&!selected)return false
    if(!audience.filters.every((filter)=>matches(contact,org,filter.field,filter.value,crm,platform,platform.communicationPreferences)))return false
    if(!allowedFor(contact,type,platform.communicationPreferences))return false
    const email=(preferenceFor(contact.id,platform.communicationPreferences)?.preferredEmail||contact.email).trim().toLowerCase()
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||seen.has(email))return false
    seen.add(email)
    return true
  }).map((contact)=>({contactId:contact.id,organisationId:contact.organisationId||undefined,email:(preferenceFor(contact.id,platform.communicationPreferences)?.preferredEmail||contact.email).trim(),status:'Queued' as const,opens:0,clicks:0}))
}
export function deliveryTotals(record:CommunicationRecord){const rows=record.recipients??[];return{delivered:rows.filter((item)=>item.status==='Delivered').length,bounced:rows.filter((item)=>item.status==='Bounced').length,opens:rows.reduce((n,item)=>n+item.opens,0),clicks:rows.reduce((n,item)=>n+item.clicks,0),failed:rows.filter((item)=>item.status==='Failed').length,unsubscribed:rows.filter((item)=>item.unsubscribedAt).length}}
export function escapeHtml(value:string){return value.replace(/[&<>"']/g,(character)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]??character))}
export function renderCommunication(record:Pick<CommunicationRecord,'body'|'ctaLabel'|'ctaUrl'>,contact:Contact,org?:Organisation){
  const replacements:Record<string,string>={first_name:contact.name.split(' ')[0],organisation_name:org?.name??'',membership_level:org?.tier??'',renewal_date:org?.renewalDate??''}
  const merge=(value:string)=>value.replace(/{{\s*(first_name|organisation_name|membership_level|renewal_date)\s*}}/g,(_,key:string)=>replacements[key])
  const inline=(value:string)=>escapeHtml(value).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>')
  const paragraphs=merge(record.body).split(/\n\s*\n/).map((block)=>{
    const lines=block.split('\n')
    if(lines.every((line)=>line.startsWith('- ')))return `<ul>${lines.map((line)=>`<li>${inline(line.slice(2))}</li>`).join('')}</ul>`
    if(lines.length===1&&lines[0].startsWith('# '))return `<h2>${inline(lines[0].slice(2))}</h2>`
    return `<p>${lines.map(inline).join('<br>')}</p>`
  }).join('')
  const url=record.ctaUrl?.trim()
  const safeUrl=url&&/^https:\/\/[^\s]+$/i.test(url)?escapeHtml(url):''
  return `${paragraphs}${record.ctaLabel&&safeUrl?`<p><a href="${safeUrl}" style="display:inline-block;padding:12px 18px;background:#6d294f;color:#fff;text-decoration:none;border-radius:6px">${escapeHtml(merge(record.ctaLabel))}</a></p>`:''}`
}
