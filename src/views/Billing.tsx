import { AlertTriangle, BellOff, Check, ChevronDown, CircleDollarSign, Download, Mail, MoreHorizontal, PauseCircle, PlayCircle, Plus, Search, Send, Trash2, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useCRM } from '../store'
import type { Invoice } from '../types'
import { currency, formatDate } from '../utils'
import { Avatar, Badge, Button, Drawer, PageHeader } from '../components/UI'
import { downloadCsv, openEmail, printHtml } from '../actions'

export function Billing({ onCreate }: { onCreate: () => void }) {
  const { data, markInvoicePaid, toggleInvoiceReminders, sendInvoice, runInvoiceReminders, updateInvoice, deleteInvoice } = useCRM()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All statuses')
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [reminderMessage,setReminderMessage]=useState('')
  const invoices = useMemo(() => data.invoices.filter((invoice) => {
    const org = data.organisations.find((item) => item.id === invoice.organisationId)
    return (!query || [invoice.number, invoice.description, org?.name].join(' ').toLowerCase().includes(query.toLowerCase())) && (status === 'All statuses' || invoice.status === status)
  }), [data.invoices, data.organisations, query, status])
  const totalPaid = data.invoices.filter((item) => item.status === 'Paid').reduce((sum, item) => sum + item.total, 0)
  const totalOutstanding = data.invoices.filter((item) => ['Sent','Overdue'].includes(item.status)).reduce((sum, item) => sum + item.total, 0)
  const totalOverdue = data.invoices.filter((item) => item.status === 'Overdue').reduce((sum, item) => sum + item.total, 0)

  return (
    <div>
      <PageHeader eyebrow="Finance" title="Billing" description="Raise invoices, track payment and manage automatic reminders." actions={<><Button variant="secondary" icon={PlayCircle} onClick={()=>{const count=runInvoiceReminders();setReminderMessage(count?`${count} reminder${count===1?'':'s'} queued.`:'No reminders are due.');window.setTimeout(()=>setReminderMessage(''),3000)}}>Run reminders</Button><Button variant="secondary" icon={Download} onClick={()=>downloadCsv('invoices.csv',[['Invoice','Organisation','Issued','Due','Net','VAT','Total','Status'],...invoices.map((invoice)=>[invoice.number,data.organisations.find((org)=>org.id===invoice.organisationId)?.name,invoice.issueDate,invoice.dueDate,invoice.subtotal,invoice.vat,invoice.total,invoice.status])])}>Export</Button><Button icon={Plus} onClick={onCreate}>New invoice</Button></>} />
      {reminderMessage&&<div className="inline-success" role="status">{reminderMessage}</div>}
      <section className="billing-stats">
        <article><span className="stat-icon green"><Check size={18} /></span><div><p>Paid this year</p><h3>{currency.format(totalPaid)}</h3><small>{data.invoices.filter((item)=>item.status==='Paid').length} paid invoices</small></div></article>
        <article><span className="stat-icon blue"><CircleDollarSign size={18} /></span><div><p>Outstanding</p><h3>{currency.format(totalOutstanding)}</h3><small>{data.invoices.filter((item) => ['Sent','Overdue'].includes(item.status)).length} invoices</small></div></article>
        <article><span className="stat-icon coral"><AlertTriangle size={18} /></span><div><p>Overdue</p><h3>{currency.format(totalOverdue)}</h3><small>{data.invoices.filter((item) => item.status === 'Overdue').length} require action</small></div></article>
        <article><span className="stat-icon amber"><BellOff size={18} /></span><div><p>Reminders paused</p><h3>{data.invoices.filter((item) => item.remindersPaused).length}</h3><small>Review payment arrangements</small></div></article>
      </section>

      <section className="panel data-panel">
        <div className="table-toolbar"><div className="table-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search invoices..." /></div><div className="toolbar-filters"><label className="select-wrap"><select value={status} onChange={(event) => setStatus(event.target.value)}><option>All statuses</option><option>Draft</option><option>Sent</option><option>Overdue</option><option>Paid</option><option>Void</option></select><ChevronDown size={14} /></label></div></div>
        <div className="table-scroll"><table className="data-table invoice-table"><thead><tr><th>Invoice</th><th>Organisation</th><th>Issued</th><th>Due</th><th>Total</th><th>Status</th><th>Reminders</th><th /></tr></thead><tbody>{invoices.map((invoice) => {
          const org = data.organisations.find((item) => item.id === invoice.organisationId)
          return <tr key={invoice.id} onClick={() => setSelectedInvoice(invoice)}><td><div className="invoice-number"><strong>{invoice.number}</strong><small>{invoice.description}</small></div></td><td><div className="org-cell"><Avatar name={org?.name ?? ''} colour={org?.colour} size="sm" /><strong>{org?.name}</strong></div></td><td>{formatDate(invoice.issueDate, { day: 'numeric', month: 'short' })}</td><td><span className={invoice.status === 'Overdue' ? 'date-overdue' : ''}>{formatDate(invoice.dueDate, { day: 'numeric', month: 'short' })}</span></td><td><strong>{currency.format(invoice.total)}</strong></td><td><Badge>{invoice.status}</Badge></td><td>{invoice.status === 'Paid' || invoice.status === 'Draft' ? <span className="muted">—</span> : invoice.remindersPaused ? <span className="reminder-state paused"><PauseCircle size={14} />Paused</span> : <span className="reminder-state active"><PlayCircle size={14} />Active</span>}</td><td><button className="icon-button" aria-label={`Open actions for ${invoice.number}`} onClick={(event) => {event.stopPropagation();setSelectedInvoice(invoice)}}><MoreHorizontal size={17} /></button></td></tr>
        })}</tbody></table></div>
        <footer className="table-footer"><span>Showing {invoices.length} invoices</span><span>All totals include VAT</span></footer>
      </section>

      {selectedInvoice && (() => {
        const liveInvoice = data.invoices.find((item) => item.id === selectedInvoice.id) ?? selectedInvoice
        const org = data.organisations.find((item) => item.id === liveInvoice.organisationId)
        return <Drawer title={liveInvoice.number} subtitle={liveInvoice.description} onClose={() => setSelectedInvoice(null)} width="standard">
          <div className="invoice-detail-hero"><div><small>Amount due</small><h2>{currency.format(liveInvoice.status === 'Paid' ? 0 : Math.max(0,liveInvoice.total-(liveInvoice.paidAmount??0)))}</h2><Badge>{liveInvoice.status}</Badge></div>{liveInvoice.status !== 'Paid'&&liveInvoice.status!=='Void'&&<Button icon={Check} onClick={()=>{const amount=window.prompt('Payment amount',String(liveInvoice.total));if(amount===null)return;const parsed=Number(amount);if(!Number.isFinite(parsed)||parsed<=0)return;const paymentReference=window.prompt('Payment reference (optional)','')??'';if(parsed>=liveInvoice.total){markInvoicePaid(liveInvoice.id);updateInvoice(liveInvoice.id,{paidAmount:parsed,paymentReference})}else updateInvoice(liveInvoice.id,{paidAmount:parsed,paymentReference})}}>Record payment</Button>}</div>
          <div className="invoice-sheet">
            <header><div className="invoice-brand"><span><CircleDollarSign size={19} /></span><strong>Visit Valechester</strong></div><div><small>Invoice number</small><strong>{liveInvoice.number}</strong></div></header>
            <section><div><small>Billed to</small><strong>{org?.name}</strong><p>{org?.address}</p></div><div><small>Sent to</small><strong>{liveInvoice.sentTo || 'Not yet set'}</strong><p>Issue date: {formatDate(liveInvoice.issueDate)}<br />Due date: {formatDate(liveInvoice.dueDate)}</p></div></section>
            <table><thead><tr><th>Description</th><th>Net</th></tr></thead><tbody><tr><td>{liveInvoice.description}</td><td>{currency.format(liveInvoice.subtotal)}</td></tr></tbody><tfoot><tr><td>Subtotal</td><td>{currency.format(liveInvoice.subtotal)}</td></tr><tr><td>VAT (20%)</td><td>{currency.format(liveInvoice.vat)}</td></tr><tr><td>Total</td><td>{currency.format(liveInvoice.total)}</td></tr></tfoot></table>
          </div>
          <section className="subpanel reminder-panel"><header><div><h3>Automatic reminders</h3><p>{liveInvoice.remindersPaused ? 'No reminders will be sent while paused.' : 'Next reminder is checked against payment status before sending.'}</p></div><button className={`switch ${!liveInvoice.remindersPaused ? 'on' : ''}`} onClick={() => toggleInvoiceReminders(liveInvoice.id)}><span /></button></header><div className="reminder-steps"><span className={liveInvoice.reminderStep >= 1 ? 'done' : ''}><i>{liveInvoice.reminderStep >= 1 ? <Check size={12} /> : '1'}</i>7 days</span><span className={liveInvoice.reminderStep >= 2 ? 'done' : ''}><i>{liveInvoice.reminderStep >= 2 ? <Check size={12} /> : '2'}</i>14 days</span><span className={liveInvoice.reminderStep >= 3 ? 'done' : ''}><i>{liveInvoice.reminderStep >= 3 ? <Check size={12} /> : '3'}</i>28 days</span></div></section>
          {(liveInvoice.paidAmount??0)>0&&<section className="subpanel"><header><div><h3>Payment record</h3><p>{currency.format(liveInvoice.paidAmount??0)} received{liveInvoice.paymentReference?` · ${liveInvoice.paymentReference}`:''}.</p></div></header></section>}
          <div className="drawer-button-stack">{liveInvoice.status === 'Draft' && <Button icon={Send} onClick={() => {sendInvoice(liveInvoice.id);openEmail(liveInvoice.sentTo,`Invoice ${liveInvoice.number}`,`Please find invoice ${liveInvoice.number} for ${currency.format(liveInvoice.total)}. It is due on ${formatDate(liveInvoice.dueDate)}.`)}}>Send invoice</Button>}<Button variant="secondary" icon={Mail} onClick={()=>openEmail(liveInvoice.sentTo,liveInvoice.number)}>Email customer</Button><Button variant="ghost" icon={Download} onClick={()=>printHtml(liveInvoice.number,`<h1>Invoice ${liveInvoice.number}</h1><p><strong>Billed to:</strong> ${org?.name??''}</p><p>${liveInvoice.description}</p><table><tr><th>Net</th><td>${currency.format(liveInvoice.subtotal)}</td></tr><tr><th>VAT</th><td>${currency.format(liveInvoice.vat)}</td></tr><tr class="total"><th>Total</th><td>${currency.format(liveInvoice.total)}</td></tr></table><p>Due ${formatDate(liveInvoice.dueDate)}</p>`)}>Print / save PDF</Button>{!['Paid','Void'].includes(liveInvoice.status)&&<Button variant="secondary" icon={XCircle} onClick={()=>updateInvoice(liveInvoice.id,{status:'Void',remindersPaused:true})}>Void invoice</Button>}<Button variant="danger" icon={Trash2} onClick={()=>{if(confirm(`Delete ${liveInvoice.number}?`)){deleteInvoice(liveInvoice.id);setSelectedInvoice(null)}}}>Delete invoice</Button></div>
        </Drawer>
      })()}
    </div>
  )
}
