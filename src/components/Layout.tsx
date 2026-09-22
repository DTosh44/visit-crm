import {
  Bell, BarChart3, BookOpen, Building2, CircleDollarSign, ClipboardCheck, ExternalLink, FilePenLine, PanelsTopLeft,
  FileSignature, Gauge, Handshake, HelpCircle, ListTodo, LogOut, Menu, Plus, Search, Settings, CalendarDays,
  Inbox as InboxIcon, UsersRound, X, MapPinned, Images, FlaskConical, ContactRound,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useCRM } from '../store'
import type { Organisation, ViewKey } from '../types'
import { classNames } from '../utils'
import { Avatar, useDialogFocus } from './UI'
import { BrandLogo, ProductLogo } from './BrandLogo'
import { type FeatureKey } from '../tenant'
import { canAccessView, useAuth } from '../auth'
import { useFeatures } from '../features'

const navGroups: Array<{ label: string; items: Array<{ key: ViewKey; label: string; icon: typeof Gauge; feature?: FeatureKey }> }> = [
  { label: 'Workspace', items: [
    { key: 'dashboard', label: 'Dashboard', icon: Gauge },
    { key: 'organisations', label: 'Organisations', icon: Building2, feature: 'organisations' },
    { key: 'people', label: 'People', icon: ContactRound, feature: 'organisations' },
    { key: 'pipeline', label: 'Sales pipeline', icon: Handshake, feature: 'salesPipeline' },
    { key: 'tasks', label: 'Tasks', icon: ListTodo, feature: 'tasks' },
  ] },
  { label: 'Membership', items: [
    { key: 'memberships', label: 'Memberships', icon: UsersRound, feature: 'memberships' },
    { key: 'agreements', label: 'Agreements', icon: FileSignature, feature: 'agreements' },
    { key: 'billing', label: 'Billing', icon: CircleDollarSign, feature: 'billing' },
  ] },
  { label: 'Website', items: [
    { key: 'pages', label: 'Pages', icon: PanelsTopLeft, feature: 'publicWebsite' },
    { key: 'images', label: 'Image bank', icon: Images, feature: 'imageBank' },
    { key: 'experiments', label: 'A/B testing', icon: FlaskConical, feature: 'websiteExperiments' },
    { key: 'map', label: 'Interactive map', icon: MapPinned, feature: 'interactiveMap' },
    { key: 'listings', label: 'Listings', icon: FilePenLine, feature: 'listings' },
    { key: 'events', label: 'Events', icon: CalendarDays, feature: 'events' },
    { key: 'content', label: 'Guides, itineraries & trails', icon: BookOpen, feature: 'itineraries' },
    { key: 'inbox', label: 'Website inbox', icon: InboxIcon },
  ] },
  { label: 'Reporting', items: [
    { key: 'insights', label: 'Reviews & social insights', icon: BarChart3, feature: 'reviewIntelligence' },
  ] },
  { label: 'Manage', items: [
    { key: 'settings', label: 'Settings', icon: Settings },
  ] },
]

const pageNames: Record<ViewKey, string> = {
  dashboard: 'Dashboard', organisations: 'Organisations', people: 'People', pipeline: 'Sales pipeline', memberships: 'Memberships',
  pages: 'Pages', images: 'Image bank', experiments: 'A/B testing', map: 'Interactive map', listings: 'Listings', events: 'Events', content: 'Guides, itineraries & trails', inbox: 'Website inbox', insights: 'Reviews & social insights', billing: 'Billing', agreements: 'Agreements', tasks: 'Tasks', settings: 'Settings',
}

