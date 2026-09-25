import {
  Accessibility, ArrowLeft, ArrowRight, CalendarDays, Check, ChevronDown, Clock3,
  Download, Heart, LogIn, LogOut, Mail, MapPin, Menu, PlayCircle, Save, Search, Share2, Sparkles, Star, TrainFront, UserPlus, X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type AnchorHTMLAttributes, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import { BrandLogo } from './components/BrandLogo'
import { useDialogFocus } from './components/UI'
import { useFeatures } from './features'
import { guides, imageLibrary, neighbourhoods } from './siteData'
import { useCRM } from './store'
import { tenant } from './tenant'
import { supabase } from './auth'
import { filtersForVisitorQuery, matchesVisitorOption, matchesVisitorQuery, visitorFilterGroups, visitorTaxonomyFor } from './listingTaxonomy'
import type { ContentPage, DestinationEvent, EventDraft, EventFormat, Listing, WebsitePageBlock, WebsitePageContent } from './types'
import { downloadCalendarEvent } from './actions'
import { publishedPages } from './contentPublishing'
import type { WebsiteAnalyticsEvent } from './types'
import { websitePageContent, websitePageForPath } from './websitePages'
import { InteractiveMap } from './components/InteractiveMap'
import { publicMapPoints, type MapPoint } from './mapData'

const categories = ['All', 'Things to do', 'Places to stay', 'Food & drink', 'Shopping']
const visitorJourneys = [
  { title: 'Families', detail: 'Big discoveries for curious minds', query: 'family', image: imageLibrary.castle },
  { title: 'Couples', detail: 'Slow days and memorable evenings', query: 'romantic', image: imageLibrary.restaurant },
  { title: 'Friends', detail: 'Shared experiences worth the trip', query: 'group', image: imageLibrary.distillery },
  { title: 'Culture seekers', detail: 'Stories, stages and local character', query: 'heritage', image: imageLibrary.theatre },
  { title: 'Food lovers', detail: 'Independent tables and Vale flavours', query: 'food', image: imageLibrary.restaurant },
  { title: 'Accessible explorers', detail: 'Plan with confidence and detail', query: 'accessible', image: imageLibrary.park },
]
const SAVED_KEY = 'visit-valechester-saved-v1'
const EVENT_ACCOUNTS_KEY = 'visit-valechester-event-accounts-v1'
const EVENT_SESSION_KEY = 'visit-valechester-event-session-v1'
interface EventAccount { id: string; name: string; email: string; organisation: string; password?: string }
function readEventAccounts(): EventAccount[] { try { return JSON.parse(localStorage.getItem(EVENT_ACCOUNTS_KEY) ?? '[]') as EventAccount[] } catch { return [] } }
function readEventAccount() { const id=localStorage.getItem(EVENT_SESSION_KEY); return readEventAccounts().find((item)=>item.id===id)??null }
function useEventAccount(){
  const [account,setAccount]=useState<EventAccount|null>(()=>supabase?null:readEventAccount())
  const [loading,setLoading]=useState(Boolean(supabase))
  useEffect(()=>{if(!supabase)return;let active=true;void supabase.auth.getSession().then(async({data})=>{if(!data.session){if(active){setAccount(null);setLoading(false)};return}const {data:profile}=await supabase!.from('event_organisers').select('user_id,full_name,organisation_name,email').eq('user_id',data.session.user.id).maybeSingle();if(active){setAccount(profile?{id:profile.user_id,name:profile.full_name,email:profile.email||data.session.user.email||'',organisation:profile.organisation_name}:null);setLoading(false)}});return()=>{active=false}},[])
  const signOut=async()=>{if(supabase)await supabase.auth.signOut();else localStorage.removeItem(EVENT_SESSION_KEY);setAccount(null)}
  return{account,setAccount,loading,signOut}
}
function eventDate(event: DestinationEvent) { return new Date(`${event.startDate}T12:00:00`) }
function eventDay(event: DestinationEvent) { return String(eventDate(event).getDate()).padStart(2,'0') }
function eventMonth(event: DestinationEvent) { return eventDate(event).toLocaleDateString('en-GB',{month:'short'}).toUpperCase() }
function eventTime(event: DestinationEvent) { return `${event.startTime}–${event.endTime}` }
function eventWhen(event: DestinationEvent) {
  const options:Intl.DateTimeFormatOptions={weekday:'long',day:'numeric',month:'long',year:'numeric'}
  const start=eventDate(event).toLocaleDateString('en-GB',options)
  if(event.endDate===event.startDate)return `${start}, ${eventTime(event)}`
  const end=new Date(`${event.endDate}T12:00:00`).toLocaleDateString('en-GB',options)
  return `${start} – ${end}, ${eventTime(event)}`
}
type EventDateFilter = 'all' | 'today' | 'tomorrow' | 'weekend' | 'next7' | 'custom'
function localDateValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0,10)
}
function eventDateRange(filter: EventDateFilter, from: string, to: string) {
  if (filter === 'custom') return { from, to }
  if (filter === 'all') return { from: '', to: '' }
  const today = new Date(); today.setHours(12,0,0,0)
  if (filter === 'today') { const value=localDateValue(today); return { from:value, to:value } }
  if (filter === 'tomorrow') {
    const tomorrow=new Date(today); tomorrow.setDate(today.getDate()+1); const value=localDateValue(tomorrow); return { from:value, to:value }
  }
  if (filter === 'next7') {
    const end=new Date(today); end.setDate(today.getDate()+6); return { from:localDateValue(today), to:localDateValue(end) }
  }
  const day=today.getDay(); const start=new Date(today)
  start.setDate(today.getDate()+(day===0?0:day===6?0:6-day))
  const end=new Date(start); end.setDate(start.getDate()+(day===0?0:1))
  return { from:localDateValue(start), to:localDateValue(end) }
}
function recurringEvents(events:DestinationEvent[]){return events.flatMap((event)=>{if(!event.recurrence||event.recurrence==='None'||!event.recurrenceUntil)return[event];const result=[event];const start=new Date(`${event.startDate}T12:00:00`);const end=new Date(`${event.endDate}T12:00:00`);const duration=end.getTime()-start.getTime();const cursor=new Date(start);for(let index=1;index<60;index++){if(event.recurrence==='Daily')cursor.setDate(cursor.getDate()+1);else if(event.recurrence==='Weekly')cursor.setDate(cursor.getDate()+7);else cursor.setMonth(cursor.getMonth()+1);const next=localDateValue(cursor);if(next>event.recurrenceUntil)break;const occurrenceEnd=localDateValue(new Date(cursor.getTime()+duration));result.push({...event,id:`${event.id}-occurrence-${index}`,startDate:next,endDate:occurrenceEnd})}return result})}
async function recordSubmission(key: string, value: Record<string, unknown>) {
  const submittedAt=new Date().toISOString()
  if(supabase){const {error}=await supabase.from('public_submissions').insert({tenant_id:tenant.id,kind:key.replace(/^vv-/,''),payload:value});if(error)throw error}
  try { const current = JSON.parse(localStorage.getItem(key) ?? '[]') as unknown[]; localStorage.setItem(key, JSON.stringify([{ ...value, submittedAt }, ...current])) } catch { localStorage.setItem(key, JSON.stringify([{ ...value, submittedAt }])) }
  window.dispatchEvent(new CustomEvent('website-submission',{detail:{id:`submission-${Date.now()}`,kind:key.replace(/^vv-/,''),payload:value,createdAt:submittedAt,status:'New'}}))
  recordAnalytics('form_submit', `${key.replace(/^vv-/, '').replaceAll('-', ' ')} submitted`)
}

const ANALYTICS_VISITOR_KEY='visit-analytics-visitor-v1'
function analyticsVisitorId(){let value=localStorage.getItem(ANALYTICS_VISITOR_KEY);if(!value){value=`visitor-${crypto.randomUUID()}`;localStorage.setItem(ANALYTICS_VISITOR_KEY,value)}return value}
function analyticsSource(){try{if(!document.referrer)return'Direct';const host=new URL(document.referrer).hostname;if(host.includes('google.'))return'Google';if(host.includes('facebook.'))return'Facebook';if(host.includes('instagram.'))return'Instagram';return host}catch{return'Direct'}}
function recordAnalytics(type:WebsiteAnalyticsEvent['type'],title=document.title){
  if(localStorage.getItem('visit-cookie-consent')!=='analytics')return
  const params=new URLSearchParams(window.location.search)
  const event:WebsiteAnalyticsEvent={id:crypto.randomUUID(),type,path:window.location.pathname,title:title.replace(/ \| .*$/,''),visitorId:analyticsVisitorId(),source:params.get('utm_source')??analyticsSource(),campaign:params.get('utm_campaign')??undefined,occurredAt:new Date().toISOString()}
  window.dispatchEvent(new CustomEvent('website-analytics',{detail:event}))
  if(supabase)void supabase.from('website_analytics_events').insert({id:event.id,tenant_id:tenant.id,event_type:event.type,path:event.path,title:event.title,visitor_id:event.visitorId,source:event.source,campaign:event.campaign??null,experiment_id:event.experimentId??null,variant_id:event.variantId??null,occurred_at:event.occurredAt})
}

function categoryGroup(listing: Listing) {
  const value = `${listing.category} ${listing.name}`.toLowerCase()
  if (/hotel|accommodation|stay|lodge|room/.test(value)) return 'Places to stay'
  if (/restaurant|food|drink|distill|café|bar/.test(value)) return 'Food & drink'
  if (/shop|book|retail/.test(value)) return 'Shopping'
  return 'Things to do'
}

function mediaUrl(value:string) {
  if(!value) return imageLibrary.hero
  return imageLibrary[value]??value
}

