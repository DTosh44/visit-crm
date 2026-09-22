import {
  Bell, BarChart3, BookOpen, Building2, CircleDollarSign, ClipboardCheck, ExternalLink, FilePenLine,
  FileSignature, Gauge, Handshake, HelpCircle, ListTodo, LogOut, Menu, Plus, Search, Settings, CalendarDays,
  Inbox as InboxIcon, UsersRound, X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useCRM } from '../store'
import type { Organisation, ViewKey } from '../types'
import { classNames } from '../utils'
import { Avatar, useDialogAccessibility } from './UI'
import { BrandLogo } from './BrandLogo'
import { type FeatureKey } from '../tenant'
import { canAccessView, useAuth } from '../auth'
import { useFeatures } from '../features'

const navGroups: Array<{ label: string; items: Array<{ key: ViewKey; label: string; icon: typeof Gauge; feature?: FeatureKey }> }> = [
  { label: 'Workspace', items: [
    { key: 'dashboard', label: 'Dashboard', icon: Gauge },
    { key: 'organisations', label: 'Organisations', icon: Building2, feature: 'organisations' },
    { key: 'pipeline', label: 'Sales pipeline', icon: Handshake, feature: 'salesPipeline' },
    { key: 'tasks', label: 'Tasks', icon: ListTodo, feature: 'tasks' },
  ] },
  { label: 'Membership', items: [
    { key: 'memberships', label: 'Memberships', icon: UsersRound, feature: 'memberships' },
    { key: 'agreements', label: 'Agreements', icon: FileSignature, feature: 'agreements' },
    { key: 'billing', label: 'Billing', icon: CircleDollarSign, feature: 'billing' },
  ] },
  { label: 'Website', items: [
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
  dashboard: 'Dashboard', organisations: 'Organisations', pipeline: 'Sales pipeline', memberships: 'Memberships',
  listings: 'Listings', events: 'Events', content: 'Guides, itineraries & trails', inbox: 'Website inbox', insights: 'Reviews & social insights', billing: 'Billing', agreements: 'Agreements', tasks: 'Tasks', settings: 'Settings',
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
  const searchDialogRef = useDialogAccessibility<HTMLDivElement>(() => setSearchOpen(false), searchOpen)

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
    document.title = `${pageNames[view]} – ${data.workspace.destinationName} CRM`
    window.requestAnimationFrame(() => document.getElementById('main-content')?.focus())
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
      <aside id="crm-sidebar" aria-label="CRM navigation" className={classNames('sidebar', sidebarOpen && 'sidebar-open')}>
        <div className="brand">
          <BrandLogo inverse />
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X size={20} /></button>
        </div>

        <div className="workspace-switcher">
          <span className="workspace-logo">VV</span>
          <span><small>Destination</small><strong>{data.workspace.destinationName}</strong></span>
        </div>

        <nav className="nav" aria-label="Primary navigation">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <span className="nav-label">{group.label}</span>
              {group.items.filter((item) => (item.key==='insights' ? features.reviewIntelligence||features.socialInsights : !item.feature || features[item.feature]) && canAccessView(user?.role, item.key)).map(({ key, label, icon: Icon }) => (
                <button type="button" key={key} className={classNames('nav-item', view === key && 'active')} aria-current={view === key ? 'page' : undefined} onClick={() => navigate(key)}>
                  <Icon size={18} strokeWidth={1.9} />
                  <span>{label}</span>
                  {key === 'tasks' && <em>{data.tasks.filter((task) => !task.completed).length}</em>}
                  {key === 'listings' && data.listings.some((listing) => listing.status === 'In review') && <i aria-hidden="true" />}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <a className="view-site-link" href="/" target="_blank" rel="noreferrer"><ExternalLink size={16} aria-hidden="true" /><span>View visitor website <span className="sr-only">(opens in a new tab)</span></span></a>
          <a className="help-feedback-link" href={`mailto:${data.workspace.contactEmail}?subject=${encodeURIComponent('CRM help and feedback')}`}><HelpCircle size={17} /><span>Help & feedback</span></a>
          <div className="sidebar-user">
            <Avatar name={user?.name ?? ''} size="sm" colour={user?.colour} />
            <span><strong>{user?.name}</strong><small>{user?.role}</small></span>
            <button onClick={() => void signOut()} aria-label="Sign out" title="Sign out"><LogOut size={14} /></button>
          </div>
        </div>
      </aside>

      {sidebarOpen && <button className="sidebar-scrim" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />}

      <div className="main-shell" inert={sidebarOpen || undefined}>
        <header className="topbar">
          <div className="topbar-left">
            <button type="button" className="mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open navigation" aria-controls="crm-sidebar" aria-expanded={sidebarOpen}><Menu size={21} aria-hidden="true" /></button>
            <span className="breadcrumb"><span>{data.workspace.destinationName} CRM</span><i>/</i><strong>{pageNames[view]}</strong></span>
          </div>
          <div className="topbar-right">
            <button type="button" className="search-trigger" aria-haspopup="dialog" aria-expanded={searchOpen} aria-controls="crm-search-dialog" onClick={() => {setActiveResult(0);setSearchOpen(true)}}>
              <Search size={17} /><span>Search organisations...</span><kbd>⌘ K</kbd>
            </button>
            <div className="notification-wrap"><button className="icon-button notification-button" aria-label={`Notifications${notifications.length ? `, ${notifications.length} requiring attention` : ''}`} aria-expanded={notificationsOpen} aria-controls="crm-notifications" onClick={()=>setNotificationsOpen((value)=>!value)} title={`${notifications.length} notifications`}><Bell size={19} />{notifications.length>0&&<i />}</button>{notificationsOpen&&<div id="crm-notifications" className="notification-panel" role="region" aria-label="Notifications"><header><div><strong>Notifications</strong><span>{notifications.length} requiring attention</span></div>{notifications.length>0&&<button onClick={dismissNotifications}>Mark all read</button>}<button onClick={()=>setNotificationsOpen(false)} aria-label="Close notifications"><X size={16}/></button></header><div>{notifications.length?notifications.map((item)=><button key={item.id} onClick={()=>{navigate(item.view);setNotificationsOpen(false)}}><span><strong>{item.title}</strong><small>{item.detail}</small></span></button>):<p>You’re all caught up.</p>}</div></div>}</div>
            <div className="quick-wrap">
              <button type="button" className="button button-primary button-md" aria-expanded={quickOpen} aria-controls="quick-create-menu" onClick={() => setQuickOpen((value) => !value)}><Plus size={17} />Add new</button>
              {quickOpen && (
                <div id="quick-create-menu" className="quick-menu" role="group" aria-label="Quick create">
                  <span aria-hidden="true">Quick create</span>
                  {canAccessView(user?.role, 'organisations') && <button onClick={() => { setQuickOpen(false); onAddOrganisation() }}><Building2 size={17} /><div><strong>Organisation</strong><small>Add a member or prospect</small></div></button>}
                  {canAccessView(user?.role, 'tasks') && <button onClick={() => { setQuickOpen(false); onAddTask() }}><ClipboardCheck size={17} /><div><strong>Task</strong><small>Create a follow-up</small></div></button>}
                  {canAccessView(user?.role, 'billing') && <button onClick={() => { setQuickOpen(false); onAddInvoice() }}><CircleDollarSign size={17} /><div><strong>Invoice</strong><small>Raise a new invoice</small></div></button>}
                </div>
              )}
            </div>
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="main-content">{children}</main>
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{pageNames[view]} page loaded</div>
      </div>

      {searchOpen && (
        <div className="command-overlay" onMouseDown={(event) => event.target === event.currentTarget && setSearchOpen(false)}>
          <div id="crm-search-dialog" ref={searchDialogRef} tabIndex={-1} className="command-palette" role="dialog" aria-modal="true" aria-label="Search organisations, contacts and listings">
            <div className="command-input"><Search size={20} /><input ref={searchRef} type="search" role="combobox" aria-label="Search organisations, contacts and listings" aria-expanded="true" aria-controls="crm-search-results" aria-autocomplete="list" aria-activedescendant={searchResults[activeResult] ? `crm-search-result-${searchResults[activeResult].id}` : undefined} value={query} onChange={(event) => {setQuery(event.target.value);setActiveResult(0)}} placeholder="Search organisations, contacts and listings..." /><kbd>esc</kbd></div>
            <div id="crm-search-results" className="command-results" role="listbox" aria-label={query ? 'Search results' : 'Recently viewed organisations'}>
              <span className="command-label">{query ? 'Results' : 'Recently viewed'}</span>
              {searchResults.length ? searchResults.map((org,index) => (
                <button type="button" id={`crm-search-result-${org.id}`} role="option" aria-selected={index===activeResult} key={org.id} className={index===activeResult?'active':''} onMouseEnter={()=>setActiveResult(index)} onClick={() => { setSearchOpen(false); setQuery(''); onOpenOrganisation(org) }}>
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
