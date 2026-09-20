import {
  Accessibility, ArrowRight, CalendarDays, ChevronDown, Clock3, Heart, MapPin, Menu,
  Search, Sparkles, Star, TrainFront, X,
} from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { BrandLogo } from './components/BrandLogo'
import { useFeatures } from './features'
import { events, guides, imageLibrary, neighbourhoods } from './siteData'
import { useCRM } from './store'
import { tenant } from './tenant'
import type { Listing } from './types'

const categories = ['All', 'Things to do', 'Places to stay', 'Food & drink', 'Shopping']

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

function ListingCard({ listing, featured = false }: { listing: Listing; featured?: boolean }) {
  const image = imageLibrary[listing.image] ?? imageLibrary.hero
  return (
    <article className={`site-card${featured ? ' site-card-featured' : ''}`}>
      <button className="site-card-image" onClick={() => siteNavigate(`/place/${listing.id}`)} aria-label={`View ${listing.name}`}>
        <img src={image} alt="" />
        <span className="site-card-category">{categoryGroup(listing)}</span>
        <span className="site-card-save"><Heart size={18} /></span>
      </button>
      <div className="site-card-copy">
        <span><MapPin size={13} />{listing.town}</span>
        <h3><button onClick={() => siteNavigate(`/place/${listing.id}`)}>{listing.name}</button></h3>
        <p>{listing.shortDescription}</p>
        <button className="site-text-link" onClick={() => siteNavigate(`/place/${listing.id}`)}>Discover more <ArrowRight size={15} /></button>
      </div>
    </article>
  )
}

function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <>
      <div className="site-utility"><div><span>{tenant.location}</span><nav><a href="#plan">Plan your visit</a><a href="#accessibility">Accessibility</a><a href="/crm">Partner login</a></nav></div></div>
      <header className="site-header">
        <a href="/" className="site-logo" aria-label={`${tenant.name} home`}><BrandLogo /></a>
        <nav className={menuOpen ? 'site-nav open' : 'site-nav'} aria-label="Main navigation">
          <a href="#discover" onClick={() => setMenuOpen(false)}>Things to do <ChevronDown size={14} /></a>
          <a href="#events" onClick={() => setMenuOpen(false)}>What’s on</a>
          <a href="#discover" onClick={() => setMenuOpen(false)}>Stay</a>
          <a href="#discover" onClick={() => setMenuOpen(false)}>Food & drink</a>
          <a href="#ideas" onClick={() => setMenuOpen(false)}>Ideas & inspiration</a>
          <a href="#plan" onClick={() => setMenuOpen(false)}>Plan your visit</a>
        </nav>
        <div className="site-header-actions"><button aria-label="Search"><Search size={20} /></button><a href="#plan" className="site-plan-button">Plan my trip</a><button className="site-menu-button" onClick={() => setMenuOpen((value) => !value)} aria-label="Toggle menu">{menuOpen ? <X size={22} /> : <Menu size={22} />}</button></div>
      </header>
    </>
  )
}

function SiteFooter() {
  return <footer className="site-footer"><div className="site-footer-main"><div><BrandLogo inverse /><p>{tenant.description}</p></div><div><strong>Explore</strong><a href="#discover">Things to do</a><a href="#events">What’s on</a><a href="#discover">Places to stay</a><a href="#ideas">Ideas & inspiration</a></div><div><strong>Plan</strong><a href="#plan">Getting here</a><a href="#plan">Getting around</a><a href="#accessibility">Accessible Valechester</a><a href="#plan">Visitor information</a></div><div><strong>Work with us</strong><a href="/crm">Partner login</a><a href="mailto:hello@visitvalechester.example">Become a member</a><a href="mailto:hello@visitvalechester.example">Submit an event</a><a href="mailto:hello@visitvalechester.example">Travel trade</a></div></div><div className="site-footer-bottom"><span>© 2026 {tenant.legalName}. Demo destination.</span><span>Privacy · Cookies · Accessibility</span></div></footer>
}