function siteNavigate(path: string) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function SiteLink({ to, onClick, ...props }: { to: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  return <a href={to} {...props} onClick={(event) => { onClick?.(event); if (!event.defaultPrevented) { event.preventDefault(); siteNavigate(to) } }} />
}

function readSavedPlaces() {
  try {
    const value = JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]')
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

interface VisitorActions {
  savedIds: string[]
  toggleSaved: (listing: Listing) => void
}

function ListingCard({ listing, savedIds, toggleSaved }: { listing: Listing } & VisitorActions) {
  const { data } = useCRM()
  const tier = data.organisations.find((item) => item.id === listing.organisationId)?.tier ?? 'Free Listing'
  const levelId = data.levels.find((item)=>item.name===tier)?.id
  const image = mediaUrl(listing.image)
  const saved = savedIds.includes(listing.id)
  return (
    <article className="site-card">
      <div className="site-card-image">
        <button className="site-card-open" onClick={() => siteNavigate(`/place/${listing.id}`)} aria-label={`View ${listing.name}`}>{tier === 'Free Listing' ? <span className="site-card-brand-image"><BrandLogo inverse /></span> : <img src={image} alt="" loading="lazy" decoding="async" />}</button>
        <span className="site-card-category">{categoryGroup(listing)}</span>
        <button className={`site-card-save${saved ? ' saved' : ''}`} onClick={() => toggleSaved(listing)} aria-label={`${saved ? 'Remove' : 'Save'} ${listing.name}`} aria-pressed={saved}><Heart size={18} fill={saved ? 'currentColor' : 'none'} /></button>
      </div>
      <div className="site-card-copy">
        <span><MapPin size={13} />{listing.town}</span>
        <h3><button onClick={() => siteNavigate(`/place/${listing.id}`)}>{listing.name}</button></h3>
        <p>{listing.shortDescription}</p>
        {(levelId === 'level-001' || levelId === 'level-002') && <div className="site-card-highlights">{listing.searchTags.slice(0,levelId === 'level-001' ? 3 : 2).map((tag)=><span key={tag}>{tag}</span>)}</div>}
        <div className="site-card-actions"><button className="site-text-link" onClick={() => siteNavigate(`/place/${listing.id}`)}>Discover more <ArrowRight size={15} /></button>{levelId === 'level-001' && listing.bookingUrl && <a href={listing.bookingUrl}>Book direct</a>}</div>
      </div>
    </article>
  )
}

function SiteHeader({ savedCount }: { savedCount: number }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { features } = useFeatures()
  const { data } = useCRM()
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const closeMenu = () => setMenuOpen(false)
  const publishedPage = (path: string) => websitePageForPath(data.websitePages, path)?.published
  const extraNavigation = data.websitePages.filter((page) => page.published?.showInNavigation && !['/', '/events', '/guides', '/map', '/plan'].includes(page.path))
  useEffect(() => {
    if (!menuOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setMenuOpen(false)
        menuButtonRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [menuOpen])
  return (
    <>
      <div className="site-utility"><div><span>{data.workspace.address.split(',').slice(-2).join(',').trim()}</span><nav>{features.interactiveMap&&<SiteLink to="/map">Interactive map</SiteLink>}<SiteLink to="/plan">Plan your visit</SiteLink><SiteLink to="/accessibility">Accessibility</SiteLink><SiteLink to="/saved">Saved places{savedCount ? ` (${savedCount})` : ''}</SiteLink><SiteLink to="/account">Event organiser login</SiteLink><a href="/crm">Partner login</a></nav></div></div>
      <header className="site-header">
        <SiteLink to="/" className="site-logo" aria-label={`${data.workspace.destinationName} home`}><BrandLogo /></SiteLink>
        <nav id="site-primary-navigation" className={menuOpen ? 'site-nav open' : 'site-nav'} aria-label="Main navigation">
          <SiteLink to="/?category=Things%20to%20do#discover" onClick={closeMenu}>Things to do</SiteLink>
          {features.events && <SiteLink to="/events" onClick={closeMenu}>{publishedPage('/events')?.navigationLabel || 'What’s on'}</SiteLink>}
          <SiteLink to="/?category=Places%20to%20stay#discover" onClick={closeMenu}>Stay</SiteLink>
          <SiteLink to="/?category=Food%20%26%20drink#discover" onClick={closeMenu}>Food & drink</SiteLink>
          {features.itineraries && <SiteLink to="/guides" onClick={closeMenu}>{publishedPage('/guides')?.navigationLabel || 'Ideas & inspiration'}</SiteLink>}
          {features.interactiveMap && <SiteLink to="/map" onClick={closeMenu}>{publishedPage('/map')?.navigationLabel || 'Explore the map'}</SiteLink>}
          <SiteLink to="/plan" onClick={closeMenu}>{publishedPage('/plan')?.navigationLabel || 'Plan your visit'}</SiteLink>
          {extraNavigation.map((page) => <SiteLink key={page.id} to={page.path} onClick={closeMenu}>{page.published!.navigationLabel || page.name}</SiteLink>)}
        </nav>
        <div className="site-header-actions"><button onClick={() => siteNavigate('/?search=1')} aria-label="Search"><Search size={20} /></button><SiteLink to="/plan" className="site-plan-button">Plan my trip</SiteLink><button ref={menuButtonRef} className="site-menu-button" onClick={() => setMenuOpen((value) => !value)} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} aria-controls="site-primary-navigation">{menuOpen ? <X size={22} /> : <Menu size={22} />}</button></div>
      </header>
    </>
  )
}

function SiteFooter() {
  const { features } = useFeatures()
  const { data } = useCRM()
  return <footer className="site-footer"><div className="site-footer-main"><div><BrandLogo inverse /><p>{data.workspace.strapline}</p></div><div><strong>Explore</strong><SiteLink to="/?category=Things%20to%20do#discover">Things to do</SiteLink>{features.events && <SiteLink to="/events">What’s on</SiteLink>}<SiteLink to="/?category=Places%20to%20stay#discover">Places to stay</SiteLink>{features.itineraries && <><SiteLink to="/guides">Guides</SiteLink><SiteLink to="/itineraries">Itineraries</SiteLink><SiteLink to="/trails">Trails</SiteLink></>}</div><div><strong>Plan</strong><SiteLink to="/plan">Getting here</SiteLink><SiteLink to="/plan">Getting around</SiteLink><SiteLink to="/accessibility">Accessible Valechester</SiteLink><SiteLink to="/contact?topic=visitor-information">Visitor information</SiteLink></div><div><strong>Work with us</strong><a href="/crm">Partner login</a><SiteLink to="/contact?topic=membership">Become a member</SiteLink><SiteLink to="/submit-event">Submit an event</SiteLink><SiteLink to="/account">Event organiser account</SiteLink><SiteLink to="/contact?topic=travel-trade">Travel trade</SiteLink></div></div><div className="site-footer-bottom"><span>© {new Date().getFullYear()} {data.workspace.legalName}. All rights reserved.</span><span><SiteLink to="/privacy">Privacy</SiteLink> · <SiteLink to="/cookies">Cookies</SiteLink> · <SiteLink to="/accessibility">Accessibility</SiteLink></span></div></footer>
}

function PublicShell({ savedCount, children }: { savedCount: number; children: ReactNode }) {
  return <div className="public-site"><a className="skip-link" href="#site-content">Skip to main content</a><div className="demo-notice" role="note">Visit Valechester is a fictional demonstration destination. Businesses, visitor claims and external links are sample content; please do not use them to plan a real trip.</div><SiteHeader savedCount={savedCount} /><div id="site-content" tabIndex={-1}>{children}</div><SiteFooter /></div>
}

function managedContent(data: ReturnType<typeof useCRM>['data'], path = window.location.pathname) {
  const page = websitePageForPath(data.websitePages, path)
  return page ? websitePageContent(page, new URLSearchParams(window.location.search).get('preview') === 'true') : undefined
}

function ManagedBlocks({ blocks }: { blocks: WebsitePageBlock[] }) {
  if (!blocks.length) return null
  return <section className="managed-page-blocks site-container">{blocks.map((block) => <article key={block.id} className={`managed-block managed-block-${block.type.toLowerCase()}`}>{block.type === 'Image' && block.image && <img src={mediaUrl(block.image)} alt="" />}{block.heading && <h2>{block.heading}</h2>}{block.body && <p>{block.body}</p>}{block.type === 'Button' && block.buttonLabel && block.buttonUrl && (block.buttonUrl.startsWith('/') ? <SiteLink to={block.buttonUrl}>{block.buttonLabel}<ArrowRight size={15}/></SiteLink> : <a href={block.buttonUrl}>{block.buttonLabel}<ArrowRight size={15}/></a>)}</article>)}</section>
}

function PageIntro({ eyebrow, title, description, image }: { eyebrow: string; title: string; description: string; image?: string }) {
  const { data } = useCRM()
  const managed = managedContent(data)
  const heroImage = managed?.heroImage ? mediaUrl(managed.heroImage) : image
  return <><section className={`visitor-page-intro${heroImage ? ' has-image' : ''}`}><div className="site-container"><SiteLink to="/" className="visitor-back"><ArrowLeft size={14} />Back to destination</SiteLink><span className="site-eyebrow">{managed?.eyebrow || eyebrow}</span><h1>{managed?.title||title}</h1><p>{managed?.description||description}</p></div>{heroImage && <img src={heroImage} alt="" />}</section>{managed && <ManagedBlocks blocks={managed.blocks}/>}</>
}

function NewsletterSignup() {
  const [email, setEmail] = useState('')
  const [joined, setJoined] = useState(false)
  const submit = (event: FormEvent) => { event.preventDefault(); if (email.trim()) void recordSubmission('vv-newsletter-signups',{ email }).then(()=>setJoined(true)).catch(()=>window.alert('The signup could not be saved. Please try again.')) }
  return <section className="site-newsletter"><div><span className="site-eyebrow">A little Valechester, now and then</span><h2>{joined ? 'You’re on the list.' : 'Good ideas for your next escape.'}</h2>{joined ? <div className="newsletter-success" role="status"><Check size={20} /><p>We’ll send the next Valechester edit to {email}.</p><button onClick={() => { setJoined(false); setEmail('') }}>Use another email</button></div> : <><p>Monthly inspiration, new openings and events worth planning around.</p><form onSubmit={submit}><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Your email address" aria-label="Email address" /><label><input type="checkbox" required/> I agree to receive destination emails and understand I can unsubscribe at any time.</label><button>Count me in <ArrowRight size={16} /></button></form><small>Monthly updates. Unsubscribe whenever you like.</small></>}</div></section>
}

function HomePage({ actions, location }: { actions: VisitorActions; location: string }) {
  const { data } = useCRM()
  const managed = managedContent(data, '/')
  const { features } = useFeatures()
  const [query, setQuery] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string,string[]>>({})
  const [town, setTown] = useState('All areas')
  const [visibleCount, setVisibleCount] = useState(12)
  const [category, setCategory] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get('category')
    return requested && categories.includes(requested) ? requested : 'All'
  })
  const published = useMemo(() => data.listings.filter((listing) => listing.status === 'Published'), [data.listings])
  const searchableTagsFor = (listing: Listing) => {
    const organisation = data.organisations.find((item) => item.id === listing.organisationId)
    const allowance = data.levels.find((item) => item.name === organisation?.tier)?.taxonomyAllowance ?? 0
    return listing.searchTags.slice(0, allowance)
  }
  const towns = useMemo(()=>['All areas',...Array.from(new Set(published.map((listing)=>listing.town))).sort()], [published])
  const membershipRank=(listing:Listing)=>{
    const tier=data.organisations.find((organisation)=>organisation.id===listing.organisationId)?.tier
    const level=data.levels.find((item)=>item.name===tier)
    if(!level||level.price===0) return Number.MAX_SAFE_INTEGER
    const index=data.levels.findIndex((item)=>item.id===level.id)
    return index<0?Number.MAX_SAFE_INTEGER-1:index
  }
  const results = published.filter((listing) => {
    const groupMatches = category === 'All' || categoryGroup(listing) === category
    const searchableTags = searchableTagsFor(listing)
    const filtersMatch=visitorFilterGroups.every((group)=>{const selected=activeFilters[group.id]??[];return !selected.length||selected.some((id)=>{const option=group.options.find((item)=>item.id===id);return Boolean(option&&matchesVisitorOption(listing,option,searchableTags))})})
    return groupMatches&&(town==='All areas'||listing.town===town)&&(!searchTerm||matchesVisitorQuery(listing,searchTerm,searchableTags))&&filtersMatch
  }).sort((a,b)=>membershipRank(a)-membershipRank(b)||b.completeness-a.completeness||a.name.localeCompare(b.name))
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const target = window.location.hash
    if (params.has('search')) window.setTimeout(() => { const input = document.querySelector<HTMLInputElement>('[aria-label="Search Valechester"]'); input?.focus(); input?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, 50)
    else if (target) window.setTimeout(() => document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [location])
  const runSearch=(term:string)=>{setQuery(term);setSearchTerm(term);setActiveFilters(filtersForVisitorQuery(term));setVisibleCount(12);document.querySelector('#discover')?.scrollIntoView({behavior:'smooth'})}
  const submitSearch = (event: FormEvent) => { event.preventDefault(); recordAnalytics('cta_click','Homepage search'); runSearch(query) }
  const quickSearch = (term: string) => runSearch(term)
  const toggleFilter=(groupId:string,optionId:string)=>setActiveFilters((current)=>{const selected=current[groupId]??[];return {...current,[groupId]:selected.includes(optionId)?selected.filter((id)=>id!==optionId):[...selected,optionId]}})
  const activeOptions=visitorFilterGroups.flatMap((group)=>group.options.filter((option)=>(activeFilters[group.id]??[]).includes(option.id)).map((option)=>({...option,groupId:group.id})))
  const clearFilters=()=>{setQuery('');setSearchTerm('');setActiveFilters({});setTown('All areas');setCategory('All');setVisibleCount(12)}

  return <PublicShell savedCount={actions.savedIds.length}>
    <main>
      <section className="site-hero">
        <img src={managed?.heroImage ? mediaUrl(managed.heroImage) : imageLibrary.hero} alt="Visitors walking beside the river in historic Valechester" fetchPriority="high" />
        <div className="site-hero-shade" />
        <div className="site-hero-content"><span className="site-eyebrow">{managed?.eyebrow || 'Find your kind of remarkable'}</span><h1>{managed?.title||'A town with stories in every direction.'}</h1><p>{managed?.description||data.workspace.strapline}</p>
          <form className="site-search" onSubmit={submitSearch}><Search size={21} /><input list="visitor-search-suggestions" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try ‘rainy day with children’ or ‘romantic evening’" aria-label="Search Valechester" /><datalist id="visitor-search-suggestions">{Array.from(new Set(published.flatMap((item)=>[item.category,item.town,...searchableTagsFor(item),...visitorTaxonomyFor(item)]))).map((item)=><option key={item} value={item}/>)}</datalist><button>Search</button></form>
          <div className="site-popular"><span>Popular:</span><button onClick={() => quickSearch('family')}>Family days</button><button onClick={() => quickSearch('free')}>Free things</button><button onClick={() => quickSearch('heritage')}>Heritage</button></div>
        </div>
        <span className="site-hero-credit">An afternoon beside the River Vale</span>
      </section>
      {managed && <ManagedBlocks blocks={managed.blocks}/>}

      <section className="site-intro site-container"><span className="site-eyebrow plum">Welcome to Valechester</span><div><h2>Historic at heart.<br /><em>Independent by nature.</em></h2><p>{data.workspace.strapline} Come for the landmark sights, stay for the unexpected finds—and make the story your own.</p></div></section>

      <section className="site-audiences site-container" id="visitors" aria-labelledby="audience-heading">
        <header className="editorial-heading"><span className="site-eyebrow plum">Make it your Valechester</span><h2 id="audience-heading">Who’s visiting?</h2><p>Choose the kind of trip you’re planning and we’ll bring the most useful places and experiences to the top.</p></header>
        <div className="site-audience-grid">{visitorJourneys.map((journey) => <button key={journey.title} onClick={() => runSearch(journey.query)}><img src={journey.image} alt="" loading="lazy" decoding="async"/><span><strong>{journey.title}</strong><small>{journey.detail}</small><i><ArrowRight size={16}/></i></span></button>)}</div>
      </section>

      {features.events && <section className="site-events" id="events"><div className="site-container"><header className="editorial-heading"><span className="site-eyebrow plum">What’s on</span><h2>Events worth planning for.</h2><button aria-label="View full calendar" onClick={() => siteNavigate('/events')}>View all events <ArrowRight size={16}/></button></header><div className="site-event-grid">{recurringEvents(data.events.filter((event)=>event.status==='Published')).sort((a,b)=>a.startDate.localeCompare(b.startDate)).slice(0,4).map((event) => <article key={event.id}><button className="event-image-link" onClick={() => siteNavigate(`/events#${event.id}`)} aria-label={`View ${event.title}`}><img src={imageLibrary[event.image]??event.image??imageLibrary.theatre} alt="" loading="lazy" decoding="async"/><span>{event.category}</span></button><div className="site-event-copy"><h3>{event.title}</h3><p><CalendarDays size={13}/>{eventDay(event)} {eventMonth(event)}</p><p><MapPin size={13}/>{event.town}</p><button className="event-card-link" onClick={() => siteNavigate(`/events#${event.id}`)}>View event <ArrowRight size={13}/></button></div></article>)}</div></div></section>}

      <section className="site-neighbourhoods" id="communities"><div className="site-container"><header className="editorial-heading"><span className="site-eyebrow plum">Featured towns and neighbourhoods</span><h2>Find your corner of the Vale.</h2><p>Each part of Valechester has its own pace, people and reasons to stay a little longer.</p></header><div className="site-neighbourhood-grid">{neighbourhoods.slice(0,4).map((place) => <article key={place.name}><img src={place.image} alt="" loading="lazy" decoding="async"/><div><span>Explore</span><h3>{place.name}</h3><p>{place.detail}</p><button onClick={() => siteNavigate(`/neighbourhood/${place.slug}`)} aria-label={`Explore ${place.name}`}><ArrowRight size={18}/></button></div></article>)}</div></div></section>

      {features.interactiveMap && <section className="site-map-promo"><div className="site-container"><div><span className="site-eyebrow">Interactive map</span><h2>Wander further.<br/><em>Find what’s nearby.</em></h2><p>Put places, events and neighbourhoods into context. Search the whole Vale, filter what matters and open every result directly from the map.</p><button onClick={() => siteNavigate('/map')}>Explore the map <ArrowRight size={16}/></button></div><div className="map-promo-visual" aria-hidden="true"><span className="map-road road-one"/><span className="map-road road-two"/><span className="map-river"/>{publicMapPoints(data.listings,data.events).filter((point)=>point.featured).slice(0,6).map((point,index)=><i key={point.id} style={{left:`${18+(index*14)%70}%`,top:`${20+(index*23)%62}%`}}><MapPin size={15}/></i>)}</div></div></section>}

      <section className="site-discover site-container" id="discover">
        <header className="site-section-heading"><div><span className="site-eyebrow plum">Start exploring</span><h2>{searchTerm ? `Results for “${searchTerm}”` : 'Find your Valechester'}</h2></div><p>Search by place, practical needs, who you are travelling with or the kind of experience you want.</p></header>
        <div className="site-category-tabs">{categories.map((item) => <button key={item} aria-pressed={category === item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div>
        <div className="visitor-discovery-layout">
          <aside className="visitor-filter-panel" aria-label="Refine your visit">
            <header><div><span>Refine your visit</span><strong>What works for you?</strong></div>{(activeOptions.length>0||town!=='All areas'||category!=='All')&&<button onClick={clearFilters}>Clear all</button>}</header>
            <label className="visitor-area-filter">Where do you want to go?<select value={town} onChange={(event)=>setTown(event.target.value)}>{towns.map((item)=><option key={item}>{item}</option>)}</select></label>
            {visitorFilterGroups.map((group)=><fieldset key={group.id}><legend>{group.label}</legend><small>{group.prompt}</small>{group.options.map((option)=>{const checked=(activeFilters[group.id]??[]).includes(option.id);const count=published.filter((listing)=>matchesVisitorOption(listing,option,searchableTagsFor(listing))).length;if(!count)return null;return <label key={option.id} className={checked?'selected':''}><input type="checkbox" checked={checked} onChange={()=>toggleFilter(group.id,option.id)}/><span>{option.label}</span><em>{count}</em></label>})}</fieldset>)}
          </aside>
          <div className="visitor-results">
            <div className="visitor-results-meta"><p className="results-count" role="status" aria-live="polite" aria-atomic="true">{results.length} {results.length===1?'place':'places'} match your choices</p>{activeOptions.length>0&&<div className="active-visitor-filters" aria-label="Selected filters">{activeOptions.map((option)=><button key={`${option.groupId}-${option.id}`} aria-label={`Remove ${option.label} filter`} onClick={()=>toggleFilter(option.groupId,option.id)}>{option.label}<X size={12}/></button>)}</div>}</div>
            <div className="site-card-grid">{results.slice(0, visibleCount).map((listing) => <ListingCard key={listing.id} listing={listing} {...actions} />)}</div>
            {results.length>visibleCount&&<div className="site-show-more"><button onClick={()=>setVisibleCount((count)=>count+12)}>Show more places <span>{Math.min(12,results.length-visibleCount)} more</span></button></div>}
            {!results.length && <div className="site-no-results"><Search size={25} /><h3>No exact matches yet</h3><p>Remove a choice or try a broader phrase.</p><button onClick={() => { setQuery(''); setSearchTerm(''); clearFilters() }}>Show everything</button></div>}
          </div>
        </div>
      </section>

      {features.itineraries && <section className="site-ideas site-container" id="ideas"><header className="site-section-heading"><div><span className="site-eyebrow plum">Ideas worth travelling for</span><h2>Follow your curiosity</h2></div><button onClick={() => siteNavigate('/plan')}>Build your own itinerary <ArrowRight size={16} /></button></header><div className="site-guide-grid">{guides.map((guide) => <article key={guide.title}><img src={guide.image} alt="" loading="lazy" decoding="async" /><div><span>{guide.eyebrow}</span><h3>{guide.title}</h3><p>{guide.description}</p><button onClick={() => siteNavigate(`/guide/${guide.slug}`)}>Read the guide <ArrowRight size={15} /></button></div></article>)}</div></section>}

      <section className="site-planner site-container" id="plan"><div><span className="planner-icon"><Sparkles size={24} /></span><span className="site-eyebrow plum">Made for your kind of trip</span><h2>Not sure where to start?</h2><p>Tell us who’s coming, what you love and how long you have. We’ll shape a Valechester itinerary around you.</p><button onClick={() => siteNavigate('/plan')}>Build my itinerary <ArrowRight size={17} /></button></div><aside><span><TrainFront size={21} /><strong>42 mins</strong><small>by direct train from Birmingham</small></span><span><Accessibility size={21} /><strong>Accessible</strong><small>routes and venue details</small></span><span><Clock3 size={21} /><strong>2–3 days</strong><small>to see the town at its best</small></span></aside></section>

      <NewsletterSignup />
    </main>
  </PublicShell>
}

function EventsPage({ savedCount }: { savedCount: number }) {
  const { data } = useCRM()
  const [query,setQuery]=useState('')
  const [categories,setCategories]=useState<string[]>([])
  const [locations,setLocations]=useState<string[]>([])
  const [formats,setFormats]=useState<EventFormat[]>([])
  const [dateFilter,setDateFilter]=useState<EventDateFilter>('all')
  const [dateFrom,setDateFrom]=useState('')
  const [dateTo,setDateTo]=useState('')
  const published=useMemo(()=>{const today=new Date().toISOString().slice(0,10);return recurringEvents(data.events.filter((event)=>event.status==='Published'&&event.endDate>=today)).sort((a,b)=>a.startDate.localeCompare(b.startDate))},[data.events])
  const eventCategories=['Music & Shows','Festivals & Seasonal','Food & Drink','Family','Arts & Culture','Talks & Workshops','Tours & Heritage','Outdoors & Sport','Wellbeing','Social']
  const eventLocations=Array.from(new Set(published.map((event)=>event.town))).sort()
  const eventFormats:{value:EventFormat;detail:string}[]=[{value:'One-off and short run',detail:'Concerts, comedy, theatre and festivals'},{value:'Ongoing events',detail:'Regular and long-running experiences'},{value:'Online events',detail:'Events you can join virtually'}]
  const selectedRange=eventDateRange(dateFilter,dateFrom,dateTo)
  const filtered=published.filter((event)=>{
    const matchesQuery=!query.trim()||[event.title,event.category,event.venueName,event.town,event.address,event.postcode,event.description,event.price,event.accessibility].join(' ').toLowerCase().includes(query.trim().toLowerCase())
    const matchesCategory=!categories.length||categories.includes(event.category)
    const matchesLocation=!locations.length||locations.includes(event.town)
    const matchesFormat=!formats.length||formats.includes(event.format)
    const matchesDate=(!selectedRange.from||event.endDate>=selectedRange.from)&&(!selectedRange.to||event.startDate<=selectedRange.to)
    return matchesQuery&&matchesCategory&&matchesLocation&&matchesFormat&&matchesDate
  })
  const hasFilters=Boolean(query.trim()||categories.length||locations.length||formats.length||dateFilter!=='all'||dateFrom||dateTo)
  const chooseQuickDate=(value:EventDateFilter)=>{setDateFilter(value);setDateFrom('');setDateTo('')}
  const toggleValue=<T extends string,>(value:T,current:T[],setValue:(items:T[])=>void)=>setValue(current.includes(value)?current.filter((item)=>item!==value):[...current,value])
  const clearFilters=()=>{setQuery('');setCategories([]);setLocations([]);setFormats([]);setDateFilter('all');setDateFrom('');setDateTo('')}
  useEffect(() => { if (window.location.hash) window.setTimeout(() => document.querySelector(window.location.hash)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50) }, [])
  return <PublicShell savedCount={savedCount}>
    <main>
      <PageIntro eyebrow="What’s on" title="Make a date of Valechester." description="Markets, live performance, family evenings and the kind of local events worth building a trip around." image={imageLibrary.restaurant} />
      <section className="event-directory-tools site-container" aria-label="Search events">
        <header>
          <span className="site-eyebrow plum">Find your event</span>
          <h2>What are you looking for?</h2>
          <p>Search by event, venue or place, then refine the results using the filters below.</p>
        </header>
        <div className="event-search">
          <Search size={18}/>
          <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search events, venues or places" aria-label="Search events"/>
          {query&&<button onClick={()=>setQuery('')} aria-label="Clear event search"><X size={16}/></button>}
        </div>
      </section>
      <div className="event-browser-layout site-container">
        <aside className="event-filter-sidebar" aria-label="Filter events">
          <header className="event-filter-sidebar-heading">
            <span className="site-eyebrow plum">Refine results</span>
            <h2>Filter events</h2>
          </header>
          <div className="event-filter-accordions">
            <details open>
              <summary>Event date <ChevronDown size={16}/></summary>
              <div className="event-filter-panel event-date-panel">
                <div className="event-quick-dates">{([['all','All dates'],['today','Today'],['tomorrow','Tomorrow'],['weekend','This weekend'],['next7','Next 7 days']] as [EventDateFilter,string][]).map(([value,label])=><button key={value} className={dateFilter===value?'active':''} aria-pressed={dateFilter===value} onClick={()=>chooseQuickDate(value)}>{label}</button>)}</div>
                <div className="event-custom-dates"><label>From<input type="date" value={dateFrom} onChange={(e)=>{setDateFrom(e.target.value);setDateFilter('custom')}} aria-label="Events from date"/></label><label>To<input type="date" min={dateFrom||undefined} value={dateTo} onChange={(e)=>{setDateTo(e.target.value);setDateFilter('custom')}} aria-label="Events to date"/></label></div>
              </div>
            </details>
            <details>
              <summary>Event type{categories.length>0&&<span>{categories.length}</span>}<ChevronDown size={16}/></summary>
              <div className="event-filter-panel event-check-options">{eventCategories.map((item)=><label key={item}><input type="checkbox" checked={categories.includes(item)} onChange={()=>toggleValue(item,categories,setCategories)}/><span><strong>{item}</strong><small>{published.filter((event)=>event.category===item).length}</small></span></label>)}</div>
            </details>
            <details>
              <summary>Event location{locations.length>0&&<span>{locations.length}</span>}<ChevronDown size={16}/></summary>
              <div className="event-filter-panel event-check-options">{eventLocations.map((item)=><label key={item}><input type="checkbox" checked={locations.includes(item)} onChange={()=>toggleValue(item,locations,setLocations)}/><span><strong>{item}</strong><small>{published.filter((event)=>event.town===item).length}</small></span></label>)}</div>
            </details>
            <details>
              <summary>Event format{formats.length>0&&<span>{formats.length}</span>}<ChevronDown size={16}/></summary>
              <div className="event-filter-panel event-check-options event-format-options">{eventFormats.map((item)=><label key={item.value}><input type="checkbox" checked={formats.includes(item.value)} onChange={()=>toggleValue(item.value,formats,setFormats)}/><span><strong>{item.value}</strong><em>{item.detail}</em><small>{published.filter((event)=>event.format===item.value).length}</small></span></label>)}</div>
            </details>
          </div>
          <button className="event-sidebar-clear" onClick={clearFilters} disabled={!hasFilters}>Clear all filters</button>
        </aside>
        <div className="event-results-column">
          <div className="event-directory-meta">
            <div><strong>Showing {filtered.length} {filtered.length===1?'event':'events'}</strong><span>{hasFilters?' matching your filters':' across Valechester'}</span></div>
            <div><button onClick={()=>siteNavigate('/submit-event')}>Add your event <ArrowRight size={14}/></button></div>
          </div>
          <section className="event-calendar">{filtered.map((event) => <article id={event.id} key={event.id}><img src={imageLibrary[event.image]??event.image??imageLibrary.theatre} alt="" /><div className="event-calendar-date"><strong>{eventDay(event)}</strong><span>{eventMonth(event)}</span></div><div><span className="site-eyebrow plum">{event.category}</span><h2>{event.title}</h2><p>{event.description}</p><dl><div><dt>Where</dt><dd>{event.venueName}, {event.town}</dd></div><div><dt>When</dt><dd>{eventWhen(event)}</dd></div><div><dt>Format</dt><dd>{event.format}</dd></div><div><dt>Tickets</dt><dd>{event.price}</dd></div></dl><div className="public-event-actions"><button onClick={() => siteNavigate(`/plan?event=${event.id}`)}>Plan a trip around this <ArrowRight size={15} /></button><button onClick={()=>downloadCalendarEvent(event)}>Add to calendar <CalendarDays size={14}/></button>{event.bookingUrl&&<a href={event.bookingUrl}>Book tickets</a>}</div></div></article>)}</section>
          {!filtered.length&&<div className="site-no-results"><Search size={25}/><h3>No matching events</h3><p>Try changing the dates, location, event type or format.</p><button onClick={clearFilters}>Clear all filters</button></div>}
        </div>
      </div>
      <NewsletterSignup />
    </main>
  </PublicShell>
}

function EventAccountPage({ savedCount }: { savedCount: number }) {
  const {account:current,setAccount,loading,signOut}=useEventAccount(); const [mode,setMode]=useState<'login'|'register'>(current?'login':'register'); const [error,setError]=useState('')
  const submit=async(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();setError('');const values=Object.fromEntries(new FormData(event.currentTarget)) as Record<string,string>
    if(supabase){if(mode==='register'){const {data,error:authError}=await supabase.auth.signUp({email:values.email,password:values.password,options:{data:{account_type:'event_organiser'}}});if(authError){setError(authError.message);return}if(!data.user||!data.session){setError('Check your email to confirm your account, then sign in.');return}const profile={user_id:data.user.id,full_name:values.name,organisation_name:values.organisation||'',email:values.email};const {error:profileError}=await supabase.from('event_organisers').upsert(profile);if(profileError){setError(profileError.message);return}setAccount({id:data.user.id,name:values.name,email:values.email,organisation:values.organisation||''});siteNavigate('/submit-event')}else{const {data,error:authError}=await supabase.auth.signInWithPassword({email:values.email,password:values.password});if(authError||!data.user){setError(authError?.message??'Unable to sign in.');return}const {data:profile}=await supabase.from('event_organisers').select('full_name,organisation_name,email').eq('user_id',data.user.id).maybeSingle();if(!profile){setError('This account is not registered as an event organiser.');return}setAccount({id:data.user.id,name:profile.full_name,email:profile.email||values.email,organisation:profile.organisation_name});siteNavigate('/submit-event')}return}
    const accounts=readEventAccounts();if(mode==='register'){if(accounts.some((item)=>item.email.toLowerCase()===values.email.toLowerCase())){setError('An account already exists for this email address.');return}const next:EventAccount={id:`organiser-${Date.now()}`,name:values.name,email:values.email,organisation:values.organisation,password:values.password};localStorage.setItem(EVENT_ACCOUNTS_KEY,JSON.stringify([...accounts,next]));localStorage.setItem(EVENT_SESSION_KEY,next.id);setAccount(next);siteNavigate('/submit-event')}else{const next=accounts.find((item)=>item.email.toLowerCase()===values.email.toLowerCase()&&item.password===values.password);if(!next){setError('Check your email address and password, then try again.');return}localStorage.setItem(EVENT_SESSION_KEY,next.id);setAccount(next);siteNavigate('/submit-event')}
  }
  if(loading)return <PublicShell savedCount={savedCount}><main><PageIntro eyebrow="Event organisers" title="Opening your account…" description="Checking your secure organiser session."/></main></PublicShell>
  if(current)return <PublicShell savedCount={savedCount}><main><PageIntro eyebrow="Event organiser account" title={`Welcome back, ${current.name.split(' ')[0]}.`} description="Submit events and keep track of their approval status."/><section className="event-account-panel site-container"><div><UserPlus size={28}/><h2>{current.organisation||current.name}</h2><p>{current.email}</p></div><div><button onClick={()=>siteNavigate('/submit-event')}>Manage my events <ArrowRight size={15}/></button><button className="secondary" onClick={()=>void signOut().then(()=>siteNavigate('/account'))}><LogOut size={15}/>Sign out</button></div></section></main></PublicShell>
  return <PublicShell savedCount={savedCount}><main><PageIntro eyebrow="Event organisers" title={mode==='register'?'Create your event account.':'Welcome back.'} description="Any organiser can submit an event. The venue or business does not need to be a Visit Valechester member."/><section className="event-account-auth site-container"><div className="event-auth-switch"><button className={mode==='register'?'active':''} aria-pressed={mode==='register'} onClick={()=>setMode('register')}>Create account</button><button className={mode==='login'?'active':''} aria-pressed={mode==='login'} onClick={()=>setMode('login')}>Sign in</button></div><form onSubmit={submit}>{mode==='register'&&<><label>Your name<input name="name" autoComplete="name" required/></label><label>Organisation or group<input name="organisation" autoComplete="organization" placeholder="Optional"/></label></>}<label>Email address<input name="email" type="email" autoComplete="email" required/></label><label>Password<input name="password" type="password" autoComplete={mode==='register'?'new-password':'current-password'} minLength={8} required/></label>{error&&<p className="form-error" role="alert">{error}</p>}<button>{mode==='register'?<><UserPlus size={16}/>Create account</>:<><LogIn size={16}/>Sign in</>}</button>{mode==='login'&&supabase&&<button type="button" className="secondary" onClick={async()=>{const email=window.prompt('Email address');if(!email)return;const client=supabase;if(!client)return;const {error:resetError}=await client.auth.resetPasswordForEmail(email,{redirectTo:`${window.location.origin}/account`});setError(resetError?resetError.message:'Password reset instructions have been sent.')}}>Forgotten your password?</button>}</form></section></main></PublicShell>
}

function SubmitEventPage({ savedCount }: { savedCount: number }) {
  const {account,loading,signOut}=useEventAccount(); const {data,createEvent,updateEvent}=useCRM(); const [sent,setSent]=useState(false); const [error,setError]=useState('');const [eventImage,setEventImage]=useState('theatre');const [editingEvent,setEditingEvent]=useState<DestinationEvent|null>(null)
  if(loading)return <PublicShell savedCount={savedCount}><main><PageIntro eyebrow="Add to what’s on" title="Opening your account…" description="Checking your secure organiser session."/></main></PublicShell>
  if(!account)return <PublicShell savedCount={savedCount}><main><PageIntro eyebrow="Add to what’s on" title="Sign in to submit an event." description="Create a free organiser account to send events to the destination team for review."/><section className="event-login-required site-container"><LogIn size={30}/><h2>Event organiser access</h2><p>Your event can take place anywhere and the venue does not need to be a member.</p><button onClick={()=>siteNavigate('/account')}>Create an account or sign in</button></section></main></PublicShell>
  const mine=data.events.filter((event)=>event.submittedBy===account.email)
  const uploadEventImage=async(file?:File)=>{if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)){setError('Choose a JPG, PNG or WebP image.');return}if(file.size>10*1024*1024){setError('The image must be smaller than 10 MB.');return}if(supabase){const safe=file.name.toLowerCase().replace(/[^a-z0-9._-]+/g,'-');const path=`${tenant.id}/${account.id}/${Date.now()}-${safe}`;const {error:uploadError}=await supabase.storage.from('event-media').upload(path,file,{contentType:file.type});if(!uploadError){setEventImage(supabase.storage.from('event-media').getPublicUrl(path).data.publicUrl);return}}const reader=new FileReader();reader.onload=()=>setEventImage(String(reader.result));reader.readAsDataURL(file)}
  const submit=(formEvent:FormEvent<HTMLFormElement>)=>{formEvent.preventDefault();setError('');const values=Object.fromEntries(new FormData(formEvent.currentTarget)) as Record<string,string>;if(values.endDate<values.startDate){setError('The end date must be on or after the start date.');return}if(values.endDate===values.startDate&&values.endTime<=values.startTime){setError('The end time must be after the start time.');return}if(values.recurrence!=='None'&&values.recurrenceUntil&&values.recurrenceUntil<values.startDate){setError('The repeat-until date must be on or after the start date.');return}if(data.events.some((item)=>item.title.toLowerCase()===values.title.toLowerCase()&&item.startDate===values.startDate&&item.venueName.toLowerCase()===values.venueName.toLowerCase())){setError('A matching event has already been submitted for this date and venue.');return}const draft:EventDraft={title:values.title,category:values.category,format:values.format as EventFormat,description:values.description,startDate:values.startDate,endDate:values.endDate,startTime:values.startTime,endTime:values.endTime,venueName:values.venueName,address:values.address,town:values.town,postcode:values.postcode,price:values.price,bookingUrl:values.bookingUrl,contactName:account.name,contactEmail:account.email,image:eventImage,accessibility:values.accessibility,status:'In review',submittedBy:account.email,recurrence:(values.recurrence||'None') as DestinationEvent['recurrence'],recurrenceUntil:values.recurrenceUntil||''};createEvent(draft);setSent(true);window.scrollTo({top:0,behavior:'smooth'})}
  return <PublicShell savedCount={savedCount}><main><PageIntro eyebrow="Event organiser account" title="Submit an event." description={`Signed in as ${account.email}. Events are checked by the destination team before publication.`}/><section className="public-event-submit site-container">{sent?<div className="contact-success" role="status"><Check size={28}/><h2>Your event has been submitted.</h2><p>It is now in review. You can follow its status below.</p><button onClick={()=>setSent(false)}>Submit another event</button></div>:<form onSubmit={submit}><div><label>Event title<input name="title" required/></label><label>Event type<select name="category" required>{['Music & Shows','Festivals & Seasonal','Food & Drink','Family','Arts & Culture','Talks & Workshops','Tours & Heritage','Outdoors & Sport','Wellbeing','Social'].map((item)=><option key={item}>{item}</option>)}</select></label><label>Event format<select name="format" required>{['One-off and short run','Ongoing events','Online events'].map((item)=><option key={item}>{item}</option>)}</select></label><label>Repeats<select name="recurrence"><option>None</option><option>Daily</option><option>Weekly</option><option>Monthly</option></select></label><label>Repeat until<input name="recurrenceUntil" type="date"/></label></div><label>Description<textarea name="description" rows={5} required placeholder="Tell visitors what makes the event worth attending."/></label><div><label>Start date<input name="startDate" type="date" required/></label><label>End date<input name="endDate" type="date" required/></label><label>Start time<input name="startTime" type="time" required/></label><label>End time<input name="endTime" type="time" required/></label></div><label>Venue name<input name="venueName" required placeholder="Any venue, public space or temporary location"/></label><div><label>Address<input name="address" autoComplete="street-address" required/></label><label>Town or area<input name="town" autoComplete="address-level2" required/></label><label>Postcode<input name="postcode" autoComplete="postal-code" required/></label></div><div><label>Ticket information<input name="price" required placeholder="Free or From £10"/></label><label>Booking URL<input name="bookingUrl" type="url"/></label><label>Image style<select name="image" value={eventImage.startsWith('data:')||eventImage.startsWith('http')?'uploaded':eventImage} onChange={(event)=>event.target.value!=='uploaded'&&setEventImage(event.target.value)}><option value="theatre">Performance</option><option value="restaurant">Food and drink</option><option value="park">Outdoors</option><option value="castle">Heritage</option><option value="gallery">Arts</option>{(eventImage.startsWith('data:')||eventImage.startsWith('http'))&&<option value="uploaded">Uploaded image</option>}</select></label><label>Upload image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event)=>void uploadEventImage(event.target.files?.[0])}/></label></div><label>Accessibility information<textarea name="accessibility" rows={3} placeholder="Step-free access, accessible toilets, quiet spaces or contact details"/></label>{error&&<p className="form-error" role="alert">{error}</p>}<button>Send event for review <ArrowRight size={15}/></button></form>}<aside className="organiser-events"><header><h2>My events</h2><button onClick={()=>void signOut().then(()=>siteNavigate('/account'))}>Sign out</button></header>{mine.length?mine.map((event)=><article key={event.id}><div><strong>{event.title}</strong><span>{eventDate(event).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})} · {event.venueName}</span></div><span className={`public-event-status status-${event.status.toLowerCase().replace(/\s+/g,'-')}`}>{event.status}</span>{event.moderationNote&&<p>{event.moderationNote}</p>}<div className="public-event-actions">{event.status!=='Published'&&event.status!=='Withdrawn'&&<button onClick={()=>setEditingEvent(event)}>Edit event</button>}{event.status==='Changes requested'&&<button onClick={()=>updateEvent(event.id,{status:'In review'})}>Resubmit for review</button>}{event.status!=='Withdrawn'&&event.status!=='Published'&&<button onClick={()=>updateEvent(event.id,{status:'Withdrawn'})}>Withdraw</button>}</div></article>):<p>Your submitted events will appear here.</p>}</aside></section></main>{editingEvent&&<OrganiserEventEditor event={editingEvent} onClose={()=>setEditingEvent(null)} onSave={(changes)=>{updateEvent(editingEvent.id,{...changes,status:'In review'});setEditingEvent(null)}}/>}</PublicShell>
}