export function Layout({
  view,
  setView,
  onAddOrganisation,
  onAddInvoice,
  onAddTask,
  onOpenOrganisation,
  children,
}: {
  view: ViewKey
  setView: (view: ViewKey) => void
  onAddOrganisation: () => void
  onAddInvoice: () => void
  onAddTask: () => void
  onOpenOrganisation: (organisation: Organisation) => void
  children: ReactNode
}) {
  const { data } = useCRM()
  const { user, signOut } = useAuth()
  const { features } = useFeatures()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)
  const [notificationsOpen,setNotificationsOpen]=useState(false)
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

  const searchResults = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return data.organisations.slice(0, 5)
    return data.organisations.filter((org) => {
      const contacts=data.contacts.filter((contact)=>contact.organisationId===org.id)
      const listings=data.listings.filter((listing)=>listing.organisationId===org.id)
      return [org.name,org.town,org.type,org.tier,...org.tags,...contacts.flatMap((contact)=>[contact.name,contact.email]),...listings.flatMap((listing)=>[listing.name,listing.category,listing.town])].join(' ').toLowerCase().includes(term)
    }).slice(0, 7)
  }, [data.contacts,data.listings,data.organisations, query])
  useEffect(()=>{if(!searchOpen)return;const handle=(event:KeyboardEvent)=>{if(event.key==='ArrowDown'){event.preventDefault();setActiveResult((current)=>Math.min(searchResults.length-1,current+1))}if(event.key==='ArrowUp'){event.preventDefault();setActiveResult((current)=>Math.max(0,current-1))}if(event.key==='Enter'&&searchResults[activeResult]){event.preventDefault();setSearchOpen(false);setQuery('');onOpenOrganisation(searchResults[activeResult])}};window.addEventListener('keydown',handle);return()=>window.removeEventListener('keydown',handle)},[activeResult,onOpenOrganisation,searchOpen,searchResults])
  const generatedNotifications=useMemo(()=>{const today=new Date().toISOString().slice(0,10);return[
    ...data.tasks.filter((task)=>!task.completed&&task.dueDate<=today).map((task)=>({id:`task-${task.id}`,title:task.title,detail:task.dueDate<today?'Task is overdue':'Task is due today',view:'tasks' as ViewKey})),
    ...data.invoices.filter((invoice)=>invoice.status==='Overdue').map((invoice)=>({id:`invoice-${invoice.id}`,title:`${invoice.number} is overdue`,detail:'Payment follow-up required',view:'billing' as ViewKey})),
    ...data.events.filter((event)=>event.status==='In review').map((event)=>({id:`event-${event.id}`,title:event.title,detail:'Event is awaiting review',view:'events' as ViewKey})),
    ...data.agreements.filter((agreement)=>agreement.status==='Sent').map((agreement)=>({id:`agreement-${agreement.id}`,title:agreement.number,detail:'Agreement is waiting for signature',view:'agreements' as ViewKey})),
  ].slice(0,12)},[data.agreements,data.events,data.invoices,data.tasks])
  const notifications=generatedNotifications.filter((item)=>!dismissedNotifications.includes(item.id))
  const dismissNotifications=()=>{const next=Array.from(new Set([...dismissedNotifications,...generatedNotifications.map((item)=>item.id)]));setDismissedNotifications(next);localStorage.setItem('vv-dismissed-notifications',JSON.stringify(next))}

  const navigate = (key: ViewKey) => {
    setView(key)
    setSidebarOpen(false)
  }

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
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <span className="nav-label">{group.label}</span>
              {group.items.filter((item) => (item.key==='insights' ? features.reviewIntelligence||features.socialInsights : !item.feature || features[item.feature]) && canAccessView(user?.role, item.key)).map(({ key, label, icon: Icon }) => (
                <button key={key} className={classNames('nav-item', view === key && 'active')} aria-current={view === key ? 'page' : undefined} aria-label={key === 'tasks' ? `${label}, ${data.tasks.filter((task) => !task.completed).length} open tasks` : label} onClick={() => navigate(key)}>
                  <Icon size={18} strokeWidth={1.9} />
                  <span>{label}</span>
                  {key === 'tasks' && <em aria-hidden="true">{data.tasks.filter((task) => !task.completed).length}</em>}
                  {key === 'listings' && data.listings.some((listing) => listing.status === 'In review') && <i aria-hidden="true" />}
                </button>
              ))}
            </div>
          ))}
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
            <button className="search-trigger" onClick={() => {setActiveResult(0);setSearchOpen(true)}} aria-haspopup="dialog" aria-expanded={searchOpen} aria-controls="command-palette">
              <Search size={17} /><span>Search organisations...</span><kbd>⌘ K</kbd>
            </button>
            <div className="notification-wrap"><button className="icon-button notification-button" aria-label="Notifications" aria-expanded={notificationsOpen} aria-controls="notification-panel" onClick={()=>setNotificationsOpen((value)=>!value)} title={`${notifications.length} notifications requiring attention`}><Bell size={19} />{notifications.length>0&&<i aria-hidden="true" />}</button>{notificationsOpen&&<div id="notification-panel" className="notification-panel" role="region" aria-label="Notifications"><header><div><strong>Notifications</strong><span aria-live="polite">{notifications.length} requiring attention</span></div>{notifications.length>0&&<button onClick={dismissNotifications}>Mark all read</button>}<button onClick={()=>setNotificationsOpen(false)} aria-label="Close notifications"><X size={16}/></button></header><div>{notifications.length?notifications.map((item)=><button key={item.id} onClick={()=>{navigate(item.view);setNotificationsOpen(false)}}><span><strong>{item.title}</strong><small>{item.detail}</small></span></button>):<p>You’re all caught up.</p>}</div></div>}</div>
            <div className="quick-wrap">
              <button className="button button-primary button-md" onClick={() => setQuickOpen((value) => !value)} aria-expanded={quickOpen} aria-controls="quick-create-menu"><Plus size={17} />Add new</button>
              {quickOpen && (
                <div id="quick-create-menu" className="quick-menu" role="region" aria-label="Quick create">
                  <span>Quick create</span>
                  {canAccessView(user?.role, 'organisations') && <button onClick={() => { setQuickOpen(false); onAddOrganisation() }}><Building2 size={17} /><div><strong>Organisation</strong><small>Add a member, prospect or partner</small></div></button>}
                  {canAccessView(user?.role, 'tasks') && <button onClick={() => { setQuickOpen(false); onAddTask() }}><ClipboardCheck size={17} /><div><strong>Task</strong><small>Create a follow-up</small></div></button>}
                  {canAccessView(user?.role, 'billing') && <button onClick={() => { setQuickOpen(false); onAddInvoice() }}><CircleDollarSign size={17} /><div><strong>Invoice</strong><small>Raise a new invoice</small></div></button>}
                </div>
              )}
            </div>
          </div>
        </header>

        <main id="main-content" className="main-content" tabIndex={-1}>{children}</main>
      </div>

      {searchOpen && (
        <div className="command-overlay" onMouseDown={(event) => event.target === event.currentTarget && setSearchOpen(false)}>
          <div id="command-palette" ref={commandRef} tabIndex={-1} className="command-palette" role="dialog" aria-modal="true" aria-label="Search organisations">
            <div className="command-input"><Search size={20} /><input ref={searchRef} data-dialog-initial-focus aria-label="Search organisations, contacts and listings" value={query} onChange={(event) => {setQuery(event.target.value);setActiveResult(0)}} placeholder="Search organisations, contacts and listings..." /><kbd>esc</kbd></div>
            <div className="command-results">
              <span className="command-label">{query ? 'Results' : 'Recently viewed'}</span>
              {searchResults.length ? searchResults.map((org,index) => (
                <button key={org.id} className={index===activeResult?'active':''} onMouseEnter={()=>setActiveResult(index)} onClick={() => { setSearchOpen(false); setQuery(''); onOpenOrganisation(org) }}>
                  <span className="search-result-avatar" style={{ background: org.colour }}>{org.name.slice(0, 2).toUpperCase()}</span>
                  <span><strong>{org.name}</strong><small>{org.type} · {org.town}</small></span>
                  <span className="search-result-meta">{org.tier}</span>
                </button>
              )) : <div className="command-empty"><Search size={24} /><p>No matching organisations</p></div>}
            </div>
            <footer><span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span><span><kbd>↵</kbd> to open</span></footer>
          </div>
        </div>
      )}
    </div>
  )
}
