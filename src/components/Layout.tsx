import {
  Bell, BarChart3, BookOpen, Building2, CircleDollarSign, ClipboardCheck, ExternalLink, FilePenLine, PanelsTopLeft,
  FileSignature, Gauge, Handshake, HelpCircle, ListTodo, LogOut, Menu, Plus, Search, Settings, CalendarDays,
  Inbox as InboxIcon, UsersRound, X, MapPinned, Images, ContactRound, Bot, Megaphone, Newspaper, Plane, BriefcaseBusiness, HeartPulse, ClipboardList, Workflow, Mail, ChevronDown,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useCRM } from '../store'
import type { CreateTarget, Listing, Organisation, ViewKey } from '../types'
import { classNames } from '../utils'
import { Avatar, useDialogFocus } from './UI'
import { BrandLogo, ProductLogo } from './BrandLogo'
import { type FeatureKey } from '../tenant'
import { canAccessView, useAuth } from '../auth'
import { useFeatures } from '../features'
import { AskVisitMade } from './AskVisitMade'
import { usePlatform } from '../platform'

const navGroups: Array<{ label: string; items: Array<{ key: ViewKey; label: string; icon: typeof Gauge; feature?: FeatureKey }> }> = [
  { label: 'Home', items: [
    { key: 'dashboard', label: 'Dashboard', icon: Gauge },
    { key: 'tasks', label: 'My tasks / team tasks', icon: ListTodo, feature: 'tasks' },
    { key: 'inbox', label: 'Approvals', icon: ClipboardCheck },
  ] },
  { label: 'Contacts', items: [
    { key: 'organisations', label: 'Organisations', icon: Building2, feature: 'organisations' },
    { key: 'people', label: 'People', icon: ContactRound, feature: 'organisations' },
  ] },
  { label: 'Membership', items: [
    { key: 'memberships', label: 'Members, renewals & benefits', icon: UsersRound, feature: 'memberships' },
    { key: 'pipeline', label: 'Sales pipeline', icon: Handshake, feature: 'salesPipeline' },
    { key: 'memberValue', label: 'Membership value', icon: HeartPulse, feature: 'memberValue' },
    { key: 'agreements', label: 'Agreements', icon: FileSignature, feature: 'agreements' },
    { key: 'memberOpportunities', label: 'Member opportunities', icon: ClipboardList, feature: 'coopOpportunities' },
    { key: 'engagement', label: 'Members needing attention', icon: Gauge, feature: 'memberValue' },
  ] },
  { label: 'Website', items: [
    { key: 'listings', label: 'Listings', icon: FilePenLine, feature: 'listings' },
    { key: 'events', label: 'What’s on', icon: CalendarDays, feature: 'events' },
    { key: 'pages', label: 'Pages', icon: PanelsTopLeft, feature: 'publicWebsite' },
    { key: 'content', label: 'Guides, itineraries & trails', icon: BookOpen, feature: 'itineraries' },
    { key: 'images', label: 'Image bank', icon: Images, feature: 'imageBank' },
    { key: 'websiteHealth', label: 'Website checks', icon: HeartPulse, feature: 'websiteHealth' },
    { key: 'inbox', label: 'Website enquiries', icon: InboxIcon },
    { key: 'map', label: 'Website settings & map', icon: MapPinned, feature: 'interactiveMap' },
  ] },
  { label: 'Marketing', items: [
    { key: 'communications', label: 'Communications', icon: Mail, feature: 'communications' },
    { key: 'campaigns', label: 'Campaigns', icon: Megaphone, feature: 'campaigns' },
    { key: 'prMedia', label: 'PR & Media', icon: Newspaper, feature: 'prMedia' },
  ] },
  { label: 'Finance', items: [
    { key: 'billing', label: 'Invoices, payments & reminders', icon: CircleDollarSign, feature: 'billing' },
  ] },
  { label: 'Reports', items: [
    { key: 'insights', label: 'Performance reports', icon: BarChart3 },
  ] },
  { label: 'Travel Trade', items: [
    { key: 'travelTrade', label: 'Buyers, leads & FAMs', icon: Plane, feature: 'travelTrade' },
  ] },
  { label: 'Business Events', items: [
    { key: 'businessEvents', label: 'Enquiries & venues', icon: BriefcaseBusiness, feature: 'businessEvents' },
  ] },
  { label: 'Settings', items: [
    { key: 'automations', label: 'Automated routines', icon: Workflow, feature: 'automations' },
    { key: 'settings', label: 'Workspace, team & modules', icon: Settings },
  ] },
]

