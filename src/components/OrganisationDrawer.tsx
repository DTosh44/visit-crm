import {
  ArrowUpRight, Calendar, Check, CheckCircle2, CircleDollarSign, Clock3,
  Edit3, ExternalLink, FileSignature, Globe2, ListChecks, Mail, MapPin, MessageSquarePlus,
  Phone, Plus, Trash2, UsersRound,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useCRM } from '../store'
import { imageLibrary } from '../siteData'
import type { Contact, Listing, Organisation } from '../types'
import { currency, formatDate, timeAgo } from '../utils'
import { Avatar, Badge, Button, Drawer, Field, Modal, Progress, Tabs } from './UI'
import { downloadFile, openEmail } from '../actions'

type OrgTab = 'Overview' | 'Contacts' | 'Membership' | 'Listings' | 'Billing' | 'Agreements' | 'Activity'

export function OrganisationDrawer({ organisation, onClose, onEditListing }: {
  organisation: Organisation
  onClose: () => void
  onEditListing: (listing: Listing) => void
}) {
  const { data, updateOrganisation, incrementBenefit, markInvoicePaid, addContact, updateContact, deleteContact, addActivity, createListing, createInvoice, createAgreement } = useCRM()
  const [tab, setTab] = useState<OrgTab>('Overview')
  const [editing, setEditing] = useState(false)
  const [draftNotes, setDraftNotes] = useState(organisation.notes)
  const [contactDraft,setContactDraft]=useState<(Contact & {isNew?:boolean})|null>(null)
  const contacts = data.contacts.filter((item) => item.organisationId === organisation.id)
  const listings = data.listings.filter((item) => item.organisationId === organisation.id)
  const invoices = data.invoices.filter((item) => item.organisationId === organisation.id)
  const agreements = data.agreements.filter((item) => item.organisationId === organisation.id)
  const activities = data.activities.filter((item) => item.organisationId === organisation.id)
  const level = data.levels.find((item) => item.name === organisation.tier)
  const primaryContact = contacts.find((item) => item.primary) ?? contacts[0]

  const outstanding = useMemo(() => invoices.filter((item) => ['Sent', 'Overdue'].includes(item.status)).reduce((total, item) => total + item.total, 0), [invoices])

  const saveNotes = () => {
    updateOrganisation(organisation.id, { notes: draftNotes })
    setEditing(false)
  }

  return (
    <Drawer title={organisation.name} subtitle={`${organisation.type} · ${organisation.town}`} onClose={onClose}>
      <div className="org-drawer-hero">
        <Avatar name={organisation.name} colour={organisation.colour} size="lg" />
        <div className="org-drawer-title"><div><h2>{organisation.name}</h2><Badge>{organisation.status}</Badge></div><p><MapPin size={14} />{organisation.town}<span>·</span>{organisation.tier} membership</p></div>
        <div className="org-hero-actions"><Button variant="secondary" icon={Mail} size="sm" onClick={()=>openEmail(primaryContact?.email??'',`Visit Valechester: ${organisation.name}`)}>Email</Button><Button icon={Plus} size="sm" onClick={()=>{const detail=window.prompt('Add a relationship action or note');if(detail)addActivity(organisation.id,'Relationship note',detail)}}>Add action</Button></div>
      </div>

      <Tabs items={['Overview','Contacts','Membership','Listings','Billing','Agreements','Activity'] as OrgTab[]} active={tab} onChange={setTab} />

      {tab === 'Overview' && <div className="org-tab-content">
        <div className="org-kpi-row">
          <div><span className="mini-icon purple"><UsersRound size={16} /></span><p><small>Membership</small><strong>{organisation.tier}</strong></p></div>
          <div><span className="mini-icon green"><CircleDollarSign size={16} /></span><p><small>Annual value</small><strong>{organisation.annualValue ? currency.format(organisation.annualValue) : 'Free'}</strong></p></div>
          <div><span className="mini-icon blue"><Globe2 size={16} /></span><p><small>Listings</small><strong>{listings.length} / {level?.listingAllowance ?? 1}</strong></p></div>
          <div><span className="mini-icon amber"><Calendar size={16} /></span><p><small>Renewal</small><strong>{formatDate(organisation.renewalDate, { day: 'numeric', month: 'short' })}</strong></p></div>
        </div>

        <div className="org-overview-grid">
          <section className="subpanel">
            <header><div><h3>Key information</h3><p>Core business and relationship details</p></div><button className="text-button" onClick={() => setEditing(!editing)}><Edit3 size={14} /> {editing ? 'Cancel' : 'Edit'}</button></header>
            <dl className="detail-list">
              <div><dt>Primary contact</dt><dd><strong>{primaryContact?.name ?? 'Not set'}</strong><span>{primaryContact?.jobTitle}</span></dd></div>
              <div><dt>Email</dt><dd>{primaryContact?.email ? <a href={`mailto:${primaryContact.email}`}>{primaryContact.email}</a> : 'Not set'}</dd></div>
              <div><dt>Phone</dt><dd>{primaryContact?.phone || 'Not set'}</dd></div>
              <div><dt>Website</dt><dd>{organisation.website ? <a href={organisation.website} target="_blank" rel="noreferrer">{organisation.website.replace(/^https?:\/\//,'')} <ExternalLink size={12} /></a> : 'Not set'}</dd></div>
              <div><dt>Relationship owner</dt><dd><span className="owner-inline"><Avatar name={organisation.owner} size="sm" />{organisation.owner}</span></dd></div>
              <div><dt>Member since</dt><dd>{formatDate(organisation.membershipStart)}</dd></div>
            </dl>
          </section>

          <section className="subpanel next-action-card">
            <header><div><h3>Next action</h3><p>Keep this relationship moving</p></div><Badge tone={organisation.nextActionDate < '2026-09-20' ? 'red' : 'amber'}>{formatDate(organisation.nextActionDate, { day: 'numeric', month: 'short' })}</Badge></header>
            <div className="next-action-main"><span><ListChecks size={18} /></span><div><strong>{organisation.nextAction}</strong><p>Owned by {organisation.owner}</p></div></div>
            <div className="next-action-buttons"><Button variant="secondary" size="sm" icon={Check} onClick={()=>{addActivity(organisation.id,'Action completed',organisation.nextAction);updateOrganisation(organisation.id,{nextAction:'No action scheduled',nextActionDate:''})}}>Complete</Button><Button variant="ghost" size="sm" icon={Clock3} onClick={()=>{const date=window.prompt('New action date (YYYY-MM-DD)',organisation.nextActionDate);if(date)updateOrganisation(organisation.id,{nextActionDate:date})}}>Reschedule</Button></div>
          </section>

          <section className="subpanel notes-card">
            <header><div><h3>Relationship notes</h3><p>Private to your destination team</p></div>{!editing && <button className="text-button" onClick={() => setEditing(true)}><Edit3 size={14} /> Edit</button>}</header>
            {editing ? <><textarea value={draftNotes} onChange={(event) => setDraftNotes(event.target.value)} rows={5} /><div className="inline-actions"><Button variant="secondary" size="sm" onClick={() => { setDraftNotes(organisation.notes); setEditing(false) }}>Cancel</Button><Button size="sm" onClick={saveNotes}>Save notes</Button></div></> : <p className="note-copy">{organisation.notes || 'No relationship notes have been added yet.'}</p>}
          </section>

          <section className="subpanel contact-summary-card">
            <header><div><h3>Contacts</h3><p>{contacts.length} people linked</p></div><button className="text-button" onClick={() => setTab('Contacts')}>View all <ArrowUpRight size={14} /></button></header>
            {contacts.slice(0, 3).map((contact) => <div className="mini-contact" key={contact.id}><Avatar name={contact.name} size="sm" /><div><strong>{contact.name}</strong><span>{contact.jobTitle || contact.roles.join(', ')}</span></div><a href={`mailto:${contact.email}`} aria-label={`Email ${contact.name}`}><Mail size={15} /></a></div>)}
          </section>
        </div>
      </div>}

      {tab === 'Contacts' && <div className="org-tab-content">
        <div className="section-heading"><div><h3>Business contacts</h3><p>Choose recipients explicitly for invoices, agreements and member updates.</p></div><Button icon={Plus} size="sm" onClick={()=>setContactDraft({id:'',organisationId:organisation.id,name:'',jobTitle:'',email:'',phone:'',roles:['General'],primary:contacts.length===0,portalAccess:false,isNew:true})}>Add contact</Button></div>
        <div className="contact-card-grid">{contacts.map((contact) => <article className="contact-card" key={contact.id}>
          <header><Avatar name={contact.name} colour={organisation.colour} /></header>
          <h3>{contact.name}</h3><p>{contact.jobTitle || 'Role not set'}</p>
          <div className="role-tags">{contact.roles.map((role) => <Badge key={role} tone="blue">{role}</Badge>)}</div>
          <dl><div><Mail size={14} /><a href={`mailto:${contact.email}`}>{contact.email}</a></div><div><Phone size={14} /><span>{contact.phone || 'Not set'}</span></div></dl>
          <footer><span className={contact.portalAccess ? 'portal-on' : ''}><i />{contact.portalAccess ? 'Portal access' : 'No portal access'}</span><span><Button variant="ghost" size="sm" onClick={()=>setContactDraft({...contact})}>Edit</Button><button className="icon-button danger" onClick={()=>{if(window.confirm(`Delete ${contact.name}?`))deleteContact(contact.id)}} aria-label={`Delete ${contact.name}`}><Trash2 size={15}/></button></span></footer>
        </article>)}</div>
      </div>}

      {tab === 'Membership' && <div className="org-tab-content">
        <div className="membership-summary-card" style={{ '--level-colour': level?.colour } as React.CSSProperties}>
          <div><span className="membership-level-icon"><UsersRound size={22} /></span><div><small>Current membership</small><h3>{organisation.tier}</h3><p>{organisation.status} · {formatDate(organisation.membershipStart, { day: 'numeric', month: 'short', year: 'numeric' })} to {formatDate(organisation.renewalDate, { day: 'numeric', month: 'short', year: 'numeric' })}</p></div></div>
          <div className="membership-price"><strong>{organisation.annualValue ? currency.format(organisation.annualValue) : 'Free'}</strong><span>ex VAT / year</span></div>
        </div>
        <div className="section-heading"><div><h3>Benefit delivery</h3><p>Track delivery against this member’s current membership period.</p></div><Button variant="secondary" size="sm" onClick={()=>setTab('Activity')}>Membership history</Button></div>
        <div className="benefit-checklist">
          {(level?.benefits ?? []).map((benefitId) => {
            const benefit = data.benefits.find((item) => item.id === benefitId)
            if (!benefit) return null
            const use = data.benefitUsage.find((item) => item.organisationId === organisation.id && item.benefitId === benefit.id)
            const used = benefit.kind === 'Ongoing' ? benefit.allowance : use?.used ?? 0
            const complete = used >= benefit.allowance
            return <div className="benefit-row" key={benefit.id}>
              <button className={`benefit-check ${complete ? 'complete' : ''}`} onClick={() => benefit.kind !== 'Ongoing' && incrementBenefit(organisation.id, benefit.id, benefit.allowance)}>{complete ? <Check size={14} /> : used}</button>
              <div><strong>{benefit.name}</strong><span>{benefit.category} · {benefit.kind}</span></div>
              <div className="benefit-progress"><Progress value={(used / benefit.allowance) * 100} colour={complete ? '#278362' : level?.colour} /><span>{benefit.kind === 'Ongoing' ? 'Active' : `${used} of ${benefit.allowance} used`}</span></div>
            </div>
          })}
          {!level?.benefits.length && <div className="inline-empty">This level has no tracked benefits.</div>}
        </div>
      </div>}

      {tab === 'Listings' && <div className="org-tab-content">
        <div className="section-heading"><div><h3>Website listings</h3><p>Edit and publish this organisation’s public content from its CRM record.</p></div><Button icon={Plus} size="sm" onClick={()=>{const name=window.prompt('Listing name',organisation.name);if(name)onEditListing(createListing(organisation.id,name))}}>Add listing</Button></div>
        <div className="org-listing-grid">{listings.map((listing) => <article className="org-listing-card" key={listing.id}>
          <div className="listing-image" style={{backgroundImage:`url("${imageLibrary[listing.image]??listing.image}")`}}><span>{listing.category}</span></div>
          <div className="org-listing-body"><div><Badge>{listing.status}</Badge><span>{listing.completeness}% complete</span></div><h3>{listing.name}</h3><p>{listing.shortDescription}</p><div className="listing-card-stats"><span><Globe2 size={14} />{listing.views.toLocaleString()} views</span><span><MessageSquarePlus size={14} />{listing.enquiries} clicks</span></div></div>
          <footer><span>Updated {formatDate(listing.lastUpdated, { day: 'numeric', month: 'short' })}</span><Button variant="secondary" size="sm" icon={Edit3} onClick={() => onEditListing(listing)}>Edit listing</Button></footer>
        </article>)}</div>
        {!listings.length && <div className="inline-empty">No listings are linked to this organisation yet.</div>}
      </div>}

      {tab === 'Billing' && <div className="org-tab-content">
        <div className="billing-mini-summary"><div><small>Total billed</small><strong>{currency.format(invoices.reduce((sum, item) => sum + item.total, 0))}</strong></div><div><small>Outstanding</small><strong>{currency.format(outstanding)}</strong></div><Button icon={Plus} size="sm" onClick={()=>{const amount=window.prompt('Invoice net amount',String(organisation.annualValue));if(amount)createInvoice({organisationId:organisation.id,description:`${organisation.tier} membership`,subtotal:Number(amount),dueDate:new Date(Date.now()+30*86400000).toISOString().slice(0,10),sendNow:false})}}>New invoice</Button></div>
        <div className="section-heading"><div><h3>Invoices</h3><p>Invoice and payment history for this organisation.</p></div></div>
        <div className="record-list">{invoices.map((invoice) => <div className="record-row" key={invoice.id}>
          <span className="record-icon"><CircleDollarSign size={18} /></span><div><strong>{invoice.number}</strong><span>{invoice.description}</span></div><div><strong>{currency.format(invoice.total)}</strong><span>Due {formatDate(invoice.dueDate, { day: 'numeric', month: 'short' })}</span></div><Badge>{invoice.status}</Badge>{invoice.status !== 'Paid' && <Button variant="secondary" size="sm" onClick={() => markInvoicePaid(invoice.id)}>Mark paid</Button>}
        </div>)}</div>
      </div>}

      {tab === 'Agreements' && <div className="org-tab-content">
        <div className="section-heading"><div><h3>Membership agreements</h3><p>Signed copies and active signing requests.</p></div><Button icon={Plus} size="sm" onClick={()=>{if(primaryContact)createAgreement({organisationId:organisation.id,membershipLevel:organisation.tier,signatory:primaryContact.name,signatoryEmail:primaryContact.email,status:'Draft',validUntil:new Date(Date.now()+365*86400000).toISOString().slice(0,10)})}}>Create agreement</Button></div>
        <div className="record-list">{agreements.map((agreement) => <div className="record-row agreement-record" key={agreement.id}>
          <span className="record-icon"><FileSignature size={18} /></span><div><strong>{agreement.number}</strong><span>{agreement.membershipLevel} membership</span></div><div><strong>{agreement.signatory}</strong><span>{agreement.signatoryEmail}</span></div><Badge>{agreement.status}</Badge><Button variant="ghost" size="sm" onClick={()=>downloadFile(`${agreement.number}.txt`,`${agreement.number}\n${organisation.name}\n${agreement.membershipLevel}\n${agreement.signatory}\nStatus: ${agreement.status}`)}>Download</Button>
        </div>)}</div>
        {!agreements.length && <div className="inline-empty">No membership agreement has been created.</div>}
      </div>}

      {tab === 'Activity' && <div className="org-tab-content">
        <div className="section-heading"><div><h3>Activity history</h3><p>A complete record of key interactions and changes.</p></div><Button icon={MessageSquarePlus} size="sm" onClick={()=>{const detail=window.prompt('Note');if(detail)addActivity(organisation.id,'Note added',detail)}}>Add note</Button></div>
        <div className="timeline">{activities.map((activity) => <div className="timeline-item" key={activity.id}><span className={`timeline-icon ${activity.type}`}><CheckCircle2 size={15} /></span><div><header><strong>{activity.title}</strong><time>{timeAgo(activity.timestamp)}</time></header><p>{activity.detail}</p><small>{activity.user}</small></div></div>)}</div>
      </div>}
      {contactDraft&&<Modal title={contactDraft.isNew?'Add contact':'Edit contact'} subtitle="Contact details and communication permissions." onClose={()=>setContactDraft(null)} width="sm"><form className="form-stack" onSubmit={(event)=>{event.preventDefault();const {isNew,id,...values}=contactDraft;if(isNew)addContact(values);else updateContact(id,values);setContactDraft(null)}}><div className="form-grid two"><Field label="Name"><input required value={contactDraft.name} onChange={(e)=>setContactDraft({...contactDraft,name:e.target.value})}/></Field><Field label="Job title"><input value={contactDraft.jobTitle} onChange={(e)=>setContactDraft({...contactDraft,jobTitle:e.target.value})}/></Field><Field label="Email"><input required type="email" value={contactDraft.email} onChange={(e)=>setContactDraft({...contactDraft,email:e.target.value})}/></Field><Field label="Phone"><input value={contactDraft.phone} onChange={(e)=>setContactDraft({...contactDraft,phone:e.target.value})}/></Field></div><Field label="Roles (comma separated)"><input value={contactDraft.roles.join(', ')} onChange={(e)=>setContactDraft({...contactDraft,roles:e.target.value.split(',').map((v)=>v.trim()).filter(Boolean)})}/></Field><label className="settings-checkbox"><input type="checkbox" checked={contactDraft.primary} onChange={(e)=>setContactDraft({...contactDraft,primary:e.target.checked})}/><span><strong>Primary contact</strong><small>Use this person by default for the organisation.</small></span></label><label className="settings-checkbox"><input type="checkbox" checked={contactDraft.portalAccess} onChange={(e)=>setContactDraft({...contactDraft,portalAccess:e.target.checked})}/><span><strong>Portal access</strong><small>Allow this contact to use member services.</small></span></label><div className="modal-actions"><Button type="button" variant="secondary" onClick={()=>setContactDraft(null)}>Cancel</Button><Button type="submit">Save contact</Button></div></form></Modal>}
    </Drawer>
  )
}
