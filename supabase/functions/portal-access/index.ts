import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { canPortalAccess, eventProposalFields, listingProposalFields, organisationProposalFields, pickFields, type PortalGrant, type PortalRole } from '../../../src/portalPolicy.ts'
import { canMoveApplication, normaliseOpportunity, opportunityCapacity, opportunityEligible } from '../../../src/opportunityModel.ts'

const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'}
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{...cors,'Content-Type':'application/json'}})
const url=Deno.env.get('SUPABASE_URL')!
const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const staffRoles=['Administrator','Membership manager']
const portalRoles:PortalRole[]=['Member admin','Member editor','Member viewer','Billing contact']
const now=()=>new Date().toISOString()
const text=(value:unknown,max=2000)=>String(value??'').trim().slice(0,max)
const urls=(value:unknown)=>Array.isArray(value)?value.filter((item)=>typeof item==='string'&&/^https:\/\//.test(item)).slice(0,20):[]
function cleanProposal(entity:string,input:Record<string,unknown>){
  const allowed=entity==='organisation'?organisationProposalFields:entity==='listing'?listingProposalFields:eventProposalFields
  const draft=pickFields(input,allowed)
  for(const [key,value] of Object.entries(draft)){
    if(['socialLinks','images','media','facilities'].includes(key))draft[key]=Array.isArray(value)?value.slice(0,30):[]
    else draft[key]=text(value,key==='description'?8000:2000)
    if(['website','bookingUrl','logoUrl'].includes(key)&&draft[key]&&!/^https:\/\//.test(String(draft[key])))throw new Error(`${key} must be an HTTPS URL`)
    if(key==='image'&&draft[key]&&!/^https:\/\//.test(String(draft[key]))&&!/^[a-z][a-z0-9-]{1,80}$/.test(String(draft[key])))throw new Error('Image must be an HTTPS URL or an existing image key')
  }
  if(entity==='organisation'){draft.socialLinks=urls(draft.socialLinks);draft.images=urls(draft.images)}
  return draft
}
function safeOrganisation(org:any){return pickFields(org,['id','name','type','town','address','website','email','phone','socialLinks','description','accessibility','facilities','logoUrl','images','tier','status','renewalDate','membershipStart','primaryContactId','colour'])}
function safeContact(contact:any){return pickFields(contact,['id','organisationId','name','jobTitle','email','phone','primary','portalAccess'])}
function safeListing(listing:any){return pickFields(listing,['id','organisationId','name','category','town','status','completeness','views','enquiries','shortDescription','description','website','bookingUrl','phone','email','openingHours','facilities','goodToKnow','image','media','accessibility','lastUpdated'])}
function safeEvent(event:any){return pickFields(event,['id','organisationId','title','category','format','description','startDate','endDate','startTime','endTime','venueName','address','town','postcode','price','bookingUrl','contactName','contactEmail','image','accessibility','status','moderationNote','lastUpdated'])}
function listingFromRow(row:any){return{id:row.id,organisationId:row.organisation_id,name:row.name,category:row.category,town:row.town,status:row.status,completeness:row.completeness,views:row.views,enquiries:row.enquiries,shortDescription:row.short_description,description:row.description,website:row.website,bookingUrl:row.booking_url,phone:row.phone,email:row.email,openingHours:row.opening_hours,facilities:row.facilities??[],goodToKnow:row.good_to_know??[],image:row.image,media:row.media??[],accessibility:row.accessibility??'',lastUpdated:String(row.updated_at).slice(0,10)}}
function eventFromRow(row:any){return{id:row.id,organisationId:row.organisation_id,title:row.title,category:row.category,format:row.format,description:row.description,startDate:row.start_date,endDate:row.end_date,startTime:row.start_time,endTime:row.end_time,venueName:row.venue_name,address:row.address,town:row.town,postcode:row.postcode,price:row.price,bookingUrl:row.booking_url,contactName:row.contact_name,contactEmail:row.contact_email,image:row.image,accessibility:row.accessibility,status:row.status,moderationNote:row.moderation_note,lastUpdated:String(row.updated_at).slice(0,10)}}
async function catalogueForOrganisation(tenantId:string,orgId:string){
  const [listings,drafts,events]=await Promise.all([
    admin.from('public_listings').select('*').eq('tenant_id',tenantId).eq('organisation_id',orgId),
    admin.from('listing_drafts').select('id,data').eq('tenant_id',tenantId),
    admin.from('events').select('*').eq('tenant_id',tenantId).eq('organisation_id',orgId),
  ])
  if(listings.error||drafts.error||events.error)throw new Error(listings.error?.message??drafts.error?.message??events.error?.message)
  const draftById=new Map((drafts.data??[]).map((row:any)=>[row.id,row.data]))
  return{listings:(listings.data??[]).map((row:any)=>listingFromRow(draftById.get(row.id)??row)),events:(events.data??[]).map(eventFromRow)}
}
async function audit(tenantId:string,userId:string,orgId:string,action:string,targetId?:string){await admin.from('audit_log').insert({tenant_id:tenantId,actor_id:userId,action:`portal.${action}`,entity_type:'organisation',entity_id:orgId,detail:{organisation_id:orgId,target_id:targetId??null}})}
async function workspaceFor(tenantId:string){const {data,error}=await admin.from('workspace_states').select('data').eq('tenant_id',tenantId).single();if(error||!data)throw new Error('Workspace data unavailable');return data.data as Record<string,any>}
async function saveWorkspace(tenantId:string,_userId:string,state:Record<string,any>){const {error}=await admin.from('workspace_states').update({data:state,updated_by:null,updated_at:now()}).eq('tenant_id',tenantId);if(error)throw error}
async function portalBundle(tenantId:string,grant:PortalGrant,state:Record<string,any>){
  const org=(state.organisations??[]).find((item:any)=>item.id===grant.organisationId)
  const contact=(state.contacts??[]).find((item:any)=>item.id===grant.contactId&&item.organisationId===grant.organisationId)
  if(!org||!contact||!contact.portalAccess)throw new Error('Portal access is no longer valid')
  const {data:platformRow}=await admin.from('platform_states').select('data').eq('tenant_id',tenantId).maybeSingle()
  const platform=platformRow?.data??{}
  const {data:requests}=await admin.from('portal_change_requests').select('id,entity_type,entity_id,proposed,status,review_note,created_at,updated_at').eq('tenant_id',tenantId).eq('organisation_id',org.id).order('created_at',{ascending:false})
  const opportunities=(platform.memberOpportunities??[]).map(normaliseOpportunity).filter((item:any)=>opportunityEligible(item,org,now().slice(0,10))||item.applications.some((entry:any)=>entry.organisationId===org.id)).map((item:any)=>({id:item.id,title:item.title,description:item.description,type:item.type,category:item.category,requirements:item.requirements,eligibilityCriteria:item.eligibilityCriteria,openingDate:item.openingDate,closingDate:item.closingDate,activityStartDate:item.activityStartDate,activityEndDate:item.activityEndDate,price:item.price,subsidisedValue:item.subsidisedValue,capacity:item.capacity,placesAvailable:opportunityCapacity(item).placesAvailable,status:item.status,links:item.links,applications:item.applications.filter((entry:any)=>entry.organisationId===org.id).map((entry:any)=>pickFields(entry,['id','contactId','response','status','amount','participated','outcome']))}))
  const level=(state.levels??[]).find((item:any)=>item.name===org.tier)
  const catalogue=await catalogueForOrganisation(tenantId,org.id)
  return {role:grant.role,contact:safeContact(contact),organisation:safeOrganisation(org),contacts:(state.contacts??[]).filter((item:any)=>item.organisationId===org.id).map(safeContact),listings:catalogue.listings.map(safeListing),events:catalogue.events.map(safeEvent),benefits:(level?.benefits??[]).map((id:string)=>{const benefit=(state.benefits??[]).find((item:any)=>item.id===id);const usage=(state.benefitUsage??[]).find((item:any)=>item.organisationId===org.id&&item.benefitId===id);return benefit?{id,name:benefit.name,kind:benefit.kind,category:benefit.category,allowance:benefit.allowance,used:usage?.used??0,note:usage?.note??'',dateUsed:usage?.updatedAt??''}:null}).filter(Boolean),opportunities,documents:(platform.resources??[]).filter((item:any)=>item.published&&/^https:\/\//.test(item.url??'')&&(!item.membershipLevels?.length||item.membershipLevels.includes(org.tier))).map((item:any)=>pickFields(item,['id','title','category','description','url','updatedAt'])),agreements:(state.agreements??[]).filter((item:any)=>item.organisationId===org.id).map((item:any)=>pickFields(item,['id','number','membershipLevel','status','validUntil'])),invoices:grant.role==='Billing contact'||grant.role==='Member admin'?(state.invoices??[]).filter((item:any)=>item.organisationId===org.id).map((item:any)=>pickFields(item,['id','number','description','dueDate','total','status'])):[],requests:requests??[],destination:{name:state.workspace?.destinationName??'',email:state.workspace?.contactEmail??'',logoUrl:state.workspace?.destinationLogoUrl??''}}
}

Deno.serve(async(request)=>{
  if(request.method==='OPTIONS')return new Response('ok',{headers:cors})
  if(request.method!=='POST')return json({error:'Method not allowed'},405)
  try{
    const auth=request.headers.get('Authorization')??''
    const caller=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:auth}}})
    const {data:{user}}=await caller.auth.getUser()
    if(!user)return json({error:'Unauthorised'},401)
    const body=await request.json().catch(()=>({})) as Record<string,any>
    const tenantId=text(body.tenantId,80),action=text(body.action,80)
    if(!tenantId||!action)return json({error:'Tenant and action are required'},400)
    if(action.startsWith('staff_')){
      const {data:profile}=await admin.from('profiles').select('role,active').eq('tenant_id',tenantId).eq('user_id',user.id).maybeSingle()
      if(!profile?.active||!staffRoles.includes(profile.role))return json({error:'Staff permission required'},403)
      const state=await workspaceFor(tenantId),orgId=text(body.organisationId,100)
      const org=(state.organisations??[]).find((item:any)=>item.id===orgId)
      if(!org)return json({error:'Organisation not found'},404)
      if(action==='staff_list'){
        const [{data:accounts},{data:requests}]=await Promise.all([admin.from('portal_organisation_access').select('user_id,contact_id,role,active,primary_account,created_at').eq('tenant_id',tenantId).eq('organisation_id',orgId),admin.from('portal_change_requests').select('*').eq('tenant_id',tenantId).eq('organisation_id',orgId).order('created_at',{ascending:false})])
        return json({accounts:accounts??[],requests:requests??[]})
      }
      if(action==='staff_invite'){
        const contact=(state.contacts??[]).find((item:any)=>item.id===body.contactId&&item.organisationId===orgId)
        if(!contact?.email)return json({error:'Choose a contact with an email in this organisation'},400)
        const role=body.role as PortalRole
        if(!portalRoles.includes(role))return json({error:'Invalid portal permission'},400)
        const redirectTo=Deno.env.get('PORTAL_BASE_URL')
        if(!redirectTo)return json({error:'PORTAL_BASE_URL is not configured'},503)
        const {data:invite,error}=await admin.auth.admin.inviteUserByEmail(contact.email,{data:{full_name:contact.name},redirectTo})
        if(error||!invite?.user)return json({error:error?.message??'Invitation failed'},400)
        if(body.primaryAccount)await admin.from('portal_organisation_access').update({primary_account:false}).eq('tenant_id',tenantId).eq('organisation_id',orgId)
        const {error:grantError}=await admin.from('portal_organisation_access').upsert({tenant_id:tenantId,user_id:invite.user.id,organisation_id:orgId,contact_id:contact.id,role,active:true,primary_account:Boolean(body.primaryAccount),updated_at:now()},{onConflict:'tenant_id,user_id,organisation_id'})
        if(grantError)throw grantError
        state.contacts=state.contacts.map((item:any)=>item.id===contact.id?{...item,portalAccess:true}:item)
        await saveWorkspace(tenantId,user.id,state)
        await audit(tenantId,user.id,orgId,'invite',contact.id)
        return json({ok:true,userId:invite.user.id})
      }
      if(action==='staff_remove'||action==='staff_role'||action==='staff_activate'){
        const {data:account}=await admin.from('portal_organisation_access').select('user_id,contact_id').eq('tenant_id',tenantId).eq('organisation_id',orgId).eq('user_id',body.userId).maybeSingle()
        if(!account)return json({error:'Portal account not found'},404)
        if(action==='staff_role'&&!portalRoles.includes(body.role))return json({error:'Invalid portal permission'},400)
        if(action==='staff_role'&&body.primaryAccount)await admin.from('portal_organisation_access').update({primary_account:false}).eq('tenant_id',tenantId).eq('organisation_id',orgId)
        const changes=action==='staff_remove'?{active:false,primary_account:false,updated_at:now()}:action==='staff_activate'?{active:true,updated_at:now()}:{role:body.role,primary_account:Boolean(body.primaryAccount),updated_at:now()}
        const {error}=await admin.from('portal_organisation_access').update(changes).eq('tenant_id',tenantId).eq('organisation_id',orgId).eq('user_id',body.userId)
        if(error)throw error
        if(action==='staff_remove'||action==='staff_activate'){state.contacts=state.contacts.map((item:any)=>item.id===account.contact_id?{...item,portalAccess:action==='staff_activate'}:item);await saveWorkspace(tenantId,user.id,state)}
        await audit(tenantId,user.id,orgId,action,account.contact_id)
        return json({ok:true})
      }
      if(action==='staff_review'){
        const {data:item}=await admin.from('portal_change_requests').select('*').eq('tenant_id',tenantId).eq('organisation_id',orgId).eq('id',body.requestId).eq('status','Submitted').maybeSingle()
        if(!item)return json({error:'Submitted request not found'},404)
        const decision=body.decision==='approve'?'Approved':body.decision==='reject'?'Rejected':''
        if(!decision)return json({error:'Invalid review decision'},400)
        if(decision==='Approved'){
          if(item.entity_type==='organisation'){state.organisations=state.organisations.map((entry:any)=>entry.id===orgId?{...entry,...cleanProposal('organisation',item.proposed)}:entry)}
          if(item.entity_type==='listing'){
            const {data:listing,error:listingError}=await admin.from('public_listings').select('*').eq('tenant_id',tenantId).eq('id',item.entity_id).eq('organisation_id',orgId).maybeSingle()
            if(listingError)throw listingError
            if(!listing)return json({error:'Listing no longer belongs to this organisation'},409)
            const {data:draftRow,error:draftError}=await admin.from('listing_drafts').select('data').eq('tenant_id',tenantId).eq('id',listing.id).maybeSingle()
            if(draftError)throw draftError
            const proposal=cleanProposal('listing',item.proposed)
            const fieldNames:Record<string,string>={shortDescription:'short_description',bookingUrl:'booking_url',openingHours:'opening_hours',goodToKnow:'good_to_know'}
            const changes=Object.fromEntries(Object.entries(proposal).map(([key,value])=>[fieldNames[key]??key,value]))
            const updated={...(draftRow?.data??listing),...changes,status:'In review',updated_at:now()}
            const {error:saveError}=await admin.from('listing_drafts').upsert({tenant_id:tenantId,id:listing.id,data:updated,updated_by:user.id,updated_at:now()},{onConflict:'tenant_id,id'})
            if(saveError)throw saveError
          }
          if(item.entity_type==='event'){
            const proposed=cleanProposal('event',item.proposed)
            const event={...proposed,id:item.entity_id??`event-${crypto.randomUUID()}`,organisationId:orgId,status:'In review',submittedBy:'Member portal',lastUpdated:now().slice(0,10)}
            if(!event.title||!event.description||!event.startDate||!event.endDate||!event.startTime||!event.endTime||!event.venueName||!event.address||!event.town||!event.contactName||!event.contactEmail)return json({error:'The event submission is incomplete'},400)
            const {error:eventError}=await admin.from('events').upsert({id:event.id,tenant_id:tenantId,organisation_id:orgId,submitted_by:item.actor_id,submitted_by_label:'Member portal',title:event.title,category:event.category||'Other',format:event.format||'One-off and short run',description:event.description,start_date:event.startDate,end_date:event.endDate,start_time:event.startTime,end_time:event.endTime,venue_name:event.venueName,address:event.address,town:event.town,postcode:event.postcode||'',price:event.price||'Free',booking_url:event.bookingUrl||'',contact_name:event.contactName,contact_email:event.contactEmail,image:event.image||'theatre',accessibility:event.accessibility||'',recurrence:event.recurrence||'None',recurrence_until:event.recurrenceUntil||null,status:'In review',updated_at:now()},{onConflict:'id'})
            if(eventError)throw eventError
          }
          if(item.entity_type==='organisation')await saveWorkspace(tenantId,user.id,state)
        }
        const {error}=await admin.from('portal_change_requests').update({status:decision,review_note:text(body.note,2000),reviewed_by:user.id,reviewed_at:now(),updated_at:now()}).eq('tenant_id',tenantId).eq('organisation_id',orgId).eq('id',item.id)
        if(error)throw error
        await audit(tenantId,user.id,orgId,decision.toLowerCase(),item.entity_id??item.id)
        return json({ok:true})
      }
      return json({error:'Unknown staff action'},400)
    }
    const {data:access}=await admin.from('portal_organisation_access').select('*').eq('tenant_id',tenantId).eq('user_id',user.id).eq('active',true).maybeSingle()
    if(!access)return json({error:'A destination team invitation is required'},403)
    const grant:PortalGrant={tenantId:access.tenant_id,organisationId:access.organisation_id,contactId:access.contact_id,role:access.role,active:access.active}
    const state=await workspaceFor(tenantId)
    const org=(state.organisations??[]).find((item:any)=>item.id===grant.organisationId)
    const contact=(state.contacts??[]).find((item:any)=>item.id===grant.contactId&&item.organisationId===grant.organisationId)
    if(!org||!contact?.portalAccess)return json({error:'Portal access is no longer valid'},403)
    if(action==='read')return json(await portalBundle(tenantId,grant,state))
    const catalogue=await catalogueForOrganisation(tenantId,org.id)
    const targetId=text(body.id,100),changes=body.changes??{}
    const deny=()=>json({error:'This action is not permitted for your organisation'},403)
    if(action==='sign_upload'){
      const entity=body.entity==='listing'?'listing':'organisation'
      const listing=entity==='listing'?catalogue.listings.find((item:any)=>item.id===targetId):null
      if(entity==='listing'&&!listing)return deny()
      if(!canPortalAccess(grant,{tenantId,organisationId:listing?.organisationId??org.id,entity,id:targetId},'propose'))return deny()
      const mime=text(body.mime,50),extension=mime==='image/png'?'png':mime==='image/webp'?'webp':mime==='image/jpeg'?'jpg':''
      if(!extension||Number(body.size)>10_485_760||Number(body.size)<1)return json({error:'Choose a JPEG, PNG or WebP image up to 10 MB'},400)
      const path=`${tenantId}/${org.id}/portal/${crypto.randomUUID()}.${extension}`
      const {data:signed,error}=await admin.storage.from('listing-media').createSignedUploadUrl(path)
      if(error||!signed)return json({error:error?.message??'Upload could not be prepared'},400)
      const publicUrl=admin.storage.from('listing-media').getPublicUrl(path).data.publicUrl
      return json({path,token:signed.token,publicUrl})
    }
    if(action==='propose_organisation'||action==='propose_listing'||action==='save_event_draft'){
      const entity=action==='propose_organisation'?'organisation':action==='propose_listing'?'listing':'event'
      const existing=entity==='listing'?catalogue.listings.find((item:any)=>item.id===targetId):entity==='event'?catalogue.events.find((item:any)=>item.id===targetId):org
      const targetOrg=existing?.organisationId??org.id
      if(entity==='listing'&&!existing)return deny()
      if(!canPortalAccess(grant,{tenantId,organisationId:targetOrg,entity,id:targetId,status:existing?.status},entity==='event'?'save_event_draft':'propose'))return deny()
      const proposed=cleanProposal(entity,changes)
      if(!Object.keys(proposed).length)return json({error:'No changes were supplied'},400)
      const status=entity==='event'&&body.draft===true?'Draft':'Submitted'
      const {data:created,error}=await admin.from('portal_change_requests').insert({tenant_id:tenantId,organisation_id:org.id,contact_id:grant.contactId,actor_id:user.id,entity_type:entity,entity_id:entity==='organisation'?org.id:entity==='listing'?targetId:null,proposed,status}).select('id').single()
      if(error)throw error
      await audit(tenantId,user.id,org.id,status==='Draft'?'save_draft':'submit_request',created.id)
    }else if(action==='submit_event'){
      const {data:item}=await admin.from('portal_change_requests').select('*').eq('tenant_id',tenantId).eq('organisation_id',org.id).eq('id',targetId).eq('entity_type','event').eq('status','Draft').maybeSingle()
      if(!item||!canPortalAccess(grant,{tenantId,organisationId:item.organisation_id,entity:'event',id:targetId,status:item.status},'submit_event'))return deny()
      await admin.from('portal_change_requests').update({status:'Submitted',updated_at:now()}).eq('id',item.id).eq('tenant_id',tenantId).eq('organisation_id',org.id)
      await audit(tenantId,user.id,org.id,'submit_event',item.id)
    }else if(action==='create_contact'||action==='update_contact'||action==='set_primary'){
      const existing=(state.contacts??[]).find((item:any)=>item.id===targetId)
      if(action!=='create_contact'&&!existing)return deny()
      if(!canPortalAccess(grant,{tenantId,organisationId:existing?.organisationId??org.id,entity:'contact',id:targetId},action==='set_primary'?'set_primary':'manage_contact'))return deny()
      if(action==='create_contact'){
        if(!text(changes.name,150)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(changes.email,250)))return json({error:'Name and valid email are required'},400)
        state.contacts=[...state.contacts,{id:`contact-${crypto.randomUUID()}`,organisationId:org.id,name:text(changes.name,150),jobTitle:text(changes.jobTitle,150),email:text(changes.email,250),phone:text(changes.phone,60),roles:['General'],tags:[],primary:false,portalAccess:false}]
      }else if(action==='set_primary'){
        state.contacts=state.contacts.map((item:any)=>item.organisationId===org.id?{...item,primary:item.id===targetId}:item)
        state.organisations=state.organisations.map((item:any)=>item.id===org.id?{...item,primaryContactId:targetId}:item)
      }else state.contacts=state.contacts.map((item:any)=>item.id===targetId?{...item,name:text(changes.name??item.name,150),jobTitle:text(changes.jobTitle??item.jobTitle,150),phone:text(changes.phone??item.phone,60)}:item)
      await saveWorkspace(tenantId,user.id,state)
      await audit(tenantId,user.id,org.id,action,targetId)
    }else if(['express_interest','apply','confirm','withdraw'].includes(action)){
      const {data:platformRow,error}=await admin.from('platform_states').select('data,version,updated_at').eq('tenant_id',tenantId).single()
      if(error)throw error
      const platform=platformRow.data,raw=(platform.memberOpportunities??[]).find((item:any)=>item.id===targetId)
      if(!raw)return deny()
      const opportunity=normaliseOpportunity(raw)
      if(!canPortalAccess(grant,{tenantId,organisationId:org.id,entity:'opportunity',id:targetId,status:opportunity.status,eligibleTiers:opportunity.eligibleLevels,tier:org.tier},action as 'express_interest'|'apply'|'confirm'|'withdraw'))return deny()
      if(['express_interest','apply'].includes(action)&&!opportunityEligible(opportunity,org,now().slice(0,10)))return deny()
      const current=(opportunity.applications??[]).find((item:any)=>item.organisationId===org.id)
      const nextStatus=action==='express_interest'?'Interested':action==='apply'?'Applied':action==='confirm'?'Confirmed':'Withdrawn'
      if(!canMoveApplication(opportunity,current,nextStatus))return json({error:'This application cannot make that transition or the opportunity is full'},409)
      const response=text(changes.response,2000)
      if(action==='apply'&&!response)return json({error:'Tell us how you would like to participate'},400)
      const application=current?{...current,status:nextStatus,response:response||current.response,updatedAt:now()}:{id:`application-${crypto.randomUUID()}`,organisationId:org.id,contactId:grant.contactId,response,status:nextStatus,notes:'',amount:opportunity.price??0,createdAt:now(),updatedAt:now()}
      platform.memberOpportunities=platform.memberOpportunities.map((item:any)=>item.id===targetId?{...item,applications:[...(item.applications??[]).filter((entry:any)=>entry.organisationId!==org.id),application]}:item)
      const {data:saved,error:saveError}=await admin.from('platform_states').update({data:platform,version:platformRow.version+1,updated_by:null,updated_at:now()}).eq('tenant_id',tenantId).eq('version',platformRow.version).eq('updated_at',platformRow.updated_at).select('tenant_id')
      if(saveError)throw saveError
      if(!saved?.length)return json({error:'The opportunity changed while you were responding. Refresh and try again.'},409)
      await audit(tenantId,user.id,org.id,action,targetId)
    }else return deny()
    return json(await portalBundle(tenantId,grant,state))
  }catch(error){return json({error:error instanceof Error?error.message:'Portal request failed'},400)}
})