const pageNames: Record<ViewKey, string> = {
  dashboard: 'Dashboard', organisations: 'Organisations', people: 'People', pipeline: 'Sales pipeline', memberships: 'Memberships',
  pages: 'Pages', images: 'Image bank', experiments: 'Unavailable', map: 'Website settings', listings: 'Listings', events: 'What’s on', content: 'Guides, itineraries & trails', inbox: 'Approvals & website enquiries', insights: 'Reports', billing: 'Invoices & payments', agreements: 'Agreements', tasks: 'Tasks', communications:'Communications', memberValue:'Membership value', memberOpportunities:'Member opportunities', campaigns:'Campaigns', engagement:'Members needing attention', travelTrade:'Travel Trade', businessEvents:'Business Events', prMedia:'PR & Media', surveys:'Unavailable', websiteHealth:'Website checks', automations:'Automated routines', settings: 'Settings',
}

export function Layout({
  view,
  setView,
  onCreate,
  onOpenOrganisation,
  onOpenListing,
  children,
}: {
  view: ViewKey
  setView: (view: ViewKey) => void
  onCreate: (target: CreateTarget) => void
  onOpenOrganisation: (organisation: Organisation) => void
  onOpenListing: (listing: Listing) => void
  children: ReactNode
}) {
  const { data } = useCRM()
  const {data:platform,updateRecord:upsertPlatformRecord}=usePlatform()
  const { user, signOut } = useAuth()
  const { features } = useFeatures()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(navGroups.map((group) => group.label)))
  const [searchOpen, setSearchOpen] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)
  const [notificationsOpen,setNotificationsOpen]=useState(false)
  const [assistantOpen,setAssistantOpen]=useState(false)
  const [dismissedNotifications,setDismissedNotifications]=useState<string[]>(()=>{try{return JSON.parse(localStorage.getItem('vv-dismissed-notifications')??'[]') as string[]}catch{return[]}})
  const [query, setQuery] = useState('')
  const [activeResult,setActiveResult]=useState(0)
  const searchRef = useRef<HTMLInputElement>(null)
  const commandRef = useDialogFocus<HTMLDivElement>(searchOpen, () => { setSearchOpen(false); setQuery('') })

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setActiveResult(0)
        setSearchOpen(true)
      }
      if (event.key === 'Escape') {
        setSearchOpen(false)
        setQuickOpen(false)
        setNotificationsOpen(false)
        setSidebarOpen(false)
      }
    }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [])

  useEffect(() => {
    if (searchOpen) window.setTimeout(() => searchRef.current?.focus(), 30)
  }, [searchOpen])

  useEffect(() => {
    document.title = `${pageNames[view]} | ${data.workspace.destinationName} CRM`
  }, [data.workspace.destinationName, view])

  const navigate = (key: ViewKey) => {
    setView(key)
    setSidebarOpen(false)
  }

  const searchResults = useMemo(() => {
    const term=query.trim().toLowerCase();const match=(...values:unknown[])=>!term||values.flat().join(' ').toLowerCase().includes(term)
    const results:Array<{id:string;title:string;detail:string;meta:string;view:ViewKey;entityId?:string;kind:'organisation'|'listing'|'module';colour?:string}>=[]
    data.organisations.filter((item)=>match(item.name,item.type,item.town,item.tier,item.status,item.tags)).forEach((item)=>results.push({id:`org-${item.id}`,title:item.name,detail:`${item.type} · ${item.town}`,meta:'Organisation',view:'organisations',entityId:item.id,kind:'organisation',colour:item.colour}))
    data.contacts.filter((item)=>match(item.name,item.jobTitle,item.email,item.phone,item.roles,item.tags,data.organisations.find((org)=>org.id===item.organisationId)?.name)).forEach((item)=>results.push({id:`person-${item.id}`,title:item.name,detail:`${item.jobTitle||item.roles.join(', ')} · ${item.email}`,meta:'Person',view:'people',kind:'module'}))
    data.opportunities.filter((item)=>match(item.organisationName,item.contactName,item.stage,item.proposedLevel,item.owner,item.nextAction)).forEach((item)=>results.push({id:`opportunity-${item.id}`,title:item.organisationName,detail:`${item.stage} · ${item.contactName}`,meta:'Opportunity',view:'pipeline',kind:'module'}))
    data.levels.filter((item)=>match(item.name,item.description,item.price,item.benefits)).forEach((item)=>results.push({id:`level-${item.id}`,title:item.name,detail:item.description,meta:'Membership',view:'memberships',kind:'module',colour:item.colour}))
    data.benefits.filter((item)=>match(item.name,item.kind,item.category,item.allowance)).forEach((item)=>results.push({id:`benefit-${item.id}`,title:item.name,detail:`${item.category} · ${item.kind}`,meta:'Benefit',view:'memberships',kind:'module'}))
    data.listings.filter((item)=>match(item.name,item.category,item.town,item.status,item.searchTags,item.facilities)).forEach((item)=>results.push({id:`listing-${item.id}`,title:item.name,detail:`${item.category} · ${item.town}`,meta:'Listing',view:'listings',entityId:item.id,kind:'listing'}))
    data.events.filter((item)=>match(item.title,item.category,item.venueName,item.town,item.status,item.contactName)).forEach((item)=>results.push({id:`event-${item.id}`,title:item.title,detail:`${item.venueName} · ${item.startDate}`,meta:'Event',view:'events',kind:'module'}))
    data.contentPages.filter((item)=>match(item.title,item.summary,item.type,item.slug,item.status)).forEach((item)=>results.push({id:`content-${item.id}`,title:item.title,detail:`${item.type} · /${item.slug}`,meta:'Content',view:'content',kind:'module'}))
    data.websitePages.filter((item)=>match(item.name,item.path,item.template,item.status,item.draft.title)).forEach((item)=>results.push({id:`page-${item.id}`,title:item.name,detail:`${item.path} · ${item.status}`,meta:'Website page',view:'pages',kind:'module'}))
    data.imageAssets.filter((item)=>match(item.name,item.alt,item.credit,item.collection,item.tags)).forEach((item)=>results.push({id:`image-${item.id}`,title:item.name,detail:`${item.collection} · ${item.credit}`,meta:'Image',view:'images',kind:'module'}))
    data.submissions.filter((item)=>match(item.kind,item.status,item.createdAt,JSON.stringify(item.payload))).forEach((item)=>results.push({id:`submission-${item.id}`,title:String(item.payload.name??item.payload.email??item.kind),detail:`${item.kind} · ${item.status}`,meta:'Website inbox',view:'inbox',kind:'module'}))
    data.invoices.filter((item)=>match(item.number,item.description,item.status,item.sentTo,data.organisations.find((org)=>org.id===item.organisationId)?.name)).forEach((item)=>results.push({id:`invoice-${item.id}`,title:item.number,detail:`${item.description} · ${item.status}`,meta:'Invoice',view:'billing',kind:'module'}))
    data.agreements.filter((item)=>match(item.number,item.membershipLevel,item.signatory,item.signatoryEmail,item.status,data.organisations.find((org)=>org.id===item.organisationId)?.name)).forEach((item)=>results.push({id:`agreement-${item.id}`,title:item.number,detail:`${item.signatory} · ${item.status}`,meta:'Agreement',view:'agreements',kind:'module'}))
    data.tasks.filter((item)=>match(item.title,item.category,item.priority,item.assignee,item.dueDate,data.organisations.find((org)=>org.id===item.organisationId)?.name)).forEach((item)=>results.push({id:`task-${item.id}`,title:item.title,detail:`${item.category} · ${item.dueDate}`,meta:'Task',view:'tasks',kind:'module'}))
    platform.campaigns.filter((item)=>match(item.name,item.description,item.type,item.objective,item.audience,item.markets,item.themes,item.channels,item.owner,item.status)).forEach((item)=>results.push({id:`campaign-${item.id}`,title:item.name,detail:`${item.status} · ${item.owner}`,meta:'Campaign',view:'campaigns',kind:'module'}))
    platform.memberOpportunities.filter((item)=>match(item.title,item.description,item.type,item.category,item.owner,item.eligibleLevels,item.eligibleGeographies,item.eligibleCategories,item.status)).forEach((item)=>results.push({id:`member-opportunity-${item.id}`,title:item.title,detail:`${item.category} · ${item.status}`,meta:'Member opportunity',view:'memberOpportunities',kind:'module'}))
    platform.travelBuyers.filter((item)=>match(item.company,item.contact,item.country,item.market,item.type,item.interests,item.tags)).forEach((item)=>results.push({id:`buyer-${item.id}`,title:item.company,detail:`${item.contact} · ${item.country}`,meta:'Travel buyer',view:'travelTrade',kind:'module'}))
    platform.tradeLeads.filter((item)=>match(item.description,item.markets,item.interests,item.stage,item.owner)).forEach((item)=>results.push({id:`trade-lead-${item.id}`,title:item.description,detail:`${item.stage} · ${item.partySize} people`,meta:'Trade lead',view:'travelTrade',kind:'module'}))
    platform.famTrips.filter((item)=>match(item.title,item.targetMarket,item.itinerary,item.feedback,item.followUp)).forEach((item)=>results.push({id:`fam-trip-${item.id}`,title:item.title,detail:`${item.targetMarket} · ${item.startDate}`,meta:'FAM trip',view:'travelTrade',kind:'module'}))
    platform.businessEnquiries.filter((item)=>match(item.client,item.organisation,item.eventType,item.requirements,item.stage,item.owner)).forEach((item)=>results.push({id:`business-${item.id}`,title:item.client,detail:`${item.eventType} · ${item.stage}`,meta:'Business event',view:'businessEvents',kind:'module'}))
    platform.mediaProfiles.filter((item)=>match(item.name,item.outlet,item.type,item.topics,item.tags)).forEach((item)=>results.push({id:`media-${item.id}`,title:item.name,detail:`${item.outlet} · ${item.type}`,meta:'Media contact',view:'prMedia',kind:'module'}))
    return results.filter((item)=>canAccessView(user?.role,item.view)).slice(0,15)
  }, [data,platform,user?.role,query])
  const openSearchResult=(result:typeof searchResults[number])=>{setSearchOpen(false);setQuery('');if(result.kind==='organisation'){const item=data.organisations.find((org)=>org.id===result.entityId);if(item)onOpenOrganisation(item);return}if(result.kind==='listing'){const item=data.listings.find((listing)=>listing.id===result.entityId);if(item)onOpenListing(item);return}navigate(result.view)}
  useEffect(()=>{if(!searchOpen)return;const handle=(event:KeyboardEvent)=>{if(event.key==='ArrowDown'){event.preventDefault();setActiveResult((current)=>Math.min(searchResults.length-1,current+1))}if(event.key==='ArrowUp'){event.preventDefault();setActiveResult((current)=>Math.max(0,current-1))}if(event.key==='Enter'&&searchResults[activeResult]){event.preventDefault();openSearchResult(searchResults[activeResult])}};window.addEventListener('keydown',handle);return()=>window.removeEventListener('keydown',handle)})
  const generatedNotifications=useMemo(()=>{const today=new Date().toISOString().slice(0,10);return[
    ...platform.automationNotifications.filter((item)=>!item.read&&item.user===user?.name).map((item)=>({id:`automation-${item.id}`,title:item.title,detail:item.detail,view:(canAccessView(user?.role,'automations')?'automations':'dashboard') as ViewKey})),
    ...data.tasks.filter((task)=>!task.completed&&task.dueDate<=today).map((task)=>({id:`task-${task.id}`,title:task.title,detail:task.dueDate<today?'Task is overdue':'Task is due today',view:'tasks' as ViewKey})),
    ...data.invoices.filter((invoice)=>invoice.status==='Overdue').map((invoice)=>({id:`invoice-${invoice.id}`,title:`${invoice.number} is overdue`,detail:'Payment follow-up required',view:'billing' as ViewKey})),
    ...data.events.filter((event)=>event.status==='In review').map((event)=>({id:`event-${event.id}`,title:event.title,detail:'Event is awaiting review',view:'events' as ViewKey})),
    ...data.agreements.filter((agreement)=>agreement.status==='Sent').map((agreement)=>({id:`agreement-${agreement.id}`,title:agreement.number,detail:'Agreement is waiting for signature',view:'agreements' as ViewKey})),
  ].slice(0,12)},[data.agreements,data.events,data.invoices,data.tasks,platform.automationNotifications,user?.name,user?.role])
  const notifications=generatedNotifications.filter((item)=>!dismissedNotifications.includes(item.id))
  const dismissNotifications=()=>{const next=Array.from(new Set([...dismissedNotifications,...generatedNotifications.map((item)=>item.id)]));setDismissedNotifications(next);localStorage.setItem('vv-dismissed-notifications',JSON.stringify(next));platform.automationNotifications.filter((item)=>item.user===user?.name&&!item.read).forEach((item)=>upsertPlatformRecord('automationNotifications',item.id,{read:true}))}

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <aside id="crm-sidebar-navigation" className={classNames('sidebar', sidebarOpen && 'sidebar-open')} aria-label="Workspace navigation">
        <div className="brand">
          <ProductLogo />
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X size={20} /></button>
        </div>

        <div className="workspace-switcher">
          <small>Destination</small>
          <BrandLogo inverse />
        </div>

        <nav className="nav" aria-label="CRM sections">
          {navGroups.map((group) => {
            const visibleItems=group.items.filter((item) => (!item.feature || features[item.feature]) && canAccessView(user?.role, item.key))
            if(!visibleItems.length)return null
            return <div className="nav-group" key={group.label}>
              <button className="nav-label nav-group-toggle" aria-expanded={openGroups.has(group.label)} onClick={()=>setOpenGroups((current)=>{const next=new Set(current);if(next.has(group.label))next.delete(group.label);else next.add(group.label);return next})}>{group.label}<ChevronDown size={13}/></button>
              {openGroups.has(group.label)&&visibleItems.map(({ key, label, icon: Icon }) => (
                <button key={key} className={classNames('nav-item', view === key && 'active')} aria-current={view === key ? 'page' : undefined} aria-label={key === 'tasks' ? `${label}, ${data.tasks.filter((task) => !task.completed).length} open tasks` : label} onClick={() => navigate(key)}>
                  <Icon size={18} strokeWidth={1.9} />
                  <span>{label}</span>
                  {key === 'tasks' && <em aria-hidden="true">{data.tasks.filter((task) => !task.completed).length}</em>}
                  {key === 'listings' && data.listings.some((listing) => listing.status === 'In review') && <i aria-hidden="true" />}
                </button>
              ))}
            </div>
          })}
        </nav>

        <div className="sidebar-footer">
          <a className="view-site-link" href="/" target="_blank" rel="noreferrer" aria-label="View visitor website (opens in a new tab)"><ExternalLink size={16} /><span>View visitor website</span></a>
          <a className="help-feedback-link" href={`mailto:${data.workspace.contactEmail}?subject=${encodeURIComponent('CRM help and feedback')}`}><HelpCircle size={17} /><span>Help & feedback</span></a>
          <div className="sidebar-user">
            <Avatar name={user?.name ?? ''} size="sm" colour={user?.colour} />
            <span><strong>{user?.name}</strong><small>{user?.role}</small></span>
            <button onClick={() => void signOut()} aria-label="Sign out" title="Sign out"><LogOut size={14} /></button>
          </div>
        </div>
      </aside>

      {sidebarOpen && <button className="sidebar-scrim" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />}

      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open navigation" aria-expanded={sidebarOpen} aria-controls="crm-sidebar-navigation"><Menu size={21} /></button>
            <span className="breadcrumb"><span>{data.workspace.destinationName} CRM</span><i>/</i><strong aria-live="polite">{pageNames[view]}</strong></span>
          </div>
          <div className="topbar-right">
            {features.aiAssistant&&<button className="assistant-trigger" onClick={()=>setAssistantOpen(true)}><Bot size={17}/><span>Ask VisitMade</span></button>}
            <button className="search-trigger" onClick={() => {setActiveResult(0);setSearchOpen(true)}} aria-haspopup="dialog" aria-expanded={searchOpen} aria-controls="command-palette">
              <Search size={17} /><span>Search the CRM...</span><kbd>⌘ K</kbd>
            </button>
            <div className="notification-wrap"><button className="icon-button notification-button" aria-label="Notifications" aria-expanded={notificationsOpen} aria-controls="notification-panel" onClick={()=>setNotificationsOpen((value)=>!value)} title={`${notifications.length} notifications requiring attention`}><Bell size={19} />{notifications.length>0&&<i aria-hidden="true" />}</button>{notificationsOpen&&<div id="notification-panel" className="notification-panel" role="region" aria-label="Notifications"><header><div><strong>Notifications</strong><span aria-live="polite">{notifications.length} requiring attention</span></div>{notifications.length>0&&<button onClick={dismissNotifications}>Mark all read</button>}<button onClick={()=>setNotificationsOpen(false)} aria-label="Close notifications"><X size={16}/></button></header><div>{notifications.length?notifications.map((item)=><button key={item.id} onClick={()=>{navigate(item.view);setNotificationsOpen(false)}}><span><strong>{item.title}</strong><small>{item.detail}</small></span></button>):<p>You’re all caught up.</p>}</div></div>}</div>
            <div className="quick-wrap">
              <button className="button button-primary button-md" onClick={() => setQuickOpen((value) => !value)} aria-expanded={quickOpen} aria-controls="quick-create-menu"><Plus size={17} />Add new</button>
              {quickOpen && (
                <div id="quick-create-menu" className="quick-menu" role="region" aria-label="Quick create">
                  <span>Quick create</span>
                  {([
                    ['organisation','organisations',Building2,'Organisation','Member, prospect or partner'],['person','people',ContactRound,'Person','Contact, PR or travel trade'],['task','tasks',ClipboardCheck,'Task','Create a follow-up'],['opportunity','pipeline',Handshake,'Sales opportunity','Add to the sales pipeline'],['membership','memberships',UsersRound,'Membership level','Create a package'],['invoice','billing',CircleDollarSign,'Invoice','Raise a new invoice'],['agreement','agreements',FileSignature,'Agreement','Create a signing record'],['listing','listings',FilePenLine,'Listing','Create a website listing'],['event','events',CalendarDays,'Event','Add to what’s on'],['content','content',BookOpen,'Guide, itinerary or trail','Create inspiration content'],['page','pages',PanelsTopLeft,'Website page','Create a landing page'],['image','images',Images,'Image','Add to the image bank'],
                    ['communication','communications',Mail,'Communication','Create a targeted draft'],['memberValue','memberValue',HeartPulse,'Membership value record','Record delivered value'],['campaign','campaigns',Megaphone,'Campaign','Plan a marketing campaign'],['memberOpportunity','memberOpportunities',ClipboardList,'Member opportunity','Invite eligible members'],['buyer','travelTrade',Plane,'Travel trade buyer','Add a buyer relationship'],['tradeLead','travelTrade',Plane,'Trade lead','Record an enquiry'],['famTrip','travelTrade',Plane,'FAM trip','Plan a familiarisation visit'],['businessEnquiry','businessEvents',BriefcaseBusiness,'Business events enquiry','Capture an RFP'],['prOpportunity','prMedia',Newspaper,'PR request','Record a media request'],
                  ] as Array<[CreateTarget,ViewKey,typeof Building2,string,string]>).filter(([target,targetView])=>{const item=navGroups.flatMap((group)=>group.items).find((entry)=>entry.key===targetView);const contextual=targetView===view||['organisation','person','task'].includes(target);return contextual&&canAccessView(user?.role,targetView)&&(!item?.feature||features[item.feature])}).map(([target,,Icon,label,detail])=><button key={target} onClick={()=>{setQuickOpen(false);onCreate(target)}}><Icon size={17}/><div><strong>{label}</strong><small>{detail}</small></div></button>)}
                </div>
              )}
            </div>
          </div>
        </header>

        <main id="main-content" className="main-content" tabIndex={-1}>{children}</main>
      </div>

      {searchOpen && (
        <div className="command-overlay" onMouseDown={(event) => event.target === event.currentTarget && setSearchOpen(false)}>
          <div id="command-palette" ref={commandRef} tabIndex={-1} className="command-palette" role="dialog" aria-modal="true" aria-label="Search the CRM">
            <div className="command-input"><Search size={20} /><input ref={searchRef} data-dialog-initial-focus aria-label="Search the whole CRM" value={query} onChange={(event) => {setQuery(event.target.value);setActiveResult(0)}} placeholder="Search people, content, finance and more..." /><kbd>esc</kbd></div>
            <div className="command-results">
              <span className="command-label">{query ? 'Results' : 'Browse CRM'}</span>
              {searchResults.length ? searchResults.map((result,index) => (
                <button key={result.id} className={index===activeResult?'active':''} onMouseEnter={()=>setActiveResult(index)} onClick={()=>openSearchResult(result)}>
                  <span className="search-result-avatar" style={{ background: result.colour }}>{result.title.slice(0, 2).toUpperCase()}</span>
                  <span><strong>{result.title}</strong><small>{result.detail}</small></span>
                  <span className="search-result-meta">{result.meta}</span>
                </button>
              )) : <div className="command-empty"><Search size={24} /><p>No matching CRM records</p></div>}
            </div>
            <footer><span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span><span><kbd>↵</kbd> to open</span></footer>
          </div>
        </div>
      )}
      <AskVisitMade open={assistantOpen} onClose={()=>setAssistantOpen(false)}/>
    </div>
  )
}
