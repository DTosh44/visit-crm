import {
  BarChart3, Bell, Building2, ChevronDown, CircleDollarSign, ClipboardCheck, FilePenLine,
  FileSignature, Gauge, Handshake, HelpCircle, ListTodo, Menu, Plus, Search, Settings,
  UsersRound, X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useCRM } from '../store'
import type { Organisation, ViewKey } from '../types'
import { classNames } from '../utils'
import { Avatar } from './UI'

const navGroups: Array<{ label: string; items: Array<{ key: ViewKey; label: string; icon: typeof Gauge }> }> = [
  { label: 'Workspace', items: [
    { key: 'dashboard', label: 'Dashboard', icon: Gauge },
    { key: 'organisations', label: 'Organisations', icon: Building2 },
    { key: 'pipeline', label: 'Sales pipeline', icon: Handshake },
    { key: 'tasks', label: 'Tasks', icon: ListTodo },
  ] },
  { label: 'Membership', items: [
    { key: 'memberships', label: 'Memberships', icon: UsersRound },
    { key: 'agreements', label: 'Agreements', icon: FileSignature },
    { key: 'billing', label: 'Billing', icon: CircleDollarSign },
  ] },
  { label: 'Website', items: [
    { key: 'listings', label: 'Listings', icon: FilePenLine },
  ] },
  { label: 'Manage', items: [
    { key: 'settings', label: 'Settings', icon: Settings },
  ] },
]

const pageNames: Record<ViewKey, string> = {
  dashboard: 'Dashboard', organisations: 'Organisations', pipeline: 'Sales pipeline', memberships: 'Memberships',
  listings: 'Listings', billing: 'Billing', agreements: 'Agreements', tasks: 'Tasks', settings: 'Settings',
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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      }
      if (event.key === 'Escape') {
        setSearchOpen(false)
        setQuickOpen(false)
      }
    }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [])

  useEffect(() => {
    if (searchOpen) window.setTimeout(() => searchRef.current?.focus(), 30)
  }, [searchOpen])

  const searchResults = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return data.organisations.slice(0, 5)
    return data.organisations.filter((org) => [org.name, org.town, org.type, org.tier, ...org.tags].join(' ').toLowerCase().includes(term)).slice(0, 7)
  }, [data.organisations, query])

  const navigate = (key: ViewKey) => {
    setView(key)
    setSidebarOpen(false)
  }

  return (
    <div className="app-shell">
      <aside className={classNames('sidebar', sidebarOpen && 'sidebar-open')}>
        <div className="brand">
          <span className="brand-mark"><BarChart3 size={20} /></span>
          <div><strong>Visit</strong><span>CRM</span></div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X size={20} /></button>
        </div>

        <button className="workspace-switcher">
          <span className="workspace-logo">SE</span>
          <span><small>Destination</small><strong>Shakespeare’s England</strong></span>
          <ChevronDown size={15} />
        </button>

        <nav className="nav">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <span className="nav-label">{group.label}</span>
              {group.items.map(({ key, label, icon: Icon }) => (
                <button key={key} className={classNames('nav-item', view === key && 'active')} onClick={() => navigate(key)}>
                  <Icon size={18} strokeWidth={1.9} />
                  <span>{label}</span>
                  {key === 'tasks' && <em>{data.tasks.filter((task) => !task.completed).length}</em>}
                  {key === 'listings' && data.listings.some((listing) => listing.status === 'In review') && <i />}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button><HelpCircle size={17} /><span>Help & feedback</span></button>
          <div className="sidebar-user">
            <Avatar name="Darren Tosh" size="sm" colour="#e2655f" />
            <span><strong>Darren Tosh</strong><small>Administrator</small></span>
            <ChevronDown size={14} />
          </div>
        </div>
      </aside>

      {sidebarOpen && <button className="sidebar-scrim" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />}

      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={21} /></button>
            <span className="breadcrumb"><span>Visit CRM</span><i>/</i><strong>{pageNames[view]}</strong></span>
          </div>
          <div className="topbar-right">
            <button className="search-trigger" onClick={() => setSearchOpen(true)}>
              <Search size={17} /><span>Search organisations...</span><kbd>⌘ K</kbd>
            </button>
            <button className="icon-button notification-button" aria-label="Notifications"><Bell size={19} /><i /></button>
            <div className="quick-wrap">
              <button className="button button-primary button-md" onClick={() => setQuickOpen((value) => !value)}><Plus size={17} />Add new</button>
              {quickOpen && (
                <div className="quick-menu">
                  <span>Quick create</span>
                  <button onClick={() => { setQuickOpen(false); onAddOrganisation() }}><Building2 size={17} /><div><strong>Organisation</strong><small>Add a member or prospect</small></div></button>
                  <button onClick={() => { setQuickOpen(false); onAddTask() }}><ClipboardCheck size={17} /><div><strong>Task</strong><small>Create a follow-up</small></div></button>
                  <button onClick={() => { setQuickOpen(false); onAddInvoice() }}><CircleDollarSign size={17} /><div><strong>Invoice</strong><small>Raise a new invoice</small></div></button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="main-content">{children}</main>
      </div>

      {searchOpen && (
        <div className="command-overlay" onMouseDown={(event) => event.target === event.currentTarget && setSearchOpen(false)}>
          <div className="command-palette">
            <div className="command-input"><Search size={20} /><input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search organisations, contacts and listings..." /><kbd>esc</kbd></div>
            <div className="command-results">
              <span className="command-label">{query ? 'Results' : 'Recently viewed'}</span>
              {searchResults.length ? searchResults.map((org) => (
                <button key={org.id} onClick={() => { setSearchOpen(false); setQuery(''); onOpenOrganisation(org) }}>
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
