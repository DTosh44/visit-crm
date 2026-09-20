import {
  Accessibility, ArrowLeft, ArrowRight, CalendarDays, Check, ChevronDown, Clock3,
  Heart, LogIn, LogOut, Mail, MapPin, Menu, PlayCircle, Search, Sparkles, Star, TrainFront, UserPlus, X,
} from 'lucide-react'
import { useEffect, useMemo, useState, type AnchorHTMLAttributes, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import { BrandLogo } from './components/BrandLogo'
import { useFeatures } from './features'
import { guides, imageLibrary, neighbourhoods } from './siteData'
import { useCRM } from './store'
import { tenant } from './tenant'
import { filtersForVisitorQuery, matchesVisitorOption, matchesVisitorQuery, visitorFilterGroups, visitorTaxonomyFor } from './listingTaxonomy'
import type { DestinationEvent, EventDraft, EventFormat, Listing } from './types'

const categories = ['All', 'Things to do', 'Places to stay', 'Food & drink', 'Shopping']
const SAVED_KEY = 'visit-valechester-saved-v1'
const EVENT_ACCOUNTS_KEY = 'visit-valechester-event-accounts-v1'
const EVENT_SESSION_KEY = 'visit-valechester-event-session-v1'
interface EventAccount { id: string; name: string; email: string; organisation: string; password: string }
function readEventAccounts(): EventAccount[] { try { return JSON.parse(localStorage.getItem(EVENT_ACCOUNTS_KEY) ?? '[]') as EventAccount[] } catch { return [] } }
function readEventAccount() { const id=localStorage.getItem(EVENT_SESSION_KEY); return readEventAccounts().find((item)=>item.id===id)??null }
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
function recordSubmission(key: string, value: Record<string, unknown>) {
  try { const current = JSON.parse(localStorage.getItem(key) ?? '[]') as unknown[]; localStorage.setItem(key, JSON.stringify([{ ...value, submittedAt: new Date().toISOString() }, ...current])) } catch { localStorage.setItem(key, JSON.stringify([{ ...value, submittedAt: new Date().toISOString() }])) }
}

function categoryGroup(listing: Listing) {
  const value = `${listing.category} ${listing.name}`.toLowerCase()
  if (/hotel|accommodation|stay|lodge|room/.test(value)) return 'Places to stay'
  if (/restaurant|food|drink|distill|café|bar/.test(value)) return 'Food & drink'
  if (/shop|book|retail/.test(value)) return 'Shopping'
  return 'Things to do'
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
  const image = imageLibrary[listing.image] ?? imageLibrary.hero
  const saved = savedIds.includes(listing.id)
  return (
    <article className="site-card">
      <div className="site-card-image">
        <button className="site-card-open" onClick={() => siteNavigate(`/place/${listing.id}`)} aria-label={`View ${listing.name}`}>{tier === 'Free Listing' ? <span className="site-card-brand-image"><BrandLogo inverse /></span> : <img src={image} alt="" loading="lazy" decoding="async" />}</button>
        <span className="site-card-category">{categoryGroup(listing)}</span>
        <button className={`site-card-save${saved ? ' saved' : ''}`} onClick={() => toggleSaved(listing)} aria-label={`${saved ? 'Remove' : 'Save'} ${listing.name}`}><Heart size={18} fill={saved ? 'currentColor' : 'none'} /></button>
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
  const closeMenu = () => setMenuOpen(false)
  return (
    <>
      <div className="site-utility"><div><span>{tenant.location}</span><nav><SiteLink to="/plan">Plan your visit</SiteLink><SiteLink to="/accessibility">Accessibility</SiteLink><SiteLink to="/saved">Saved places{savedCount ? ` (${savedCount})` : ''}</SiteLink><SiteLink to="/account">Event organiser login</SiteLink><a href="/crm">Partner login</a></nav></div></div>
      <header className="site-header">
        <SiteLink to="/" className="site-logo" aria-label={`${tenant.name} home`}><BrandLogo /></SiteLink>
        <nav className={menuOpen ? 'site-nav open' : 'site-nav'} aria-label="Main navigation">
          <SiteLink to="/?category=Things%20to%20do#discover" onClick={closeMenu}>Things to do <ChevronDown size={14} /></SiteLink>
          {features.events && <SiteLink to="/events" onClick={closeMenu}>What’s on</SiteLink>}
          <SiteLink to="/?category=Places%20to%20stay#discover" onClick={closeMenu}>Stay</SiteLink>
          <SiteLink to="/?category=Food%20%26%20drink#discover" onClick={closeMenu}>Food & drink</SiteLink>
          {features.itineraries && <SiteLink to="/#ideas" onClick={closeMenu}>Ideas & inspiration</SiteLink>}
          <SiteLink to="/plan" onClick={closeMenu}>Plan your visit</SiteLink>
        </nav>
        <div className="site-header-actions"><button onClick={() => siteNavigate('/?search=1')} aria-label="Search"><Search size={20} /></button><SiteLink to="/plan" className="site-plan-button">Plan my trip</SiteLink><button className="site-menu-button" onClick={() => setMenuOpen((value) => !value)} aria-label="Toggle menu">{menuOpen ? <X size={22} /> : <Menu size={22} />}</button></div>
      </header>
    </>
  )
}

function SiteFooter() {
  const { features } = useFeatures()
  return <footer className="site-footer"><div className="site-footer-main"><div><BrandLogo inverse /><p>{tenant.description}</p></div><div><strong>Explore</strong><SiteLink to="/?category=Things%20to%20do#discover">Things to do</SiteLink>{features.events && <SiteLink to="/events">What’s on</SiteLink>}<SiteLink to="/?category=Places%20to%20stay#discover">Places to stay</SiteLink>{features.itineraries && <SiteLink to="/#ideas">Ideas & inspiration</SiteLink>}</div><div><strong>Plan</strong><SiteLink to="/plan">Getting here</SiteLink><SiteLink to="/plan">Getting around</SiteLink><SiteLink to="/accessibility">Accessible Valechester</SiteLink><SiteLink to="/contact?topic=visitor-information">Visitor information</SiteLink></div><div><strong>Work with us</strong><a href="/crm">Partner login</a><SiteLink to="/contact?topic=membership">Become a member</SiteLink><SiteLink to="/submit-event">Submit an event</SiteLink><SiteLink to="/account">Event organiser account</SiteLink><SiteLink to="/contact?topic=travel-trade">Travel trade</SiteLink></div></div><div className="site-footer-bottom"><span>© 2026 {tenant.legalName}. All rights reserved.</span><span><SiteLink to="/privacy">Privacy</SiteLink> · <SiteLink to="/cookies">Cookies</SiteLink> · <SiteLink to="/accessibility">Accessibility</SiteLink></span></div></footer>
}

function PublicShell({ savedCount, children }: { savedCount: number; children: ReactNode }) {
  return <div className="public-site"><SiteHeader savedCount={savedCount} />{children}<SiteFooter /></div>
}

function PageIntro({ eyebrow, title, description, image }: { eyebrow: string; title: string; description: string; image?: string }) {
  return <section className={`visitor-page-intro${image ? ' has-image' : ''}`}><div className="site-container"><SiteLink to="/" className="visitor-back"><ArrowLeft size={14} />Back to Valechester</SiteLink><span className="site-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{image && <img src={image} alt="" />}</section>
}

function NewsletterSignup() {
  const [email, setEmail] = useState('')
  const [joined, setJoined] = useState(false)
  const submit = (event: FormEvent) => { event.preventDefault(); if (email.trim()) { recordSubmission('vv-newsletter-signups',{ email }); setJoined(true) } }
  return <section className="site-newsletter"><div><span className="site-eyebrow">A little Valechester, now and then</span><h2>{joined ? 'You’re on the list.' : 'Good ideas for your next escape.'}</h2>{joined ? <div className="newsletter-success" role="status"><Check size={20} /><p>We’ll send the next Valechester edit to {email}.</p><button onClick={() => { setJoined(false); setEmail('') }}>Use another email</button></div> : <><p>Monthly inspiration, new openings and events worth planning around.</p><form onSubmit={submit}><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Your email address" aria-label="Email address" /><button>Count me in <ArrowRight size={16} /></button></form><small>No clutter. Unsubscribe whenever you like.</small></>}</div></section>
}

function HomePage({ actions, location }: { actions: VisitorActions; location: string }) {
  const { data } = useCRM()
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
  const submitSearch = (event: FormEvent) => { event.preventDefault(); runSearch(query) }
  const quickSearch = (term: string) => runSearch(term)
  const toggleFilter=(groupId:string,optionId:string)=>setActiveFilters((current)=>{const selected=current[groupId]??[];return {...current,[groupId]:selected.includes(optionId)?selected.filter((id)=>id!==optionId):[...selected,optionId]}})
  const activeOptions=visitorFilterGroups.flatMap((group)=>group.options.filter((option)=>(activeFilters[group.id]??[]).includes(option.id)).map((option)=>({...option,groupId:group.id})))
  const clearFilters=()=>{setActiveFilters({});setTown('All areas');setCategory('All')}

  return <PublicShell savedCount={actions.savedIds.length}>
    <main>
      <section className="site-hero">
        <img src={imageLibrary.hero} alt="Visitors walking beside the river in historic Valechester" fetchPriority="high" />
        <div className="site-hero-shade" />
        <div className="site-hero-content"><span className="site-eyebrow">Find your kind of remarkable</span><h1>A town with stories<br />in every direction.</h1><p>{tenant.strapline}</p>
          <form className="site-search" onSubmit={submitSearch}><Search size={21} /><input list="visitor-search-suggestions" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try ‘rainy day with children’ or ‘romantic evening’" aria-label="Search Valechester" /><datalist id="visitor-search-suggestions">{Array.from(new Set(published.flatMap((item)=>[item.category,item.town,...searchableTagsFor(item),...visitorTaxonomyFor(item)]))).map((item)=><option key={item} value={item}/>)}</datalist><button>Search</button></form>
          <div className="site-popular"><span>Popular:</span><button onClick={() => quickSearch('family')}>Family days</button><button onClick={() => quickSearch('free')}>Free things</button><button onClick={() => quickSearch('heritage')}>Heritage</button></div>
        </div>
        <span className="site-hero-credit">An afternoon beside the River Vale</span>
      </section>

      <section className="site-intro site-container"><span className="site-eyebrow plum">Welcome to Valechester</span><div><h2>Historic at heart.<br /><em>Independent by nature.</em></h2><p>{tenant.description} Come for the landmark sights, stay for the unexpected finds—and make the story your own.</p></div></section>

      <section className="site-discover site-container" id="discover">
        <header className="site-section-heading"><div><span className="site-eyebrow plum">Start exploring</span><h2>{searchTerm ? `Results for “${searchTerm}”` : 'Find your Valechester'}</h2></div><p>Search by place, practical needs, who you are travelling with or the kind of experience you want.</p></header>
        <div className="site-category-tabs">{categories.map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div>
        <div className="visitor-discovery-layout">
          <aside className="visitor-filter-panel" aria-label="Refine your visit">
            <header><div><span>Refine your visit</span><strong>What works for you?</strong></div>{(activeOptions.length>0||town!=='All areas'||category!=='All')&&<button onClick={clearFilters}>Clear all</button>}</header>
            <label className="visitor-area-filter">Where do you want to go?<select value={town} onChange={(event)=>setTown(event.target.value)}>{towns.map((item)=><option key={item}>{item}</option>)}</select></label>
            {visitorFilterGroups.map((group)=><fieldset key={group.id}><legend>{group.label}</legend><small>{group.prompt}</small>{group.options.map((option)=>{const checked=(activeFilters[group.id]??[]).includes(option.id);const count=published.filter((listing)=>matchesVisitorOption(listing,option,searchableTagsFor(listing))).length;if(!count)return null;return <label key={option.id} className={checked?'selected':''}><input type="checkbox" checked={checked} onChange={()=>toggleFilter(group.id,option.id)}/><span>{option.label}</span><em>{count}</em></label>})}</fieldset>)}
          </aside>
          <div className="visitor-results">
            <div className="visitor-results-meta"><p className="results-count">{results.length} {results.length===1?'place':'places'} match your choices</p>{activeOptions.length>0&&<div className="active-visitor-filters" aria-label="Selected filters">{activeOptions.map((option)=><button key={`${option.groupId}-${option.id}`} onClick={()=>toggleFilter(option.groupId,option.id)}>{option.label}<X size={12}/></button>)}</div>}</div>
            <div className="site-card-grid">{results.slice(0, visibleCount).map((listing) => <ListingCard key={listing.id} listing={listing} {...actions} />)}</div>
            {results.length>visibleCount&&<div className="site-show-more"><button onClick={()=>setVisibleCount((count)=>count+12)}>Show more places <span>{Math.min(12,results.length-visibleCount)} more</span></button></div>}
            {!results.length && <div className="site-no-results"><Search size={25} /><h3>No exact matches yet</h3><p>Remove a choice or try a broader phrase.</p><button onClick={() => { setQuery(''); setSearchTerm(''); clearFilters() }}>Show everything</button></div>}
          </div>
        </div>
      </section>

      {features.events && <section className="site-events" id="events"><div className="site-container"><header className="site-section-heading inverse"><div><span className="site-eyebrow">Make a date of it</span><h2>What’s on next</h2></div><button onClick={() => siteNavigate('/events')}>View full calendar <ArrowRight size={16} /></button></header><div className="site-event-grid">{data.events.filter((event)=>event.status==='Published').sort((a,b)=>a.startDate.localeCompare(b.startDate)).slice(0,4).map((event) => <article key={event.id}><img src={imageLibrary[event.image]??imageLibrary.theatre} alt="" loading="lazy" decoding="async" /><div className="site-date"><strong>{eventDay(event)}</strong><span>{eventMonth(event)}</span></div><div><span>{event.category}</span><h3>{event.title}</h3><p><MapPin size={13} />{event.venueName}</p><button className="event-card-link" onClick={() => siteNavigate(`/events#${event.id}`)}>View event <ArrowRight size={13} /></button></div></article>)}</div></div></section>}

      {features.itineraries && <section className="site-ideas site-container" id="ideas"><header className="site-section-heading"><div><span className="site-eyebrow plum">Ideas worth travelling for</span><h2>Follow your curiosity</h2></div><button onClick={() => siteNavigate('/plan')}>Build your own itinerary <ArrowRight size={16} /></button></header><div className="site-guide-grid">{guides.map((guide) => <article key={guide.title}><img src={guide.image} alt="" loading="lazy" decoding="async" /><div><span>{guide.eyebrow}</span><h3>{guide.title}</h3><p>{guide.description}</p><button onClick={() => siteNavigate(`/guide/${guide.slug}`)}>Read the guide <ArrowRight size={15} /></button></div></article>)}</div></section>}

      <section className="site-neighbourhoods"><div className="site-container"><div className="site-section-heading inverse"><div><span className="site-eyebrow">Pick a neighbourhood</span><h2>Three sides of the same story</h2></div></div><div className="site-neighbourhood-grid">{neighbourhoods.map((place) => <article key={place.name}><img src={place.image} alt="" loading="lazy" decoding="async" /><div><h3>{place.name}</h3><p>{place.detail}</p><button onClick={() => siteNavigate(`/neighbourhood/${place.slug}`)} aria-label={`Explore ${place.name}`}><ArrowRight size={18} /></button></div></article>)}</div></div></section>

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
  const published=useMemo(()=>data.events.filter((event)=>event.status==='Published').sort((a,b)=>a.startDate.localeCompare(b.startDate)),[data.events])
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
                <div className="event-quick-dates">{([['all','All dates'],['today','Today'],['tomorrow','Tomorrow'],['weekend','This weekend'],['next7','Next 7 days']] as [EventDateFilter,string][]).map(([value,label])=><button key={value} className={dateFilter===value?'active':''} onClick={()=>chooseQuickDate(value)}>{label}</button>)}</div>
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
          <section className="event-calendar">{filtered.map((event) => <article id={event.id} key={event.id}><img src={imageLibrary[event.image]??imageLibrary.theatre} alt="" /><div className="event-calendar-date"><strong>{eventDay(event)}</strong><span>{eventMonth(event)}</span></div><div><span className="site-eyebrow plum">{event.category}</span><h2>{event.title}</h2><p>{event.description}</p><dl><div><dt>Where</dt><dd>{event.venueName}, {event.town}</dd></div><div><dt>When</dt><dd>{eventWhen(event)}</dd></div><div><dt>Format</dt><dd>{event.format}</dd></div><div><dt>Tickets</dt><dd>{event.price}</dd></div></dl><div className="public-event-actions"><button onClick={() => siteNavigate(`/plan?event=${event.id}`)}>Plan a trip around this <ArrowRight size={15} /></button>{event.bookingUrl&&<a href={event.bookingUrl}>Book tickets</a>}</div></div></article>)}</section>
          {!filtered.length&&<div className="site-no-results"><Search size={25}/><h3>No matching events</h3><p>Try changing the dates, location, event type or format.</p><button onClick={clearFilters}>Clear all filters</button></div>}
        </div>
      </div>
      <NewsletterSignup />
    </main>
  </PublicShell>
}

function EventAccountPage({ savedCount }: { savedCount: number }) {
  const current=readEventAccount(); const [mode,setMode]=useState<'login'|'register'>(current?'login':'register'); const [error,setError]=useState('')
  const submit=(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();setError('');const values=Object.fromEntries(new FormData(event.currentTarget)) as Record<string,string>;const accounts=readEventAccounts()
    if(mode==='register'){if(accounts.some((item)=>item.email.toLowerCase()===values.email.toLowerCase())){setError('An account already exists for this email address.');return}const account:EventAccount={id:`organiser-${Date.now()}`,name:values.name,email:values.email,organisation:values.organisation,password:values.password};localStorage.setItem(EVENT_ACCOUNTS_KEY,JSON.stringify([...accounts,account]));localStorage.setItem(EVENT_SESSION_KEY,account.id);siteNavigate('/submit-event')}
    else{const account=accounts.find((item)=>item.email.toLowerCase()===values.email.toLowerCase()&&item.password===values.password);if(!account){setError('Check your email address and password, then try again.');return}localStorage.setItem(EVENT_SESSION_KEY,account.id);siteNavigate('/submit-event')}
  }
  if(current)return <PublicShell savedCount={savedCount}><main><PageIntro eyebrow="Event organiser account" title={`Welcome back, ${current.name.split(' ')[0]}.`} description="Submit events and keep track of their approval status."/><section className="event-account-panel site-container"><div><UserPlus size={28}/><h2>{current.organisation||current.name}</h2><p>{current.email}</p></div><div><button onClick={()=>siteNavigate('/submit-event')}>Manage my events <ArrowRight size={15}/></button><button className="secondary" onClick={()=>{localStorage.removeItem(EVENT_SESSION_KEY);siteNavigate('/account')}}><LogOut size={15}/>Sign out</button></div></section></main></PublicShell>
  return <PublicShell savedCount={savedCount}><main><PageIntro eyebrow="Event organisers" title={mode==='register'?'Create your event account.':'Welcome back.'} description="Any organiser can submit an event. The venue or business does not need to be a Visit Valechester member."/><section className="event-account-auth site-container"><div className="event-auth-switch"><button className={mode==='register'?'active':''} onClick={()=>setMode('register')}>Create account</button><button className={mode==='login'?'active':''} onClick={()=>setMode('login')}>Sign in</button></div><form onSubmit={submit}>{mode==='register'&&<><label>Your name<input name="name" required/></label><label>Organisation or group<input name="organisation" placeholder="Optional"/></label></>}<label>Email address<input name="email" type="email" required/></label><label>Password<input name="password" type="password" minLength={8} required/></label>{error&&<p className="form-error" role="alert">{error}</p>}<button>{mode==='register'?<><UserPlus size={16}/>Create account</>:<><LogIn size={16}/>Sign in</>}</button></form></section></main></PublicShell>
}

function SubmitEventPage({ savedCount }: { savedCount: number }) {
  const account=readEventAccount(); const {data,createEvent}=useCRM(); const [sent,setSent]=useState(false)
  if(!account)return <PublicShell savedCount={savedCount}><main><PageIntro eyebrow="Add to what’s on" title="Sign in to submit an event." description="Create a free organiser account to send events to the destination team for review."/><section className="event-login-required site-container"><LogIn size={30}/><h2>Event organiser access</h2><p>Your event can take place anywhere and the venue does not need to be a member.</p><button onClick={()=>siteNavigate('/account')}>Create an account or sign in</button></section></main></PublicShell>
  const mine=data.events.filter((event)=>event.submittedBy===account.email)
  const submit=(formEvent:FormEvent<HTMLFormElement>)=>{formEvent.preventDefault();const values=Object.fromEntries(new FormData(formEvent.currentTarget)) as Record<string,string>;const draft:EventDraft={title:values.title,category:values.category,format:values.format as EventFormat,description:values.description,startDate:values.startDate,endDate:values.endDate,startTime:values.startTime,endTime:values.endTime,venueName:values.venueName,address:values.address,town:values.town,postcode:values.postcode,price:values.price,bookingUrl:values.bookingUrl,contactName:account.name,contactEmail:account.email,image:values.image||'theatre',accessibility:values.accessibility,status:'In review',submittedBy:account.email};createEvent(draft);setSent(true);window.scrollTo({top:0,behavior:'smooth'})}
  return <PublicShell savedCount={savedCount}><main><PageIntro eyebrow="Event organiser account" title="Submit an event." description={`Signed in as ${account.email}. Events are checked by the destination team before publication.`}/><section className="public-event-submit site-container">{sent?<div className="contact-success"><Check size={28}/><h2>Your event has been submitted.</h2><p>It is now in review. You can follow its status below.</p><button onClick={()=>setSent(false)}>Submit another event</button></div>:<form onSubmit={submit}><div><label>Event title<input name="title" required/></label><label>Event type<select name="category" required>{['Music & Shows','Festivals & Seasonal','Food & Drink','Family','Arts & Culture','Talks & Workshops','Tours & Heritage','Outdoors & Sport','Wellbeing','Social'].map((item)=><option key={item}>{item}</option>)}</select></label><label>Event format<select name="format" required>{['One-off and short run','Ongoing events','Online events'].map((item)=><option key={item}>{item}</option>)}</select></label></div><label>Description<textarea name="description" rows={5} required placeholder="Tell visitors what makes the event worth attending."/></label><div><label>Start date<input name="startDate" type="date" required/></label><label>End date<input name="endDate" type="date" required/></label><label>Start time<input name="startTime" type="time" required/></label><label>End time<input name="endTime" type="time" required/></label></div><label>Venue name<input name="venueName" required placeholder="Any venue, public space or temporary location"/></label><div><label>Address<input name="address" required/></label><label>Town or area<input name="town" required/></label><label>Postcode<input name="postcode" required/></label></div><div><label>Ticket information<input name="price" required placeholder="Free or From £10"/></label><label>Booking URL<input name="bookingUrl" type="url"/></label><label>Image style<select name="image"><option value="theatre">Performance</option><option value="restaurant">Food and drink</option><option value="park">Outdoors</option><option value="castle">Heritage</option><option value="gallery">Arts</option></select></label></div><label>Accessibility information<textarea name="accessibility" rows={3} placeholder="Step-free access, accessible toilets, quiet spaces or contact details"/></label><button>Send event for review <ArrowRight size={15}/></button></form>}<aside className="organiser-events"><header><h2>My events</h2><button onClick={()=>{localStorage.removeItem(EVENT_SESSION_KEY);siteNavigate('/account')}}>Sign out</button></header>{mine.length?mine.map((event)=><article key={event.id}><div><strong>{event.title}</strong><span>{eventDate(event).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})} · {event.venueName}</span></div><span className={`public-event-status status-${event.status.toLowerCase().replace(/\s+/g,'-')}`}>{event.status}</span></article>):<p>Your submitted events will appear here.</p>}</aside></section></main></PublicShell>
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
  const [days, setDays] = useState(2)
  const [group, setGroup] = useState('Couple')
  const [interests, setInterests] = useState<string[]>(['Heritage', 'Food & drink'])
  const [plan, setPlan] = useState<Listing[]>([])
  const toggleInterest = (interest: string) => setInterests((current) => current.includes(interest) ? current.filter((item) => item !== interest) : [...current, interest])
  const buildPlan = (event: FormEvent) => {
    event.preventDefault()
    const ranked = listings.map((listing) => ({ listing, score: interests.reduce((score, interest) => score + (interestMatchers[interest].test(`${listing.name} ${listing.category} ${listing.description} ${listing.facilities.join(' ')}`) ? 1 : 0), 0) })).sort((a, b) => b.score - a.score)
    setPlan(ranked.slice(0, Math.min(days * 2, ranked.length)).map((item) => item.listing))
    window.setTimeout(() => document.querySelector('#your-plan')?.scrollIntoView({ behavior: 'smooth' }), 50)
  }
  return <PublicShell savedCount={actions.savedIds.length}><main><PageIntro eyebrow="Trip planner" title="Shape your Valechester." description="Choose the pace and the things you enjoy. We’ll turn published destination listings into a practical starting itinerary." image={imageLibrary.hero} /><section className="planner-builder site-container"><form onSubmit={buildPlan}><div><label>Who’s coming?<select value={group} onChange={(event) => setGroup(event.target.value)}><option>Solo traveller</option><option>Couple</option><option>Family</option><option>Friends</option></select></label><label>How long?<select value={days} onChange={(event) => setDays(Number(event.target.value))}><option value={1}>One day</option><option value={2}>Two days</option><option value={3}>Three days</option></select></label></div><fieldset><legend>What sounds good?</legend><div>{Object.keys(interestMatchers).map((interest) => <label key={interest} className={interests.includes(interest) ? 'selected' : ''}><input type="checkbox" checked={interests.includes(interest)} onChange={() => toggleInterest(interest)} />{interest}</label>)}</div></fieldset><button type="submit">Build my trip <Sparkles size={17} /></button></form>{plan.length > 0 && <section id="your-plan" className="generated-plan" aria-live="polite"><header><span className="site-eyebrow plum">Made for a {group.toLowerCase()}</span><h2>Your Valechester itinerary</h2><p>{days} {days === 1 ? 'day' : 'days'} · {interests.join(' · ')}</p></header>{Array.from({ length: days }, (_, day) => { const dayStops = plan.slice(day * 2, day * 2 + 2); return dayStops.length > 0 && <div className="plan-day" key={day}><h3>Day {day + 1}</h3>{dayStops.map((listing, index) => <article key={listing.id}><span>{index === 0 ? 'Morning' : 'Afternoon'}</span><img src={imageLibrary[listing.image] ?? imageLibrary.hero} alt="" /><div><small>{listing.town}</small><h4>{listing.name}</h4><p>{listing.shortDescription}</p><button onClick={() => siteNavigate(`/place/${listing.id}`)}>View place <ArrowRight size={14} /></button></div><button className={`plan-save${actions.savedIds.includes(listing.id) ? ' saved' : ''}`} onClick={() => actions.toggleSaved(listing)} aria-label={`${actions.savedIds.includes(listing.id) ? 'Remove' : 'Save'} ${listing.name}`}><Heart size={17} fill={actions.savedIds.includes(listing.id) ? 'currentColor' : 'none'} /></button></article>)}</div> })}</section>}</section></main></PublicShell>
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

function LegacyListingPage({ listing, actions, tier }: { listing: Listing; actions: VisitorActions; tier: string }) {
  const image = imageLibrary[listing.image] ?? imageLibrary.hero
  const [enquiring, setEnquiring] = useState(false)
  const [sent, setSent] = useState(false)
  const saved = actions.savedIds.includes(listing.id)
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); recordSubmission('vv-listing-enquiries',{ listingId: listing.id, listingName: listing.name, ...values }); setSent(true) }
  return <PublicShell savedCount={actions.savedIds.length}><main className={`place-page membership-${tier.toLowerCase().replace(/\s+/g,'-')}`}><div className="place-breadcrumb site-container"><button onClick={() => siteNavigate('/')}>Home</button><span>/</span><button onClick={() => siteNavigate('/#discover')}>{categoryGroup(listing)}</button><span>/</span><strong>{listing.name}</strong></div><section className="place-hero"><img src={image} alt={listing.name} /><div className="place-hero-copy site-container"><span className="site-eyebrow">{listing.category}</span>{tier === 'Tier 4' && <span className="place-partner-badge">Signature partner</span>}{tier === 'Tier 3' && <span className="place-partner-badge">Featured member</span>}<h1>{listing.name}</h1><p><MapPin size={16} />{listing.town}</p></div></section><div className="place-layout site-container"><article><p className="place-lede">{listing.shortDescription}</p><div className="place-good-for"><h2>Good for</h2><div>{listing.searchTags.map((item) => <span key={item}><Check size={13} />{item}</span>)}</div></div><h2>Your visit</h2><p>{listing.description}</p><div className="place-highlights"><h3>Visitors frequently mention</h3><div>{listing.reviewHighlights.map((item) => <span key={item}><Star size={14} />{item}</span>)}</div><small>Themes supported by recent visitor feedback.</small></div><h2>Good to know</h2><dl>{listing.goodToKnow.map((item) => <div key={item}><dt><Check size={14} /></dt><dd>{item}</dd></div>)}<div><dt>Opening times</dt><dd>{listing.openingHours}</dd></div><div><dt>Accessibility & facilities</dt><dd>{listing.facilities.join(' · ')}</dd></div><div><dt>Location</dt><dd>{listing.town}, Valechester</dd></div></dl></article><aside><span className="place-book-label">Plan your visit</span><h3>{listing.name}</h3>{sent ? <div className="place-enquiry-success" role="status"><Check size={22} /><strong>Enquiry sent</strong><small>The team will reply to the email address you provided.</small><button onClick={() => { setSent(false); setEnquiring(false) }}>Done</button></div> : enquiring ? <form className="place-enquiry" onSubmit={submit}><label>Name<input name="name" required /></label><label>Email<input name="email" type="email" required /></label><label>Preferred date<input name="preferredDate" type="date" required /></label><button>Send enquiry <ArrowRight size={14} /></button><button type="button" onClick={() => setEnquiring(false)}>Cancel</button></form> : <><button className="place-book" onClick={() => setEnquiring(true)}>Check availability <ArrowRight size={16} /></button><button className="place-save-button" onClick={() => actions.toggleSaved(listing)}><Heart size={15} fill={saved ? 'currentColor' : 'none'} />{saved ? 'Saved to your trip' : 'Save for later'}</button>{listing.phone && <span className="place-contact">Call {listing.phone}</span>}<div><CalendarDays size={18} /><span><strong>Flexible booking</strong><small>Check dates directly with the venue</small></span></div></>}</aside></div></main></PublicShell>
}

function ListingPage({ listing, actions }: { listing: Listing; actions: VisitorActions }) {
  const { data } = useCRM()
  const organisation = data.organisations.find((item) => item.id === listing.organisationId)
  const tier = organisation?.tier ?? 'Free Listing'
  const levelId=data.levels.find((item)=>item.name===tier)?.id??'level-006'
  const profile = listingTemplateProfiles.find((item)=>item.levelId===levelId) ?? listingTemplateProfiles.find((item)=>item.levelId==='level-006')!
  return <TemplateListingPage listing={listing} actions={actions} tier={tier} profile={profile}/>
}

function TemplateListingPage({ listing, actions, tier, profile }: { listing: Listing; actions: VisitorActions; tier: string; profile: ListingTemplateProfile }) {
  const image = imageLibrary[listing.image] ?? imageLibrary.hero
  const [enquiring, setEnquiring] = useState(false)
  const [sent, setSent] = useState(false)
  const saved = actions.savedIds.includes(listing.id)
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); recordSubmission('vv-listing-enquiries',{ listingId: listing.id, listingName: listing.name, ...values }); setSent(true) }
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
  const galleryPool = Array.from(new Set([image,imageLibrary.hero,imageLibrary.gardens,imageLibrary.restaurant,imageLibrary.theatre,imageLibrary.hotel,imageLibrary.museum,imageLibrary.park,imageLibrary.books,imageLibrary.lodge]))
  const gallery = galleryPool.slice(0,Math.min(profile.imageCount,5))
  const directions=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${listing.name}, ${listing.town}, Valechester`)}`
  const actionLabel = profile.action==='quote'?'Request a quote':'Make an enquiry'
  const sectionTitle = profile.action==='quote'?'Services for your business':'About this place'
  const accessFacilities=listing.facilities.filter((item)=>/access|step|hearing|wheel|toilet/i.test(item))
  const generalFacilities=listing.facilities.filter((item)=>!accessFacilities.includes(item))
  return <PublicShell savedCount={actions.savedIds.length}>
    <main className={`place-page template-place-page membership-${tier.toLowerCase().replace(/\s+/g,'-')}`} style={{'--template-accent':profile.accent} as CSSProperties}>
      <div className="place-breadcrumb site-container"><button onClick={() => siteNavigate('/')}>Home</button><span>/</span><button onClick={() => siteNavigate('/#discover')}>{categoryGroup(listing)}</button><span>/</span><strong>{listing.name}</strong></div>
      <section className="place-hero"><img src={image} alt={listing.name} /><div className="place-hero-copy site-container"><span className="site-eyebrow">{listing.category}</span><h1>{listing.name}</h1><p><MapPin size={16} />{listing.town}</p></div></section>
      {profile.showPlanningSummary&&<div className="place-planning-summary"><div className="site-container"><span><strong>Best for</strong><small>{listing.searchTags.slice(0,2).join(' · ')}</small></span><span><strong>Allow</strong><small>{profile.levelId==='level-001'?'Half a day or more':'Around two hours'}</small></span><span><strong>Plan ahead</strong><small>{listing.goodToKnow[0]}</small></span></div></div>}
      {profile.imageCount>1&&<section className="member-media site-container"><header><div><span className="site-eyebrow plum">See the experience</span><h2>Gallery</h2></div><small>{profile.imageCount} images{profile.videoCount?` · ${profile.videoCount} ${profile.videoCount===1?'video':'videos'}`:''}</small></header><div className={`member-media-grid media-count-${gallery.length}`}>{gallery.map((src,index)=><img key={src} src={src} alt={`${listing.name} gallery view ${index+1}`}/>)}</div>{profile.videoCount>0&&<button className="member-video"><PlayCircle size={22}/><span><strong>Watch {listing.name}</strong><small>{profile.videoCount} video feature{profile.videoCount===1?'':'s'} available</small></span><ArrowRight size={16}/></button>}</section>}
      {profile.showAtGlance&&<section className="listing-at-glance"><div className="site-container"><header><span className="site-eyebrow plum">Visitor essentials</span><h2>At a glance</h2></header><dl><div><dt>Location</dt><dd>{listing.town}, Valechester</dd></div><div><dt>Experience</dt><dd>{listing.category}</dd></div><div><dt>Booking</dt><dd>{listing.bookingUrl?'Online booking available':'Check directly before visiting'}</dd></div><div><dt>Opening information</dt><dd>{listing.openingHours}</dd></div></dl></div></section>}
      <div className="place-layout site-container">
        <article>
          <p className="place-lede">{listing.shortDescription}</p>
          {profile.levelId!=='level-004'&&<div className="place-good-for"><h2>{profile.action==='quote'?'Services and strengths':'Good for'}</h2><div>{listing.searchTags.slice(0,profile.goodForLimit).map((item)=><span key={item}><Check size={13}/>{item}</span>)}</div></div>}
          <section className="listing-feature-section"><span className="site-eyebrow plum">{profile.action==='quote'?'What we provide':'The story'}</span><h2>{sectionTitle}</h2><p>{listing.description}</p><p>Use the practical information below to decide whether it suits your plans, then check current availability and any date-specific details directly with the business.</p></section>
          {profile.levelId==='level-004'&&<section className="listing-feature-section listing-taxonomy"><span className="site-eyebrow plum">Plan the right visit</span><h2>Visitor information</h2><p>These details help visitors find experiences that suit their interests and practical needs.</p><div><section><h3>Visitor interests</h3><div>{visitorTaxonomyFor(listing).map((item)=><span key={item}><Check size={13}/>{item}</span>)}</div><h3 className="taxonomy-subheading">Search filters</h3><div>{listing.searchTags.slice(0,profile.taxonomyAllowance).map((item)=><span key={item}><Search size={13}/>{item}</span>)}</div></section><section><h3>Good to know</h3><ul>{listing.goodToKnow.map((item)=><li key={item}><Check size={14}/>{item}</li>)}</ul></section></div></section>}
          {profile.showReviews&&<section className="listing-feature-section listing-reviews"><span className="site-eyebrow plum">Visitor feedback</span><h2>{profile.action==='quote'?'What clients value':'What visitors say'}</h2><p>Recent feedback themes help people understand what stands out before they visit.</p><div>{listing.reviewHighlights.map((item)=><blockquote key={item}><Star size={16}/><strong>{item}</strong><small>Recurring feedback theme</small></blockquote>)}</div>{listing.reviewSites?.length?<nav aria-label="Review sites">{listing.reviewSites.filter((site)=>site.url).map((site)=><a key={site.id} href={site.url} target="_blank" rel="noreferrer">Reviews on {site.name} <ArrowRight size={13}/></a>)}</nav>:<small className="review-source">A live rating or review widget appears here when an authorised source is connected.</small>}</section>}
          <section className="listing-feature-section listing-access"><span className="site-eyebrow plum">Plan with confidence</span><h2>Accessibility information</h2><p>Accessibility information is available on every paid member listing. Contact the business if you need details for a specific visit.</p><div><span><Accessibility size={20}/><strong>{accessFacilities.length?accessFacilities.join(' · '):'Ask the venue about step-free routes and individual access requirements'}</strong></span><a href={`mailto:${listing.email}`}>Contact about accessibility <ArrowRight size={14}/></a></div></section>
          <section className="listing-feature-section listing-facilities"><span className="site-eyebrow plum">Useful details</span><h2>Facilities</h2><div><section><h3>On site</h3><ul>{generalFacilities.map((item)=><li key={item}><Check size={14}/>{item}</li>)}</ul></section><section><h3>Access and support</h3><ul>{(accessFacilities.length?accessFacilities:['Contact the venue for access details']).map((item)=><li key={item}><Check size={14}/>{item}</li>)}</ul></section><section><h3>Before you travel</h3><ul>{listing.goodToKnow.map((item)=><li key={item}><Check size={14}/>{item}</li>)}</ul></section></div></section>
          <section className="listing-feature-section listing-opening"><span className="site-eyebrow plum">When to visit</span><h2>Opening information</h2><div><Clock3 size={22}/><span><strong>{listing.openingHours}</strong><small>Check the official website for seasonal changes and exceptions.</small></span></div></section>
          <section className="listing-feature-section listing-contact"><span className="site-eyebrow plum">Find and contact</span><h2>Location and contact</h2><div className={profile.showMap?'has-map':''}><address><strong>{listing.name}</strong><span>{listing.town}, Valechester</span>{listing.phone&&<a href={`tel:${listing.phone.replace(/\s/g,'')}`}>{listing.phone}</a>}{listing.email&&<a href={`mailto:${listing.email}`}>{listing.email}</a>}<a href={listing.website}>Official website <ArrowRight size={13}/></a></address>{profile.showMap&&<div className="listing-map"><MapPin size={27}/><strong>{listing.town}</strong><span>Interactive map position</span><a href={directions}>Open directions <ArrowRight size={13}/></a></div>}</div></section>
          {profile.showAwards&&<section className="listing-feature-section listing-awards"><span className="site-eyebrow plum">Verified recognition</span><h2>Awards and accreditations</h2><div><span><Star size={18}/><strong>Valechester Quality Assured</strong><small>2026</small></span><span><Accessibility size={18}/><strong>Visitor Access Commitment</strong><small>Current</small></span></div></section>}
          {profile.showRelated&&<section className="listing-feature-section listing-related"><span className="site-eyebrow plum">Continue planning</span><h2>Make it part of your trip</h2><div>{guides.slice(0,profile.levelId==='level-001'?3:2).map((guide)=><article key={guide.slug}><img src={guide.image} alt=""/><span>{guide.eyebrow}</span><h3>{guide.title}</h3><p>{guide.description}</p><button onClick={()=>siteNavigate(`/guide/${guide.slug}`)}>Explore <ArrowRight size={14}/></button></article>)}</div></section>}
        </article>
        <aside><span className="place-book-label">{profile.action==='quote'?'Business enquiry':'Plan your visit'}</span><h3>{listing.name}</h3>{sent?<div className="place-enquiry-success" role="status"><Check size={22}/><strong>Enquiry sent</strong><small>The team will reply to the email address you provided.</small><button onClick={()=>{setSent(false);setEnquiring(false)}}>Done</button></div>:enquiring?<form className="place-enquiry" onSubmit={submit}><label>Name<input name="name" required/></label><label>Email<input name="email" type="email" required/></label><label>{profile.action==='quote'?'What do you need?':'Preferred date'}<input name="preferredDate" type={profile.action==='quote'?'text':'date'} required/></label><button>Send enquiry <ArrowRight size={14}/></button><button type="button" onClick={()=>setEnquiring(false)}>Cancel</button></form>:<>{profile.action==='book'&&listing.bookingUrl?<a className="place-book" href={listing.bookingUrl}>Book direct <ArrowRight size={16}/></a>:profile.action==='website'?<a className="place-book" href={listing.website}>Visit official website <ArrowRight size={16}/></a>:<button className="place-book" onClick={()=>setEnquiring(true)}>{actionLabel} <ArrowRight size={16}/></button>}{profile.action==='quote'?<a className="place-save-button" href={listing.website}>Visit website <ArrowRight size={14}/></a>:<button className="place-save-button" onClick={()=>actions.toggleSaved(listing)}><Heart size={15} fill={saved?'currentColor':'none'}/>{saved?'Saved to your trip':'Save for later'}</button>}{profile.action==='book'&&<a className="place-contact" href={listing.website}>Visit official website</a>}{listing.phone&&<span className="place-contact">Call {listing.phone}</span>}<div><CalendarDays size={18}/><span><strong>{profile.action==='quote'?'Discuss your requirements':'Plan with confidence'}</strong><small>{listing.openingHours}</small></span></div></>}</aside>
      </div>
    </main>
  </PublicShell>
}