function OrganiserEventEditor({event,onClose,onSave}:{event:DestinationEvent;onClose:()=>void;onSave:(changes:Partial<DestinationEvent>)=>void}){
  const [draft,setDraft]=useState(event);const [error,setError]=useState('');const dialogRef=useDialogFocus<HTMLFormElement>(true,onClose)
  const submit=(formEvent:FormEvent)=>{formEvent.preventDefault();if(draft.endDate<draft.startDate||draft.endDate===draft.startDate&&draft.endTime<=draft.startTime){setError('Check that the event finishes after it starts.');return}onSave(draft)}
  return <div className="modal-backdrop"><form ref={dialogRef} tabIndex={-1} className="event-editor-modal" onSubmit={submit} role="dialog" aria-modal="true" aria-label={`Edit ${event.title}`}><header><div><span className="site-eyebrow plum">Event organiser</span><h2>Edit event</h2></div><button type="button" onClick={onClose} aria-label="Close"><X size={19}/></button></header><div className="event-form-grid"><label className="event-field-wide">Event title<input data-dialog-initial-focus value={draft.title} onChange={(e)=>setDraft({...draft,title:e.target.value})} required/></label><label className="event-field-wide">Description<textarea rows={5} value={draft.description} onChange={(e)=>setDraft({...draft,description:e.target.value})} required/></label><label>Start date<input type="date" value={draft.startDate} onChange={(e)=>setDraft({...draft,startDate:e.target.value})} required/></label><label>End date<input type="date" min={draft.startDate} value={draft.endDate} onChange={(e)=>setDraft({...draft,endDate:e.target.value})} required/></label><label>Start time<input type="time" value={draft.startTime} onChange={(e)=>setDraft({...draft,startTime:e.target.value})} required/></label><label>End time<input type="time" value={draft.endTime} onChange={(e)=>setDraft({...draft,endTime:e.target.value})} required/></label><label className="event-field-wide">Venue<input value={draft.venueName} onChange={(e)=>setDraft({...draft,venueName:e.target.value})} required/></label><label className="event-field-wide">Address<input value={draft.address} onChange={(e)=>setDraft({...draft,address:e.target.value})} required/></label><label>Town or area<input value={draft.town} onChange={(e)=>setDraft({...draft,town:e.target.value})} required/></label><label>Postcode<input value={draft.postcode} onChange={(e)=>setDraft({...draft,postcode:e.target.value})} required/></label><label className="event-field-wide">Accessibility information<textarea rows={3} value={draft.accessibility} onChange={(e)=>setDraft({...draft,accessibility:e.target.value})}/></label></div>{error&&<p className="form-error" role="alert">{error}</p>}<footer><button type="button" onClick={onClose}>Cancel</button><button>Save and resubmit</button></footer></form></div>
}

