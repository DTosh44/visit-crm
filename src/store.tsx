/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
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
  InvoiceDraft,
  Listing,
  MembershipLevel,
  Organisation,
  OrganisationDraft,
  Opportunity,
  PipelineStage,
  TaskDraft,
} from './types'

const STORAGE_KEY = 'visit-valechester-crm-v4'

interface CRMContextValue {
  data: CRMData
  addOrganisation: (draft: OrganisationDraft) => Organisation
  updateOrganisation: (id: string, changes: Partial<Organisation>) => void
  addContact: (contact: Omit<Contact, 'id'>) => void
  updateContact: (id: string, changes: Partial<Contact>) => void
  addActivity: (organisationId: string | undefined, title: string, detail: string) => void
  createListing: (organisationId: string, name: string) => Listing
  updateListing: (id: string, changes: Partial<Listing>) => void
  publishListing: (id: string) => void
  createEvent: (draft: EventDraft) => DestinationEvent
  updateEvent: (id: string, changes: Partial<DestinationEvent>) => void
  publishEvent: (id: string) => void
  deleteEvent: (id: string) => void
  moveOpportunity: (id: string, stage: PipelineStage) => void
  addOpportunity: (opportunity: Omit<Opportunity, 'id' | 'daysInStage'>) => void
  markInvoicePaid: (id: string) => void
  toggleInvoiceReminders: (id: string) => void
  sendInvoice: (id: string) => void
  createInvoice: (draft: InvoiceDraft) => void
  createAgreement: (agreement: Omit<Agreement, 'id' | 'number' | 'createdAt'>) => void
  updateAgreement: (id: string, changes: Partial<Agreement>) => void
  toggleTask: (id: string) => void
  createTask: (draft: TaskDraft) => void
  incrementBenefit: (organisationId: string, benefitId: string, allowance: number) => void
  addLevel: (level: Omit<MembershipLevel, 'id' | 'members'>) => void
  updateLevel: (id: string, changes: Partial<MembershipLevel>) => void
  addBenefit: (benefit: Omit<Benefit, 'id'>) => void
  updateWorkspace: (changes: Partial<CRMData['workspace']>) => void
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
  image: string
  media?: Listing['media']
  updated_at: string
}

type EventRow = {id:string;organisation_id?:string;submitted_by_label:string;title:string;category:string;format:DestinationEvent['format'];description:string;start_date:string;end_date:string;start_time:string;end_time:string;venue_name:string;address:string;town:string;postcode:string;price:string;booking_url:string;contact_name:string;contact_email:string;image:string;accessibility:string;status:DestinationEvent['status'];moderation_note?:string;updated_at:string}
function fromEventRow(row:EventRow):DestinationEvent{return{id:row.id,organisationId:row.organisation_id,title:row.title,category:row.category,format:row.format,description:row.description,startDate:row.start_date,endDate:row.end_date,startTime:row.start_time.slice(0,5),endTime:row.end_time.slice(0,5),venueName:row.venue_name,address:row.address,town:row.town,postcode:row.postcode,price:row.price,bookingUrl:row.booking_url,contactName:row.contact_name,contactEmail:row.contact_email,image:row.image,accessibility:row.accessibility,status:row.status,submittedBy:row.submitted_by_label,moderationNote:row.moderation_note,lastUpdated:row.updated_at.slice(0,10)}}
function toEventRow(event:DestinationEvent,submittedBy?:string){return{id:event.id,tenant_id:tenant.id,organisation_id:event.organisationId??null,submitted_by:submittedBy??null,submitted_by_label:event.submittedBy,title:event.title,category:event.category,format:event.format,description:event.description,start_date:event.startDate,end_date:event.endDate,start_time:event.startTime,end_time:event.endTime,venue_name:event.venueName,address:event.address,town:event.town,postcode:event.postcode,price:event.price,booking_url:event.bookingUrl,contact_name:event.contactName,contact_email:event.contactEmail,image:event.image,accessibility:event.accessibility,status:event.status,moderation_note:event.moderationNote??'',updated_at:new Date().toISOString()}}

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
    image: row.image,
    media: row.media ?? [],
    lastUpdated: row.updated_at.slice(0, 10),
    searchTags: [], reviewHighlights: [], goodToKnow: [],
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
    image: listing.image,
    media: listing.media ?? [],
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
    events: (normalized.events ?? initialData.events).map((event) => ({ ...event, format: event.format ?? 'One-off and short run' })),
    socialMetrics: normalized.socialMetrics ?? initialData.socialMetrics,
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