const infoPages: Record<string, { eyebrow: string; title: string; description: string; sections: Array<[string, string]> }> = {
  privacy: { eyebrow: 'Visitor information', title: 'Privacy', description: 'How Visit Valechester handles visitor information.', sections: [['What we collect', 'We collect only the information needed to answer enquiries, provide requested updates and improve your visit planning. Saved places remain on your device unless you choose to share them.'], ['Production approach', 'We keep personal information only for as long as it is needed, use approved service providers and respect your data protection rights.']] },
  cookies: { eyebrow: 'Visitor information', title: 'Cookies', description: 'How this website uses cookies and local storage.', sections: [['Essential storage', 'Essential local storage remembers saved places, cookie choices and account session details.'], ['Analytics and marketing', 'Analytics and marketing cookies are used only with consent. You can change your choice at any time.']] },
  accessibility: { eyebrow: 'Plan with confidence', title: 'Accessible Valechester', description: 'Practical information for planning an inclusive visit.', sections: [['Before you travel', 'Venue listings show accessibility and facility information supplied through the destination CRM. Contact individual venues when you need details for a specific visit.'], ['Using this website', 'The interface supports keyboard navigation, labelled controls, responsive text and meaningful page structure. We review the website regularly and welcome feedback when something is difficult to use.']] },
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
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const values=Object.fromEntries(new FormData(event.currentTarget)); recordSubmission('vv-contact-enquiries',{ topic, ...values }); setSent(true) }
  return <PublicShell savedCount={savedCount}><main><PageIntro eyebrow="Talk to the team" title={contactTopics[topic] ?? 'Contact Visit Valechester'} description="Send your enquiry to the Valechester team." /><section className="contact-page site-container">{sent ? <div className="contact-success" role="status"><Check size={28} /><h2>Thanks — your enquiry has been sent.</h2><p>The right team has been notified and will respond as soon as possible.</p><button onClick={() => siteNavigate('/')}>Return home</button></div> : <form onSubmit={submit}><label>Enquiry type<select name="topic" defaultValue={topic}>{Object.entries(contactTopics).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><div><label>Name<input name="name" required /></label><label>Email<input name="email" type="email" required /></label></div><label>Message<textarea name="message" required rows={6} placeholder="How can the Valechester team help?" /></label><button>Send enquiry <ArrowRight size={15} /></button><small>We’ll use these details only to respond to your enquiry.</small></form>}</section></main></PublicShell>
}