function GuidePage({ slug, listings, actions }: { slug: string; listings: Listing[]; actions: VisitorActions }) {
  const guide = guides.find((item) => item.slug === slug)
  if (!guide) return <NotFoundPage savedCount={actions.savedIds.length} />
  const stops = guide.stops.map((id) => listings.find((listing) => listing.id === id)).filter((item): item is Listing => Boolean(item))
  return <PublicShell savedCount={actions.savedIds.length}><main><PageIntro eyebrow={`${guide.eyebrow} · ${guide.duration}`} title={guide.title} description={guide.intro} image={guide.image} /><section className="guide-route site-container"><header><span className="site-eyebrow plum">Your route</span><h2>{stops.length} stops, one very good trip.</h2></header><div>{stops.map((listing, index) => <article key={listing.id}><span>{String(index + 1).padStart(2, '0')}</span><ListingCard listing={listing} {...actions} /></article>)}</div><aside><Sparkles size={22} /><div><h3>Make it your own</h3><p>Use these stops as a starting point, then let the planner adapt the trip to your interests.</p></div><button onClick={() => siteNavigate('/plan')}>Open trip planner <ArrowRight size={15} /></button></aside></section></main></PublicShell>
}

function NeighbourhoodPage({ slug, listings, actions }: { slug: string; listings: Listing[]; actions: VisitorActions }) {
  const place = neighbourhoods.find((item) => item.slug === slug)
  if (!place) return <NotFoundPage savedCount={actions.savedIds.length} />
  const results = listings.filter((listing) => listing.town === place.name)
  return <PublicShell savedCount={actions.savedIds.length}><main><PageIntro eyebrow="Explore the neighbourhood" title={place.name} description={place.intro} image={place.image} /><section className="visitor-listing-section site-container"><header><span className="site-eyebrow plum">Worth your time</span><h2>Places in {place.name}</h2></header><div className="site-card-grid">{results.map((listing) => <ListingCard key={listing.id} listing={listing} {...actions} />)}</div>{!results.length && <p className="visitor-empty">More places are being prepared by the destination team.</p>}</section></main></PublicShell>
}