export function CRMProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [data, setData] = useState<CRMData>(readInitialData)
  const [remoteReady, setRemoteReady] = useState(!supabase)

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
      } else {
        const [{ data: listings },{data:events}] = await Promise.all([client.from('public_listings').select('*').eq('tenant_id', tenant.id).eq('status', 'Published'),client.from('events').select('*').eq('tenant_id',tenant.id)])
        if (active && listings?.length) setData((current) => ({ ...current, listings: (listings as PublicListingRow[]).map(fromPublicListing) }))
        if(active&&events?.length)setData((current)=>({...current,events:(events as EventRow[]).map(fromEventRow)}))
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
      if(record.updated_by!==user.id&&record.data)setData(normalizeCRMData(record.data))
    }).subscribe()
    return()=>{void client.removeChannel(channel)}
  },[user])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    document.documentElement.style.setProperty('--tenant-primary',data.workspace.primaryColour)
    document.documentElement.style.setProperty('--tenant-accent',data.workspace.accentColour)
    document.documentElement.style.setProperty('--tenant-sage',data.workspace.supportingColour)
  }, [data])

  useEffect(() => {
    const client = supabase
    if (!client || !user || !remoteReady) return
    const timer = window.setTimeout(() => {
      void client.from('workspace_states').upsert({
        tenant_id: tenant.id,
        data,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id' })
      void client.from('public_listings').upsert(data.listings.map(toPublicListing), { onConflict: 'tenant_id,id' })
    }, 650)
    return () => window.clearTimeout(timer)
  }, [data, remoteReady, user])

  const value = useMemo<CRMContextValue>(() => ({
    data,
    addOrganisation: (draft) => {
      const organisationId = id('org')
      const contactId = id('con')
      const level = data.levels.find((item) => item.name === draft.tier)
      const organisation: Organisation = {
        id: organisationId,
        name: draft.name,
        type: draft.type,
        town: draft.town,
        address: '',
        website: '',
        tier: draft.tier,
        status: draft.status,
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
        tags: draft.status === 'Prospect' ? ['Prospect'] : [],
        notes: '',
        colour: level?.colour ?? '#376b87',
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
      return organisation
    },
    updateOrganisation: (organisationId, changes) => {
      setData((current) => ({
        ...current,
        organisations: current.organisations.map((item) => item.id === organisationId ? { ...item, ...changes } : item),
      }))
    },
    addContact: (contact) => setData((current) => ({ ...current, contacts: [{ ...contact, id: id('con') }, ...current.contacts] })),
    updateContact: (contactId, changes) => setData((current) => ({ ...current, contacts: current.contacts.map((item) => item.id === contactId ? { ...item, ...changes } : item) })),
    addActivity: (organisationId, title, detail) => setData((current) => ({ ...current, activities: [{ id: id('act'), organisationId, type: 'note', title, detail, timestamp: new Date().toISOString(), user: user?.name ?? 'Workspace user' }, ...current.activities] })),
    createListing: (organisationId, name) => {
      const organisation = data.organisations.find((item) => item.id === organisationId)
      const listing: Listing = { id: id('list'), organisationId, name, category: organisation?.type ?? 'Attractions', town: organisation?.town ?? '', status: 'Draft', completeness: 20, views: 0, enquiries: 0, shortDescription: '', description: '', website: organisation?.website ?? '', bookingUrl: '', phone: '', email: '', openingHours: '', facilities: [], searchTags: [], visitorTaxonomy: [], reviewHighlights: [], reviewSites: [], goodToKnow: [], lastUpdated: todayISO(), image: 'hero', media: [] }
      setData((current) => ({ ...current, listings: [listing, ...current.listings], organisations: current.organisations.map((item) => item.id === organisationId ? { ...item, listings: item.listings + 1 } : item) }))
      return listing
    },
    updateListing: (listingId, changes) => {
      setData((current) => ({
        ...current,
        listings: current.listings.map((item) => item.id === listingId ? { ...item, ...changes, lastUpdated: todayISO() } : item),
        activities: [{
          id: id('act'), organisationId: current.listings.find((item) => item.id === listingId)?.organisationId,
          type: 'listing', title: 'Listing updated', detail: 'Listing content was updated in the CRM.',
          timestamp: new Date().toISOString(), user: user?.name ?? 'Workspace user',
        }, ...current.activities],
      }))
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
    },
    createEvent: (draft) => {
      const event: DestinationEvent = { ...draft, id: id('event'), lastUpdated: todayISO() }
      setData((current) => ({
        ...current,
        events: [event, ...current.events],
        activities: [{ id: id('act'), type: 'event', title: 'Event submitted', detail: `${event.title} was submitted for review.`, timestamp: new Date().toISOString(), user: draft.submittedBy || user?.name || 'Event organiser' }, ...current.activities],
      }))
      const client=supabase;if(client)void client.auth.getUser().then(({data:auth})=>client.from('events').insert(toEventRow(event,auth.user?.id)))
      return event
    },
    updateEvent: (eventId, changes) => { setData((current) => ({
      ...current,
      events: current.events.map((item) => item.id === eventId ? { ...item, ...changes, lastUpdated: todayISO() } : item),
      activities: [{ id: id('act'), type: 'event', title: 'Event updated', detail: `${current.events.find((item) => item.id === eventId)?.title ?? 'Event'} was updated.`, timestamp: new Date().toISOString(), user: user?.name ?? 'Workspace user' }, ...current.activities],
    }));if(supabase){const event=data.events.find((item)=>item.id===eventId);if(event)void supabase.from('events').update(toEventRow({...event,...changes,lastUpdated:todayISO()})).eq('id',eventId)}},
    publishEvent: (eventId) => {setData((current) => ({
      ...current,
      events: current.events.map((item) => item.id === eventId ? { ...item, status: 'Published', lastUpdated: todayISO() } : item),
    }));if(supabase)void supabase.from('events').update({status:'Published',updated_at:new Date().toISOString()}).eq('id',eventId)},
    deleteEvent: (eventId) => {setData((current) => ({ ...current, events: current.events.filter((item) => item.id !== eventId) }));if(supabase)void supabase.from('events').delete().eq('id',eventId)},
    moveOpportunity: (opportunityId, stage) => {
      setData((current) => ({
        ...current,
        opportunities: current.opportunities.map((item) => item.id === opportunityId ? {
          ...item, stage, daysInStage: 0, probability: stage === 'Won' ? 100 : item.probability,
        } : item),
      }))
    },
    addOpportunity: (opportunity) => setData((current) => ({ ...current, opportunities: [{ ...opportunity, id: id('opp'), daysInStage: 0 }, ...current.opportunities] })),
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
    createInvoice: (draft) => {
      const count = data.invoices.length + 1060
      const vat = Math.round(draft.subtotal * 0.2 * 100) / 100
      setData((current) => ({
        ...current,
        invoices: [{
          id: id('inv'),
          number: `VV-2026-${count}`,
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
    createAgreement: (agreement) => setData((current) => ({ ...current, agreements: [{ ...agreement, id: id('agr'), number: `AGR-${new Date().getFullYear()}-${String(current.agreements.length + 113).padStart(3, '0')}`, createdAt: todayISO() }, ...current.agreements] })),
    updateAgreement: (agreementId, changes) => setData((current) => ({ ...current, agreements: current.agreements.map((item) => item.id === agreementId ? { ...item, ...changes } : item) })),
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
    incrementBenefit: (organisationId, benefitId, allowance) => {
      setData((current) => {
        const existing = current.benefitUsage.find((item) => item.organisationId === organisationId && item.benefitId === benefitId)
        return {
          ...current,
          benefitUsage: existing
            ? current.benefitUsage.map((item) => item.id === existing.id ? {
              ...item, used: item.used >= item.allowance ? 0 : item.used + 1, updatedAt: todayISO(),
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
    resetWorkspace: () => {
      localStorage.removeItem(STORAGE_KEY)
      setData(initialData)
    },
  }), [data,user?.name])

  return <CRMContext.Provider value={value}>{children}</CRMContext.Provider>
}

export function useCRM() {
  const context = useContext(CRMContext)
  if (!context) throw new Error('useCRM must be used inside CRMProvider')
  return context
}
