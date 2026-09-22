import { Building2, ChevronDown, Download, Filter, Mail, Merge, Plus, Search, SlidersHorizontal, Trash2, Upload } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useCRM } from '../store'
import type { Organisation } from '../types'
import { currency, formatDate } from '../utils'
import { Avatar, Badge, Button, EmptyState, PageHeader } from '../components/UI'
import { downloadCsv, openEmail, parseCsv } from '../actions'

const filterVisibilityKey = 'visit-valechester-organisation-filters-visible'

function initialFilterVisibility() {
  try {
    return window.localStorage.getItem(filterVisibilityKey) !== 'false'
  } catch {
    return true
  }
}

export function Organisations({ onAdd, onOpen }: { onAdd: () => void; onOpen: (organisation: Organisation) => void }) {
  const { data, updateOrganisation, addOrganisation, deleteOrganisation, deduplicateOrganisations } = useCRM()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All statuses')
  const [tier, setTier] = useState('All levels')
  const [location,setLocation]=useState('All locations')
  const [health,setHealth]=useState('All health')
  const [organisationType,setOrganisationType]=useState('All types')
  const [filtersVisible,setFiltersVisible]=useState(initialFilterVisibility)
  const [selected, setSelected] = useState<string[]>([])
  const [bulkOwner,setBulkOwner]=useState('')
  const [bulkStatus,setBulkStatus]=useState<Organisation['status']|'Change status'>('Change status')

  const locations=useMemo(()=>Array.from(new Set(data.organisations.map((org)=>org.town).filter(Boolean))).sort(),[data.organisations])
  const organisationTypes=useMemo(()=>Array.from(new Set(data.organisations.map((org)=>org.type).filter(Boolean))).sort(),[data.organisations])
  const activeFilterCount=[status!=='All statuses',tier!=='All levels',location!=='All locations',health!=='All health',organisationType!=='All types'].filter(Boolean).length
  const resetFilters=()=>{setStatus('All statuses');setTier('All levels');setLocation('All locations');setHealth('All health');setOrganisationType('All types');setQuery('')}
  const toggleFilterVisibility=()=>setFiltersVisible((visible)=>{const next=!visible;try{window.localStorage.setItem(filterVisibilityKey,String(next))}catch{/* Browser storage may be unavailable. */}return next})

  const organisations = useMemo(() => {
    const search = query.trim().toLowerCase()
    return data.organisations.filter((org) => {
      const matchesSearch = !search || [org.name, org.town, org.type, org.tier, ...org.tags].join(' ').toLowerCase().includes(search)
      const matchesStatus = status === 'All statuses' || org.status === status
      const matchesTier = tier === 'All levels' || org.tier === tier
      const matchesLocation=location==='All locations'||org.town===location
      const matchesHealth=health==='All health'||org.health===health
      const matchesType=organisationType==='All types'||org.type===organisationType
      return matchesSearch && matchesStatus && matchesTier && matchesLocation && matchesHealth && matchesType
    })
  }, [data.organisations, health, location, organisationType, query, status, tier])

  const toggleAll = () => setSelected(selected.length === organisations.length ? [] : organisations.map((org) => org.id))
  const toggle = (id: string) => setSelected((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id])
  const activeMembers = data.organisations.filter((org) => (org.status === 'Active' || org.status === 'Renewing') && org.tier !== 'Free Listing').length
  const healthCount = (health: Organisation['health']) => data.organisations.filter((org) => org.health === health).length
  const freeListings = data.organisations.filter((org) => org.tier === 'Free Listing').length
  const importCsv=async(file?:File)=>{if(!file)return;const rows=parseCsv(await file.text());const headers=rows.shift()?.map((value)=>value.trim().toLowerCase())??[];if(!headers.includes('name')){window.alert('The CSV must contain a name column. No records were imported.');return}let imported=0,skipped=0;for(const values of rows){const row=Object.fromEntries(headers.map((header,index)=>[header,values[index]?.trim()??'']));if(!row.name||data.organisations.some((org)=>org.name.toLowerCase()===row.name.toLowerCase()&&org.town.toLowerCase()===(row.town||'Valechester').toLowerCase())){skipped++;continue}addOrganisation({name:row.name,type:row.type||'Attractions',town:row.town||'Valechester',contactName:row.contactname||row['contact name']||'Primary contact',contactEmail:row.contactemail||row['contact email']||'',tier:data.levels.some((level)=>level.active&&level.name===row.tier)?row.tier:data.levels.find((level)=>level.active)?.name??'Free Listing',status:(['Active','Renewing','Prospect','Free listing','Lapsed'].includes(row.status)?row.status:'Prospect') as Organisation['status'],nextAction:row.nextaction||row['next action']||'Review imported record'});imported++}window.alert(`${imported} organisation${imported===1?'':'s'} imported${skipped?`; ${skipped} duplicate or incomplete row${skipped===1?'':'s'} skipped`:'.'}`)}

  return (
    <div>
      <PageHeader eyebrow="CRM" title="Organisations" description="Manage members, prospects, contacts and every relationship in one place." actions={<><label className="button button-secondary button-md"><Upload size={17}/>Import CSV<input hidden type="file" accept=".csv,text/csv" onChange={(e)=>void importCsv(e.target.files?.[0])}/></label><Button variant="secondary" icon={Merge} onClick={()=>{const count=deduplicateOrganisations();window.alert(count?`${count} duplicate organisation${count===1?'':'s'} removed.`:'No duplicates found.')}}>Deduplicate</Button><Button variant="secondary" icon={Download} onClick={()=>downloadCsv('organisations.csv',[['Organisation','Type','Town','Membership','Status','Owner','Renewal','Annual value'],...organisations.map((org)=>[org.name,org.type,org.town,org.tier,org.status,org.owner,org.renewalDate,org.annualValue])])}>Export</Button><Button icon={Plus} onClick={onAdd}>Add organisation</Button></>} />

      <section className="summary-strip organisation-summary">
        <div><span className="summary-icon purple"><Building2 size={18} /></span><p><strong>{activeMembers}</strong><small>Active members</small></p></div>
        <div><span className="summary-dot green" /><p><strong>{healthCount('Happy')}</strong><small>Happy</small></p></div>
        <div><span className="summary-dot amber" /><p><strong>{healthCount('OK')}</strong><small>OK</small></p></div>
        <div><span className="summary-dot red" /><p><strong>{healthCount('Needs attention')}</strong><small>Need attention</small></p></div>
        <div><p><strong>{freeListings}</strong><small>Free listings</small></p></div>
      </section>

      <section className={`panel data-panel organisation-directory ${filtersVisible?'filters-open':'filters-closed'}`}>
        <div className="table-toolbar organisation-toolbar">
          <div className="table-search"><Search size={17} /><input type="search" aria-label="Search organisations" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search organisations..." /></div>
          <div className="organisation-toolbar-actions">
            <span className="organisation-result-count"><strong>{organisations.length}</strong> matching {organisations.length===1?'organisation':'organisations'}</span>
            <button className={`filter-visibility-button ${filtersVisible?'active':''}`} type="button" onClick={toggleFilterVisibility} aria-label={`${filtersVisible?'Hide filters':'Show filters'}${activeFilterCount>0?`, ${activeFilterCount} active`:''}`} aria-expanded={filtersVisible} aria-controls="organisation-filters"><SlidersHorizontal size={15}/>{filtersVisible?'Hide filters':'Show filters'}{activeFilterCount>0&&<em aria-hidden="true">{activeFilterCount}</em>}</button>
          </div>
        </div>
        {filtersVisible&&<div id="organisation-filters" className="organisation-filter-bar"><span className="filter-bar-title"><Filter size={15}/>Filters{activeFilterCount>0&&<em>{activeFilterCount}</em>}</span><label className="select-wrap"><select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}><option>All statuses</option><option>Active</option><option>Renewing</option><option>Prospect</option><option>Free listing</option><option>Lapsed</option></select><ChevronDown size={14} /></label><label className="select-wrap"><select aria-label="Filter by membership level" value={tier} onChange={(event) => setTier(event.target.value)}><option>All levels</option>{data.levels.map((level) => <option key={level.id}>{level.name}</option>)}</select><ChevronDown size={14} /></label><label className="select-wrap"><select aria-label="Filter by location" value={location} onChange={(event) => setLocation(event.target.value)}><option>All locations</option>{locations.map((item)=><option key={item}>{item}</option>)}</select><ChevronDown size={14}/></label><label className="select-wrap"><select aria-label="Filter by health" value={health} onChange={(event)=>setHealth(event.target.value)}><option>All health</option><option>Happy</option><option>OK</option><option>Needs attention</option></select><ChevronDown size={14}/></label><label className="select-wrap"><select aria-label="Filter by organisation type" value={organisationType} onChange={(event)=>setOrganisationType(event.target.value)}><option>All types</option>{organisationTypes.map((item)=><option key={item}>{item}</option>)}</select><ChevronDown size={14}/></label><button className="filter-button" onClick={resetFilters} disabled={!query&&activeFilterCount===0}><SlidersHorizontal size={16}/>Reset</button></div>}

        {selected.length > 0 && <div className="bulk-bar"><strong>{selected.length} selected</strong><button onClick={()=>openEmail(data.contacts.filter((contact)=>selected.includes(contact.organisationId)&&contact.primary).map((contact)=>contact.email),'Message from Visit Valechester')}><Mail size={15} /> Send email</button><label className="select-wrap"><select aria-label="Assign selected organisations to an owner" value={bulkOwner} onChange={(event)=>{const owner=event.target.value;setBulkOwner(owner);if(owner)selected.forEach((id)=>updateOrganisation(id,{owner}))}}><option value="">Assign owner</option>{Array.from(new Set(data.organisations.map((organisation)=>organisation.owner).filter(Boolean))).sort().map((owner)=><option key={owner}>{owner}</option>)}</select><ChevronDown size={14}/></label><label className="select-wrap"><select aria-label="Change status for selected organisations" value={bulkStatus} onChange={(event)=>{const next=event.target.value as Organisation['status']|'Change status';setBulkStatus(next);if(next!=='Change status')selected.forEach((id)=>updateOrganisation(id,{status:next}))}}><option>Change status</option><option>Active</option><option>Renewing</option><option>Prospect</option><option>Free listing</option><option>Lapsed</option></select><ChevronDown size={14}/></label><button className="bulk-clear" onClick={() => {setSelected([]);setBulkOwner('');setBulkStatus('Change status')}}>Clear</button></div>}

        {organisations.length ? (
          <div className="table-scroll organisation-table-scroll" tabIndex={0} aria-label="Organisation results. Scroll to view all matching organisations.">
            <table className="data-table organisations-table">
              <thead><tr><th className="checkbox-cell"><input type="checkbox" aria-label="Select all matching organisations" checked={selected.length === organisations.length && organisations.length > 0} onChange={toggleAll} /></th><th>Organisation</th><th>Membership</th><th>Health</th><th>Location</th><th>Renewal</th><th>Value</th><th>Owner</th><th aria-label="Actions" /></tr></thead>
              <tbody>{organisations.map((org) => {
                const contact = data.contacts.find((item) => item.id === org.primaryContactId)
                return <tr key={org.id}>
                  <td className="checkbox-cell" onClick={(event) => event.stopPropagation()}><input type="checkbox" aria-label={`Select ${org.name}`} checked={selected.includes(org.id)} onChange={() => toggle(org.id)} /></td>
                  <td><div className="org-cell"><Avatar name={org.name} colour={org.colour} /><div><button className="table-primary-action" onClick={() => onOpen(org)}>{org.name}</button><small>{contact?.name ?? 'No primary contact'} · {org.type}</small></div></div></td>
                  <td><div className="membership-cell"><strong>{org.tier}</strong><Badge>{org.status}</Badge></div></td>
                  <td><Badge dot>{org.health}</Badge></td>
                  <td><span>{org.town}</span></td>
                  <td><span>{org.renewalDate ? formatDate(org.renewalDate, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span></td>
                  <td><strong>{org.annualValue ? currency.format(org.annualValue) : 'Free'}</strong></td>
                  <td><span className="owner-cell"><Avatar name={org.owner} size="sm" />{org.owner.split(' ')[0]}</span></td>
                  <td><button className="icon-button danger" onClick={(event) => {event.stopPropagation();if(window.confirm(`Delete ${org.name} and its linked records?`))deleteOrganisation(org.id)}} aria-label={`Delete ${org.name}`}><Trash2 size={17} /></button></td>
                </tr>
              })}</tbody>
            </table>
          </div>
        ) : <EmptyState icon={Search} title="No organisations found" description="Try changing the search or filters." action={<Button variant="secondary" onClick={resetFilters}>Clear filters</Button>} />}
        <footer className="table-footer"><span>Showing all {organisations.length} matching organisations from {data.organisations.length} records</span><span>Scroll the table to see every result</span></footer>
      </section>
    </div>
  )
}