function SavedPage({ listings, actions }: { listings: Listing[]; actions: VisitorActions }) {
  const saved = listings.filter((listing) => actions.savedIds.includes(listing.id))
  return <PublicShell savedCount={actions.savedIds.length}><main><PageIntro eyebrow="Your trip" title="Saved places" description="Keep the places that catch your eye together while you shape your Valechester visit." /><section className="visitor-listing-section site-container">{saved.length ? <div className="site-card-grid">{saved.map((listing) => <ListingCard key={listing.id} listing={listing} {...actions} />)}</div> : <div className="saved-empty"><Heart size={28} /><h2>Nothing saved yet</h2><p>Tap the heart on any place to keep it here.</p><button onClick={() => siteNavigate('/#discover')}>Start exploring <ArrowRight size={15} /></button></div>}</section></main></PublicShell>
}

const interestMatchers: Record<string, RegExp> = {
  Heritage: /castle|heritage|museum|garden/i,
  'Food & drink': /distill|food|drink|restaurant|café/i,
  Culture: /theatre|gallery|book|museum/i,
  Outdoors: /park|garden|river|outdoor/i,
  Family: /family|museum|castle|garden|play/i,
}

function PlanPage({ listings, actions }: { listings: Listing[]; actions: VisitorActions }) {
  const { data } = useCRM()
  const [days, setDays] = useState(2)
  const [group, setGroup] = useState('Couple')
  const [interests, setInterests] = useState<string[]>(['Heritage', 'Food & drink'])
  const [plan, setPlan] = useState<Listing[]>([])
  const selectedEvent = data.events.find((event) => event.id === new URLSearchParams(window.location.search).get('event') && event.status === 'Published')
  const toggleInterest = (interest: string) => setInterests((current) => current.includes(interest) ? current.filter((item) => item !== interest) : [...current, interest])
  const buildPlan = (event: FormEvent) => {
    event.preventDefault()
    const groupMatchers: Record<string, RegExp> = { 'Solo traveller': /solo|quiet|museum|gallery|walking/i, Couple: /romantic|couple|food|drink|garden|theatre/i, Family: /family|children|play|museum|castle/i, Friends: /group|social|food|drink|outdoor/i }
    const ranked = listings.map((listing) => {
      const text = `${listing.name} ${listing.category} ${listing.description} ${listing.facilities.join(' ')} ${listing.searchTags.join(' ')}`
      const score = interests.reduce((total, interest) => total + (interestMatchers[interest].test(text) ? 2 : 0), 0) + (groupMatchers[group]?.test(text) ? 1 : 0) + (selectedEvent && listing.town === selectedEvent.town ? 2 : 0)
      return { listing, score }
    }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score || a.listing.town.localeCompare(b.listing.town))
    const next = ranked.slice(0, Math.min(days * 2, ranked.length)).map((item) => item.listing)
    setPlan(next)
    localStorage.setItem('visit-valechester-plan-v1', JSON.stringify({ ids: next.map((item) => item.id), days, group, interests, eventId: selectedEvent?.id }))
    window.setTimeout(() => document.querySelector('#your-plan')?.scrollIntoView({ behavior: 'smooth' }), 50)
  }
  const savePlan = () => plan.forEach((listing) => { if (!actions.savedIds.includes(listing.id)) actions.toggleSaved(listing) })
  return <PublicShell savedCount={actions.savedIds.length}><main>
    <PageIntro eyebrow="Trip planner" title="Shape your Valechester." description="Choose the pace and the things you enjoy. We’ll turn published destination listings into a practical starting itinerary." image={imageLibrary.hero} />
    <section className="planner-builder site-container">
      {selectedEvent && <article className="subpanel"><span className="site-eyebrow plum">Built around your event</span><h2>{selectedEvent.title}</h2><p>{eventWhen(selectedEvent)} · {selectedEvent.venueName}, {selectedEvent.town}</p></article>}
      <form onSubmit={buildPlan}><div><label>Who’s coming?<select value={group} onChange={(event) => setGroup(event.target.value)}><option>Solo traveller</option><option>Couple</option><option>Family</option><option>Friends</option></select></label><label>How long?<select value={days} onChange={(event) => setDays(Number(event.target.value))}><option value={1}>One day</option><option value={2}>Two days</option><option value={3}>Three days</option></select></label></div><fieldset><legend>What sounds good?</legend><div>{Object.keys(interestMatchers).map((interest) => <label key={interest} className={interests.includes(interest) ? 'selected' : ''}><input type="checkbox" checked={interests.includes(interest)} onChange={() => toggleInterest(interest)} />{interest}</label>)}</div></fieldset><button type="submit">Build my trip <Sparkles size={17} /></button></form>
      {plan.length > 0 && <section id="your-plan" className="generated-plan" aria-live="polite"><header><span className="site-eyebrow plum">Made for a {group.toLowerCase()}</span><h2>Your Valechester itinerary</h2><p>{days} {days === 1 ? 'day' : 'days'} · {interests.join(' · ')}</p><div className="public-event-actions"><button onClick={() => window.print()}><Download size={14}/>Print plan</button><button onClick={() => { void navigator.clipboard?.writeText(window.location.href) }}><Share2 size={14}/>Copy link</button><button onClick={savePlan}><Save size={14}/>Save places</button></div></header>
        {selectedEvent && <div className="plan-day"><h3>Fixed event</h3><article><span>{selectedEvent.startTime}</span><img src={imageLibrary[selectedEvent.image]??selectedEvent.image??imageLibrary.theatre} alt=""/><div><small>{selectedEvent.town}</small><h4>{selectedEvent.title}</h4><p>{selectedEvent.venueName}</p></div></article></div>}
        {Array.from({ length: days }, (_, day) => { const dayStops = plan.slice(day * 2, day * 2 + 2); return dayStops.length > 0 && <div className="plan-day" key={day}><h3>Day {day + 1}</h3>{dayStops.map((listing, index) => <article key={listing.id}><span>{index === 0 ? 'Morning' : 'Afternoon'}</span><img src={mediaUrl(listing.image)} alt="" /><div><small>{listing.town}</small><h4>{listing.name}</h4><p>{listing.shortDescription}</p><button onClick={() => siteNavigate(`/place/${listing.id}`)}>View place <ArrowRight size={14} /></button></div><button className={`plan-save${actions.savedIds.includes(listing.id) ? ' saved' : ''}`} onClick={() => actions.toggleSaved(listing)} aria-label={`${actions.savedIds.includes(listing.id) ? 'Remove' : 'Save'} ${listing.name}`}><Heart size={17} fill={actions.savedIds.includes(listing.id) ? 'currentColor' : 'none'} /></button></article>)}</div> })}
      </section>}
    </section>
  </main></PublicShell>
}

interface ListingTemplateProfile {
  levelId: string
  listingId: string
  templateName: string
  purpose: string
  accent: string
  media: string
  includes: string[]
  goodForLimit: number
  imageCount: number
  videoCount: number
  taxonomyAllowance: number
  showAtGlance: boolean
  showReviews: boolean
  showPlanningSummary: boolean
  showMap: boolean
  showAwards: boolean
  showRelated: boolean
  action: 'book' | 'enquire' | 'quote' | 'website'
}

