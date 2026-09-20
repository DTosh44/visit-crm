import { CheckCircle2, Clock3, Download, Eye, FileSignature, Mail, MoreHorizontal, Plus, Search, Send, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useCRM } from '../store'
import { formatDate } from '../utils'
import { Avatar, Badge, Button, Drawer, PageHeader } from '../components/UI'

export function Agreements() {
  const { data } = useCRM()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const agreements = data.agreements.filter((agreement) => {
    const org = data.organisations.find((item) => item.id === agreement.organisationId)
    return !query || [agreement.number, agreement.signatory, org?.name].join(' ').toLowerCase().includes(query.toLowerCase())
  })
  const agreement = data.agreements.find((item) => item.id === selected)
  const selectedOrg = agreement ? data.organisations.find((item) => item.id === agreement.organisationId) : undefined

  return (
    <div>
      <PageHeader eyebrow="Membership" title="Agreements" description="Generate membership agreements and track each signing journey." actions={<><Button variant="secondary">Manage templates</Button><Button icon={Plus}>New agreement</Button></>} />
      <section className="agreement-stats">
        <article><span className="stat-icon green"><CheckCircle2 size={18} /></span><div><strong>{data.agreements.filter((item) => item.status === 'Signed').length}</strong><span>Signed</span></div></article>
        <article><span className="stat-icon blue"><Eye size={18} /></span><div><strong>{data.agreements.filter((item) => item.status === 'Viewed').length}</strong><span>Viewed</span></div></article>
        <article><span className="stat-icon amber"><Clock3 size={18} /></span><div><strong>{data.agreements.filter((item) => item.status === 'Sent').length}</strong><span>Awaiting signature</span></div></article>
        <article><span className="stat-icon purple"><FileSignature size={18} /></span><div><strong>{data.agreements.filter((item) => item.status === 'Draft').length}</strong><span>Draft</span></div></article>
      </section>
      <section className="panel data-panel">
        <div className="table-toolbar"><div className="table-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search agreements..." /></div><Button variant="secondary" size="sm">All statuses</Button></div>
        <div className="table-scroll"><table className="data-table agreement-table"><thead><tr><th>Agreement</th><th>Organisation</th><th>Membership</th><th>Signatory</th><th>Created</th><th>Valid until</th><th>Status</th><th /></tr></thead><tbody>{agreements.map((item) => {
          const org = data.organisations.find((orgItem) => orgItem.id === item.organisationId)
          return <tr key={item.id} onClick={() => setSelected(item.id)}><td><div className="invoice-number"><strong>{item.number}</strong><small>Membership agreement</small></div></td><td><div className="org-cell"><Avatar name={org?.name ?? ''} colour={org?.colour} size="sm" /><strong>{org?.name}</strong></div></td><td>{item.membershipLevel}</td><td><div className="invoice-number"><strong>{item.signatory}</strong><small>{item.signatoryEmail}</small></div></td><td>{formatDate(item.createdAt, { day: 'numeric', month: 'short' })}</td><td>{formatDate(item.validUntil, { day: 'numeric', month: 'short', year: 'numeric' })}</td><td><Badge>{item.status}</Badge></td><td><button className="icon-button"><MoreHorizontal size={17} /></button></td></tr>
        })}</tbody></table></div>
      </section>

      {agreement && <Drawer title={agreement.number} subtitle={`${agreement.membershipLevel} membership agreement`} onClose={() => setSelected(null)} width="standard">
        <div className="agreement-detail-status"><span className={`agreement-big-icon ${agreement.status.toLowerCase()}`}><FileSignature size={26} /></span><div><Badge>{agreement.status}</Badge><h2>{selectedOrg?.name}</h2><p>{agreement.status === 'Signed' ? `Completed on ${formatDate(agreement.signedAt)}` : `Waiting for ${agreement.signatory}`}</p></div></div>
        <section className="subpanel"><header><div><h3>Signing details</h3><p>The exact recipient and agreement version are preserved.</p></div></header><dl className="detail-list"><div><dt>Signatory</dt><dd><strong>{agreement.signatory}</strong><span>{agreement.signatoryEmail}</span></dd></div><div><dt>Membership</dt><dd>{agreement.membershipLevel}</dd></div><div><dt>Created</dt><dd>{formatDate(agreement.createdAt)}</dd></div><div><dt>Sent</dt><dd>{formatDate(agreement.sentAt)}</dd></div><div><dt>Valid until</dt><dd>{formatDate(agreement.validUntil)}</dd></div></dl></section>
        <section className="agreement-audit"><h3>Agreement history</h3><div className="audit-step complete"><span><CheckCircle2 size={14} /></span><div><strong>Agreement created</strong><small>{formatDate(agreement.createdAt)} · Alex Morgan</small></div></div>{agreement.sentAt && <div className="audit-step complete"><span><Send size={14} /></span><div><strong>Sent to {agreement.signatory}</strong><small>{formatDate(agreement.sentAt)} · {agreement.signatoryEmail}</small></div></div>}{agreement.status === 'Viewed' && <div className="audit-step current"><span><Eye size={14} /></span><div><strong>Agreement viewed</strong><small>Awaiting signature</small></div></div>}{agreement.signedAt && <div className="audit-step complete"><span><ShieldCheck size={14} /></span><div><strong>Signed and completed</strong><small>{formatDate(agreement.signedAt)} · Audit record retained</small></div></div>}</section>
        <div className="drawer-button-stack"><Button icon={agreement.status === 'Signed' ? Download : Send}>{agreement.status === 'Signed' ? 'Download signed copy' : 'Send reminder'}</Button><Button variant="secondary" icon={Mail}>Email signatory</Button></div>
      </Drawer>}
    </div>
  )
}
