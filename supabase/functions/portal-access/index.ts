import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'}
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}})
const safeOrganisation=(org:any)=>({id:org.id,name:org.name,type:org.type,town:org.town,address:org.address,website:org.website,tier:org.tier,status:org.status,health:'OK',owner:'Destination team',primaryContactId:org.primaryContactId,renewalDate:org.renewalDate,membershipStart:org.membershipStart,annualValue:org.annualValue,listings:org.listings,lastActivity:'',nextAction:'',nextActionDate:'',tags:org.tags??[],notes:'',colour:org.colour})

Deno.serve(async(request)=>{
  if(request.method==='OPTIONS')return new Response('ok',{headers:cors})
  try{
    const auth=request.headers.get('Authorization')??''
    const userClient=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:auth}}})
    const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const {data:{user}}=await userClient.auth.getUser();if(!user?.email)return json({error:'Unauthorised'},401)
    const body=await request.json().catch(()=>({}));const action=String(body.action??'read')
    let {data:access}=await admin.from('portal_organisation_access').select('*').eq('user_id',user.id).eq('active',true).limit(1).maybeSingle()
    if(!access){
      const {data:states}=await admin.from('workspace_states').select('tenant_id,data')
      const matched=states?.map((row:any)=>({row,contact:(row.data?.contacts??[]).find((item:any)=>item.portalAccess&&String(item.email).toLowerCase()===user.email!.toLowerCase())})).find((item:any)=>item.contact)
      if(!matched)return json({error:'This account is not linked to a portal-enabled organisation.'},403)
      access={tenant_id:matched.row.tenant_id,user_id:user.id,organisation_id:matched.contact.organisationId,contact_id:matched.contact.id,role:'Member editor',active:true}
      await admin.from('portal_organisation_access').upsert(access)
    }
    const {data:workspace,error}=await admin.from('workspace_states').select('data').eq('tenant_id',access.tenant_id).single();if(error||!workspace)return json({error:'Workspace data unavailable'},404)
    const state=workspace.data;const org=(state.organisations??[]).find((item:any)=>item.id===access.organisation_id);if(!org)return json({error:'Organisation unavailable'},404)
    const {data:platformRow}=await admin.from('platform_states').select('data').eq('tenant_id',access.tenant_id).maybeSingle();const platformState=platformRow?.data??{}
    const contacts=(state.contacts??[]).filter((item:any)=>item.organisationId===org.id).map((item:any)=>({...item,portalAccess:Boolean(item.portalAccess)}))
    const listings=(state.listings??[]).filter((item:any)=>item.organisationId===org.id)
    const events=(state.events??[]).filter((item:any)=>item.organisationId===org.id)
    const invoices=(state.invoices??[]).filter((item:any)=>item.organisationId===org.id)
    const agreements=(state.agreements??[]).filter((item:any)=>item.organisationId===org.id)
    const benefitUsage=(state.benefitUsage??[]).filter((item:any)=>item.organisationId===org.id)
    const deny=()=>json({error:'Operation not permitted'},403)
    if(action!=='read'){
      if(access.role==='Member viewer')return deny()
      const id=String(body.id??'');const changes=body.changes??{}
      if(action==='update_organisation'){const allowed=['name','address','town','website'];const next=Object.fromEntries(allowed.filter((key)=>key in changes).map((key)=>[key,changes[key]]));state.organisations=state.organisations.map((item:any)=>item.id===org.id?{...item,...next}:item)}
      else if(action==='update_contact'){if(!contacts.some((item:any)=>item.id===id))return deny();const allowed=['name','jobTitle','email','phone','primary'];const next=Object.fromEntries(allowed.filter((key)=>key in changes).map((key)=>[key,changes[key]]));state.contacts=state.contacts.map((item:any)=>item.id===id?{...item,...next}:item)}
      else if(action==='create_contact'){state.contacts=[...state.contacts,{...changes,id:`contact-${crypto.randomUUID()}`,organisationId:org.id,portalAccess:false,roles:['General'],tags:[],primary:false}]}
      else if(action==='update_listing'){if(!listings.some((item:any)=>item.id===id))return deny();const allowed=['name','shortDescription','description','website','bookingUrl','phone','email','openingHours','facilities','goodToKnow','image','media'];const next=Object.fromEntries(allowed.filter((key)=>key in changes).map((key)=>[key,changes[key]]));state.listings=state.listings.map((item:any)=>item.id===id?{...item,...next,status:'In review',lastUpdated:new Date().toISOString().slice(0,10)}:item)}
      else if(action==='create_event'){state.events=[...state.events,{...changes,id:`event-${crypto.randomUUID()}`,organisationId:org.id,status:'In review',submittedBy:'Member portal',lastUpdated:new Date().toISOString().slice(0,10)}]}
      else if(action==='update_event'){if(!events.some((item:any)=>item.id===id))return deny();const allowed=['title','description','startDate','endDate','startTime','endTime','venueName','address','town','postcode','price','bookingUrl','contactName','contactEmail','accessibility','status'];const next=Object.fromEntries(allowed.filter((key)=>key in changes).map((key)=>[key,changes[key]]));state.events=state.events.map((item:any)=>item.id===id?{...item,...next,lastUpdated:new Date().toISOString().slice(0,10)}:item)}
      else if(action==='apply_opportunity'){const opportunity=(platformState.memberOpportunities??[]).find((item:any)=>item.id===id);if(!opportunity||opportunity.status!=='Open'||!opportunity.eligibleLevels?.includes(org.tier)||opportunity.applications?.some((item:any)=>item.organisationId===org.id))return deny();const response=String(changes.response??'').trim();if(!response)return json({error:'A participation response is required'},400);platformState.memberOpportunities=platformState.memberOpportunities.map((item:any)=>item.id===id?{...item,applications:[...(item.applications??[]),{id:`application-${crypto.randomUUID()}`,organisationId:org.id,contactId:access.contact_id,response,notes:'',status:'Applied',amount:item.price??0}]}:item);await admin.from('platform_states').upsert({tenant_id:access.tenant_id,data:platformState,updated_by:user.id,updated_at:new Date().toISOString()},{onConflict:'tenant_id'})}
      else return deny()
      await admin.from('workspace_states').update({data:state,updated_by:user.id,updated_at:new Date().toISOString()}).eq('tenant_id',access.tenant_id)
      await admin.from('audit_log').insert({tenant_id:access.tenant_id,actor_id:user.id,action:`portal.${action}`,entity_type:action.split('_').slice(1).join('_'),entity_id:id||org.id,detail:{organisation_id:org.id}})
    }
    const currentContact=contacts.find((item:any)=>item.id===access.contact_id)??contacts.find((item:any)=>String(item.email).toLowerCase()===user.email!.toLowerCase())
    const portalPlatform={resources:(platformState.resources??[]).filter((item:any)=>item.published&&(!item.membershipLevels?.length||item.membershipLevels.includes(org.tier))),campaigns:(platformState.campaigns??[]).filter((item:any)=>item.organisationIds?.includes(org.id)).map((item:any)=>({id:item.id,name:item.name,status:item.status,organisationIds:[org.id]})),memberValue:(platformState.memberValue??[]).filter((item:any)=>item.organisationId===org.id),memberOpportunities:(platformState.memberOpportunities??[]).filter((item:any)=>item.status==='Open'&&item.eligibleLevels?.includes(org.tier)).map((item:any)=>({...item,applications:(item.applications??[]).filter((application:any)=>application.organisationId===org.id)}))}
    return json({contact:currentContact,organisation:safeOrganisation(org),data:{contacts,listings,events,invoices,agreements,benefitUsage,levels:state.levels??[],benefits:state.benefits??[],analyticsEvents:state.analyticsEvents??[],workspace:{destinationName:state.workspace?.destinationName,contactEmail:state.workspace?.contactEmail,currency:state.workspace?.currency}},platform:portalPlatform})
  }catch(error){return json({error:error instanceof Error?error.message:'Portal request failed'},400)}
})