const listingTemplateProfiles: ListingTemplateProfile[] = [
  { levelId:'level-001', listingId:'list-001', templateName:'Main destination listing', purpose:'The complete best-practice page for priority partners, based on the Warwick Castle prototype functionality.', accent:'#a86b78', media:'10 images · 2 videos', includes:['Up to 12 searchable visitor categories','Full media gallery and direct booking','At a glance, detailed story and visitor reviews','Accessibility, grouped facilities, hours and map','Awards, guides, itineraries, events and offers'], goodForLimit:8, imageCount:10, videoCount:2, taxonomyAllowance:12, showAtGlance:true, showReviews:true, showPlanningSummary:true, showMap:true, showAwards:true, showRelated:true, action:'book' },
  { levelId:'level-002', listingId:'list-005', templateName:'Enhanced destination listing', purpose:'A rich listing with most planning functions and strong bookable content.', accent:'#a86b78', media:'5 images · 1 video', includes:['Up to 10 searchable visitor categories','Five-image gallery, video and direct booking','At a glance and visitor feedback themes','Accessibility, facilities, hours and map','Related visitor inspiration'], goodForLimit:7, imageCount:5, videoCount:1, taxonomyAllowance:10, showAtGlance:true, showReviews:true, showPlanningSummary:true, showMap:true, showAwards:false, showRelated:true, action:'book' },
  { levelId:'level-003', listingId:'list-007', templateName:'Bookable member listing', purpose:'A practical, attractive listing with direct conversion and the details needed to plan.', accent:'#a86b78', media:'3 images', includes:['Up to 8 searchable visitor categories','Three-image gallery and direct booking','Visitor introduction and accessibility','Opening information, contact and map','Save and website actions'], goodForLimit:6, imageCount:3, videoCount:0, taxonomyAllowance:8, showAtGlance:false, showReviews:false, showPlanningSummary:false, showMap:true, showAwards:false, showRelated:false, action:'book' },
  { levelId:'level-004', listingId:'list-009', templateName:'Core member listing', purpose:'A clear one-image page with strong visitor essentials and an official website journey.', accent:'#a86b78', media:'1 image', includes:['Up to 6 searchable visitor categories','One hero image and visitor introduction','Accessibility and grouped facilities','Opening, contact and directions','Official website link; no direct booking'], goodForLimit:6, imageCount:1, videoCount:0, taxonomyAllowance:6, showAtGlance:false, showReviews:false, showPlanningSummary:false, showMap:false, showAwards:false, showRelated:false, action:'website' },
  { levelId:'level-005', listingId:'list-013', templateName:'Visitor economy supplier', purpose:'A business-to-business page focused on services, coverage and qualified enquiries.', accent:'#a86b78', media:'Up to 8 images · 1 video', includes:['Up to 8 searchable service categories','Service-led media and introduction','Credibility themes from feedback','Coverage, access and operating details','Quote enquiry and website actions'], goodForLimit:5, imageCount:5, videoCount:1, taxonomyAllowance:8, showAtGlance:false, showReviews:true, showPlanningSummary:false, showMap:true, showAwards:false, showRelated:false, action:'quote' },
  { levelId:'level-006', listingId:'list-011', templateName:'Basic directory listing', purpose:'Essential business information with Visit Valechester branding in place of a business image.', accent:'#a86b78', media:'Visit Valechester branded image', includes:['Up to 3 searchable visitor categories','Business name, category and location','Short description and opening information','Essential facilities and Visit Valechester image','No business website or booking link'], goodForLimit:0, imageCount:0, videoCount:0, taxonomyAllowance:3, showAtGlance:false, showReviews:false, showPlanningSummary:false, showMap:false, showAwards:false, showRelated:false, action:'website' },
]

function ListingTemplatesPage({ listings, actions }: { listings: Listing[]; actions: VisitorActions }) {
  const { data }=useCRM()
  return <PublicShell savedCount={actions.savedIds.length}><main><PageIntro eyebrow="Membership formats" title="Member listing templates." description="The approved page standards used across published listings, matched to the visibility and content allowance of each membership level." image={imageLibrary.castle}/><section className="template-review site-container"><header><span className="site-eyebrow plum">Approved standards</span><h2>One format for every membership type</h2><p>Paid templates share accurate visitor information, useful search taxonomy and clear calls to action. Higher levels add richer storytelling, media, review insight and conversion features. The free directory option provides essential business information, using the Visit Valechester logo as its image and offering no external website link.</p></header><div className="template-review-grid">{listingTemplateProfiles.map((profile)=>{const listing=listings.find((item)=>item.id===profile.listingId);const levelName=data.levels.find((item)=>item.id===profile.levelId)?.name??'Membership level';return <article key={profile.levelId} style={{'--template-accent':profile.accent} as CSSProperties}><div className="template-review-tier"><span>{levelName}</span><small>{profile.media}</small></div><h3>{profile.templateName}</h3><p>{profile.purpose}</p><h4>Template includes</h4><ul>{profile.includes.map((item)=><li key={item}><Check size={14}/>{item}</li>)}</ul>{listing&&<button onClick={()=>siteNavigate(`/place/${listing.id}`)}>View {listing.name} <ArrowRight size={15}/></button>}</article>})}</div><aside><strong>Applied across listings</strong><p>Every published business now uses the approved format for its organisation’s membership level. Website listing changes made in the CRM flow into the appropriate public format.</p></aside><aside className="template-review-note"><strong>Review integration</strong><p>The design supports an authorised Google Business Profile connection or a member-supplied Tripadvisor widget. Public Google Places review requests require a billing-enabled account, so listings use stored feedback themes until an approved source is connected.</p></aside></section></main></PublicShell>
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LegacyListingPage({ listing, actions, tier }: { listing: Listing; actions: VisitorActions; tier: string }) {
  const image = mediaUrl(listing.image)
  const [enquiring, setEnquiring] = useState(false)
  const [sent, setSent] = useState(false)
  const saved = actions.savedIds.includes(listing.id)
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); void recordSubmission('vv-listing-enquiries',{ listingId: listing.id, listingName: listing.name, ...values }).then(()=>setSent(true)).catch(()=>window.alert('The enquiry could not be saved. Please try again.')) }
  return <PublicShell savedCount={actions.savedIds.length}><main className={`place-page membership-${tier.toLowerCase().replace(/\s+/g,'-')}`}><div className="place-breadcrumb site-container"><button onClick={() => siteNavigate('/')}>Home</button><span>/</span><button onClick={() => siteNavigate('/#discover')}>{categoryGroup(listing)}</button><span>/</span><strong>{listing.name}</strong></div><section className="place-hero"><img src={image} alt={listing.name} /><div className="place-hero-copy site-container"><span className="site-eyebrow">{listing.category}</span>{tier === 'Tier 4' && <span className="place-partner-badge">Signature partner</span>}{tier === 'Tier 3' && <span className="place-partner-badge">Featured member</span>}<h1>{listing.name}</h1><p><MapPin size={16} />{listing.town}</p></div></section><div className="place-layout site-container"><article><p className="place-lede">{listing.shortDescription}</p><div className="place-good-for"><h2>Good for</h2><div>{listing.searchTags.map((item) => <span key={item}><Check size={13} />{item}</span>)}</div></div><h2>Your visit</h2><p>{listing.description}</p><div className="place-highlights"><h3>Visitors frequently mention</h3><div>{listing.reviewHighlights.map((item) => <span key={item}><Star size={14} />{item}</span>)}</div><small>Themes supported by recent visitor feedback.</small></div><h2>Good to know</h2><dl>{listing.goodToKnow.map((item) => <div key={item}><dt><Check size={14} /></dt><dd>{item}</dd></div>)}<div><dt>Opening times</dt><dd>{listing.openingHours}</dd></div><div><dt>Accessibility & facilities</dt><dd>{listing.facilities.join(' · ')}</dd></div><div><dt>Location</dt><dd>{listing.town}, Valechester</dd></div></dl></article><aside><span className="place-book-label">Plan your visit</span><h3>{listing.name}</h3>{sent ? <div className="place-enquiry-success" role="status"><Check size={22} /><strong>Enquiry sent</strong><small>The team will reply to the email address you provided.</small><button onClick={() => { setSent(false); setEnquiring(false) }}>Done</button></div> : enquiring ? <form className="place-enquiry" onSubmit={submit}><label>Name<input name="name" required /></label><label>Email<input name="email" type="email" required /></label><label>Preferred date<input name="preferredDate" type="date" required /></label><button>Send enquiry <ArrowRight size={14} /></button><button type="button" onClick={() => setEnquiring(false)}>Cancel</button></form> : <><button className="place-book" onClick={() => setEnquiring(true)}>Check availability <ArrowRight size={16} /></button><button className="place-save-button" onClick={() => actions.toggleSaved(listing)}><Heart size={15} fill={saved ? 'currentColor' : 'none'} />{saved ? 'Saved to your trip' : 'Save for later'}</button>{listing.phone && <span className="place-contact">Call {listing.phone}</span>}<div><CalendarDays size={18} /><span><strong>Flexible booking</strong><small>Check dates directly with the venue</small></span></div></>}</aside></div></main></PublicShell>
}

function ListingPage({ listing, actions }: { listing: Listing; actions: VisitorActions }) {
  const { data } = useCRM()
  const organisation = data.organisations.find((item) => item.id === listing.organisationId)
  const tier = organisation?.tier ?? 'Free Listing'
  const level=data.levels.find((item)=>item.name===tier)
  const configuredProfile=listingTemplateProfiles.find((item)=>item.levelId===level?.id)
  const profileId=configuredProfile?.levelId??(!level||level.price===0?'level-006':level.imageAllowance>=8||level.videoAllowance>=2?'level-001':level.imageAllowance>=4?'level-002':level.imageAllowance>=2?'level-003':'level-004')
  const baseProfile=listingTemplateProfiles.find((item)=>item.levelId===profileId)??listingTemplateProfiles.find((item)=>item.levelId==='level-006')!
  const profile={...baseProfile,imageCount:level?.imageAllowance??baseProfile.imageCount,videoCount:level?.videoAllowance??baseProfile.videoCount,taxonomyAllowance:level?.taxonomyAllowance??baseProfile.taxonomyAllowance}
  return <TemplateListingPage listing={listing} actions={actions} tier={tier} profile={profile}/>
}

