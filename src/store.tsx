/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { initialData } from './data'
import { supabase, useAuth } from './auth'
import { tenant } from './tenant'
import { visitorTaxonomyFor } from './listingTaxonomy'
import type {
  CRMData,
  DestinationEvent,
  EventDraft,
  Agreement,
  Benefit,
  Contact,
  ContentPage,
  InvoiceDraft,
  Listing,
  MembershipLevel,
  Organisation,
  OrganisationDraft,
  Opportunity,
  SocialMetric,
  WebsiteSubmission,
  PipelineStage,
  TaskDraft,
  WebsiteAnalyticsEvent,
  WebsitePage,
  WebsitePageContent,
  ImageAsset,
  WebsiteExperiment,
} from './types'
import { contentSnapshot } from './contentPublishing'

const STORAGE_KEY = 'visit-valechester-crm-v4'

interface CRMContextValue {
  data: CRMData
  ready: boolean
  saveError?: string
  remoteAutomationRevision: number
  applyAutomationUpdate: (update: (current: CRMData) => CRMData) => void
  addOrganisation: (draft: OrganisationDraft) => Organisation
  updateOrganisation: (id: string, changes: Partial<Organisation>) => void
  deleteOrganisation: (id: string) => void
  deduplicateOrganisations: () => number
  mergeOrganisations: (survivorId: string, duplicateId: string) => void
  addContact: (contact: Omit<Contact, 'id'>) => void
  updateContact: (id: string, changes: Partial<Contact>) => void
  deleteContact: (id: string) => void
  addActivity: (organisationId: string | undefined, title: string, detail: string) => void
  createListing: (organisationId: string, name: string) => Listing
  updateListing: (id: string, changes: Partial<Listing>) => void
  publishListing: (id: string) => void
  unpublishListing: (id: string) => void
  duplicateListing: (id: string) => Listing | undefined
  deleteListing: (id: string) => void
  createEvent: (draft: EventDraft) => DestinationEvent
  updateEvent: (id: string, changes: Partial<DestinationEvent>) => void
  publishEvent: (id: string) => void
  deleteEvent: (id: string) => void
  moveOpportunity: (id: string, stage: PipelineStage) => void
  addOpportunity: (opportunity: Omit<Opportunity, 'id' | 'daysInStage'>) => void
  updateOpportunity: (id: string, changes: Partial<Opportunity>) => void
  deleteOpportunity: (id: string) => void
  markInvoicePaid: (id: string) => void
  toggleInvoiceReminders: (id: string) => void
  sendInvoice: (id: string) => void
  updateInvoice: (id: string, changes: Partial<CRMData['invoices'][number]>) => void
  deleteInvoice: (id: string) => void
  createInvoice: (draft: InvoiceDraft) => void
  runInvoiceReminders: () => number
  createAgreement: (agreement: Omit<Agreement, 'id' | 'number' | 'createdAt'>) => void
  renewMembership: (input: { organisationId: string; membershipLevel: string; annualValue: number; startDate: string; endDate: string; raiseInvoice: boolean; createAgreement: boolean }) => void
  updateAgreement: (id: string, changes: Partial<Agreement>) => void
  deleteAgreement: (id: string) => void
  toggleTask: (id: string) => void
  createTask: (draft: TaskDraft) => void
  updateTask: (id: string, changes: Partial<CRMData['tasks'][number]>) => void
  deleteTask: (id: string) => void
  incrementBenefit: (organisationId: string, benefitId: string, allowance: number) => void
  addLevel: (level: Omit<MembershipLevel, 'id' | 'members'>) => void
  updateLevel: (id: string, changes: Partial<MembershipLevel>) => void
  addBenefit: (benefit: Omit<Benefit, 'id'>) => void
  updateWorkspace: (changes: Partial<CRMData['workspace']>) => void
  createContentPage: (page: Omit<ContentPage, 'id' | 'updatedAt'>) => ContentPage
  updateContentPage: (id: string, changes: Partial<ContentPage>) => void
  publishContentPage: (id: string) => void
  discardContentDraft: (id: string) => void
  deleteContentPage: (id: string) => void
  createWebsitePage: (input: { name: string; path: string; content: WebsitePageContent }) => WebsitePage
  updateWebsitePageDraft: (id: string, draft: WebsitePageContent) => void
  publishWebsitePage: (id: string) => void
  discardWebsitePageDraft: (id: string) => void
  restoreWebsitePageVersion: (id: string, version: number) => void
  deleteWebsitePage: (id: string) => void
  createImageAsset: (asset: Omit<ImageAsset, 'id' | 'uploadedAt'>) => ImageAsset
  updateImageAsset: (id: string, changes: Partial<ImageAsset>) => void
  archiveImageAsset: (id: string) => void
  createWebsiteExperiment: (experiment: Omit<WebsiteExperiment, 'id' | 'createdAt'>) => WebsiteExperiment
  updateWebsiteExperiment: (id: string, changes: Partial<WebsiteExperiment>) => void
  deleteWebsiteExperiment: (id: string) => void
  updateSubmission: (id: string, changes: Partial<WebsiteSubmission>) => void
  updateSocialMetric: (id: SocialMetric['id'], changes: Partial<SocialMetric>) => void
  resetWorkspace: () => void
}

const CRMContext = createContext<CRMContextValue | null>(null)

interface PublicListingRow {
  id: string
  organisation_id: string
  name: string
  category: string
  town: string
  status: Listing['status']
  completeness: number
  views: number
  enquiries: number
  short_description: string
  description: string
  website: string
  booking_url: string
  phone: string
  email: string
  opening_hours: string
  facilities: string[]
  accessibility?: string
  image: string
  media?: Listing['media']
  search_tags?: string[]
  visitor_taxonomy?: string[]
  review_highlights?: string[]
  review_sites?: Listing['reviewSites']
  good_to_know?: string[]
  awards?: string[]
  image_rights_confirmed?: boolean
  map_latitude?: number
  map_longitude?: number
  map_visible?: boolean
  map_featured?: boolean
  updated_at: string
}

type EventRow = {id:string;organisation_id?:string;submitted_by_label:string;title:string;category:string;format:DestinationEvent['format'];description:string;start_date:string;end_date:string;start_time:string;end_time:string;venue_name:string;address:string;town:string;postcode:string;price:string;booking_url:string;contact_name:string;contact_email:string;image:string;accessibility:string;status:DestinationEvent['status'];moderation_note?:string;recurrence?:DestinationEvent['recurrence'];recurrence_until?:string;map_latitude?:number;map_longitude?:number;map_visible?:boolean;map_featured?:boolean;updated_at:string}
function fromEventRow(row:EventRow):DestinationEvent{return{id:row.id,organisationId:row.organisation_id,title:row.title,category:row.category,format:row.format,description:row.description,startDate:row.start_date,endDate:row.end_date,startTime:row.start_time.slice(0,5),endTime:row.end_time.slice(0,5),venueName:row.venue_name,address:row.address,town:row.town,postcode:row.postcode,price:row.price,bookingUrl:row.booking_url,contactName:row.contact_name,contactEmail:row.contact_email,image:row.image,accessibility:row.accessibility,status:row.status,submittedBy:row.submitted_by_label,moderationNote:row.moderation_note,recurrence:row.recurrence??'None',recurrenceUntil:row.recurrence_until??'',mapLatitude:row.map_latitude,mapLongitude:row.map_longitude,mapVisible:row.map_visible,mapFeatured:row.map_featured,lastUpdated:row.updated_at.slice(0,10)}}
function toEventRow(event:DestinationEvent,submittedBy?:string){return{id:event.id,tenant_id:tenant.id,organisation_id:event.organisationId??null,submitted_by:submittedBy??null,submitted_by_label:event.submittedBy,title:event.title,category:event.category,format:event.format,description:event.description,start_date:event.startDate,end_date:event.endDate,start_time:event.startTime,end_time:event.endTime,venue_name:event.venueName,address:event.address,town:event.town,postcode:event.postcode,price:event.price,booking_url:event.bookingUrl,contact_name:event.contactName,contact_email:event.contactEmail,image:event.image,accessibility:event.accessibility,status:event.status,moderation_note:event.moderationNote??'',recurrence:event.recurrence??'None',recurrence_until:event.recurrenceUntil||null,map_latitude:event.mapLatitude??null,map_longitude:event.mapLongitude??null,map_visible:event.mapVisible??true,map_featured:event.mapFeatured??false,updated_at:new Date().toISOString()}}