function NotFoundPage({ savedCount }: { savedCount: number }) {
  return <PublicShell savedCount={savedCount}><main><section className="not-found-page"><Search size={28} /><h1>We couldn’t find that page.</h1><p>Try exploring the latest places, events and ideas instead.</p><button onClick={() => siteNavigate('/')}>Return to Valechester</button></section></main></PublicShell>
}

export function PublicSite() {
  const { data } = useCRM()
  const { features } = useFeatures()
  const [location, setLocation] = useState(() => `${window.location.pathname}${window.location.search}${window.location.hash}`)
  const [savedIds, setSavedIds] = useState<string[]>(readSavedPlaces)
  const [notice, setNotice] = useState('')
  useEffect(() => {
    const listener = () => { setLocation(`${window.location.pathname}${window.location.search}${window.location.hash}`); if (!window.location.hash) window.scrollTo({ top: 0 }) }
    window.addEventListener('popstate', listener)
    return () => window.removeEventListener('popstate', listener)
  }, [])
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
  let page: ReactNode
  if (path === '/') page = <HomePage key={location} actions={actions} location={location} />
  else if (path === '/events' && features.events) page = <EventsPage savedCount={savedIds.length} />
  else if (path === '/account' && features.events) page = <EventAccountPage key={location} savedCount={savedIds.length} />
  else if (path === '/submit-event' && features.events) page = <SubmitEventPage key={location} savedCount={savedIds.length} />
  else if (path === '/saved') page = <SavedPage listings={published} actions={actions} />
  else if (path === '/plan' && features.itineraries) page = <PlanPage listings={published} actions={actions} />
  else if (path === '/listing-templates') page = <ListingTemplatesPage listings={published} actions={actions} />
  else if (path === '/contact') page = <ContactPage savedCount={savedIds.length} />
  else if (['/privacy', '/cookies', '/accessibility'].includes(path)) page = <InfoPage page={parts[0]} savedCount={savedIds.length} />
  else if (parts[0] === 'guide' && features.itineraries) page = <GuidePage slug={parts[1]} listings={published} actions={actions} />
  else if (parts[0] === 'neighbourhood') page = <NeighbourhoodPage slug={parts[1]} listings={published} actions={actions} />
  else if (parts[0] === 'place') {
    const listing = published.find((item) => item.id === parts[1])
    page = listing ? <ListingPage listing={listing} actions={actions} /> : <NotFoundPage savedCount={savedIds.length} />
  } else page = <NotFoundPage savedCount={savedIds.length} />
  return <>{page}{notice && <div className="site-toast" role="status"><Check size={16} />{notice}</div>}</>
}
