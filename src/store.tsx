/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { demoData } from './data'
import type {
  CRMData,
  InvoiceDraft,
  Listing,
  MembershipLevel,
  Organisation,
  OrganisationDraft,
  PipelineStage,
  TaskDraft,
} from './types'

const STORAGE_KEY = 'visit-crm-demo-v1'

interface CRMContextValue {
  data: CRMData
  addOrganisation: (draft: OrganisationDraft) => Organisation
  updateOrganisation: (id: string, changes: Partial<Organisation>) => void
  updateListing: (id: string, changes: Partial<Listing>) => void
  publishListing: (id: string) => void
  moveOpportunity: (id: string, stage: PipelineStage) => void
  markInvoicePaid: (id: string) => void
  toggleInvoiceReminders: (id: string) => void
  sendInvoice: (id: string) => void
  createInvoice: (draft: InvoiceDraft) => void
  toggleTask: (id: string) => void
  createTask: (draft: TaskDraft) => void
  incrementBenefit: (organisationId: string, benefitId: string, allowance: number) => void
  addLevel: (level: Omit<MembershipLevel, 'id' | 'members'>) => void
  resetDemo: () => void
}

const CRMContext = createContext<CRMContextValue | null>(null)

function readInitialData(): CRMData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) as CRMData : demoData
  } catch {
    return demoData
  }
}

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function CRMProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CRMData>(readInitialData)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  const value = useMemo<CRMContextValue>(() => ({
    data,
    addOrganisation: (draft) => {
      const organisationId = id('org')
      const contactId = id('con')
      const level = data.levels.find((item) => item.name === draft.tier)
      const organisation: Organisation = {
        id: organisationId,
        name: draft.name,
        type: draft.type,
        town: draft.town,
        address: '',
        website: '',
        tier: draft.tier,
        status: draft.status,
        health: 'OK',
        owner: 'Vicki Zamudio',
        primaryContactId: contactId,
        renewalDate: '',
        membershipStart: '',
        annualValue: level?.price ?? 0,
        listings: 0,
        lastActivity: new Date().toISOString(),
        nextAction: draft.nextAction,
        nextActionDate: todayISO(),
        tags: draft.status === 'Prospect' ? ['Prospect'] : [],
        notes: '',
        colour: level?.colour ?? '#376b87',
      }
      setData((current) => ({
        ...current,
        organisations: [organisation, ...current.organisations],
        contacts: [{
          id: contactId,
          organisationId,
          name: draft.contactName,
          jobTitle: '',
          email: draft.contactEmail,
          phone: '',
          roles: ['Primary'],
          primary: true,
          portalAccess: false,
        }, ...current.contacts],
        activities: [{
          id: id('act'), organisationId, type: 'note', title: 'Organisation created',
          detail: `${draft.name} was added to the CRM.`, timestamp: new Date().toISOString(), user: 'Darren Tosh',
        }, ...current.activities],
      }))
      return organisation
    },
    updateOrganisation: (organisationId, changes) => {
      setData((current) => ({
        ...current,
        organisations: current.organisations.map((item) => item.id === organisationId ? { ...item, ...changes } : item),
      }))
    },
    updateListing: (listingId, changes) => {
      setData((current) => ({
        ...current,
        listings: current.listings.map((item) => item.id === listingId ? { ...item, ...changes, lastUpdated: todayISO() } : item),
        activities: [{
          id: id('act'), organisationId: current.listings.find((item) => item.id === listingId)?.organisationId,
          type: 'listing', title: 'Listing updated', detail: 'Listing content was updated in the CRM.',
          timestamp: new Date().toISOString(), user: 'Darren Tosh',
        }, ...current.activities],
      }))
    },
    publishListing: (listingId) => {
      setData((current) => ({
        ...current,
        listings: current.listings.map((item) => item.id === listingId ? { ...item, status: 'Published', lastUpdated: todayISO() } : item),
        activities: [{
          id: id('act'), organisationId: current.listings.find((item) => item.id === listingId)?.organisationId,
          type: 'listing', title: 'Listing published', detail: 'The approved listing is now live on the destination website.',
          timestamp: new Date().toISOString(), user: 'Darren Tosh',
        }, ...current.activities],
      }))
    },
    moveOpportunity: (opportunityId, stage) => {
      setData((current) => ({
        ...current,
        opportunities: current.opportunities.map((item) => item.id === opportunityId ? {
          ...item, stage, daysInStage: 0, probability: stage === 'Won' ? 100 : item.probability,
        } : item),
      }))
    },
    markInvoicePaid: (invoiceId) => {
      setData((current) => {
        const invoice = current.invoices.find((item) => item.id === invoiceId)
        return {
          ...current,
          invoices: current.invoices.map((item) => item.id === invoiceId ? {
            ...item, status: 'Paid', paidAt: todayISO(), remindersPaused: false,
          } : item),
          activities: invoice ? [{
            id: id('act'), organisationId: invoice.organisationId, type: 'invoice', title: 'Invoice marked paid',
            detail: `${invoice.number} marked paid in full.`, timestamp: new Date().toISOString(), user: 'Darren Tosh',
          }, ...current.activities] : current.activities,
        }
      })
    },
    toggleInvoiceReminders: (invoiceId) => {
      setData((current) => ({
        ...current,
        invoices: current.invoices.map((item) => item.id === invoiceId ? { ...item, remindersPaused: !item.remindersPaused } : item),
      }))
    },
    sendInvoice: (invoiceId) => {
      setData((current) => ({
        ...current,
        invoices: current.invoices.map((item) => item.id === invoiceId && item.status === 'Draft' ? { ...item, status: 'Sent' } : item),
      }))
    },
    createInvoice: (draft) => {
      const count = data.invoices.length + 1060
      const vat = Math.round(draft.subtotal * 0.2 * 100) / 100
      setData((current) => ({
        ...current,
        invoices: [{
          id: id('inv'),
          number: `SE-2026-${count}`,
          organisationId: draft.organisationId,
          description: draft.description,
          issueDate: todayISO(),
          dueDate: draft.dueDate,
          subtotal: draft.subtotal,
          vat,
          total: draft.subtotal + vat,
          status: draft.sendNow ? 'Sent' : 'Draft',
          remindersPaused: false,
          reminderStep: 0,
          sentTo: data.contacts.find((contact) => contact.organisationId === draft.organisationId && contact.roles.includes('Accounts'))?.email
            ?? data.contacts.find((contact) => contact.organisationId === draft.organisationId && contact.primary)?.email
            ?? '',
        }, ...current.invoices],
      }))
    },
    toggleTask: (taskId) => {
      setData((current) => ({
        ...current,
        tasks: current.tasks.map((item) => item.id === taskId ? { ...item, completed: !item.completed } : item),
      }))
    },
    createTask: (draft) => {
      setData((current) => ({
        ...current,
        tasks: [{ id: id('task'), ...draft, assignee: 'Darren Tosh', completed: false }, ...current.tasks],
      }))
    },
    incrementBenefit: (organisationId, benefitId, allowance) => {
      setData((current) => {
        const existing = current.benefitUsage.find((item) => item.organisationId === organisationId && item.benefitId === benefitId)
        return {
          ...current,
          benefitUsage: existing
            ? current.benefitUsage.map((item) => item.id === existing.id ? {
              ...item, used: item.used >= item.allowance ? 0 : item.used + 1, updatedAt: todayISO(),
            } : item)
            : [{ id: id('use'), organisationId, benefitId, used: 1, allowance, updatedAt: todayISO() }, ...current.benefitUsage],
        }
      })
    },
    addLevel: (level) => {
      setData((current) => ({ ...current, levels: [...current.levels, { ...level, id: id('level'), members: 0 }] }))
    },
    resetDemo: () => {
      localStorage.removeItem(STORAGE_KEY)
      setData(demoData)
    },
  }), [data])

  return <CRMContext.Provider value={value}>{children}</CRMContext.Provider>
}

export function useCRM() {
  const context = useContext(CRMContext)
  if (!context) throw new Error('useCRM must be used inside CRMProvider')
  return context
}
