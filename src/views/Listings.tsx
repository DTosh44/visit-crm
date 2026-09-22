import { CheckCircle2, ChevronDown, Copy, Eye, FilePenLine, Globe2, Grid2X2, List, Plus, Search, Send, Trash2, Undo2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useCRM } from '../store'
import type { Listing } from '../types'
import { formatDate } from '../utils'
import { imageLibrary } from '../siteData'
import { Badge, Button, Field, Modal, PageHeader, Progress } from '../components/UI'

export function Listings({ onEdit }: { onEdit: (listing: Listing) => void }) {
  const { data, publishListing, unpublishListing, duplicateListing, deleteListing, createListing } = useCRM()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All statuses')
  const [layout, setLayout] = useState<'grid' | 'list'>('grid')
  const [adding,setAdding]=useState(false)
  const [newListing,setNewListing]=useState({organisationId:data.organisations[0]?.id??'',name:''})
  const listings = useMemo(() => data.listings.filter((listing) => {
    const org = data.organisations.find((item) => item.id === listing.organisationId)
    return (!query || [listing.name, listing.category, listing.town, org?.name].join(' ').toLowerCase().includes(query.toLowerCase())) && (status === 'All statuses' || listing.status === status)
  }), [data.listings, data.organisations, query, status])

  const reviewCount = data.listings.filter((listing) => listing.status === 'In review' || listing.status === 'Changes requested').length
  const averageCompleteness = Math.round(data.listings.reduce((sum, listing) => sum + listing.completeness, 0) / data.listings.length)

  return (
    <div>
      <PageHeader eyebrow="Website content" title="Listings" description="Edit, review and publish public listings without leaving the CRM." actions={<Button icon={Plus} onClick={()=>setAdding(true)}>Add listing</Button>} />
      <section className="listing-summary">
        <div><span className="summary-icon green"><Globe2 size={18} /></span><p><small>Published</small><strong>{data.listings.filter((item) => item.status === 'Published').length}</strong></p></div>
        <div><span className="summary-icon blue"><FilePenLine size={18} /></span><p><small>Awaiting review</small><strong>{reviewCount}</strong></p></div>
        <div><span className="summary-icon purple"><Eye size={18} /></span><p><small>Views this month</small><strong>{data.listings.reduce((sum, item) => sum + item.views, 0).toLocaleString()}</strong></p></div>
        <div><p><small>Average completeness</small><strong>{averageCompleteness}%</strong></p><Progress value={averageCompleteness} colour="#5c57d6" /></div>
      </section>

      <section className="panel listings-panel">
        <div className="table-toolbar">
          <div className="table-search"><Search size={17} /><input type="search" aria-label="Search listings" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search listings..." /></div>
          <div className="toolbar-filters">
            <label className="select-wrap"><select aria-label="Filter listings by status" value={status} onChange={(event) => setStatus(event.target.value)}><option>All statuses</option><option>Published</option><option>Draft</option><option>In review</option><option>Changes requested</option></select><ChevronDown size={14} /></label>
            <div className="view-toggle" role="group" aria-label="Listing display"><button className={layout === 'grid' ? 'active' : ''} onClick={() => setLayout('grid')} aria-label="Grid view" aria-pressed={layout === 'grid'}><Grid2X2 size={16} /></button><button className={layout === 'list' ? 'active' : ''} onClick={() => setLayout('list')} aria-label="List view"><List size={17} /></button></div>
          </div>
        </div>

        <div className={layout === 'grid' ? 'listing-grid' : 'listing-list'}>
          {listings.map((listing) => {
            const org = data.organisations.find((item) => item.id === listing.organisationId)
            return <article className="listing-card" key={listing.id}>
              <div className="listing-image" style={{backgroundImage:`url("${imageLibrary[listing.image]??listing.image}")`}}><div><Badge>{listing.status}</Badge></div><span>{listing.category}</span></div>
              <div className="listing-card-content">
                <small>{org?.name}</small><h3>{listing.name}</h3><p>{listing.shortDescription}</p>
                <div className="listing-completeness"><div><span>Completeness</span><strong>{listing.completeness}%</strong></div><Progress value={listing.completeness} colour={listing.completeness >= 85 ? '#278362' : '#d28d30'} /></div>
                <div className="listing-metrics"><span><Eye size={14} /><strong>{listing.views.toLocaleString()}</strong> views</span><span><Send size={14} /><strong>{listing.enquiries}</strong> enquiries</span></div>
              </div>
              <footer><span>Updated {formatDate(listing.lastUpdated, { day: 'numeric', month: 'short' })}</span><div>{listing.status !== 'Published' ? <button className="publish-icon" onClick={() => publishListing(listing.id)} title="Approve and publish" aria-label={`Publish ${listing.name}`}><CheckCircle2 size={17} /></button>:<button className="icon-button" onClick={()=>unpublishListing(listing.id)} title="Return to draft" aria-label={`Unpublish ${listing.name}`}><Undo2 size={16}/></button>}<button className="icon-button" onClick={()=>{const copy=duplicateListing(listing.id);if(copy)onEdit(copy)}} title="Duplicate" aria-label={`Duplicate ${listing.name}`}><Copy size={16}/></button><button className="icon-button danger" onClick={()=>confirm(`Delete ${listing.name}?`)&&deleteListing(listing.id)} title="Delete" aria-label={`Delete ${listing.name}`}><Trash2 size={16}/></button><Button variant="secondary" size="sm" onClick={() => onEdit(listing)}>Edit</Button></div></footer>
            </article>
          })}
        </div>
      </section>
      {adding&&<Modal title="Add website listing" subtitle="Create a draft linked to an organisation, then complete its content and media." onClose={()=>setAdding(false)}><form className="form-stack" onSubmit={(event)=>{event.preventDefault();const listing=createListing(newListing.organisationId,newListing.name);setAdding(false);setNewListing({organisationId:data.organisations[0]?.id??'',name:''});onEdit(listing)}}><Field label="Organisation"><select value={newListing.organisationId} onChange={(event)=>setNewListing({...newListing,organisationId:event.target.value})}>{data.organisations.map((organisation)=><option value={organisation.id} key={organisation.id}>{organisation.name}</option>)}</select></Field><Field label="Listing name"><input autoFocus required value={newListing.name} onChange={(event)=>setNewListing({...newListing,name:event.target.value})}/></Field><div className="modal-actions"><Button type="button" variant="secondary" onClick={()=>setAdding(false)}>Cancel</Button><Button type="submit">Create draft</Button></div></form></Modal>}
    </div>
  )
}
