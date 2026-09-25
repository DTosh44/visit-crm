export type ViewKey =
  | 'dashboard'
  | 'organisations'
  | 'people'
  | 'pipeline'
  | 'memberships'
  | 'listings'
  | 'events'
  | 'pages'
  | 'images'
  | 'experiments'
  | 'map'
  | 'content'
  | 'inbox'
  | 'insights'
  | 'billing'
  | 'agreements'
  | 'tasks'
  | 'communications'
  | 'memberValue'
  | 'memberOpportunities'
  | 'campaigns'
  | 'engagement'
  | 'travelTrade'
  | 'businessEvents'
  | 'prMedia'
  | 'surveys'
  | 'websiteHealth'
  | 'automations'
  | 'settings'

export type CreateTarget = 'organisation' | 'person' | 'opportunity' | 'membership' | 'listing' | 'event' | 'content' | 'page' | 'image' | 'experiment' | 'invoice' | 'agreement' | 'task' | 'communication' | 'memberValue' | 'campaign' | 'memberOpportunity' | 'survey' | 'buyer' | 'tradeLead' | 'famTrip' | 'businessEnquiry' | 'prOpportunity'

export type Health = 'Happy' | 'OK' | 'Needs attention'
export type MembershipStatus = 'Active' | 'Renewing' | 'Prospect' | 'Free listing' | 'Lapsed' | 'Non-member'
export type ListingStatus = 'Published' | 'Draft' | 'In review' | 'Changes requested' | 'Rejected'
export type InvoiceStatus = 'Draft' | 'Sent' | 'Overdue' | 'Paid' | 'Void'
export type AgreementStatus = 'Draft' | 'Sent' | 'Viewed' | 'Signed' | 'Declined' | 'Expired'
export type TaskPriority = 'High' | 'Medium' | 'Low'
export type PipelineStage = 'New lead' | 'Qualified' | 'Proposal' | 'Decision' | 'Won' | 'Lost'
export type EventStatus = 'Published' | 'Draft' | 'In review' | 'Changes requested' | 'Rejected' | 'Withdrawn'
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
  tags?: string[]
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
  email?: string
  phone?: string
  socialLinks?: string[]
  description?: string
  accessibility?: string
  facilities?: string[]
  logoUrl?: string
  images?: string[]
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
  hasUnpublishedChanges?: boolean
  isPublic?: boolean
  completeness: number
  views: number
  viewsThisMonth?: number
  enquiries: number
  shortDescription: string
  description: string
  website: string
  bookingUrl: string
  phone: string
  email: string
  openingHours: string
  accessibility?: string
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
  mapLatitude?: number
  mapLongitude?: number
  mapVisible?: boolean
  mapFeatured?: boolean
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
  mapLatitude?: number
  mapLongitude?: number
  mapVisible?: boolean
  mapFeatured?: boolean
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

export interface MembershipPeriod {
  id: string
  organisationId: string
  membershipLevel: string
  annualValue: number
  startDate: string
  endDate: string
  outcome: 'Current' | 'Renewed' | 'Cancelled' | 'Lapsed' | 'Unknown'
  reason?: string
  invoiceId?: string
  agreementId?: string
  createdAt: string
}

export interface CRMTask {
  id: string
  title: string
  organisationId?: string
  campaignId?: string
  opportunityId?: string
  tradeShowId?: string
  tradeLeadId?: string
  businessEnquiryId?: string
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
  outcomeDate?: string
  lostReason?: string
}

export interface ContentPage {
  id: string
  type: 'Guide' | 'Itinerary' | 'Trail'
  title: string
  slug: string
  summary: string
  body: string
  image: string
  status: 'Draft' | 'Published' | 'Draft changes'
  updatedAt: string
  metaTitle?: string
  metaDescription?: string
  published?: PublishedContentPage
  publishedAt?: string
  version?: number
}

export type PublishedContentPage = Pick<ContentPage, 'type' | 'title' | 'slug' | 'summary' | 'body' | 'image' | 'metaTitle' | 'metaDescription'>

