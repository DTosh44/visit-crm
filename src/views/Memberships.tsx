import { Archive, Check, ChevronRight, CirclePlus, Layers3, Plus, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { useCRM } from '../store'
import type { Benefit, MembershipLevel, Organisation } from '../types'
import { currency, formatDate } from '../utils'
import { Avatar, Badge, Button, Field, Modal, PageHeader, Progress, Tabs } from '../components/UI'
import { downloadCsv } from '../actions'

type MembershipTab = 'Overview' | 'Benefits' | 'Renewals'

export function Memberships({ openOrganisation }: { openOrganisation: (organisation: Organisation) => void }) {
  const { data, addLevel, updateLevel, addBenefit } = useCRM()
  const [tab, setTab] = useState<MembershipTab>('Overview')
  const [addOpen, setAddOpen] = useState(false)
  const [editingLevel, setEditingLevel] = useState<MembershipLevel|null>(null)
  const [addingBenefit,setAddingBenefit]=useState(false)
  const [showArchived,setShowArchived]=useState(false)
  const [benefit,setBenefit]=useState<Omit<Benefit,'id'>>({name:'',kind:'Single use',allowance:1,category:'Marketing'})
  const [newLevel, setNewLevel] = useState({ name: '', price: 0, description: '', colour: '#4b69c6', listingAllowance: 1, imageAllowance: 6, videoAllowance: 0, taxonomyAllowance: 6 })
  const memberCount=(levelName:string)=>data.organisations.filter((organisation)=>organisation.tier===levelName&&(organisation.status==='Active'||organisation.status==='Renewing'||organisation.status==='Free listing')).length
  const activeTotal = data.levels.reduce((sum, level) => sum + memberCount(level.name), 0)
  const paidTotal = data.levels.filter((level)=>level.price>0).reduce((sum,level)=>sum+memberCount(level.name),0)
  const freeTotal = data.organisations.filter((organisation)=>organisation.tier==='Free Listing').length
  const revenueTotal = data.levels.reduce((sum, level) => sum + level.price * memberCount(level.name), 0)
  const renewals = data.organisations.filter((org) => org.status === 'Renewing')

  const submitLevel = () => {
    if (!newLevel.name.trim()) return
    addLevel({ ...newLevel, benefits: [], active: true })
    setAddOpen(false)
    setNewLevel({ name: '', price: 0, description: '', colour: '#4b69c6', listingAllowance: 1, imageAllowance: 6, videoAllowance: 0, taxonomyAllowance: 6 })
  }

  return (
    <div>
      <PageHeader eyebrow="Membership" title="Memberships" description="Configure levels, track benefit delivery and stay ahead of renewals." actions={<Button icon={Plus} onClick={() => setAddOpen(true)}>New level</Button>} />
      <Tabs items={['Overview','Benefits','Renewals'] as MembershipTab[]} active={tab} onChange={setTab} />

      {tab === 'Overview' && <>
        <section className="membership-stats">
          <div><span className="summary-icon purple"><UsersRound size={18} /></span><p><small>Paid members</small><strong>{paidTotal}</strong><em>across {data.levels.filter((level)=>level.active&&level.price>0).length} packages</em></p></div>
          <div><span className="summary-icon green"><Layers3 size={18} /></span><p><small>Membership income</small><strong>{currency.format(revenueTotal)}</strong><em>current annual value</em></p></div>
          <div><p><small>Free listings</small><strong>{freeTotal}</strong><em>{activeTotal} total relationships</em></p></div>
          <div><p><small>Renewing soon</small><strong>{renewals.length}</strong><em>within 30 days</em></p></div>
        </section>

        <div className="section-heading memberships-heading"><div><h2>Membership levels</h2><p>Each destination can set its own packages, prices and allowances.</p></div><button className="text-button" onClick={()=>setShowArchived((value)=>!value)}><Archive size={14} />{showArchived?'Active levels':'Archived levels'}</button></div>
        <section className="level-grid">
          {data.levels.filter((level)=>showArchived?!level.active:level.active).map((level) => <article className="level-card" key={level.id} style={{ '--level-colour': level.colour } as React.CSSProperties}>
            <header><span className="level-emblem"><Layers3 size={19} /></span><button className="text-button" onClick={()=>updateLevel(level.id,{active:!level.active})}>{level.active?'Archive':'Restore'}</button></header>
            <div className="level-name"><h3>{level.name}</h3>{level.price === 0 && <Badge tone="teal">Free</Badge>}</div>
            <p>{level.description}</p>
            <div className="level-price"><strong>{level.price ? currency.format(level.price) : '£0'}</strong><span>ex VAT / year</span></div>
            <div className="level-usage"><div><span>Members</span><strong>{memberCount(level.name)}</strong></div><Progress value={Math.min(100, memberCount(level.name) * 2)} colour={level.colour} /></div>
            <ul><li><Check size={14} />{level.listingAllowance} website {level.listingAllowance === 1 ? 'listing' : 'listings'}</li><li><Check size={14} />Up to {level.imageAllowance} images</li><li><Check size={14} />Up to {level.taxonomyAllowance} searchable categories</li><li><Check size={14} />{level.benefits.length} tracked benefits</li></ul>
            <footer><Button variant="secondary" size="sm" onClick={()=>setEditingLevel({...level})}>Edit level</Button><button aria-label={`Open ${level.name}`} onClick={()=>setEditingLevel({...level})}><ChevronRight size={18} /></button></footer>
          </article>)}
        </section>
        <section className="panel membership-composition">
          <header className="panel-header"><div><h3>Membership composition</h3><p>{activeTotal} relationships across all levels in this model</p></div><strong>{currency.format(revenueTotal)}<small>modelled annual value</small></strong></header>
          <div className="composition-bar">{data.levels.map((level) => <span key={level.id} style={{ width: `${(memberCount(level.name) / activeTotal) * 100}%`, background: level.colour }} />)}</div>
          <div className="composition-legend">{data.levels.map((level) => <span key={level.id}><i style={{ background: level.colour }} />{level.name}<strong>{memberCount(level.name)}</strong></span>)}</div>
        </section>
      </>}

      {tab === 'Benefits' && <section className="panel benefit-catalogue-panel">
        <div className="section-heading"><div><h2>Benefit catalogue</h2><p>Reusable benefits can be assigned to any membership level.</p></div><Button icon={CirclePlus} size="sm" onClick={()=>setAddingBenefit(true)}>Add benefit</Button></div>
        <div className="table-scroll"><table className="data-table benefit-table"><thead><tr><th>Benefit</th><th>Type</th><th>Category</th>{data.levels.filter((level) => level.price > 0).map((level) => <th key={level.id}>{level.name}</th>)}</tr></thead><tbody>{data.benefits.map((benefit) => <tr key={benefit.id}><td><strong>{benefit.name}</strong></td><td><Badge tone="grey">{benefit.kind}</Badge>{benefit.kind === 'Allowance' && <small>{benefit.allowance} uses</small>}</td><td>{benefit.category}</td>{data.levels.filter((level) => level.price > 0).map((level) => <td key={level.id}><button type="button" aria-label={`${level.benefits.includes(benefit.id)?'Remove':'Add'} ${benefit.name} ${level.benefits.includes(benefit.id)?'from':'to'} ${level.name}`} className={level.benefits.includes(benefit.id)?'matrix-check':'matrix-empty'} onClick={()=>updateLevel(level.id,{benefits:level.benefits.includes(benefit.id)?level.benefits.filter((id)=>id!==benefit.id):[...level.benefits,benefit.id]})}>{level.benefits.includes(benefit.id)?<Check size={14}/>:<Plus size={14}/>}</button></td>)}</tr>)}</tbody></table></div>
      </section>}

      {tab === 'Renewals' && <section className="panel data-panel renewals-table-panel">
        <div className="table-toolbar"><div><h2>Renewal queue</h2><p>Memberships requiring action in the current period.</p></div><Button variant="secondary" size="sm" onClick={()=>downloadCsv('membership-renewals.csv',[['Organisation','Level','Renewal date','Owner','Next action'],...renewals.map((org)=>[org.name,org.tier,org.renewalDate,org.owner,org.nextAction])])}>Export queue</Button></div>
        <div className="table-scroll"><table className="data-table"><thead><tr><th>Organisation</th><th>Current level</th><th>Renewal date</th><th>Agreement</th><th>Invoice</th><th>Owner</th><th>Next action</th></tr></thead><tbody>{renewals.map((org) => {
          const agreement = data.agreements.find((item) => item.organisationId === org.id)
          const invoice = data.invoices.find((item) => item.organisationId === org.id && item.status !== 'Paid')
          return <tr key={org.id}><td><div className="org-cell"><Avatar name={org.name} colour={org.colour} size="sm" /><button type="button" className="table-row-link" onClick={() => openOrganisation(org)}>{org.name}</button></div></td><td>{org.tier}</td><td><strong>{formatDate(org.renewalDate)}</strong></td><td><Badge>{agreement?.status ?? 'Draft'}</Badge></td><td>{invoice ? <Badge>{invoice.status}</Badge> : <span>Not raised</span>}</td><td>{org.owner}</td><td>{org.nextAction}</td></tr>
        })}</tbody></table></div>
      </section>}

      {addOpen && <Modal title="Create membership level" subtitle="Set a package that belongs only to this destination workspace." onClose={() => setAddOpen(false)}>
        <div className="form-stack">
          <div className="form-grid two"><Field label="Level name"><input autoFocus value={newLevel.name} onChange={(event) => setNewLevel({ ...newLevel, name: event.target.value })} placeholder="e.g. Partner" /></Field><Field label="Annual price (ex VAT)"><input type="number" min="0" value={newLevel.price} onChange={(event) => setNewLevel({ ...newLevel, price: Number(event.target.value) })} /></Field></div>
          <Field label="Description"><textarea rows={3} value={newLevel.description} onChange={(event) => setNewLevel({ ...newLevel, description: event.target.value })} placeholder="Who this level is for and what it offers" /></Field>
          <div className="form-grid two"><Field label="Listings"><input type="number" min="0" value={newLevel.listingAllowance} onChange={(event) => setNewLevel({ ...newLevel, listingAllowance: Number(event.target.value) })} /></Field><Field label="Images"><input type="number" min="0" value={newLevel.imageAllowance} onChange={(event) => setNewLevel({ ...newLevel, imageAllowance: Number(event.target.value) })} /></Field><Field label="Videos"><input type="number" min="0" value={newLevel.videoAllowance} onChange={(event) => setNewLevel({ ...newLevel, videoAllowance: Number(event.target.value) })} /></Field><Field label="Search categories"><input type="number" min="0" value={newLevel.taxonomyAllowance} onChange={(event) => setNewLevel({ ...newLevel, taxonomyAllowance: Number(event.target.value) })} /></Field></div>
          <Field label="Level colour"><input type="color" value={newLevel.colour} onChange={(event) => setNewLevel({ ...newLevel, colour: event.target.value })} /></Field>
          <div className="modal-actions"><Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button><Button onClick={submitLevel}>Create level</Button></div>
        </div>
      </Modal>}
      {editingLevel&&<Modal title={`Edit ${editingLevel.name}`} subtitle="Names, prices and search allowances are specific to this destination workspace." onClose={()=>setEditingLevel(null)}>
        <div className="form-stack">
          <div className="form-grid two"><Field label="Level name"><input autoFocus value={editingLevel.name} onChange={(event)=>setEditingLevel({...editingLevel,name:event.target.value})}/></Field><Field label="Annual price (ex VAT)"><input type="number" min="0" value={editingLevel.price} onChange={(event)=>setEditingLevel({...editingLevel,price:Number(event.target.value)})}/></Field></div>
          <Field label="Description"><textarea rows={3} value={editingLevel.description} onChange={(event)=>setEditingLevel({...editingLevel,description:event.target.value})}/></Field>
          <div className="form-grid two"><Field label="Listings"><input type="number" min="0" value={editingLevel.listingAllowance} onChange={(event)=>setEditingLevel({...editingLevel,listingAllowance:Number(event.target.value)})}/></Field><Field label="Images"><input type="number" min="0" value={editingLevel.imageAllowance} onChange={(event)=>setEditingLevel({...editingLevel,imageAllowance:Number(event.target.value)})}/></Field><Field label="Videos"><input type="number" min="0" value={editingLevel.videoAllowance} onChange={(event)=>setEditingLevel({...editingLevel,videoAllowance:Number(event.target.value)})}/></Field><Field label="Search categories"><input type="number" min="0" value={editingLevel.taxonomyAllowance} onChange={(event)=>setEditingLevel({...editingLevel,taxonomyAllowance:Number(event.target.value)})}/></Field></div>
          <Field label="Level colour"><input type="color" value={editingLevel.colour} onChange={(event)=>setEditingLevel({...editingLevel,colour:event.target.value})}/></Field>
          <div className="modal-actions"><Button variant="secondary" onClick={()=>setEditingLevel(null)}>Cancel</Button><Button onClick={()=>{if(!editingLevel.name.trim())return;updateLevel(editingLevel.id,editingLevel);setEditingLevel(null)}}>Save level</Button></div>
        </div>
      </Modal>}
      {addingBenefit&&<Modal title="Add membership benefit" subtitle="Create a benefit that can be assigned to membership levels." onClose={()=>setAddingBenefit(false)}><form className="form-stack" onSubmit={(event)=>{event.preventDefault();addBenefit(benefit);setAddingBenefit(false);setBenefit({name:'',kind:'Single use',allowance:1,category:'Marketing'})}}><Field label="Benefit name"><input required autoFocus value={benefit.name} onChange={(e)=>setBenefit({...benefit,name:e.target.value})}/></Field><div className="form-grid two"><Field label="Type"><select value={benefit.kind} onChange={(e)=>setBenefit({...benefit,kind:e.target.value as typeof benefit.kind})}><option>Single use</option><option>Allowance</option><option>Ongoing</option></select></Field><Field label="Allowance"><input type="number" min="1" value={benefit.allowance} onChange={(e)=>setBenefit({...benefit,allowance:Number(e.target.value)})}/></Field><Field label="Category"><select value={benefit.category} onChange={(e)=>setBenefit({...benefit,category:e.target.value as typeof benefit.category})}>{['Marketing','Networking','Listing','Insight','Support'].map((item)=><option key={item}>{item}</option>)}</select></Field></div><div className="modal-actions"><Button type="button" variant="secondary" onClick={()=>setAddingBenefit(false)}>Cancel</Button><Button type="submit">Add benefit</Button></div></form></Modal>}
    </div>
  )
}
