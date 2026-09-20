import { AlertTriangle, BellOff, Check, ChevronDown, CircleDollarSign, Download, Mail, MoreHorizontal, PauseCircle, PlayCircle, Plus, Search, Send } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useCRM } from '../store'
import type { Invoice } from '../types'
import { currency, formatDate } from '../utils'
import { Avatar, Badge, Button, Drawer, PageHeader } from '../components/UI'

export function Billing({ onCreate }: { onCreate: () => void }) {
  const { data, markInvoicePaid, toggleInvoiceReminders, sendInvoice } = useCRM()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All statuses')
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const invoices = useMemo(() => data.invoices.filter((invoice) => {
    const org = data.organisations.find((item) => item.id === invoice.organisationId)
    return (!query || [invoice.number, invoice.description, org?.name].join(' ').toLowerCase().includes(query.toLowerCase())) && (status === 'All statuses' || invoice.status === status)
  }), [data.invoices, data.organisations, query, status])
  const totalPaid = data.invoices.filter((item) => item.status === 'Paid').reduce((sum, item) => sum + item.total, 0)
  const totalOutstanding = data.invoices.filter((item) => ['Sent','Overdue'].includes(item.status)).reduce((sum, item) => sum + item.total, 0)
  const totalOverdue = data.invoices.filter((item) => item.status === 'Overdue').reduce((sum, item) => sum + item.total, 0)

  return (
    <div>
      <PageHeader eyebrow="Finance" title="Billing" description="Raise invoices, track payment and manage automatic reminders." actions={<><Button variant="secondary" icon={Download}>Export</Button><Button icon={Plus} onClick={onCreate}>New invoice</Button></>} />
      <section className="billing-stats">
        <article><span className="stat-icon green"><Check size={18} /></span><div><p>Paid this year</p><h3>{currency.format(totalPaid)}</h3><small>2 invoices in this model</small></div></article>
        <article><span className="stat-icon blue"><CircleDollarSign size={18} /></span><div><p>Outstanding</p><h3>{currency.format(totalOutstanding)}</h3><small>{data.invoices.filter((item) => ['Sent','Overdue'].includes(item.status)).length} invoices</small></div></article>
        <article><span className="stat-icon coral"><AlertTriangle size={18} /></span><div><p>Overdue</p><h3>{currency.format(totalOverdue)}</h3><small>{data.invoices.filter((item) => item.status === 'Overdue').length} require action</small></div></article>
        <article><span className="stat-icon amber"><BellOff size={18} /></span><div><p>Reminders paused</p><h3>{data.invoices.filter((item) => item.remindersPaused).length}</h3><small>Review payment arrangements</small></div></article>
      </section>

      <section className="panel data-panel">
        <div className="table-toolbar"><div className="table-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search invoices..." /></div><div className="toolbar-filters"><label className="select-wrap"><select value={status} onChange={(event) => setStatus(event.target.value)}><option>All statuses</option><option>Draft</option><option>Sent</option><option>Overdue</option><option>Paid</option><option>Void</option></select><ChevronDown size={14} /></label><Button variant="secondary" size="sm">This membership year</Button></div></div>
        <div className="table-scroll"><table className="data-table invoice-table"><thead><tr><th>Invoice</th><th>Organisation</th><th>Issued</th><th>Due</th><th>Total</th><th>Status</th><th>Reminders</th><th /></tr></thead><tbody>{invoices.map((invoice) => {
          const org = data.organisations.find((item) => item.id === invoice.organisationId)
          return <tr key={invoice.id} onClick={() => setSelectedInvoice(invoice)}><td><div className="invoice-number"><strong>{invoice.number}</strong><small>{invoice.description}</small></div></td><td><div className="org-cell"><Avatar name={org?.name ?? ''} colour={org?.colour} size="sm" /><strong>{org?.name}</strong></div></td><td>{formatDate(invoice.issueDate, { day: 'numeric', month: 'short' })}</td><td><span className={invoice.status === 'Overdue' ? 'date-overdue' : ''}>{formatDate(invoice.dueDate, { day: 'numeric', month: 'short' })}</span></td><td><strong>{currency.format(invoice.total)}</strong></td><td><Badge>{invoice.status}</Badge></td><td>{invoice.status === 'Paid' || invoice.status === 'Draft' ? <span className="muted">—</span> : invoice.remindersPaused ? <span className="reminder-state paused"><PauseCircle size={14} />Paused</span> : <span className="reminder-state active"><PlayCircle size={14} />Active</span>}</td><td><button className="icon-button" onClick={(event) => event.stopPropagation()}><MoreHorizontal size={17} /></button></td></tr>
        })}</tbody></table></div>
        <footer className="table-footer"><span>Showing {invoices.length} invoices</span><span>All totals include VAT</span></footer>
      </section>

      {selectedInvoice && (() => {
        const liveInvoice = data.invoices.find((item) => item.id === selectedInvoice.id) ?? selectedInvoice
        const org = data.organisations.find((item) => item.id === liveInvoice.organisationId)
        return <Drawer title={liveInvoice.number} subtitle={liveInvoice.description} onClose={() => setSelectedInvoice(null)} width="standard">
          <div className="invoice-detail-hero"><div><small>Amount due</small><h2>{currency.format(liveInvoice.status === 'Paid' ? 0 : liveInvoice.total)}</h2><Badge>{liveInvoice.status}</Badge></div>{liveInvoice.status !== 'Paid' && <Button icon={Check} onClick={() => markInvoicePaid(liveInvoice.id)}>Mark as paid</Button>}</div>
          <div className="invoice-sheet">
            <header><div className="invoice-brand"><span><CircleDollarSign size={19} /></span><strong>Visit Valechester</strong></div><div><small>Invoice number</small><strong>{liveInvoice.number}</strong></div></header>
            <section><div><small>Billed to</small><strong>{org?.name}</strong><p>{org?.address}</p></div><div><small>Sent to</small><strong>{liveInvoice.sentTo || 'Not yet set'}</strong><p>Issue date: {formatDate(liveInvoice.issueDate)}<br />Due date: {formatDate(liveInvoice.dueDate)}</p></div></section>
            <table><thead><tr><th>Description</th><th>Net</th></tr></thead><tbody><tr><td>{liveInvoice.description}</td><td>{currency.format(liveInvoice.subtotal)}</td></tr></tbody><tfoot><tr><td>Subtotal</td><td>{currency.format(liveInvoice.subtotal)}</td></tr><tr><td>VAT (20%)</td><td>{currency.format(liveInvoice.vat)}</td></tr><tr><td>Total</td><td>{currency.format(liveInvoice.total)}</td></tr></tfoot></table>
          </div>
          <section className="subpanel reminder-panel"><header><div><h3>Automatic reminders</h3><p>{liveInvoice.remindersPaused ? 'No reminders will be sent while paused.' : 'Next reminder is checked against payment status before sending.'}</p></div><button className={`switch ${!liveInvoice.remindersPaused ? 'on' : ''}`} onClick={() => toggleInvoiceReminders(liveInvoice.id)}><span /></button></header><div className="reminder-steps"><span className={liveInvoice.reminderStep >= 1 ? 'done' : ''}><i>{liveInvoice.reminderStep >= 1 ? <Check size={12} /> : '1'}</i>7 days</span><span className={liveInvoice.reminderStep >= 2 ? 'done' : ''}><i>{liveInvoice.reminderStep >= 2 ? <Check size={12} /> : '2'}</i>14 days</span><span className={liveInvoice.reminderStep >= 3 ? 'done' : ''}><i>{liveInvoice.reminderStep >= 3 ? <Check size={12} /> : '3'}</i>28 days</span></div></section>
          <div className="drawer-button-stack">{liveInvoice.status === 'Draft' && <Button icon={Send} onClick={() => sendInvoice(liveInvoice.id)}>Send invoice</Button>}<Button variant="secondary" icon={Mail}>Email customer</Button><Button variant="ghost" icon={Download}>Download PDF</Button></div>
        </Drawer>
      })()}
    </div>
  )
}