export type WebsitePageStatus = 'Published' | 'Draft' | 'Draft changes'
export type WebsitePageTemplate = 'Home' | 'Collection' | 'Service' | 'Information' | 'Landing page'
export type WebsiteBlockType = 'Text' | 'Callout' | 'Image' | 'Button'

export interface WebsitePageBlock {
  id: string
  type: WebsiteBlockType
  heading: string
  body: string
  image?: string
  buttonLabel?: string
  buttonUrl?: string
}

export interface WebsitePageContent {
  eyebrow: string
  title: string
  description: string
  heroImage?: string
  metaTitle: string
  metaDescription: string
  navigationLabel: string
  showInNavigation: boolean
  blocks: WebsitePageBlock[]
}

export interface WebsitePageVersion {
  version: number
  publishedAt: string
  publishedBy: string
  content: WebsitePageContent
}

export interface WebsitePage {
  id: string
  name: string
  path: string
  template: WebsitePageTemplate
  status: WebsitePageStatus
  draft: WebsitePageContent
  published?: WebsitePageContent
  version: number
  versions: WebsitePageVersion[]
  updatedAt: string
  publishedAt?: string
}

export interface WebsiteAnalyticsEvent {
  id: string
  type: 'page_view' | 'form_submit' | 'cta_click' | 'booking_completed'
  path: string
  title: string
  visitorId: string
  source: string
  campaign?: string
  experimentId?: string
  variantId?: string
  occurredAt: string
}

export type ImageAssetLicence = 'Owned' | 'Licensed' | 'Partner supplied' | 'Creative Commons'
export type ImageAssetStatus = 'Ready' | 'Processing' | 'Archived'

export interface ImageAsset {
  id: string
  name: string
  url: string
  alt: string
  caption: string
  credit: string
  rightsHolder: string
  licence: ImageAssetLicence
  usageExpiry?: string
  tags: string[]
  collection: string
  width: number
  height: number
  fileSize: number
  mimeType: string
  storageProvider: 'Demo library' | 'Supabase Storage' | 'Cloudinary' | 'S3 compatible'
  uploadedAt: string
  uploadedBy: string
  status: ImageAssetStatus
}

export type WebsiteExperimentStatus = 'Draft' | 'Scheduled' | 'Running' | 'Paused' | 'Completed'
export type WebsiteExperimentGoal = WebsiteAnalyticsEvent['type']

export interface WebsiteExperimentVariant {
  id: string
  name: string
  weight: number
  title: string
  description: string
  buttonLabel: string
}

export interface WebsiteExperiment {
  id: string
  name: string
  hypothesis: string
  pagePath: string
  goal: WebsiteExperimentGoal
  status: WebsiteExperimentStatus
  variants: WebsiteExperimentVariant[]
  createdAt: string
  startedAt?: string
  endedAt?: string
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
  membershipPeriods: MembershipPeriod[]
  tasks: CRMTask[]
  opportunities: Opportunity[]
  activities: Activity[]
  socialMetrics: SocialMetric[]
  websitePages: WebsitePage[]
  contentPages: ContentPage[]
  analyticsEvents: WebsiteAnalyticsEvent[]
  imageAssets: ImageAsset[]
  websiteExperiments: WebsiteExperiment[]
  submissions: WebsiteSubmission[]
  workspace: WorkspaceSettings
}

export interface WorkspaceSettings {
  destinationName: string
  legalName: string
  strapline: string
  contactEmail: string
  contactPhone?: string
  publicWebsiteUrl?: string
  destinationLogoUrl?: string
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
  campaignId?: string
  opportunityId?: string
  tradeShowId?: string
  tradeLeadId?: string
  businessEnquiryId?: string
  dueDate: string
  priority: TaskPriority
  category: CRMTask['category']
}

export type EventDraft = Omit<DestinationEvent, 'id' | 'lastUpdated'>
