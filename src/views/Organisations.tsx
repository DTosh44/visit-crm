import { Building2, ChevronDown, Download, Filter, Mail, MoreHorizontal, Plus, Search, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useCRM } from '../store'
import type { Organisation } from '../types'
import { currency, formatDate } from '../utils'
import { Avatar, Badge, Button, EmptyState, PageHeader } from '../components/UI'

export function Organisations({ onAdd, onOpen }: { onAdd: () => void; onOpen: (organisation: Organisation) => void }) {
  const { data } = useCRM()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All')
  const [tier, setTier] = useState('All levels')
  const [selected, setSelected] = useState<string[]>([])

  const organisations = useMemo(() => {
    const search = query.trim().toLowerCase()
    return data.organisations.filter((org) => {
      const matchesSearch = !search || [org.name, org.town, org.type, org.tier, ...org.tags].join(' ').toLowerCase().includes(search)
      const matchesStatus = status === 'All' || org.status === status
      const matchesTier = tier === 'All levels' || org.tier === tier
      return matchesSearch && matchesStatus && matchesTier
    })
  }, [data.organisations, query, status, tier])

  const toggleAll = () => setSelected(selected.length === organisations.length ? [] : organisations.map((org) => org.id))
  const toggle = (id: string) => setSelected((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id])
  const activeMembers = data.organisations.filter((org) => (org.status === 'Active' || org.status === 'Renewing') && org.tier !== 'Free Listing').length
  const healthCount = (health: Organisation['health']) => data.organisations.filter((org) => org.health === health).length
  const freeListings = data.organisations.filter((org) => org.tier === 'Free Listing').length

  return (
    <div>
      <PageHeader eyebrow="CRM" title="Organisations" description="Manage members, prospects, contacts and every relationship in one place." actions={<><Button variant="secondary" icon={Download}>Export</Button><Button icon={Plus} onClick={onAdd}>Add organisation</Button></>} />

      <section className="summary-strip organisation-summary">
        <div><span className="summary-icon purple"><Building2 size={18} /></span><p><strong>{activeMembers}</strong><small>Active members</small></p></div>
        <div><span className="summary-dot green" /><p><strong>{healthCount('Happy')}</strong><small>Happy</small></p></div>
        <div><span className="summary-dot amber" /><p><strong>{healthCount('OK')}</strong><small>OK</small></p></div>
        <div><span className="summary-dot red" /><p><strong>{healthCount('Needs attention')}</strong><small>Need attention</small></p></div>
        <div><p><strong>{freeListings}</strong><small>Free listings</small></p></div>
      </section>

      <section className="panel data-panel">
        <div className="table-toolbar">
          <div className="table-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search organisations..." /></div>
          <div className="toolbar-filters">
            <label className="select-wrap"><Filter size={15} /><select value={status} onChange={(event) => setStatus(event.target.value)}><option>All</option><option>Active</option><option>Renewing</option><option>Prospect</option><option>Free listing</option><option>Lapsed</option></select><ChevronDown size={14} /></label>
            <label className="select-wrap"><select value={tier} onChange={(event) => setTier(event.target.value)}><option>All levels</option>{data.levels.map((level) => <option key={level.id}>{level.name}</option>)}</select><ChevronDown size={14} /></label>
            <button className="filter-button"><SlidersHorizontal size={16} /> More filters</button>
          </div>
        </div>

        {selected.length > 0 && <div className="bulk-bar"><strong>{selected.length} selected</strong><button><Mail size={15} /> Send email</button><button>Assign owner</button><button>Change status</button><button className="bulk-clear" onClick={() => setSelected([])}>Clear</button></div>}

        {organisations.length ? (
          <div className="table-scroll">
            <table className="data-table organisations-table">
              <thead><tr><th className="checkbox-cell"><input type="checkbox" checked={selected.length === organisations.length && organisations.length > 0} onChange={toggleAll} /></th><th>Organisation</th><th>Membership</th><th>Health</th><th>Location</th><th>Renewal</th><th>Value</th><th>Owner</th><th /></tr></thead>
              <tbody>{organisations.map((org) => {
                const contact = data.contacts.find((item) => item.id === org.primaryContactId)
                return <tr key={org.id} onClick={() => onOpen(org)}>
                  <td className="checkbox-cell" onClick={(event) => event.stopPropagation()}><input type="checkbox" checked={selected.includes(org.id)} onChange={() => toggle(org.id)} /></td>
                  <td><div className="org-cell"><Avatar name={org.name} colour={org.colour} /><div><strong>{org.name}</strong><small>{contact?.name ?? 'No primary contact'} · {org.type}</small></div></div></td>
                  <td><div className="membership-cell"><strong>{org.tier}</strong><Badge>{org.status}</Badge></div></td>
                  <td><Badge dot>{org.health}</Badge></td>
                  <td><span>{org.town}</span></td>
                  <td><span>{org.renewalDate ? formatDate(org.renewalDate, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span></td>
                  <td><strong>{org.annualValue ? currency.format(org.annualValue) : 'Free'}</strong></td>
                  <td><span className="owner-cell"><Avatar name={org.owner} size="sm" />{org.owner.split(' ')[0]}</span></td>
                  <td><button className="icon-button" onClick={(event) => event.stopPropagation()} aria-label="More"><MoreHorizontal size={17} /></button></td>
                </tr>
              })}</tbody>
            </table>
          </div>
        ) : <EmptyState icon={Search} title="No organisations found" description="Try changing the search or filters." action={<Button variant="secondary" onClick={() => { setQuery(''); setStatus('All'); setTier('All levels') }}>Clear filters</Button>} />}
        <footer className="table-footer"><span>Showing {organisations.length} of {data.organisations.length} organisations</span><div><button disabled>Previous</button><button className="active">1</button><button>2</button><button>3</button><button>Next</button></div></footer>
      </section>
    </div>
  )
}
