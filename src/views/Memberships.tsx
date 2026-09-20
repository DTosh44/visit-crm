import { Archive, Check, ChevronRight, CirclePlus, Layers3, MoreHorizontal, Plus, Settings2, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { useCRM } from '../store'
import type { Organisation } from '../types'
import { currency, formatDate } from '../utils'
import { Avatar, Badge, Button, Field, Modal, PageHeader, Progress, Tabs } from '../components/UI'

type MembershipTab = 'Overview' | 'Benefits' | 'Renewals'

export function Memberships({ openOrganisation }: { openOrganisation: (organisation: Organisation) => void }) {
  const { data, addLevel } = useCRM()
  const [tab, setTab] = useState<MembershipTab>('Overview')
  const [addOpen, setAddOpen] = useState(false)
  const [newLevel, setNewLevel] = useState({ name: '', price: 0, description: '', colour: '#4b69c6', listingAllowance: 1, imageAllowance: 6, videoAllowance: 0 })
  const activeTotal = data.levels.reduce((sum, level) => sum + level.members, 0)
  const paidTotal = data.levels.filter((level)=>level.price>0).reduce((sum,level)=>sum+level.members,0)
  const freeTotal = data.levels.find((level)=>level.name==='Free Listing')?.members ?? 0
  const revenueTotal = data.levels.reduce((sum, level) => sum + level.price * level.members, 0)
  const renewals = data.organisations.filter((org) => org.status === 'Renewing')

  const submitLevel = () => {
    if (!newLevel.name.trim()) return
    addLevel({ ...newLevel, benefits: [], active: true })
    setAddOpen(false)
    setNewLevel({ name: '', price: 0, description: '', colour: '#4b69c6', listingAllowance: 1, imageAllowance: 6, videoAllowance: 0 })
  }

  return (
    <div>
      <PageHeader eyebrow="Membership" title="Memberships" description="Configure levels, track benefit delivery and stay ahead of renewals." actions={<><Button variant="secondary" icon={Settings2}>Membership settings</Button><Button icon={Plus} onClick={() => setAddOpen(true)}>New level</Button></>} />
      <Tabs items={['Overview','Benefits','Renewals'] as MembershipTab[]} active={tab} onChange={setTab} />

      {tab === 'Overview' && <>
        <section className="membership-stats">
          <div><span className="summary-icon purple"><UsersRound size={18} /></span><p><small>Paid members</small><strong>{paidTotal}</strong><em>across five packages</em></p></div>
          <div><span className="summary-icon green"><Layers3 size={18} /></span><p><small>Membership income</small><strong>£74,210</strong><em>92.8% of target</em></p></div>
          <div><p><small>Free listings</small><strong>{freeTotal}</strong><em>{activeTotal} total relationships</em></p></div>
          <div><p><small>Renewing soon</small><strong>{renewals.length}</strong><em>within 30 days</em></p></div>
        </section>

        <div className="section-heading memberships-heading"><div><h2>Membership levels</h2><p>Each destination can set its own packages, prices and allowances.</p></div><button className="text-button"><Archive size={14} />Archived levels</button></div>
        <section className="level-grid">
          {data.levels.map((level) => <article className="level-card" key={level.id} style={{ '--level-colour': level.colour } as React.CSSProperties}>
            <header><span className="level-emblem"><Layers3 size={19} /></span><button className="icon-button"><MoreHorizontal size={17} /></button></header>
            <div className="level-name"><h3>{level.name}</h3>{level.price === 0 && <Badge tone="teal">Free</Badge>}</div>
            <p>{level.description}</p>
            <div className="level-price"><strong>{level.price ? currency.format(level.price) : '£0'}</strong><span>ex VAT / year</span></div>
            <div className="level-usage"><div><span>Members</span><strong>{level.members}</strong></div><Progress value={Math.min(100, level.members * 2)} colour={level.colour} /></div>
            <ul><li><Check size={14} />{level.listingAllowance} website {level.listingAllowance === 1 ? 'listing' : 'listings'}</li><li><Check size={14} />Up to {level.imageAllowance} images</li><li><Check size={14} />{level.benefits.length} tracked benefits</li></ul>
            <footer><Button variant="secondary" size="sm">Edit level</Button><button aria-label={`Open ${level.name}`}><ChevronRight size={18} /></button></footer>
          </article>)}
        </section>
        <section className="panel membership-composition">
          <header className="panel-header"><div><h3>Membership composition</h3><p>{activeTotal} relationships across all levels in this model</p></div><strong>{currency.format(revenueTotal)}<small>modelled annual value</small></strong></header>
          <div className="composition-bar">{data.levels.map((level) => <span key={level.id} style={{ width: `${(level.members / activeTotal) * 100}%`, background: level.colour }} />)}</div>
          <div className="composition-legend">{data.levels.map((level) => <span key={level.id}><i style={{ background: level.colour }} />{level.name}<strong>{level.members}</strong></span>)}</div>
        </section>
      </>}

      {tab === 'Benefits' && <section className="panel benefit-catalogue-panel">
        <div className="section-heading"><div><h2>Benefit catalogue</h2><p>Reusable benefits can be assigned to any membership level.</p></div><Button icon={CirclePlus} size="sm">Add benefit</Button></div>
        <div className="table-scroll"><table className="data-table benefit-table"><thead><tr><th>Benefit</th><th>Type</th><th>Category</th>{data.levels.filter((level) => level.price > 0).map((level) => <th key={level.id}>{level.name}</th>)}<th /></tr></thead><tbody>{data.benefits.map((benefit) => <tr key={benefit.id}><td><strong>{benefit.name}</strong></td><td><Badge tone="grey">{benefit.kind}</Badge>{benefit.kind === 'Allowance' && <small>{benefit.allowance} uses</small>}</td><td>{benefit.category}</td>{data.levels.filter((level) => level.price > 0).map((level) => <td key={level.id}>{level.benefits.includes(benefit.id) ? <span className="matrix-check"><Check size={14} /></span> : <span className="matrix-empty">—</span>}</td>)}<td><button className="icon-button"><MoreHorizontal size={16} /></button></td></tr>)}</tbody></table></div>
      </section>}

      {tab === 'Renewals' && <section className="panel data-panel renewals-table-panel">
        <div className="table-toolbar"><div><h2>Renewal queue</h2><p>Memberships requiring action in the current period.</p></div><Button variant="secondary" size="sm">Export queue</Button></div>
        <div className="table-scroll"><table className="data-table"><thead><tr><th>Organisation</th><th>Current level</th><th>Renewal date</th><th>Agreement</th><th>Invoice</th><th>Owner</th><th>Next action</th></tr></thead><tbody>{renewals.map((org) => {
          const agreement = data.agreements.find((item) => item.organisationId === org.id)
          const invoice = data.invoices.find((item) => item.organisationId === org.id && item.status !== 'Paid')
          return <tr key={org.id} onClick={() => openOrganisation(org)}><td><div className="org-cell"><Avatar name={org.name} colour={org.colour} size="sm" /><strong>{org.name}</strong></div></td><td>{org.tier}</td><td><strong>{formatDate(org.renewalDate)}</strong></td><td><Badge>{agreement?.status ?? 'Draft'}</Badge></td><td>{invoice ? <Badge>{invoice.status}</Badge> : <span>Not raised</span>}</td><td>{org.owner}</td><td>{org.nextAction}</td></tr>
        })}</tbody></table></div>
      </section>}

      {addOpen && <Modal title="Create membership level" subtitle="Set a package that belongs only to this destination workspace." onClose={() => setAddOpen(false)}>
        <div className="form-stack">
          <div className="form-grid two"><Field label="Level name"><input autoFocus value={newLevel.name} onChange={(event) => setNewLevel({ ...newLevel, name: event.target.value })} placeholder="e.g. Partner" /></Field><Field label="Annual price (ex VAT)"><input type="number" min="0" value={newLevel.price} onChange={(event) => setNewLevel({ ...newLevel, price: Number(event.target.value) })} /></Field></div>
          <Field label="Description"><textarea rows={3} value={newLevel.description} onChange={(event) => setNewLevel({ ...newLevel, description: event.target.value })} placeholder="Who this level is for and what it offers" /></Field>
          <div className="form-grid three"><Field label="Listings"><input type="number" min="0" value={newLevel.listingAllowance} onChange={(event) => setNewLevel({ ...newLevel, listingAllowance: Number(event.target.value) })} /></Field><Field label="Images"><input type="number" min="0" value={newLevel.imageAllowance} onChange={(event) => setNewLevel({ ...newLevel, imageAllowance: Number(event.target.value) })} /></Field><Field label="Videos"><input type="number" min="0" value={newLevel.videoAllowance} onChange={(event) => setNewLevel({ ...newLevel, videoAllowance: Number(event.target.value) })} /></Field></div>
          <Field label="Level colour"><input type="color" value={newLevel.colour} onChange={(event) => setNewLevel({ ...newLevel, colour: event.target.value })} /></Field>
          <div className="modal-actions"><Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button><Button onClick={submitLevel}>Create level</Button></div>
        </div>
      </Modal>}
    </div>
  )
}
