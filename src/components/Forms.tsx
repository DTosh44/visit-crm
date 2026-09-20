import { useState, type FormEvent } from 'react'
import { typeOptions, townOptions } from '../data'
import { useCRM } from '../store'
import type { InvoiceDraft, MembershipStatus, Organisation, OrganisationDraft, TaskDraft, TaskPriority } from '../types'
import { currency } from '../utils'
import { Button, Field, Modal } from './UI'

export function AddOrganisationModal({ onClose, onCreated }: { onClose: () => void; onCreated: (organisation: Organisation) => void }) {
  const { data, addOrganisation } = useCRM()
  const [draft, setDraft] = useState<OrganisationDraft>({ name: '', type: 'Attraction', town: 'Valechester', contactName: '', contactEmail: '', tier: 'Tier 1', status: 'Prospect', nextAction: 'Arrange introductory call' })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!draft.name.trim()) return
    const organisation = addOrganisation(draft)
    onClose()
    onCreated(organisation)
  }
  return <Modal title="Add organisation" subtitle="Create the shared record once, then connect membership, listings and billing." onClose={onClose}>
    <form className="form-stack" onSubmit={submit}>
      <Field label="Organisation name"><input autoFocus required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Business or organisation name" /></Field>
      <div className="form-grid two"><Field label="Business type"><select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })}>{typeOptions.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Town"><select value={draft.town} onChange={(event) => setDraft({ ...draft, town: event.target.value })}>{townOptions.map((item) => <option key={item}>{item}</option>)}</select></Field></div>
      <div className="form-separator"><span>Primary contact</span></div>
      <div className="form-grid two"><Field label="Contact name"><input value={draft.contactName} onChange={(event) => setDraft({ ...draft, contactName: event.target.value })} placeholder="Full name" /></Field><Field label="Email address"><input type="email" value={draft.contactEmail} onChange={(event) => setDraft({ ...draft, contactEmail: event.target.value })} placeholder="name@business.co.uk" /></Field></div>
      <div className="form-separator"><span>Relationship</span></div>
      <div className="form-grid two"><Field label="Membership level"><select value={draft.tier} onChange={(event) => setDraft({ ...draft, tier: event.target.value })}>{data.levels.filter((level)=>level.active).map((level) => <option key={level.id}>{level.name}</option>)}</select></Field><Field label="Status"><select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as MembershipStatus })}><option>Prospect</option><option>Active</option><option>Free listing</option></select></Field></div>
      <Field label="Next action"><input value={draft.nextAction} onChange={(event) => setDraft({ ...draft, nextAction: event.target.value })} /></Field>
      <div className="modal-actions"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit">Create organisation</Button></div>
    </form>
  </Modal>
}

export function CreateInvoiceModal({ onClose }: { onClose: () => void }) {
  const { data, createInvoice } = useCRM()
  const initialOrganisation = data.organisations.find((item) => item.status === 'Active' && item.annualValue > 0)
  const [draft, setDraft] = useState<InvoiceDraft>(()=>{const now=new Date();const dueDate=new Date(now);dueDate.setDate(dueDate.getDate()+30);return{ organisationId: initialOrganisation?.id ?? '', description: `${initialOrganisation?.tier ?? ''} membership ${now.getFullYear()}/${String(now.getFullYear()+1).slice(-2)}`, subtotal: initialOrganisation?.annualValue ?? 0, dueDate: dueDate.toISOString().slice(0,10), sendNow: false }})
  const org = data.organisations.find((item) => item.id === draft.organisationId)
  const submit = (event: FormEvent) => { event.preventDefault(); createInvoice(draft); onClose() }
  return <Modal title="Create invoice" subtitle="Raise a draft or send it to the organisation’s nominated billing contact." onClose={onClose}>
    <form className="form-stack" onSubmit={submit}>
      <Field label="Organisation"><select required value={draft.organisationId} onChange={(event) => { const selected = data.organisations.find((item) => item.id === event.target.value); setDraft({ ...draft, organisationId: event.target.value, subtotal: selected?.annualValue ?? 0, description: `${selected?.tier ?? ''} membership ${new Date().getFullYear()}/${String(new Date().getFullYear()+1).slice(-2)}` }) }}>{data.organisations.filter((item) => item.status !== 'Prospect' && item.annualValue > 0).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
      {org && <div className="invoice-recipient"><span>{org.name.slice(0,2).toUpperCase()}</span><div><strong>{org.name}</strong><small>Invoice will use the nominated accounts contact</small></div></div>}
      <Field label="Description"><input required value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></Field>
      <div className="form-grid two"><Field label="Net amount"><div className="prefix-input"><span>£</span><input type="number" min="0" step="0.01" value={draft.subtotal} onChange={(event) => setDraft({ ...draft, subtotal: Number(event.target.value) })} /></div></Field><Field label="Due date"><input type="date" value={draft.dueDate} onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })} /></Field></div>
      <div className="invoice-total-preview"><span><small>Subtotal</small><strong>{currency.format(draft.subtotal)}</strong></span><span><small>VAT (20%)</small><strong>{currency.format(draft.subtotal * .2)}</strong></span><span><small>Total</small><strong>{currency.format(draft.subtotal * 1.2)}</strong></span></div>
      <label className="settings-checkbox"><input type="checkbox" checked={draft.sendNow} onChange={(event) => setDraft({ ...draft, sendNow: event.target.checked })} /><span><strong>Send invoice immediately</strong><small>Leave unticked to save as a draft for review.</small></span></label>
      <div className="modal-actions"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit">{draft.sendNow ? 'Create & send' : 'Save draft'}</Button></div>
    </form>
  </Modal>
}

export function AddTaskModal({ onClose }: { onClose: () => void }) {
  const { data, createTask } = useCRM()
  const [draft, setDraft] = useState<TaskDraft>({ title: '', organisationId: '', dueDate: new Date().toISOString().slice(0,10), priority: 'Medium', category: 'Follow-up' })
  const submit = (event: FormEvent) => { event.preventDefault(); if (!draft.title.trim()) return; createTask({ ...draft, organisationId: draft.organisationId || undefined }); onClose() }
  return <Modal title="Add task" subtitle="Create a clear, dated next action for yourself or the team." onClose={onClose} width="sm">
    <form className="form-stack" onSubmit={submit}>
      <Field label="Task"><input autoFocus required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="What needs to happen next?" /></Field>
      <Field label="Organisation (optional)"><select value={draft.organisationId} onChange={(event) => setDraft({ ...draft, organisationId: event.target.value })}><option value="">No organisation</option>{data.organisations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
      <div className="form-grid two"><Field label="Due date"><input type="date" value={draft.dueDate} onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })} /></Field><Field label="Priority"><select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as TaskPriority })}><option>High</option><option>Medium</option><option>Low</option></select></Field></div>
      <Field label="Category"><select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as TaskDraft['category'] })}><option>Follow-up</option><option>Renewal</option><option>Content</option><option>Finance</option><option>General</option></select></Field>
      <div className="modal-actions"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit">Add task</Button></div>
    </form>
  </Modal>
}