function fromPublicListing(row: PublicListingRow): Listing {
  return {
    id: row.id,
    organisationId: row.organisation_id,
    name: row.name,
    category: row.category,
    town: row.town,
    status: row.status,
    completeness: row.completeness,
    views: row.views,
    enquiries: row.enquiries,
    shortDescription: row.short_description,
    description: row.description,
    website: row.website,
    bookingUrl: row.booking_url,
    phone: row.phone,
    email: row.email,
    openingHours: row.opening_hours,
    facilities: row.facilities,
    accessibility: row.accessibility ?? '',
    image: row.image,
    media: row.media ?? [],
    lastUpdated: row.updated_at.slice(0, 10),
    searchTags: row.search_tags ?? [], visitorTaxonomy: row.visitor_taxonomy ?? [], reviewHighlights: row.review_highlights ?? [], reviewSites: row.review_sites ?? [], goodToKnow: row.good_to_know ?? [], awards: row.awards ?? [], imageRightsConfirmed: row.image_rights_confirmed ?? false,
    mapLatitude: row.map_latitude, mapLongitude: row.map_longitude, mapVisible: row.map_visible, mapFeatured: row.map_featured,
  }
}

function toPublicListing(listing: Listing) {
  return {
    id: listing.id,
    tenant_id: tenant.id,
    organisation_id: listing.organisationId,
    name: listing.name,
    category: listing.category,
    town: listing.town,
    status: listing.status,
    completeness: listing.completeness,
    views: listing.views,
    enquiries: listing.enquiries,
    short_description: listing.shortDescription,
    description: listing.description,
    website: listing.website,
    booking_url: listing.bookingUrl,
    phone: listing.phone,
    email: listing.email,
    opening_hours: listing.openingHours,
    facilities: listing.facilities,
    accessibility: listing.accessibility ?? '',
    image: listing.image,
    media: listing.media ?? [],
    search_tags: listing.searchTags,
    visitor_taxonomy: listing.visitorTaxonomy ?? [],
    review_highlights: listing.reviewHighlights,
    review_sites: listing.reviewSites ?? [],
    good_to_know: listing.goodToKnow,
    awards: listing.awards ?? [],
    image_rights_confirmed: listing.imageRightsConfirmed ?? false,
    map_latitude: listing.mapLatitude ?? null,
    map_longitude: listing.mapLongitude ?? null,
    map_visible: listing.mapVisible ?? true,
    map_featured: listing.mapFeatured ?? false,
    published_at: listing.status === 'Published' ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }
}

function normalizeCRMData(parsed: CRMData): CRMData {
  const hasLegacyTierOrder=parsed.levels?.find((level)=>level.id==='level-001')?.name==='Tier 4'&&parsed.levels?.find((level)=>level.id==='level-004')?.name==='Tier 1'
  const legacyNameMap:Record<string,string>={'Tier 4':'Tier 1','Tier 3':'Tier 2','Tier 2':'Tier 3','Tier 1':'Tier 4'}
  const rename=(value:string)=>hasLegacyTierOrder?(legacyNameMap[value]??value):value
  const renameInText=(value:string)=>{if(!hasLegacyTierOrder)return value;const oldName=Object.keys(legacyNameMap).find((name)=>value.includes(name));return oldName?value.replace(oldName,legacyNameMap[oldName]):value}
  const normalized={...parsed,
    levels:(parsed.levels??initialData.levels).map((level)=>({...level,name:rename(level.name)})),
    organisations:parsed.organisations.map((organisation)=>({...organisation,tier:rename(organisation.tier)})),
    agreements:parsed.agreements.map((agreement)=>({...agreement,membershipLevel:rename(agreement.membershipLevel)})),
    opportunities:parsed.opportunities.map((opportunity)=>({...opportunity,proposedLevel:rename(opportunity.proposedLevel)})),
    invoices:parsed.invoices.map((invoice)=>({...invoice,description:renameInText(invoice.description)})),
  }
  const legacyMediaAllowances: Record<string, [number, number]> = { 'level-001':[30,5], 'level-002':[20,3], 'level-003':[12,1], 'level-004':[6,0], 'level-006':[1,0] }
  return {
    ...normalized,
    workspace: normalized.workspace ?? initialData.workspace,
    events: (normalized.events ?? initialData.events).map((event) => ({ ...event, format: event.format ?? 'One-off and short run', recurrence:event.recurrence??'None' })),
    socialMetrics: normalized.socialMetrics ?? initialData.socialMetrics,
    websitePages: initialData.websitePages.map((baseline) => normalized.websitePages?.find((page) => page.id === baseline.id) ?? baseline).concat((normalized.websitePages ?? []).filter((page) => !initialData.websitePages.some((baseline) => baseline.id === page.id))),
    contentPages: (normalized.contentPages ?? initialData.contentPages).map((page) => page.status === 'Published' && !page.published ? { ...page, published: contentSnapshot(page), publishedAt: page.updatedAt, version: 1 } : page),
    analyticsEvents: normalized.analyticsEvents ?? initialData.analyticsEvents,
    imageAssets: normalized.imageAssets ?? initialData.imageAssets,
    websiteExperiments: normalized.websiteExperiments ?? initialData.websiteExperiments,
    submissions: normalized.submissions ?? initialData.submissions,
    membershipPeriods: normalized.membershipPeriods ?? [],
    contacts: (normalized.contacts ?? initialData.contacts).map((contact)=>({...contact,tags:contact.tags??[]})),
    levels: normalized.levels.map((level) => {
      const baseline = initialData.levels.find((item) => item.id === level.id)
      const legacy = legacyMediaAllowances[level.id]
      const hasLegacyMedia = Boolean(legacy && level.imageAllowance === legacy[0] && level.videoAllowance === legacy[1])
      return { ...level, imageAllowance: hasLegacyMedia ? baseline?.imageAllowance ?? level.imageAllowance : level.imageAllowance, videoAllowance: hasLegacyMedia ? baseline?.videoAllowance ?? level.videoAllowance : level.videoAllowance, taxonomyAllowance: level.taxonomyAllowance ?? baseline?.taxonomyAllowance ?? 6 }
    }),
    listings: normalized.listings.map((item) => {
      const sampleBaseline=/^list-1\d\d$/.test(item.id)?initialData.listings.find((listing)=>listing.id===item.id):undefined
      const searchTags=Array.from(new Set([...(item.searchTags??[]),...(sampleBaseline?.searchTags??[])]))
      const listing = { ...item, searchTags }
      const visitorTaxonomy=sampleBaseline?visitorTaxonomyFor({...listing,visitorTaxonomy:undefined}):item.visitorTaxonomy??visitorTaxonomyFor(listing)
      const media=item.media?.length?item.media:[{id:`media-${item.id}-hero`,type:'image' as const,url:item.image,alt:item.name,caption:''}]
      return { ...listing, media, visitorTaxonomy, reviewHighlights: item.reviewHighlights ?? [], reviewSites: item.reviewSites ?? [], goodToKnow: item.goodToKnow ?? [] }
    }),
  }
}