function TemplateListingPage({ listing, actions, tier, profile }: { listing: Listing; actions: VisitorActions; tier: string; profile: ListingTemplateProfile }) {
  const image = mediaUrl(listing.image)
  const [enquiring, setEnquiring] = useState(false)
  const [sent, setSent] = useState(false)
  const saved = actions.savedIds.includes(listing.id)
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); void recordSubmission('vv-listing-enquiries',{ listingId: listing.id, listingName: listing.name, ...values }).then(()=>setSent(true)).catch(()=>window.alert('The enquiry could not be saved. Please try again.')) }
  if (profile.levelId === 'level-006') return <PublicShell savedCount={actions.savedIds.length}>
    <main className="free-listing-page">
      <div className="place-breadcrumb site-container"><button onClick={() => siteNavigate('/')}>Home</button><span>/</span><button onClick={() => siteNavigate('/#discover')}>{categoryGroup(listing)}</button><span>/</span><strong>{listing.name}</strong></div>
      <section className="free-listing-hero site-container">
        <div className="free-listing-brand-image" role="img" aria-label="Visit Valechester branded listing image"><BrandLogo inverse /></div>
        <div className="free-listing-heading"><span className="site-eyebrow plum">{listing.category}</span><h1>{listing.name}</h1><p><MapPin size={16}/>{listing.town}</p></div>
      </section>
      <section className="free-listing-details site-container">
        <article><span className="site-eyebrow plum">About</span><h2>About {listing.name}</h2><p className="place-lede">{listing.shortDescription}</p><p>{listing.description}</p></article>
        <aside><h2>Business information</h2><dl><div><dt>Category</dt><dd>{listing.category}</dd></div><div><dt>Location</dt><dd>{listing.town}, Valechester</dd></div><div><dt>Opening information</dt><dd>{listing.openingHours}</dd></div></dl><h3>Facilities</h3><ul>{listing.facilities.map((item)=><li key={item}><Check size={14}/>{item}</li>)}</ul></aside>
      </section>
    </main>
  </PublicShell>
  const managedImages=(listing.media??[]).filter((item)=>item.type==='image').map((item)=>mediaUrl(item.url))
  const videos=(listing.media??[]).filter((item)=>item.type==='video'&&item.url).slice(0,profile.videoCount)
  const galleryPool = Array.from(new Set([image,...managedImages].filter(Boolean)))
  const gallery = galleryPool.slice(0,Math.min(profile.imageCount,5))
  const directions=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${listing.name}, ${listing.town}, Valechester`)}`
  const mapEmbed=`https://www.google.com/maps?q=${encodeURIComponent(`${listing.name}, ${listing.town}, Valechester`)}&output=embed`
  const actionLabel = profile.action==='quote'?'Request a quote':'Make an enquiry'
  const sectionTitle = profile.action==='quote'?'Services for your business':'About this place'
  const accessFacilities=listing.facilities.filter((item)=>/access|step|hearing|wheel|toilet/i.test(item))
  const generalFacilities=listing.facilities.filter((item)=>!accessFacilities.includes(item))
  return <PublicShell savedCount={actions.savedIds.length}>
    <main className={`place-page template-place-page membership-${tier.toLowerCase().replace(/\s+/g,'-')}`} style={{'--template-accent':profile.accent} as CSSProperties}>
      <div className="place-breadcrumb site-container"><button onClick={() => siteNavigate('/')}>Home</button><span>/</span><button onClick={() => siteNavigate('/#discover')}>{categoryGroup(listing)}</button><span>/</span><strong>{listing.name}</strong></div>
      <section className="place-hero"><img src={image} alt={listing.name} /><div className="place-hero-copy site-container"><span className="site-eyebrow">{listing.category}</span><h1>{listing.name}</h1><p><MapPin size={16} />{listing.town}</p></div></section>
      {profile.showPlanningSummary&&<div className="place-planning-summary"><div className="site-container"><span><strong>Best for</strong><small>{listing.searchTags.slice(0,2).join(' · ')}</small></span><span><strong>Allow</strong><small>{profile.levelId==='level-001'?'Half a day or more':'Around two hours'}</small></span><span><strong>Plan ahead</strong><small>{listing.goodToKnow[0]}</small></span></div></div>}
      {profile.imageCount>1&&<section className="member-media site-container"><header><div><span className="site-eyebrow plum">See the experience</span><h2>Gallery</h2></div><small>{gallery.length} images{videos.length?` · ${videos.length} ${videos.length===1?'video':'videos'}`:''}</small></header><div className={`member-media-grid media-count-${gallery.length}`}>{gallery.map((src,index)=>{const managed=(listing.media??[]).find((item)=>item.type==='image'&&mediaUrl(item.url)===src);return <img key={src} src={src} alt={managed?.alt||`${listing.name} gallery view ${index+1}`}/>})}</div>{videos.map((video)=><a className="member-video" href={video.url} target="_blank" rel="noreferrer" key={video.id}><PlayCircle size={22}/><span><strong>{video.title||`Watch ${listing.name}`}</strong><small>Open video</small></span><ArrowRight size={16}/></a>)}</section>}
      {profile.showAtGlance&&<section className="listing-at-glance"><div className="site-container"><header><span className="site-eyebrow plum">Visitor essentials</span><h2>At a glance</h2></header><dl><div><dt>Location</dt><dd>{listing.town}, Valechester</dd></div><div><dt>Experience</dt><dd>{listing.category}</dd></div><div><dt>Booking</dt><dd>{listing.bookingUrl?'Online booking available':'Check directly before visiting'}</dd></div><div><dt>Opening information</dt><dd>{listing.openingHours}</dd></div></dl></div></section>}
      <div className="place-layout site-container">
        <article>
          <p className="place-lede">{listing.shortDescription}</p>
          {profile.levelId!=='level-004'&&<div className="place-good-for"><h2>{profile.action==='quote'?'Services and strengths':'Good for'}</h2><div>{listing.searchTags.slice(0,profile.goodForLimit).map((item)=><span key={item}><Check size={13}/>{item}</span>)}</div></div>}
          <section className="listing-feature-section"><span className="site-eyebrow plum">{profile.action==='quote'?'What we provide':'The story'}</span><h2>{sectionTitle}</h2><p>{listing.description}</p><p>Use the practical information below to decide whether it suits your plans, then check current availability and any date-specific details directly with the business.</p></section>
          {profile.levelId==='level-004'&&<section className="listing-feature-section listing-taxonomy"><span className="site-eyebrow plum">Plan the right visit</span><h2>Visitor information</h2><p>These details help visitors find experiences that suit their interests and practical needs.</p><div><section><h3>Visitor interests</h3><div>{visitorTaxonomyFor(listing).map((item)=><span key={item}><Check size={13}/>{item}</span>)}</div><h3 className="taxonomy-subheading">Search filters</h3><div>{listing.searchTags.slice(0,profile.taxonomyAllowance).map((item)=><span key={item}><Search size={13}/>{item}</span>)}</div></section><section><h3>Good to know</h3><ul>{listing.goodToKnow.map((item)=><li key={item}><Check size={14}/>{item}</li>)}</ul></section></div></section>}
          {profile.showReviews&&<section className="listing-feature-section listing-reviews"><span className="site-eyebrow plum">Visitor feedback</span><h2>{profile.action==='quote'?'What clients value':'What visitors say'}</h2><p>Feedback themes manually recorded by the destination team help people understand what stands out before they visit.</p><div>{listing.reviewHighlights.map((item)=><blockquote key={item}><Star size={16}/><strong>{item}</strong><small>Manually recorded feedback theme</small></blockquote>)}</div>{listing.reviewSites?.length&&<nav aria-label="Review sites">{listing.reviewSites.filter((site)=>site.url).map((site)=><a key={site.id} href={site.url} target="_blank" rel="noreferrer">Reviews on {site.name} <ArrowRight size={13}/></a>)}</nav>}</section>}
          <section className="listing-feature-section listing-access"><span className="site-eyebrow plum">Plan with confidence</span><h2>Accessibility information</h2><p>Accessibility information is available on every paid member listing. Contact the business if you need details for a specific visit.</p><div><span><Accessibility size={20}/><strong>{accessFacilities.length?accessFacilities.join(' · '):'Ask the venue about step-free routes and individual access requirements'}</strong></span>{listing.email&&<a href={`mailto:${listing.email}`}>Contact about accessibility <ArrowRight size={14}/></a>}</div></section>
          <section className="listing-feature-section listing-facilities"><span className="site-eyebrow plum">Useful details</span><h2>Facilities</h2><div><section><h3>On site</h3><ul>{generalFacilities.map((item)=><li key={item}><Check size={14}/>{item}</li>)}</ul></section><section><h3>Access and support</h3><ul>{(accessFacilities.length?accessFacilities:['Contact the venue for access details']).map((item)=><li key={item}><Check size={14}/>{item}</li>)}</ul></section><section><h3>Before you travel</h3><ul>{listing.goodToKnow.map((item)=><li key={item}><Check size={14}/>{item}</li>)}</ul></section></div></section>
          <section className="listing-feature-section listing-opening"><span className="site-eyebrow plum">When to visit</span><h2>Opening information</h2><div><Clock3 size={22}/><span><strong>{listing.openingHours}</strong>{listing.website&&<small>Check the official website for seasonal changes and exceptions.</small>}</span></div></section>
          <section className="listing-feature-section listing-contact"><span className="site-eyebrow plum">Find and contact</span><h2>Location and contact</h2><div className={profile.showMap?'has-map':''}><address><strong>{listing.name}</strong><span>{listing.town}, Valechester</span>{listing.phone&&<a href={`tel:${listing.phone.replace(/\s/g,'')}`}>{listing.phone}</a>}{listing.email&&<a href={`mailto:${listing.email}`}>{listing.email}</a>}{listing.website&&<a href={listing.website}>Official website <ArrowRight size={13}/></a>}</address>{profile.showMap&&<div className="listing-map"><iframe title={`Map showing ${listing.name}`} src={mapEmbed} loading="lazy" referrerPolicy="no-referrer-when-downgrade"/><a href={directions}>Open directions <ArrowRight size={13}/></a></div>}</div></section>
          {profile.showAwards&&<section className="listing-feature-section listing-awards"><span className="site-eyebrow plum">Verified recognition</span><h2>Awards and accreditations</h2>{listing.awards?.length?<div>{listing.awards.map((award)=><span key={award}><Star size={18}/><strong>{award}</strong></span>)}</div>:<p>No verified awards or accreditations have been supplied for this listing.</p>}</section>}
          {profile.showRelated&&<section className="listing-feature-section listing-related"><span className="site-eyebrow plum">Continue planning</span><h2>Make it part of your trip</h2><div>{guides.slice(0,profile.levelId==='level-001'?3:2).map((guide)=><article key={guide.slug}><img src={guide.image} alt=""/><span>{guide.eyebrow}</span><h3>{guide.title}</h3><p>{guide.description}</p><button onClick={()=>siteNavigate(`/guide/${guide.slug}`)}>Explore <ArrowRight size={14}/></button></article>)}</div></section>}
        </article>
        <aside><span className="place-book-label">{profile.action==='quote'?'Business enquiry':'Plan your visit'}</span><h3>{listing.name}</h3>{sent?<div className="place-enquiry-success" role="status"><Check size={22}/><strong>Enquiry sent</strong><small>The team will reply to the email address you provided.</small><button onClick={()=>{setSent(false);setEnquiring(false)}}>Done</button></div>:enquiring?<form className="place-enquiry" onSubmit={submit}><label>Name<input name="name" autoComplete="name" required/></label><label>Email<input name="email" type="email" autoComplete="email" required/></label><label>{profile.action==='quote'?'What do you need?':'Preferred date'}<input name="preferredDate" type={profile.action==='quote'?'text':'date'} required/></label><button>Send enquiry <ArrowRight size={14}/></button><button type="button" onClick={()=>setEnquiring(false)}>Cancel</button></form>:<>{profile.action==='book'&&listing.bookingUrl?<a className="place-book" href={listing.bookingUrl}>Book direct <ArrowRight size={16}/></a>:profile.action==='website'&&listing.website?<a className="place-book" href={listing.website}>Visit official website <ArrowRight size={16}/></a>:<button className="place-book" onClick={()=>setEnquiring(true)}>{actionLabel} <ArrowRight size={16}/></button>}{profile.action==='quote'&&listing.website?<a className="place-save-button" href={listing.website}>Visit website <ArrowRight size={14}/></a>:<button className="place-save-button" aria-pressed={saved} onClick={()=>actions.toggleSaved(listing)}><Heart size={15} fill={saved?'currentColor':'none'}/>{saved?'Saved to your trip':'Save for later'}</button>}{profile.action==='book'&&listing.website&&<a className="place-contact" href={listing.website}>Visit official website</a>}{listing.phone&&<span className="place-contact">Call {listing.phone}</span>}<div><CalendarDays size={18}/><span><strong>{profile.action==='quote'?'Discuss your requirements':'Plan with confidence'}</strong><small>{listing.openingHours}</small></span></div></>}</aside>
      </div>
    </main>
  </PublicShell>
}

const contentTypeByPath:Record<string,ContentPage['type']>={guides:'Guide',itineraries:'Itinerary',trails:'Trail'}
function ContentDirectoryPage({kind,savedCount}:{kind:ContentPage['type'];savedCount:number}){const {data}=useCRM();const pages=publishedPages(data.contentPages).filter((page)=>page.type===kind);const plural=kind==='Itinerary'?'itineraries':`${kind.toLowerCase()}s`;return <PublicShell savedCount={savedCount}><main><PageIntro eyebrow="Ideas and inspiration" title={`${kind}s for your visit.`} description={kind==='Guide'?'Practical recommendations to help you choose what to do.':kind==='Itinerary'?'Ready made plans for making the most of your time in Valechester.':'Follow Valechester stories, landmarks and landscapes at your own pace.'}/><section className="content-directory site-container"><div className="site-card-grid">{pages.map((page)=><article className="site-card content-card" key={page.id}><button className="site-card-open" onClick={()=>siteNavigate(`/${plural}/${page.slug}`)}><img src={mediaUrl(page.image)} alt=""/></button><div className="site-card-copy"><span>{page.type}</span><h2>{page.title}</h2><p>{page.summary}</p><button className="site-text-link" onClick={()=>siteNavigate(`/${plural}/${page.slug}`)}>Read more <ArrowRight size={15}/></button></div></article>)}</div>{!pages.length&&<div className="visitor-empty">The destination team is preparing new {kind.toLowerCase()}s.</div>}</section></main></PublicShell>}
function ContentDetailPage({page,savedCount}:{page:ContentPage;savedCount:number}){return <PublicShell savedCount={savedCount}><main><PageIntro eyebrow={page.type} title={page.title} description={page.summary} image={mediaUrl(page.image)}/><article className="content-detail site-container">{page.body.split(/\n+/).filter(Boolean).map((paragraph,index)=>paragraph.startsWith('## ')?<h2 key={index}>{paragraph.slice(3)}</h2>:paragraph.startsWith('- ')?<ul key={index}><li>{paragraph.slice(2)}</li></ul>:index===0?<p className="place-lede" key={index}>{paragraph}</p>:<p key={index}>{paragraph}</p>)}</article></main></PublicShell>}

function ManagedLandingPage({ content, savedCount }: { content: WebsitePageContent; savedCount: number }) {
  const image = content.heroImage ? mediaUrl(content.heroImage) : undefined
  return <PublicShell savedCount={savedCount}><main><section className={`visitor-page-intro${image ? ' has-image' : ''}`}><div className="site-container"><SiteLink to="/" className="visitor-back"><ArrowLeft size={14}/>Back to destination</SiteLink><span className="site-eyebrow">{content.eyebrow}</span><h1>{content.title}</h1><p>{content.description}</p></div>{image && <img src={image} alt=""/>}</section><ManagedBlocks blocks={content.blocks}/></main></PublicShell>
}

function InteractiveMapPage({ savedCount }: { savedCount: number }) {
  const { data } = useCRM()
  const points = useMemo(() => publicMapPoints(data.listings, data.events), [data.events, data.listings])
  const open = (point: MapPoint) => siteNavigate(point.path)
  return <PublicShell savedCount={savedCount}><main><PageIntro eyebrow="Find your way" title="Explore Valechester your way." description="Search places, events and neighbourhoods on one interactive map, then open anything that catches your eye."/><section className="public-map-page site-container"><InteractiveMap points={points} onOpen={open}/></section></main></PublicShell>
}

