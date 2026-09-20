export type ViewKey =
  | 'dashboard'
  | 'organisations'
  | 'pipeline'
  | 'memberships'
  | 'listings'
  | 'events'
  | 'content'
  | 'inbox'
  | 'insights'
  | 'billing'
  | 'agreements'
  | 'tasks'
  | 'settings'

export type Health = 'Happy' | 'OK' | 'Needs attention'
export type MembershipStatus = 'Active' | 'Renewing' | 'Prospect' | 'Free listing' | 'Lapsed'
export type ListingStatus = 'Published' | 'Draft' | 'In review' | 'Changes requested'
export type InvoiceStatus = 'Draft' | 'Sent' | 'Overdue' | 'Paid' | 'Void'
export type AgreementStatus = 'Draft' | 'Sent' | 'Viewed' | 'Signed' | 'Declined' | 'Expired'
export type TaskPriority = 'High' | 'Medium' | 'Low'
export type PipelineStage = 'New lead' | 'Qualified' | 'Proposal' | 'Decision' | 'Won'
export type EventStatus = 'Published' | 'Draft' | 'In review' | 'Changes requested' | 'Withdrawn'
export type EventFormat = 'One-off and short run' | 'Ongoing events' | 'Online events'
export type EventRecurrence = 'None' | 'Daily' | 'Weekly' | 'Monthly'

export interface Contact {
  id: string
  organisationId: string
  name: string
  jobTitle: string
  email: string
  phone: string
  roles: string[]
  primary?: boolean
  portalAccess?: boolean
}

export interface Organisation {
  id: string
  name: string
  type: string
  town: string
  address: string
  website: string
  tier: string
  status: MembershipStatus
  health: Health
  owner: string
  primaryContactId: string
  renewalDate: string
  membershipStart: string
  annualValue: number
  listings: number
  lastActivity: string
  nextAction: string
  nextActionDate: string
  tags: string[]
  notes: string
  colour: string
}

export interface Benefit {
  id: string
  name: string
  kind: 'Single use' | 'Allowance' | 'Ongoing'
  allowance: number
  category: 'Marketing' | 'Networking' | 'Listing' | 'Insight' | 'Support'
}

export interface MembershipLevel {
  id: string
  name: string
  price: number
  description: string
  colour: string
  benefits: string[]
  listingAllowance: number
  imageAllowance: number
  videoAllowance: number
  taxonomyAllowance: number
  active: boolean
  members: number
}

export interface BenefitUse {
  id: string
  organisationId: string
  benefitId: string
  used: number
  allowance: number
  note?: string
  updatedAt?: string
}

export interface ListingMedia {
  id: string
  type: 'image' | 'video'
  url: string
  title?: string
  alt?: string
  caption?: string
  storagePath?: string
}

export interface Listing {
  id: string
  organisationId: string
  name: string
  category: string
  town: string
  status: ListingStatus
  completeness: number
  views: number
  enquiries: number
  shortDescription: string
  description: string
  website: string
  bookingUrl: string
  phone: string
  email: string
  openingHours: string
  facilities: string[]
  visitorTaxonomy?: string[]
  searchTags: string[]
  reviewHighlights: string[]
  reviewSites?: Array<{ id: string; name: string; url: string }>
  goodToKnow: string[]
  lastUpdated: string
  image: string
  media?: ListingMedia[]
  awards?: string[]
  imageRightsConfirmed?: boolean
}

export interface DestinationEvent {
  id: string
  title: string
  category: string
  format: EventFormat
  description: string
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  venueName: string
  address: string
  town: string
  postcode: string
  price: string
  bookingUrl: string
  contactName: string
  contactEmail: string
  image: string
  accessibility: string
  status: EventStatus
  submittedBy: string
  moderationNote?: string
  recurrence?: EventRecurrence
  recurrenceUntil?: string
  organisationId?: string
  lastUpdated: string
}

export interface Invoice {
  id: string
  number: string
  organisationId: string
  description: string
  issueDate: string
  dueDate: string
  subtotal: number
  vat: number
  total: number
  status: InvoiceStatus
  remindersPaused: boolean
  reminderStep: number
  sentTo: string
  paidAt?: string
  paidAmount?: number
  paymentReference?: string
}

export interface Agreement {
  id: string
  number: string
  organisationId: string
  membershipLevel: string
  signatory: string
  signatoryEmail: string
  status: AgreementStatus
  createdAt: string
  sentAt?: string
  signedAt?: string
  validUntil: string
}

export interface CRMTask {
  id: string
  title: string
  organisationId?: string
  dueDate: string
  dueTime?: string
  priority: TaskPriority
  assignee: string
  category: 'Follow-up' | 'Renewal' | 'Content' | 'Finance' | 'General'
  completed: boolean
}

export interface Opportunity {
  id: string
  organisationName: string
  contactName: string
  stage: PipelineStage
  proposedLevel: string
  value: number
  probability: number
  source: string
  nextAction: string
  nextActionDate: string
  owner: string
  daysInStage: number
  stageEnteredAt?: string
}

export interface ContentPage {
  id: string
  type: 'Guide' | 'Itinerary' | 'Trail'
  title: string
  slug: string
  summary: string
  body: string
  image: string
  status: 'Draft' | 'Published'
  updatedAt: string
  metaTitle?: string
  metaDescription?: string
}

export interface WebsiteSubmission {
  id: string
  kind: string
  payload: Record<string, unknown>
  createdAt: string
  status: 'New' | 'In progress' | 'Resolved'
}

export interface Activity {
  id: string
  organisationId?: string
  type: 'note' | 'email' | 'invoice' | 'listing' | 'event' | 'agreement' | 'task'
  title: string
  detail: string
  timestamp: string
  user: string
}

export interface SocialMetric {
  id: 'followers' | 'reach' | 'videoViews' | 'engagements'
  label: string
  value: number
  displayValue: string
  context: string
  source: string
  period: string
  updatedAt: string
}

export interface CRMData {
  organisations: Organisation[]
  contacts: Contact[]
  levels: MembershipLevel[]
  benefits: Benefit[]
  benefitUsage: BenefitUse[]
  listings: Listing[]
  events: DestinationEvent[]
  invoices: Invoice[]
  agreements: Agreement[]
  tasks: CRMTask[]
  opportunities: Opportunity[]
  activities: Activity[]
  socialMetrics: SocialMetric[]
  contentPages: ContentPage[]
  submissions: WebsiteSubmission[]
  workspace: WorkspaceSettings
}

export interface WorkspaceSettings {
  destinationName: string
  legalName: string
  strapline: string
  contactEmail: string
  address: string
  timezone: string
  currency: string
  financialYearStart: string
  membershipYearStart: string
  primaryColour: string
  accentColour: string
  supportingColour: string
  visitorVolume: number
  visitorSpend: number
  overnightStays: number
  bankBalance?: number
  bankProvider?: string
  accountingProvider?: string
  reviewProvider?: string
  vatRate?: number
}

export interface OrganisationDraft {
  name: string
  type: string
  town: string
  contactName: string
  contactEmail: string
  tier: string
  status: MembershipStatus
  nextAction: string
}

export interface InvoiceDraft {
  organisationId: string
  description: string
  subtotal: number
  dueDate: string
  sendNow: boolean
}

export interface TaskDraft {
  title: string
  organisationId?: string
  dueDate: string
  priority: TaskPriority
  category: CRMTask['category']
}

export type EventDraft = Omit<DestinationEvent, 'id' | 'lastUpdated'>