function HomePage() {
  const { data } = useCRM()
  const { features } = useFeatures()
  const [query, setQuery] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [category, setCategory] = useState('All')
  const published = useMemo(() => data.listings.filter((listing) => listing.status === 'Published'), [data.listings])
  const results = published.filter((listing) => {
    const groupMatches = category === 'All' || categoryGroup(listing) === category
    const term = searchTerm.toLowerCase()
    return groupMatches && (!term || `${listing.name} ${listing.category} ${listing.town} ${listing.shortDescription} ${listing.description} ${listing.facilities.join(' ')}`.toLowerCase().includes(term))
  })
  const submitSearch = (event: FormEvent) => { event.preventDefault(); setSearchTerm(query); document.querySelector('#discover')?.scrollIntoView({ behavior: 'smooth' }) }

  return <div className="public-site">
    <SiteHeader />
    <main>
      <section className="site-hero">
        <img src={imageLibrary.hero} alt="Historic rooftops and riverside landmarks in Valechester" />
        <div className="site-hero-shade" />
        <div className="site-hero-content"><span className="site-eyebrow">Find your kind of remarkable</span><h1>A town with stories<br />in every direction.</h1><p>{tenant.strapline}</p>
          <form className="site-search" onSubmit={submitSearch}><Search size={21} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="What would you like to discover?" aria-label="Search Valechester" /><button>Search</button></form>
          <div className="site-popular"><span>Popular:</span><button onClick={() => { setQuery('family'); setSearchTerm('family') }}>Family days</button><button onClick={() => { setQuery('free'); setSearchTerm('free') }}>Free things</button><button onClick={() => { setQuery('heritage'); setSearchTerm('heritage') }}>Heritage</button></div>
        </div>
        <span className="site-hero-credit">Valechester from Castle Hill</span>
      </section>

      <section className="site-intro site-container"><span className="site-eyebrow plum">Welcome to Valechester</span><div><h2>Historic at heart.<br /><em>Independent by nature.</em></h2><p>{tenant.description} Come for the landmark sights, stay for the unexpected finds—and make the story your own.</p></div></section>

      <section className="site-discover site-container" id="discover">
        <header className="site-section-heading"><div><span className="site-eyebrow plum">Start exploring</span><h2>{searchTerm ? `Results for “${searchTerm}”` : 'Find your Valechester'}</h2></div><p>Every listing shown here is published from the same destination CRM used by the team.</p></header>
        <div className="site-category-tabs">{categories.map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div>
        <div className="site-card-grid">{results.slice(0, 6).map((listing, index) => <ListingCard key={listing.id} listing={listing} featured={index === 0} />)}</div>
        {!results.length && <div className="site-no-results"><Search size={25} /><h3>No exact matches yet</h3><p>Try a broader search or explore all of Valechester.</p><button onClick={() => { setQuery(''); setSearchTerm(''); setCategory('All') }}>Show everything</button></div>}
      </section>

      {features.events && <section className="site-events" id="events"><div className="site-container"><header className="site-section-heading inverse"><div><span className="site-eyebrow">Make a date of it</span><h2>What’s on next</h2></div><button>View full calendar <ArrowRight size={16} /></button></header><div className="site-event-grid">{events.map((event) => <article key={event.id}><img src={event.image} alt="" /><div className="site-date"><strong>{event.day}</strong><span>{event.month}</span></div><div><span>{event.category}</span><h3>{event.title}</h3><p><MapPin size={13} />{event.place}</p></div></article>)}</div></div></section>}

      {features.itineraries && <section className="site-ideas site-container" id="ideas"><header className="site-section-heading"><div><span className="site-eyebrow plum">Ideas worth travelling for</span><h2>Follow your curiosity</h2></div><button>All guides & itineraries <ArrowRight size={16} /></button></header><div className="site-guide-grid">{guides.map((guide) => <article key={guide.title}><img src={guide.image} alt="" /><div><span>{guide.eyebrow}</span><h3>{guide.title}</h3><p>{guide.description}</p><button>Read the guide <ArrowRight size={15} /></button></div></article>)}</div></section>}

      <section className="site-neighbourhoods"><div className="site-container"><div className="site-section-heading inverse"><div><span className="site-eyebrow">Pick a neighbourhood</span><h2>Three sides of the same story</h2></div></div><div className="site-neighbourhood-grid">{neighbourhoods.map((place) => <article key={place.name}><img src={place.image} alt="" /><div><h3>{place.name}</h3><p>{place.detail}</p><button aria-label={`Explore ${place.name}`}><ArrowRight size={18} /></button></div></article>)}</div></div></section>

      <section className="site-planner site-container" id="plan"><div><span className="planner-icon"><Sparkles size={24} /></span><span className="site-eyebrow plum">Made for your kind of trip</span><h2>Not sure where to start?</h2><p>Tell us who’s coming, what you love and how long you have. We’ll shape a Valechester itinerary around you.</p><button>Build my itinerary <ArrowRight size={17} /></button></div><aside id="accessibility"><span><TrainFront size={21} /><strong>42 mins</strong><small>by direct train from Birmingham</small></span><span><Accessibility size={21} /><strong>Accessible</strong><small>routes and venue details</small></span><span><Clock3 size={21} /><strong>2–3 days</strong><small>to see the town at its best</small></span></aside></section>

      <section className="site-newsletter"><div><span className="site-eyebrow">A little Valechester, now and then</span><h2>Good ideas for your next escape.</h2><p>Monthly inspiration, new openings and events worth planning around.</p><form onSubmit={(event) => event.preventDefault()}><input type="email" placeholder="Your email address" aria-label="Email address" /><button>Count me in <ArrowRight size={16} /></button></form><small>No clutter. Unsubscribe whenever you like.</small></div></section>
    </main>
    <SiteFooter />
  </div>
}

function ListingPage({ listing }: { listing: Listing }) {
  const image = imageLibrary[listing.image] ?? imageLibrary.hero
  return <div className="public-site"><SiteHeader /><main className="place-page"><div className="place-breadcrumb site-container"><button onClick={() => siteNavigate('/')}>Home</button><span>/</span><button onClick={() => siteNavigate('/')}>{categoryGroup(listing)}</button><span>/</span><strong>{listing.name}</strong></div><section className="place-hero"><img src={image} alt={listing.name} /><div className="place-hero-copy site-container"><span className="site-eyebrow">{listing.category}</span><h1>{listing.name}</h1><p><MapPin size={16} />{listing.town}</p></div></section><div className="place-layout site-container"><article><p className="place-lede">{listing.shortDescription}</p><h2>Your visit</h2><p>{listing.description}</p><div className="place-highlights"><h3>Visitors frequently mention</h3><div>{listing.facilities.slice(0, 5).map((item) => <span key={item}><Star size={14} />{item}</span>)}</div><small>Common themes from destination content and visitor feedback. Demo data only.</small></div><h2>Good to know</h2><dl><div><dt>Opening times</dt><dd>{listing.openingHours}</dd></div><div><dt>Accessibility & facilities</dt><dd>{listing.facilities.join(' · ')}</dd></div><div><dt>Location</dt><dd>{listing.town}, Valechester</dd></div></dl></article><aside><span className="place-book-label">Plan your visit</span><h3>{listing.name}</h3><a className="place-book" href={listing.bookingUrl || listing.website}>Visit website <ArrowRight size={16} /></a><a href={`mailto:${listing.email}`}>{listing.email || 'Contact venue'}</a>{listing.phone && <a href={`tel:${listing.phone}`}>{listing.phone}</a>}<div><CalendarDays size={18} /><span><strong>Save for later</strong><small>Add this place to your trip</small></span></div></aside></div></main><SiteFooter /></div>
}

export function PublicSite() {
  const { data } = useCRM()
  const { features } = useFeatures()
  const [path, setPath] = useState(window.location.pathname)
  useEffect(() => {
    const listener = () => { setPath(window.location.pathname); window.scrollTo({ top: 0 }) }
    window.addEventListener('popstate', listener)
    return () => window.removeEventListener('popstate', listener)
  }, [])
  if (!features.publicWebsite) return <main className="site-disabled"><BrandLogo /><h1>Website module is not enabled</h1><p>This destination currently uses the CRM workspace without a public website.</p><a href="/crm">Open destination workspace</a></main>
  const listingId = path.startsWith('/place/') ? path.split('/')[2] : null
  const listing = data.listings.find((item) => item.id === listingId && item.status === 'Published')
  return listing ? <ListingPage listing={listing} /> : <HomePage />
}