const infoPages: Record<string, { eyebrow: string; title: string; description: string; sections: Array<[string, string]> }> = {
  privacy: { eyebrow: 'Visitor information', title: 'Privacy', description: 'How Visit Valechester handles visitor information.', sections: [['What we collect', 'We collect only the information needed to answer enquiries, provide requested updates and improve your visit planning. Saved places remain on your device unless you choose to share them.'], ['Production approach', 'We keep personal information only for as long as it is needed, use approved service providers and respect your data protection rights.']] },
  cookies: { eyebrow: 'Visitor information', title: 'Cookies', description: 'How this website uses cookies and local storage.', sections: [['Essential storage', 'Essential local storage remembers saved places, cookie choices and account session details.'], ['Analytics and marketing', 'Analytics and marketing cookies are used only with consent. You can change your choice at any time.']] },
  accessibility: { eyebrow: 'Accessibility statement', title: 'Accessible Valechester', description: 'How we support inclusive visits and accessible use of this website.', sections: [['Before you travel', 'Venue listings show accessibility and facility information supplied through the destination CRM. Contact individual venues when you need details for a specific visit.'], ['Our website accessibility target', 'This website is designed and maintained against the Web Content Accessibility Guidelines (WCAG) 2.2 at level AA. We test keyboard access, visible focus, zoom and reflow, colour contrast, form labels, page structure and common assistive-technology journeys.'], ['What we have built in', 'The website includes skip links, keyboard-operable controls, labelled forms, accessible dialog behaviour, status announcements, reduced-motion support and non-drag alternatives for interactions that can use dragging.'], ['Testing and review', 'Accessibility is reviewed whenever the design system or key journeys change. Automated checks are used alongside manual keyboard, zoom and screen-reader testing because automated testing alone cannot establish full conformance.'], ['Report an accessibility problem', 'If you cannot access information or complete a task, contact visitor information using the link below. Tell us the page, what you were trying to do and the format or support you need.']] },
}

function InfoPage({ page, savedCount }: { page: string; savedCount: number }) {
  const content = infoPages[page]
  if (!content) return <NotFoundPage savedCount={savedCount} />
  return <PublicShell savedCount={savedCount}><main><PageIntro eyebrow={content.eyebrow} title={content.title} description={content.description} /><section className="info-page site-container">{content.sections.map(([title, body]) => <article key={title}><h2>{title}</h2><p>{body}</p></article>)}<div className="info-contact"><Mail size={20} /><div><strong>Need this in another format?</strong><p>Use the visitor information form and the team will help.</p></div><button onClick={() => siteNavigate('/contact?topic=accessibility')}>Contact visitor information</button></div></section></main></PublicShell>
}

const contactTopics: Record<string, string> = { membership: 'Become a member', event: 'Submit an event', 'travel-trade': 'Travel trade enquiry', 'visitor-information': 'Visitor information', accessibility: 'Accessibility request' }

function ContactPage({ savedCount }: { savedCount: number }) {
  const topic = new URLSearchParams(window.location.search).get('topic') ?? 'visitor-information'
  const [sent, setSent] = useState(false)
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const values=Object.fromEntries(new FormData(event.currentTarget)); void recordSubmission('vv-contact-enquiries',{ topic, ...values }).then(()=>setSent(true)).catch(()=>window.alert('The enquiry could not be saved. Please try again.')) }
  return <PublicShell savedCount={savedCount}><main><PageIntro eyebrow="Talk to the team" title={contactTopics[topic] ?? 'Contact Visit Valechester'} description="Try the enquiry workflow in this fictional destination." /><section className="contact-page site-container">{sent ? <div className="contact-success" role="status"><Check size={28} /><h2>Demo enquiry saved.</h2><p>Your submission is in the demonstration CRM. No real destination team will respond.</p><button onClick={() => siteNavigate('/')}>Return home</button></div> : <form onSubmit={submit}><label>Enquiry type<select name="topic" defaultValue={topic}>{Object.entries(contactTopics).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><div><label>Name<input name="name" required /></label><label>Email<input name="email" type="email" required /></label></div><label>Message<textarea name="message" required rows={6} placeholder="How can the Valechester team help?" /></label><button>Save demo enquiry <ArrowRight size={15} /></button><small>This is a demonstration. Do not submit sensitive personal information.</small></form>}</section></main></PublicShell>
}

function NotFoundPage({ savedCount }: { savedCount: number }) {
  return <PublicShell savedCount={savedCount}><main><section className="not-found-page"><Search size={28} /><h1>We couldn’t find that page.</h1><p>Try exploring the latest places, events and ideas instead.</p><button onClick={() => siteNavigate('/')}>Return to Valechester</button></section></main></PublicShell>
}

function CookiePreferences(){
  const [choice,setChoice]=useState(()=>localStorage.getItem('visit-cookie-consent'))
  const [custom,setCustom]=useState(false)
  if(choice)return null
  const save=(value:'essential'|'analytics')=>{localStorage.setItem('visit-cookie-consent',value);setChoice(value);if(value==='analytics')recordAnalytics('page_view')}
  return <aside className="cookie-preferences" role="region" aria-label="Cookie preferences"><div><strong>Choose your cookie settings</strong><p>Essential storage keeps saved places and account sessions working. Optional analytics can help the destination team improve the site.</p>{custom&&<label><input type="checkbox" disabled checked/> Essential storage</label>}</div><div>{custom?<><button onClick={()=>save('essential')}>Save essential only</button><button onClick={()=>save('analytics')}>Allow analytics</button></>:<><button onClick={()=>save('essential')}>Essential only</button><button onClick={()=>setCustom(true)}>Choose settings</button><button onClick={()=>save('analytics')}>Accept optional cookies</button></>}</div></aside>
}

export function PublicSite() {
  const { data } = useCRM()
  const { features } = useFeatures()
  const [location, setLocation] = useState(() => `${window.location.pathname}${window.location.search}${window.location.hash}`)
  const [savedIds, setSavedIds] = useState<string[]>(readSavedPlaces)
  const [notice, setNotice] = useState('')
  const liveContent=useMemo(()=>publishedPages(data.contentPages),[data.contentPages])
  useEffect(()=>{
    const path=window.location.pathname
    const parts=path.split('/').filter(Boolean)
    const listing=parts[0]==='place'?data.listings.find((item)=>item.id===parts[1]):undefined
    const preview=new URLSearchParams(window.location.search).get('preview')==='true'
    const content=contentTypeByPath[parts[0]]?(preview?data.contentPages:liveContent).find((item)=>item.slug===parts[1]):undefined
    const titles:Record<string,string>={'/':'Visit Valechester','/events':"What's on in Valechester",'/map':'Explore the Valechester map','/plan':'Plan your visit to Valechester','/guides':'Valechester visitor guides','/itineraries':'Valechester itineraries','/trails':'Valechester trails','/saved':'Saved places','/contact':'Contact Visit Valechester','/accessibility':'Accessible Valechester','/privacy':'Privacy','/cookies':'Cookies'}
    const websitePage=websitePageForPath(data.websitePages,path)
    const websiteContent=websitePage?websitePageContent(websitePage,preview):undefined
    const title=listing?.name??content?.metaTitle??content?.title??websiteContent?.metaTitle??websiteContent?.title??titles[path]??'Visit Valechester'
    const description=listing?.shortDescription??content?.metaDescription??content?.summary??websiteContent?.metaDescription??websiteContent?.description??data.workspace.strapline
    document.title=`${title} | ${data.workspace.destinationName}`
    let meta=document.querySelector<HTMLMetaElement>('meta[name="description"]');if(!meta){meta=document.createElement('meta');meta.name='description';document.head.append(meta)}meta.content=description
    let canonical=document.querySelector<HTMLLinkElement>('link[rel="canonical"]');if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.append(canonical)}canonical.href=`${window.location.origin}${path}`
    let og=document.querySelector<HTMLMetaElement>('meta[property="og:title"]');if(!og){og=document.createElement('meta');og.setAttribute('property','og:title');document.head.append(og)}og.content=title
  },[data.contentPages,data.listings,data.websitePages,data.workspace.destinationName,data.workspace.strapline,liveContent,location])
  useEffect(() => {
    const listener = () => { setLocation(`${window.location.pathname}${window.location.search}${window.location.hash}`); if (!window.location.hash) window.scrollTo({ top: 0 }) }
    window.addEventListener('popstate', listener)
    return () => window.removeEventListener('popstate', listener)
  }, [])
  useEffect(() => {
    if (window.location.hash) return
    const frame = window.requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>('#site-content h1')
      if (heading) {
        heading.tabIndex = -1
        heading.focus({ preventScroll: true })
      }
    })
    return () => window.cancelAnimationFrame(frame)
  }, [location])
  useEffect(()=>{const params=new URLSearchParams(window.location.search);if(params.get('preview')!=='true')recordAnalytics('page_view')},[location])
  if (!features.publicWebsite) return <main className="site-disabled"><BrandLogo /><h1>Website module is not enabled</h1><p>This destination currently uses the CRM workspace without a public website.</p><a href="/crm">Open destination workspace</a></main>
  const published = data.listings.filter((listing) => listing.status === 'Published')
  const toggleSaved = (listing: Listing) => {
    setSavedIds((current) => {
      const removing = current.includes(listing.id)
      const next = removing ? current.filter((id) => id !== listing.id) : [...current, listing.id]
      localStorage.setItem(SAVED_KEY, JSON.stringify(next))
      setNotice(removing ? `${listing.name} removed from saved places` : `${listing.name} saved for your trip`)
      window.setTimeout(() => setNotice(''), 2200)
      return next
    })
  }
  const actions = { savedIds, toggleSaved }
  const path = window.location.pathname
  const parts = path.split('/').filter(Boolean)
  const schemaListing=parts[0]==='place'?published.find((item)=>item.id===parts[1]):undefined
  const structuredData={
    '@context':'https://schema.org',
    '@graph':[
      {'@type':'Organization','@id':`${window.location.origin}/#organisation`,name:data.workspace.destinationName,url:window.location.origin,email:data.workspace.contactEmail,address:data.workspace.address},
      {'@type':'BreadcrumbList',itemListElement:[{ '@type':'ListItem',position:1,name:'Home',item:window.location.origin},...(path==='/'?[]:[{'@type':'ListItem',position:2,name:schemaListing?.name??document.title.split(' | ')[0],item:`${window.location.origin}${path}`}])]},
      ...(schemaListing?[{'@type':schemaListing.category==='Accommodation'?'Hotel':schemaListing.category==='Food & drink'?'Restaurant':'TouristAttraction',name:schemaListing.name,description:schemaListing.shortDescription,url:`${window.location.origin}${path}`,image:mediaUrl(schemaListing.image),address:{'@type':'PostalAddress',addressLocality:schemaListing.town},telephone:schemaListing.phone,sameAs:schemaListing.website?[schemaListing.website]:[]}]:[]),
    ],
  }
  let page: ReactNode
  if (path === '/') page = <HomePage key={location} actions={actions} location={location} />
  else if(path==='/map'&&features.interactiveMap) page=<InteractiveMapPage savedCount={savedIds.length}/>
  else if (path === '/events' && features.events) page = <EventsPage savedCount={savedIds.length} />
  else if (path === '/account' && features.events) page = <EventAccountPage key={location} savedCount={savedIds.length} />
  else if (path === '/submit-event' && features.events) page = <SubmitEventPage key={location} savedCount={savedIds.length} />
  else if (path === '/saved') page = <SavedPage listings={published} actions={actions} />
  else if (path === '/plan' && features.itineraries) page = <PlanPage listings={published} actions={actions} />
  else if (path === '/listing-templates') page = <ListingTemplatesPage listings={published} actions={actions} />
  else if (path === '/contact') page = <ContactPage savedCount={savedIds.length} />
  else if (features.itineraries&&contentTypeByPath[parts[0]]&&parts.length===1) page=<ContentDirectoryPage kind={contentTypeByPath[parts[0]]} savedCount={savedIds.length}/>
  else if (features.itineraries&&contentTypeByPath[parts[0]]&&parts[1]) {const preview=new URLSearchParams(window.location.search).get('preview')==='true';const content=(preview?data.contentPages:liveContent).find((item)=>item.type===contentTypeByPath[parts[0]]&&item.slug===parts[1]);page=content?<ContentDetailPage page={content} savedCount={savedIds.length}/>:<NotFoundPage savedCount={savedIds.length}/>}
  else if (['/privacy', '/cookies', '/accessibility'].includes(path)) page = <InfoPage page={parts[0]} savedCount={savedIds.length} />
  else if (parts[0] === 'guide' && features.itineraries) page = <GuidePage slug={parts[1]} listings={published} actions={actions} />
  else if (parts[0] === 'neighbourhood') page = <NeighbourhoodPage slug={parts[1]} listings={published} actions={actions} />
  else if (parts[0] === 'place') {
    const listing = published.find((item) => item.id === parts[1])
    page = listing ? <ListingPage listing={listing} actions={actions} /> : <NotFoundPage savedCount={savedIds.length} />
  } else { const managedPage=websitePageForPath(data.websitePages,path);const content=managedPage?websitePageContent(managedPage,new URLSearchParams(window.location.search).get('preview')==='true'):undefined;page=content?<ManagedLandingPage content={content} savedCount={savedIds.length}/>:<NotFoundPage savedCount={savedIds.length}/> }
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(structuredData).replaceAll('<','\\u003c')}}/>{page}<CookiePreferences/>{notice && <div className="site-toast" role="status"><Check size={16} />{notice}</div>}</>
}