function readInitialData(): CRMData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const parsed = stored ? JSON.parse(stored) as CRMData : initialData
    return normalizeCRMData(parsed)
  } catch {
    return initialData
  }
}

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function listingCompleteness(listing: Listing) {
  const checks = [listing.name, listing.category, listing.town, listing.shortDescription, listing.description, listing.openingHours, listing.image, listing.facilities.length, listing.searchTags.length, listing.goodToKnow.length, listing.imageRightsConfirmed]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

export function CRMProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [data, setData] = useState<CRMData>(readInitialData)
  const [remoteReady, setRemoteReady] = useState(!supabase)
  const [saveError,setSaveError]=useState<string>()
  const [remoteAutomationRevision,setRemoteAutomationRevision]=useState(0)
  const audit=useCallback((action:string,entityType:string,entityId?:string,detail:Record<string,unknown>={})=>{const client=supabase;if(client&&user)void client.from('audit_log').insert({tenant_id:tenant.id,actor_id:user.id,action,entity_type:entityType,entity_id:entityId,detail})},[user])

  useEffect(() => {
    const client = supabase
    if (!client) return
    let active = true
    const hydrate = async () => {
      setRemoteReady(false)
      if (user) {
        const { data: state } = await client.from('workspace_states').select('data').eq('tenant_id', tenant.id).maybeSingle()
        if (active && state?.data) {
          const remoteData = state.data as CRMData
          setData(normalizeCRMData(remoteData))
        }
        const {data:events}=await client.from('events').select('*').eq('tenant_id',tenant.id)
        if(active&&events?.length)setData((current)=>({...current,events:(events as EventRow[]).map(fromEventRow)}))
        const {data:submissions}=await client.from('public_submissions').select('*').eq('tenant_id',tenant.id).order('created_at',{ascending:false})
        if(active&&submissions)setData((current)=>({...current,submissions:submissions.map((item)=>({id:item.id,kind:item.kind,payload:item.payload as Record<string,unknown>,createdAt:item.created_at,status:(item.status??'New') as WebsiteSubmission['status']}))}))
        const {data:auditRows}=await client.from('audit_log').select('id,action,entity_type,entity_id,detail,created_at,actor_id').eq('tenant_id',tenant.id).order('created_at',{ascending:false}).limit(250)
        if(active&&auditRows?.length)setData((current)=>({...current,activities:auditRows.map((row)=>({id:`audit-${row.id}`,organisationId:row.entity_type==='organisation'?row.entity_id:undefined,type:'note' as const,title:`${row.action.replaceAll('_',' ')} · ${row.entity_type.replaceAll('_',' ')}`,detail:JSON.stringify(row.detail??{}),timestamp:row.created_at,user:row.actor_id??'System'}))}))
        const {data:analytics}=await client.from('website_analytics_events').select('id,event_type,path,title,visitor_id,source,campaign,experiment_id,variant_id,occurred_at').eq('tenant_id',tenant.id).order('occurred_at',{ascending:false}).limit(5000)
        if(active&&analytics)setData((current)=>({...current,analyticsEvents:analytics.map((row)=>({id:row.id,type:row.event_type,path:row.path,title:row.title,visitorId:row.visitor_id,source:row.source,campaign:row.campaign??undefined,experimentId:row.experiment_id??undefined,variantId:row.variant_id??undefined,occurredAt:row.occurred_at} as WebsiteAnalyticsEvent))}))
        const {data:imageAssets}=await client.from('image_assets').select('*').eq('tenant_id',tenant.id).order('created_at',{ascending:false})
        if(active&&imageAssets?.length)setData((current)=>({...current,imageAssets:imageAssets.map((row)=>({id:row.id,name:row.name,url:row.public_url,alt:row.alt_text,caption:row.caption,credit:row.credit,rightsHolder:row.rights_holder,licence:row.licence,usageExpiry:row.usage_expiry??undefined,tags:row.tags??[],collection:row.collection_name,width:row.width,height:row.height,fileSize:row.file_size,mimeType:row.mime_type,storageProvider:'Supabase Storage',uploadedAt:row.created_at,uploadedBy:row.uploaded_by??'Workspace user',status:row.status} as ImageAsset))}))
        const {data:experiments}=await client.from('website_experiments').select('*').eq('tenant_id',tenant.id).order('created_at',{ascending:false})
        if(active&&experiments?.length)setData((current)=>({...current,websiteExperiments:experiments.map((row)=>({id:row.id,name:row.name,hypothesis:row.hypothesis,pagePath:row.page_path,goal:row.goal,status:row.status,variants:row.variants,createdAt:row.created_at,startedAt:row.started_at??undefined,endedAt:row.ended_at??undefined} as WebsiteExperiment))}))
      } else {
        const [{ data: listings },{data:events},{data:content},{data:websitePages},{data:experiments}] = await Promise.all([client.from('public_listings').select('*').eq('tenant_id', tenant.id).eq('status', 'Published'),client.from('events').select('*').eq('tenant_id',tenant.id),client.from('public_content').select('*').eq('tenant_id',tenant.id).eq('status','Published'),client.from('public_website_pages').select('*').eq('tenant_id',tenant.id),client.from('website_experiments').select('*').eq('tenant_id',tenant.id).eq('status','Running')])
        if (active && listings) setData((current) => ({ ...current, listings: (listings as PublicListingRow[]).map(fromPublicListing) }))
        if(active&&events)setData((current)=>({...current,events:(events as EventRow[]).map(fromEventRow)}))
        if(active&&content)setData((current)=>({...current,contentPages:content.map((row)=>({id:row.id,type:row.type,title:row.title,slug:row.slug,summary:row.summary,body:row.body,image:row.image,status:row.status,metaTitle:row.meta_title??'',metaDescription:row.meta_description??'',updatedAt:row.updated_at.slice(0,10)} as ContentPage))}))
        if(active&&websitePages?.length)setData((current)=>({...current,websitePages:websitePages.map((row)=>({id:row.id,name:row.name,path:row.path,template:row.template,status:'Published',draft:row.content,published:row.content,version:row.version,versions:[],updatedAt:row.updated_at.slice(0,10),publishedAt:row.published_at} as WebsitePage))}))
        if(active&&experiments)setData((current)=>({...current,websiteExperiments:experiments.map((row)=>({id:row.id,name:row.name,hypothesis:row.hypothesis,pagePath:row.page_path,goal:row.goal,status:row.status,variants:row.variants,createdAt:row.created_at,startedAt:row.started_at??undefined,endedAt:row.ended_at??undefined} as WebsiteExperiment))}))
      }
      if (active) setRemoteReady(true)
    }
    void hydrate()
    return () => { active = false }
  }, [user])

  useEffect(()=>{
    const client=supabase
    if(!client||!user)return
    const channel=client.channel(`workspace-${tenant.id}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'workspace_states',filter:`tenant_id=eq.${tenant.id}`},(payload)=>{
      const record=payload.new as {data?:CRMData;updated_by?:string}
      if(record.updated_by!==user.id&&record.data){setData(normalizeCRMData(record.data));if(!record.updated_by)setRemoteAutomationRevision((current)=>current+1)}
    }).subscribe()
    return()=>{void client.removeChannel(channel)}
  },[user])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    document.documentElement.style.setProperty('--tenant-primary',data.workspace.primaryColour)
    document.documentElement.style.setProperty('--tenant-accent',data.workspace.accentColour)
    document.documentElement.style.setProperty('--tenant-sage',data.workspace.supportingColour)
  }, [data])

  useEffect(()=>{const receive=(event:Event)=>{const submission=(event as CustomEvent<WebsiteSubmission>).detail;setData((current)=>({...current,submissions:[submission,...current.submissions]}))};window.addEventListener('website-submission',receive);return()=>window.removeEventListener('website-submission',receive)},[])
  useEffect(()=>{const receive=(event:Event)=>{const analyticsEvent=(event as CustomEvent<WebsiteAnalyticsEvent>).detail;setData((current)=>current.analyticsEvents.some((item)=>item.id===analyticsEvent.id)?current:{...current,analyticsEvents:[analyticsEvent,...current.analyticsEvents].slice(0,5000)})};window.addEventListener('website-analytics',receive);return()=>window.removeEventListener('website-analytics',receive)},[])

  useEffect(() => {
    const client = supabase
    if (!client || !user || !remoteReady || user.role==='Viewer / Reporting') return
    const timer = window.setTimeout(() => { void (async()=>{
      setSaveError(undefined)
      const failures:string[]=[]
      const write=async(query:PromiseLike<{error:{message:string}|null}>)=>{const {error}=await query;if(error)failures.push(error.message)}
      const writes:Array<Promise<void>>=[write(client.from('workspace_states').upsert({
        tenant_id: tenant.id,
        data,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id' })),write(client.from('public_listings').upsert(data.listings.map(toPublicListing), { onConflict: 'tenant_id,id' }))]
      const publishedContent=data.contentPages.filter((page)=>page.published).map((page)=>({id:page.id,tenant_id:tenant.id,type:page.published!.type,title:page.published!.title,slug:page.published!.slug,summary:page.published!.summary,body:page.published!.body,image:page.published!.image,status:'Published',meta_title:page.published!.metaTitle??'',meta_description:page.published!.metaDescription??'',updated_at:page.publishedAt??new Date().toISOString()}))
      const publishedWebsitePages=data.websitePages.filter((page)=>page.published).map((page)=>({id:page.id,tenant_id:tenant.id,name:page.name,path:page.path,template:page.template,content:page.published,version:page.version,published_at:page.publishedAt??new Date().toISOString(),updated_at:new Date().toISOString()}))
      if(publishedContent.length)writes.push(write(client.from('public_content').upsert(publishedContent,{onConflict:'tenant_id,id'})))
      if(publishedWebsitePages.length)writes.push(write(client.from('public_website_pages').upsert(publishedWebsitePages,{onConflict:'tenant_id,id'})))
      const imageAssets=data.imageAssets.map((asset)=>({id:asset.id,tenant_id:tenant.id,name:asset.name,storage_path:null,public_url:asset.url,alt_text:asset.alt,caption:asset.caption,credit:asset.credit,rights_holder:asset.rightsHolder,licence:asset.licence,usage_expiry:asset.usageExpiry??null,tags:asset.tags,collection_name:asset.collection,width:asset.width,height:asset.height,file_size:asset.fileSize,mime_type:asset.mimeType,status:asset.status,updated_at:new Date().toISOString()}))
      const experiments=data.websiteExperiments.map((experiment)=>({id:experiment.id,tenant_id:tenant.id,name:experiment.name,hypothesis:experiment.hypothesis,page_path:experiment.pagePath,goal:experiment.goal,status:experiment.status,variants:experiment.variants,started_at:experiment.startedAt??null,ended_at:experiment.endedAt??null,created_at:experiment.createdAt,updated_at:new Date().toISOString()}))
      if(imageAssets.length)writes.push(write(client.from('image_assets').upsert(imageAssets,{onConflict:'tenant_id,id'})))
      if(experiments.length)writes.push(write(client.from('website_experiments').upsert(experiments,{onConflict:'tenant_id,id'})))
      const listingIds=data.listings.map((item)=>item.id)
      const contentIds=publishedContent.map((item)=>item.id)
      if(listingIds.length)writes.push(write(client.from('public_listings').delete().eq('tenant_id',tenant.id).not('id','in',`(${listingIds.join(',')})`)))
      else writes.push(write(client.from('public_listings').delete().eq('tenant_id',tenant.id)))
      if(contentIds.length)writes.push(write(client.from('public_content').delete().eq('tenant_id',tenant.id).not('id','in',`(${contentIds.join(',')})`)))
      else writes.push(write(client.from('public_content').delete().eq('tenant_id',tenant.id)))
      const websitePageIds=publishedWebsitePages.map((item)=>item.id)
      if(websitePageIds.length)writes.push(write(client.from('public_website_pages').delete().eq('tenant_id',tenant.id).not('id','in',`(${websitePageIds.join(',')})`)))
      else writes.push(write(client.from('public_website_pages').delete().eq('tenant_id',tenant.id)))
      const imageAssetIds=imageAssets.map((item)=>item.id)
      const experimentIds=experiments.map((item)=>item.id)
      if(imageAssetIds.length)writes.push(write(client.from('image_assets').delete().eq('tenant_id',tenant.id).not('id','in',`(${imageAssetIds.join(',')})`)))
      if(experimentIds.length)writes.push(write(client.from('website_experiments').delete().eq('tenant_id',tenant.id).not('id','in',`(${experimentIds.join(',')})`)))
      await Promise.all(writes)
      if(failures.length)setSaveError(`Changes could not be saved: ${failures[0]}`)
    })() }, 650)
    return () => window.clearTimeout(timer)
  }, [data, remoteReady, user])

  const value = useMemo<CRMContextValue>(() => ({
    data,
    ready: remoteReady,
    saveError,
    remoteAutomationRevision,
    applyAutomationUpdate: (update) => setData(update),
    addOrganisation: (draft) => {
      const organisationId = id('org')
      const contactId = id('con')
      const nonMember = draft.status === 'Non-member' || draft.tier === 'No membership'
      const level = nonMember ? undefined : data.levels.find((item) => item.name === draft.tier)
      const organisation: Organisation = {
        id: organisationId,
        name: draft.name,
        type: draft.type,
        town: draft.town,
        address: '',
        website: '',
        tier: nonMember ? 'No membership' : draft.tier,
        status: nonMember ? 'Non-member' : draft.status,
        health: 'OK',
        owner: user?.name ?? 'Morgan Lee',
        primaryContactId: contactId,
        renewalDate: '',
        membershipStart: '',
        annualValue: level?.price ?? 0,
        listings: 0,
        lastActivity: new Date().toISOString(),
        nextAction: draft.nextAction,
        nextActionDate: todayISO(),
        tags: nonMember ? ['Non-member'] : draft.status === 'Prospect' ? ['Prospect'] : [],
        notes: '',
        colour: level?.colour ?? '#64748b',
      }
      setData((current) => ({
        ...current,
        organisations: [organisation, ...current.organisations],
        contacts: [{
          id: contactId,
          organisationId,
          name: draft.contactName,
          jobTitle: '',
          email: draft.contactEmail,
          phone: '',
          roles: ['Primary'],
          primary: true,
          portalAccess: false,
        }, ...current.contacts],
        activities: [{
          id: id('act'), organisationId, type: 'note', title: 'Organisation created',
          detail: `${draft.name} was added to the CRM.`, timestamp: new Date().toISOString(), user: user?.name ?? 'Workspace user',
        }, ...current.activities],
      }))
      audit('create','organisation',organisationId,{name:draft.name,status:draft.status})
      return organisation
    },
    updateOrganisation: (organisationId, changes) => {
      setData((current) => ({
        ...current,
        organisations: current.organisations.map((item) => item.id === organisationId ? { ...item, ...changes } : item),
      }))
      audit('update','organisation',organisationId,changes)
    },
    deleteOrganisation: (organisationId) => {setData((current)=>({...current,organisations:current.organisations.filter((item)=>item.id!==organisationId),contacts:current.contacts.filter((item)=>item.organisationId!==organisationId),listings:current.listings.filter((item)=>item.organisationId!==organisationId),agreements:current.agreements.filter((item)=>item.organisationId!==organisationId),membershipPeriods:current.membershipPeriods.filter((item)=>item.organisationId!==organisationId),invoices:current.invoices.filter((item)=>item.organisationId!==organisationId),tasks:current.tasks.filter((item)=>item.organisationId!==organisationId),benefitUsage:current.benefitUsage.filter((item)=>item.organisationId!==organisationId),activities:current.activities.filter((item)=>item.organisationId!==organisationId),events:current.events.map((item)=>item.organisationId===organisationId?{...item,organisationId:undefined}:item)}));audit('delete','organisation',organisationId)},
    deduplicateOrganisations: () => {const canonical=new Map<string,string>();const remap=new Map<string,string>();data.organisations.forEach((item)=>{const key=`${item.name}|${item.town}`.toLowerCase();const existing=canonical.get(key);if(existing)remap.set(item.id,existing);else canonical.set(key,item.id)});const duplicateIds=new Set(remap.keys());setData((current)=>({...current,organisations:current.organisations.filter((item)=>!duplicateIds.has(item.id)),contacts:current.contacts.map((item)=>remap.has(item.organisationId)?{...item,organisationId:remap.get(item.organisationId)!}:item),listings:current.listings.map((item)=>remap.has(item.organisationId)?{...item,organisationId:remap.get(item.organisationId)!}:item),agreements:current.agreements.map((item)=>remap.has(item.organisationId)?{...item,organisationId:remap.get(item.organisationId)!}:item),invoices:current.invoices.map((item)=>remap.has(item.organisationId)?{...item,organisationId:remap.get(item.organisationId)!}:item),tasks:current.tasks.map((item)=>item.organisationId&&remap.has(item.organisationId)?{...item,organisationId:remap.get(item.organisationId)!}:item),benefitUsage:current.benefitUsage.map((item)=>remap.has(item.organisationId)?{...item,organisationId:remap.get(item.organisationId)!}:item),activities:current.activities.map((item)=>item.organisationId&&remap.has(item.organisationId)?{...item,organisationId:remap.get(item.organisationId)!}:item),events:current.events.map((item)=>item.organisationId&&remap.has(item.organisationId)?{...item,organisationId:remap.get(item.organisationId)!}:item)}));audit('deduplicate','organisation',undefined,{removed:duplicateIds.size});return duplicateIds.size},
    mergeOrganisations: (survivorId,duplicateId) => {if(survivorId===duplicateId)return;setData((current)=>{if(!current.organisations.some((item)=>item.id===survivorId)||!current.organisations.some((item)=>item.id===duplicateId))return current;return{...current,organisations:current.organisations.filter((item)=>item.id!==duplicateId),contacts:current.contacts.map((item)=>item.organisationId===duplicateId?{...item,organisationId:survivorId}:item),listings:current.listings.map((item)=>item.organisationId===duplicateId?{...item,organisationId:survivorId}:item),agreements:current.agreements.map((item)=>item.organisationId===duplicateId?{...item,organisationId:survivorId}:item),membershipPeriods:current.membershipPeriods.map((item)=>item.organisationId===duplicateId?{...item,organisationId:survivorId}:item),invoices:current.invoices.map((item)=>item.organisationId===duplicateId?{...item,organisationId:survivorId}:item),tasks:current.tasks.map((item)=>item.organisationId===duplicateId?{...item,organisationId:survivorId}:item),benefitUsage:current.benefitUsage.map((item)=>item.organisationId===duplicateId?{...item,organisationId:survivorId}:item),activities:current.activities.map((item)=>item.organisationId===duplicateId?{...item,organisationId:survivorId}:item),events:current.events.map((item)=>item.organisationId===duplicateId?{...item,organisationId:survivorId}:item)}});audit('merge','organisation',survivorId,{duplicateId})},
    addContact: (contact) => setData((current) => ({ ...current, contacts: [{ ...contact, id: id('con') }, ...current.contacts.map((item)=>contact.primary&&item.organisationId===contact.organisationId?{...item,primary:false}:item)] })),
    updateContact: (contactId, changes) => setData((current) => {const target=current.contacts.find((item)=>item.id===contactId);return{...current,contacts:current.contacts.map((item)=>changes.primary&&target&&item.organisationId===target.organisationId?{...item,...(item.id===contactId?changes:{primary:false})}:item.id===contactId?{...item,...changes}:item)}}),
    deleteContact: (contactId) => {setData((current)=>{const removed=current.contacts.find((item)=>item.id===contactId);const contacts=current.contacts.filter((item)=>item.id!==contactId);if(!removed)return current;const remaining=contacts.filter((item)=>item.organisationId===removed.organisationId);const nextPrimary=remaining[0];return{...current,contacts:contacts.map((item)=>item.id===nextPrimary?.id?{...item,primary:true}:item),organisations:current.organisations.map((item)=>item.id===removed.organisationId?{...item,primaryContactId:nextPrimary?.id??''}:item)}});audit('delete','contact',contactId)},
    addActivity: (organisationId, title, detail) => setData((current) => ({ ...current, activities: [{ id: id('act'), organisationId, type: 'note', title, detail, timestamp: new Date().toISOString(), user: user?.name ?? 'Workspace user' }, ...current.activities] })),
    createListing: (organisationId, name) => {
      const organisation = data.organisations.find((item) => item.id === organisationId)
      const listing: Listing = { id: id('list'), organisationId, name, category: organisation?.type ?? 'Attractions', town: organisation?.town ?? '', status: 'Draft', completeness: 9, views: 0, enquiries: 0, shortDescription: '', description: '', website: organisation?.website ?? '', bookingUrl: '', phone: '', email: '', openingHours: '', facilities: [], searchTags: [], visitorTaxonomy: [], reviewHighlights: [], reviewSites: [], goodToKnow: [], awards:[], imageRightsConfirmed:false, lastUpdated: todayISO(), image: 'hero', media: [] }
      setData((current) => ({ ...current, listings: [listing, ...current.listings], organisations: current.organisations.map((item) => item.id === organisationId ? { ...item, listings: item.listings + 1 } : item) }))
      audit('create','listing',listing.id,{organisationId,name})
      return listing
    },
    updateListing: (listingId, changes) => {
      setData((current) => ({
        ...current,
        listings: current.listings.map((item) => {if(item.id!==listingId)return item;const updated={...item,...changes,lastUpdated:todayISO()};return{...updated,completeness:listingCompleteness(updated)}}),
        activities: [{
          id: id('act'), organisationId: current.listings.find((item) => item.id === listingId)?.organisationId,
          type: 'listing', title: 'Listing updated', detail: 'Listing content was updated in the CRM.',
          timestamp: new Date().toISOString(), user: user?.name ?? 'Workspace user',
        }, ...current.activities],
      }))
      audit('update','listing',listingId,changes)
    },
    publishListing: (listingId) => {
      setData((current) => ({
        ...current,
        listings: current.listings.map((item) => item.id === listingId ? { ...item, status: 'Published', lastUpdated: todayISO() } : item),
        activities: [{
          id: id('act'), organisationId: current.listings.find((item) => item.id === listingId)?.organisationId,
          type: 'listing', title: 'Listing published', detail: 'The approved listing is now live on the destination website.',
          timestamp: new Date().toISOString(), user: user?.name ?? 'Workspace user',
        }, ...current.activities],
      }))
      audit('publish','listing',listingId)
    },
    unpublishListing: (listingId) => {setData((current)=>({...current,listings:current.listings.map((item)=>item.id===listingId?{...item,status:'Draft',lastUpdated:todayISO()}:item)}));audit('unpublish','listing',listingId)},
    duplicateListing: (listingId) => {const source=data.listings.find((item)=>item.id===listingId);if(!source)return undefined;const copy={...source,id:id('list'),name:`${source.name} copy`,status:'Draft' as const,views:0,enquiries:0,lastUpdated:todayISO()};setData((current)=>({...current,listings:[copy,...current.listings],organisations:current.organisations.map((item)=>item.id===copy.organisationId?{...item,listings:item.listings+1}:item)}));audit('duplicate','listing',copy.id,{sourceId:listingId});return copy},
    deleteListing: (listingId) => {setData((current)=>{const source=current.listings.find((item)=>item.id===listingId);return{...current,listings:current.listings.filter((item)=>item.id!==listingId),organisations:current.organisations.map((item)=>item.id===source?.organisationId?{...item,listings:Math.max(0,item.listings-1)}:item)}});audit('delete','listing',listingId);if(supabase)void supabase.from('public_listings').delete().eq('tenant_id',tenant.id).eq('id',listingId)},
    createEvent: (draft) => {
      const event: DestinationEvent = { ...draft, id: id('event'), lastUpdated: todayISO() }
      setData((current) => ({
        ...current,
        events: [event, ...current.events],
        activities: [{ id: id('act'), type: 'event', title: 'Event submitted', detail: `${event.title} was submitted for review.`, timestamp: new Date().toISOString(), user: draft.submittedBy || user?.name || 'Event organiser' }, ...current.activities],
      }))
      const client=supabase;if(client)void client.auth.getUser().then(({data:auth})=>client.from('events').insert(toEventRow(event,auth.user?.id)))
      audit('create','event',event.id,{title:event.title})
      return event
    },
    updateEvent: (eventId, changes) => { setData((current) => ({
      ...current,
      events: current.events.map((item) => item.id === eventId ? { ...item, ...changes, lastUpdated: todayISO() } : item),
      activities: [{ id: id('act'), type: 'event', title: 'Event updated', detail: `${current.events.find((item) => item.id === eventId)?.title ?? 'Event'} was updated.`, timestamp: new Date().toISOString(), user: user?.name ?? 'Workspace user' }, ...current.activities],
    }));audit('update','event',eventId,changes);if(supabase){const event=data.events.find((item)=>item.id===eventId);if(event)void supabase.from('events').update(toEventRow({...event,...changes,lastUpdated:todayISO()})).eq('id',eventId)}},
    publishEvent: (eventId) => {setData((current) => ({
      ...current,
      events: current.events.map((item) => item.id === eventId ? { ...item, status: 'Published', lastUpdated: todayISO() } : item),
    }));audit('publish','event',eventId);if(supabase)void supabase.from('events').update({status:'Published',updated_at:new Date().toISOString()}).eq('id',eventId)},
    deleteEvent: (eventId) => {setData((current) => ({ ...current, events: current.events.filter((item) => item.id !== eventId) }));audit('delete','event',eventId);if(supabase)void supabase.from('events').delete().eq('id',eventId)},
    moveOpportunity: (opportunityId, stage) => {setData((current)=>{const opportunity=current.opportunities.find((item)=>item.id===opportunityId);if(!opportunity)return current;const alreadyExists=current.organisations.some((item)=>item.name.toLowerCase()===opportunity.organisationName.toLowerCase());const organisationId=id('org');const contactId=id('con');const level=current.levels.find((item)=>item.name===opportunity.proposedLevel);const closed=stage==='Won'||stage==='Lost';return{...current,opportunities:current.opportunities.map((item)=>item.id===opportunityId?{...item,stage,daysInStage:0,stageEnteredAt:new Date().toISOString(),probability:stage==='Won'?100:stage==='Lost'?0:item.probability,outcomeDate:closed?todayISO():undefined,lostReason:stage==='Lost'?(item.lostReason||'Not recorded'):undefined}:item),...(stage==='Won'&&!alreadyExists?{organisations:[{id:organisationId,name:opportunity.organisationName,type:'Other',town:'Valechester',address:'',website:'',tier:opportunity.proposedLevel,status:'Active' as const,health:'OK' as const,owner:opportunity.owner,primaryContactId:contactId,renewalDate:'',membershipStart:todayISO(),annualValue:opportunity.value,listings:0,lastActivity:new Date().toISOString(),nextAction:'Complete member onboarding',nextActionDate:todayISO(),tags:['New member'],notes:`Converted from ${opportunity.source}`,colour:level?.colour??'#376b87'},...current.organisations],contacts:[{id:contactId,organisationId,name:opportunity.contactName,jobTitle:'',email:'',phone:'',roles:['Primary'],primary:true,portalAccess:false},...current.contacts],tasks:[{id:id('task'),title:`Complete onboarding for ${opportunity.organisationName}`,organisationId,dueDate:todayISO(),priority:'High' as const,assignee:opportunity.owner,category:'Follow-up' as const,completed:false},...current.tasks]}:{})}});audit('move','opportunity',opportunityId,{stage})},
    addOpportunity: (opportunity) => setData((current) => ({ ...current, opportunities: [{ ...opportunity, id: id('opp'), daysInStage: 0, stageEnteredAt:new Date().toISOString() }, ...current.opportunities] })),
    updateOpportunity: (opportunityId, changes) => {setData((current)=>({...current,opportunities:current.opportunities.map((item)=>item.id===opportunityId?{...item,...changes}:item)}));audit('update','opportunity',opportunityId,changes)},
    deleteOpportunity: (opportunityId) => {setData((current)=>({...current,opportunities:current.opportunities.filter((item)=>item.id!==opportunityId)}));audit('delete','opportunity',opportunityId)},
    markInvoicePaid: (invoiceId) => {
      setData((current) => {
        const invoice = current.invoices.find((item) => item.id === invoiceId)
        return {
          ...current,
          invoices: current.invoices.map((item) => item.id === invoiceId ? {
            ...item, status: 'Paid', paidAt: todayISO(), remindersPaused: false,
          } : item),
          activities: invoice ? [{
            id: id('act'), organisationId: invoice.organisationId, type: 'invoice', title: 'Invoice marked paid',
            detail: `${invoice.number} marked paid in full.`, timestamp: new Date().toISOString(), user: user?.name ?? 'Workspace user',
          }, ...current.activities] : current.activities,
        }
      })
    },
    toggleInvoiceReminders: (invoiceId) => {
      setData((current) => ({
        ...current,
        invoices: current.invoices.map((item) => item.id === invoiceId ? { ...item, remindersPaused: !item.remindersPaused } : item),
      }))
    },
    sendInvoice: (invoiceId) => {
      setData((current) => ({
        ...current,
        invoices: current.invoices.map((item) => item.id === invoiceId && item.status === 'Draft' ? { ...item, status: 'Sent' } : item),
      }))
    },
    updateInvoice: (invoiceId, changes) => {setData((current)=>({...current,invoices:current.invoices.map((item)=>item.id===invoiceId?{...item,...changes}:item)}));audit('update','invoice',invoiceId,changes)},
    deleteInvoice: (invoiceId) => {setData((current)=>({...current,invoices:current.invoices.filter((item)=>item.id!==invoiceId)}));audit('delete','invoice',invoiceId)},
    createInvoice: (draft) => {
      const count = data.invoices.length + 1060
      const vat = Math.round(draft.subtotal * ((data.workspace.vatRate??20)/100) * 100) / 100
      const year=new Date().getFullYear()
      setData((current) => ({
        ...current,
        invoices: [{
          id: id('inv'),
          number: `VV-${year}-${count}`,
          organisationId: draft.organisationId,
          description: draft.description,
          issueDate: todayISO(),
          dueDate: draft.dueDate,
          subtotal: draft.subtotal,
          vat,
          total: draft.subtotal + vat,
          status: draft.sendNow ? 'Sent' : 'Draft',
          remindersPaused: false,
          reminderStep: 0,
          sentTo: data.contacts.find((contact) => contact.organisationId === draft.organisationId && contact.roles.includes('Accounts'))?.email
            ?? data.contacts.find((contact) => contact.organisationId === draft.organisationId && contact.primary)?.email
            ?? '',
        }, ...current.invoices],
      }))
    },
    runInvoiceReminders: () => {let sent=0;const today=todayISO();setData((current)=>({...current,invoices:current.invoices.map((invoice)=>{if(invoice.status==='Paid'||invoice.status==='Draft'||invoice.remindersPaused||invoice.dueDate>=today)return invoice;sent++;return{...invoice,status:'Overdue',reminderStep:Math.min(3,invoice.reminderStep+1)}}),activities:sent?[{id:id('act'),type:'invoice',title:'Invoice reminders processed',detail:`${sent} overdue invoice reminder${sent===1?'':'s'} queued.`,timestamp:new Date().toISOString(),user:user?.name??'Workspace user'},...current.activities]:current.activities}));audit('process_reminders','invoice',undefined,{sent});return sent},
    createAgreement: (agreement) => setData((current) => ({ ...current, agreements: [{ ...agreement, id: id('agr'), number: `AGR-${new Date().getFullYear()}-${String(current.agreements.length + 113).padStart(3, '0')}`, createdAt: todayISO() }, ...current.agreements] })),
    renewMembership: (input) => {
      setData((current) => {
        const organisation=current.organisations.find((item)=>item.id===input.organisationId)
        if(!organisation)return current
        const contact=current.contacts.find((item)=>item.id===organisation.primaryContactId)??current.contacts.find((item)=>item.organisationId===organisation.id)
        const agreementId=input.createAgreement?id('agr'):undefined
        const invoiceId=input.raiseInvoice?id('inv'):undefined
        const priorPeriod=organisation.membershipStart&&organisation.renewalDate&&!current.membershipPeriods.some((item)=>item.organisationId===organisation.id&&item.startDate===organisation.membershipStart)
          ? [{id:id('period'),organisationId:organisation.id,membershipLevel:organisation.tier,annualValue:organisation.annualValue,startDate:organisation.membershipStart,endDate:organisation.renewalDate,outcome:'Renewed' as const,createdAt:new Date().toISOString()}]
          : []
        const currentPeriod={id:id('period'),organisationId:organisation.id,membershipLevel:input.membershipLevel,annualValue:input.annualValue,startDate:input.startDate,endDate:input.endDate,outcome:'Current' as const,invoiceId,agreementId,createdAt:new Date().toISOString()}
        const vat=Math.round(input.annualValue*((current.workspace.vatRate??20)/100)*100)/100
        return {...current,
          organisations:current.organisations.map((item)=>item.id===organisation.id?{...item,tier:input.membershipLevel,annualValue:input.annualValue,membershipStart:input.startDate,renewalDate:input.endDate,status:'Active',nextAction:'Membership renewed',nextActionDate:input.endDate}:item),
          membershipPeriods:[currentPeriod,...priorPeriod,...current.membershipPeriods.map((item)=>item.organisationId===organisation.id&&item.outcome==='Current'?{...item,outcome:'Renewed' as const}:item)],
          invoices:invoiceId?[{id:invoiceId,number:`VV-${new Date().getFullYear()}-${current.invoices.length+1060}`,organisationId:organisation.id,description:`Membership renewal — ${input.membershipLevel} (${input.startDate} to ${input.endDate})`,issueDate:todayISO(),dueDate:input.startDate,subtotal:input.annualValue,vat,total:input.annualValue+vat,status:'Draft' as const,remindersPaused:false,reminderStep:0,sentTo:contact?.email??''},...current.invoices]:current.invoices,
          agreements:agreementId?[{id:agreementId,number:`AGR-${new Date().getFullYear()}-${String(current.agreements.length+113).padStart(3,'0')}`,organisationId:organisation.id,membershipLevel:input.membershipLevel,signatory:contact?.name??'',signatoryEmail:contact?.email??'',status:'Draft' as const,createdAt:todayISO(),validUntil:input.endDate},...current.agreements]:current.agreements,
          activities:[{id:id('act'),organisationId:organisation.id,type:'agreement',title:'Membership renewed',detail:`${input.membershipLevel} membership recorded for ${input.startDate} to ${input.endDate}.`,timestamp:new Date().toISOString(),user:user?.name??'Workspace user'},...current.activities],
        }
      })
      audit('renew','membership',input.organisationId,input)
    },
    updateAgreement: (agreementId, changes) => setData((current) => ({ ...current, agreements: current.agreements.map((item) => item.id === agreementId ? { ...item, ...changes } : item) })),
    deleteAgreement: (agreementId) => {setData((current)=>({...current,agreements:current.agreements.filter((item)=>item.id!==agreementId)}));audit('delete','agreement',agreementId)},
    toggleTask: (taskId) => {
      setData((current) => ({
        ...current,
        tasks: current.tasks.map((item) => item.id === taskId ? { ...item, completed: !item.completed } : item),
      }))
    },
    createTask: (draft) => {
      setData((current) => ({
        ...current,
        tasks: [{ id: id('task'), ...draft, assignee: user?.name ?? 'Workspace user', completed: false }, ...current.tasks],
      }))
    },
    updateTask: (taskId, changes) => {setData((current)=>({...current,tasks:current.tasks.map((item)=>item.id===taskId?{...item,...changes}:item)}));audit('update','task',taskId,changes)},
    deleteTask: (taskId) => {setData((current)=>({...current,tasks:current.tasks.filter((item)=>item.id!==taskId)}));audit('delete','task',taskId)},
    incrementBenefit: (organisationId, benefitId, allowance) => {
      setData((current) => {
        const existing = current.benefitUsage.find((item) => item.organisationId === organisationId && item.benefitId === benefitId)
        return {
          ...current,
          benefitUsage: existing
            ? current.benefitUsage.map((item) => item.id === existing.id ? {
              ...item, used: Math.min(item.allowance,item.used + 1), updatedAt: todayISO(),
            } : item)
            : [{ id: id('use'), organisationId, benefitId, used: 1, allowance, updatedAt: todayISO() }, ...current.benefitUsage],
        }
      })
    },
    addLevel: (level) => {
      setData((current) => ({ ...current, levels: [...current.levels, { ...level, id: id('level'), members: 0 }] }))
    },
    updateLevel: (levelId, changes) => {
      setData((current)=>{
        const existing=current.levels.find((level)=>level.id===levelId)
        if(!existing) return current
        const nextName=changes.name?.trim()||existing.name
        return {...current,
          levels:current.levels.map((level)=>level.id===levelId?{...level,...changes,name:nextName}:level),
          organisations:current.organisations.map((organisation)=>organisation.tier===existing.name?{...organisation,tier:nextName}:organisation),
          agreements:current.agreements.map((agreement)=>agreement.membershipLevel===existing.name?{...agreement,membershipLevel:nextName}:agreement),
          opportunities:current.opportunities.map((opportunity)=>opportunity.proposedLevel===existing.name?{...opportunity,proposedLevel:nextName}:opportunity),
          invoices:current.invoices.map((invoice)=>({...invoice,description:invoice.description.replace(existing.name,nextName)})),
        }
      })
    },
    addBenefit: (benefit) => setData((current) => ({ ...current, benefits: [...current.benefits, { ...benefit, id: id('benefit') }] })),
    updateWorkspace: (changes) => setData((current) => ({ ...current, workspace: { ...current.workspace, ...changes } })),
    createContentPage: (page) => {const created:ContentPage={...page,status:'Draft',id:id('content'),updatedAt:todayISO(),version:0};setData((current)=>({...current,contentPages:[created,...current.contentPages]}));audit('create_draft','content_page',created.id,{type:created.type,title:created.title});return created},
    updateContentPage: (pageId, changes) => {setData((current)=>({...current,contentPages:current.contentPages.map((item)=>item.id===pageId?{...item,...changes,status:item.published?'Draft changes':'Draft',updatedAt:todayISO()}:item)}));audit('save_draft','content_page',pageId,{title:changes.title})},
    publishContentPage: (pageId) => {setData((current)=>({...current,contentPages:current.contentPages.map((item)=>item.id===pageId?{...item,status:'Published',published:contentSnapshot(item),publishedAt:new Date().toISOString(),updatedAt:todayISO(),version:(item.version??0)+1}:item)}));audit('publish','content_page',pageId)},
    discardContentDraft: (pageId) => {setData((current)=>({...current,contentPages:current.contentPages.map((item)=>item.id===pageId&&item.published?{...item,...item.published,status:'Published',updatedAt:todayISO()}:item)}));audit('discard_draft','content_page',pageId)},
    deleteContentPage: (pageId) => {setData((current)=>({...current,contentPages:current.contentPages.filter((item)=>item.id!==pageId)}));audit('delete','content_page',pageId)},
    createWebsitePage: ({name,path,content}) => {const created:WebsitePage={id:id('webpage'),name,path:path.startsWith('/')?path:`/${path}`,template:'Landing page',status:'Draft',draft:content,version:0,versions:[],updatedAt:todayISO()};setData((current)=>({...current,websitePages:[created,...current.websitePages]}));audit('create_draft','website_page',created.id,{name,path:created.path});return created},
    updateWebsitePageDraft: (pageId,draft) => {setData((current)=>({...current,websitePages:current.websitePages.map((page)=>page.id===pageId?{...page,draft,status:page.published?'Draft changes':'Draft',updatedAt:todayISO()}:page)}));audit('save_draft','website_page',pageId,{title:draft.title})},
    publishWebsitePage: (pageId) => {const now=new Date().toISOString();setData((current)=>({...current,websitePages:current.websitePages.map((page)=>{if(page.id!==pageId)return page;const version=page.version+1;const published=structuredClone(page.draft);return {...page,published,status:'Published',version,publishedAt:now,updatedAt:todayISO(),versions:[{version,publishedAt:now,publishedBy:user?.name??'Workspace user',content:published},...page.versions].slice(0,20)}})}));audit('publish','website_page',pageId)},
    discardWebsitePageDraft: (pageId) => {setData((current)=>({...current,websitePages:current.websitePages.map((page)=>page.id===pageId&&page.published?{...page,draft:structuredClone(page.published),status:'Published',updatedAt:todayISO()}:page)}));audit('discard_draft','website_page',pageId)},
    restoreWebsitePageVersion: (pageId,version) => {setData((current)=>({...current,websitePages:current.websitePages.map((page)=>{const snapshot=page.versions.find((item)=>item.version===version);return page.id===pageId&&snapshot?{...page,draft:structuredClone(snapshot.content),status:'Draft changes',updatedAt:todayISO()}:page})}));audit('restore_version','website_page',pageId,{version})},
    deleteWebsitePage: (pageId) => {setData((current)=>({...current,websitePages:current.websitePages.filter((page)=>page.id!==pageId)}));audit('delete','website_page',pageId)},
    createImageAsset: (asset) => {const created:ImageAsset={...asset,id:id('asset'),uploadedAt:new Date().toISOString()};setData((current)=>({...current,imageAssets:[created,...current.imageAssets]}));audit('upload','image_asset',created.id,{name:created.name,licence:created.licence});return created},
    updateImageAsset: (assetId,changes) => {setData((current)=>({...current,imageAssets:current.imageAssets.map((asset)=>asset.id===assetId?{...asset,...changes}:asset)}));audit('update','image_asset',assetId,{fields:Object.keys(changes)})},
    archiveImageAsset: (assetId) => {setData((current)=>({...current,imageAssets:current.imageAssets.map((asset)=>asset.id===assetId?{...asset,status:'Archived'}:asset)}));audit('archive','image_asset',assetId)},
    createWebsiteExperiment: (experiment) => {const created:WebsiteExperiment={...experiment,id:id('experiment'),createdAt:new Date().toISOString()};setData((current)=>({...current,websiteExperiments:[created,...current.websiteExperiments]}));audit('create','website_experiment',created.id,{name:created.name,pagePath:created.pagePath});return created},
    updateWebsiteExperiment: (experimentId,changes) => {setData((current)=>({...current,websiteExperiments:current.websiteExperiments.map((experiment)=>experiment.id===experimentId?{...experiment,...changes}:experiment)}));audit('update','website_experiment',experimentId,{status:changes.status})},
    deleteWebsiteExperiment: (experimentId) => {setData((current)=>({...current,websiteExperiments:current.websiteExperiments.filter((experiment)=>experiment.id!==experimentId)}));audit('delete','website_experiment',experimentId)},
    updateSubmission: (submissionId, changes) => {setData((current)=>({...current,submissions:current.submissions.map((item)=>item.id===submissionId?{...item,...changes}:item)}));if(supabase)void supabase.from('public_submissions').update(changes.status?{status:changes.status}:{}).eq('id',submissionId)},
    updateSocialMetric: (metricId, changes) => setData((current)=>({...current,socialMetrics:current.socialMetrics.map((item)=>item.id===metricId?{...item,...changes}:item)})),
    resetWorkspace: () => {
      localStorage.removeItem(STORAGE_KEY)
      setData(initialData)
    },
  }), [audit,data,remoteReady,remoteAutomationRevision,saveError,user?.name])

  return <CRMContext.Provider value={value}>{children}</CRMContext.Provider>
}

export function useCRM() {
  const context = useContext(CRMContext)
  if (!context) throw new Error('useCRM must be used inside CRMProvider')
  return context
}
