export interface TenantBrand {
  id: string
  name: string
  shortName: string
  legalName: string
  strapline: string
  description: string
  websiteUrl: string
  crmPath: string
  contactEmail: string
  location: string
  colours: {
    ink: string
    primary: string
    primaryDark: string
    accent: string
    sage: string
    mist: string
    paper: string
  }
}

export type FeatureKey =
  | 'publicWebsite'
  | 'interactiveMap'
  | 'imageBank'
  | 'websiteExperiments'
  | 'organisations'
  | 'salesPipeline'
  | 'memberships'
  | 'listings'
  | 'events'
  | 'itineraries'
  | 'billing'
  | 'agreements'
  | 'tasks'
  | 'businessPortal'
  | 'travelTrade'
  | 'reviewIntelligence'
  | 'socialInsights'
  | 'aiWebsiteEditor'
  | 'memberPortal'
  | 'memberValue'
  | 'communications'
  | 'automations'
  | 'campaigns'
  | 'coopOpportunities'
  | 'businessEvents'
  | 'prMedia'
  | 'surveys'
  | 'websiteHealth'
  | 'aiAssistant'

export const defaultFeatures: Record<FeatureKey, boolean> = {
  publicWebsite: true,
  interactiveMap: true,
  imageBank: true,
  websiteExperiments: false,
  organisations: true,
  salesPipeline: true,
  memberships: true,
  listings: true,
  events: true,
  itineraries: true,
  billing: true,
  agreements: true,
  tasks: true,
  businessPortal: false,
  travelTrade: true,
  reviewIntelligence: false,
  socialInsights: true,
  aiWebsiteEditor: false,
  memberPortal: true,
  memberValue: true,
  communications: true,
  automations: true,
  campaigns: true,
  coopOpportunities: true,
  businessEvents: true,
  prMedia: true,
  surveys: false,
  websiteHealth: true,
  aiAssistant: true,
}

/**
 * The active tenant is deliberately configuration-driven. A production build can
 * load this record by hostname after authentication without changing page code.
 */
export const tenant: TenantBrand = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Visit Valechester',
  shortName: 'Valechester',
  legalName: 'Valechester Visitor Economy Partnership',
  strapline: 'Past, present, perfectly placed.',
  description: 'A storied riverside town where independent spirit, green spaces and remarkable culture meet.',
  websiteUrl: '/',
  crmPath: '/crm',
  contactEmail: 'hello@visitvalechester.example',
  location: 'Valechester, England',
  colours: {
    ink: '#22152b',
    primary: '#6d294f',
    primaryDark: '#4f1b39',
    accent: '#f0785e',
    sage: '#7a9a83',
    mist: '#e7f0ed',
    paper: '#fffdf9',
  },
}

export function applyTenantTheme() {
  const root = document.documentElement
  root.style.setProperty('--tenant-ink', tenant.colours.ink)
  root.style.setProperty('--tenant-primary', tenant.colours.primary)
  root.style.setProperty('--tenant-primary-dark', tenant.colours.primaryDark)
  root.style.setProperty('--tenant-accent', tenant.colours.accent)
  root.style.setProperty('--tenant-sage', tenant.colours.sage)
  root.style.setProperty('--tenant-mist', tenant.colours.mist)
  root.style.setProperty('--tenant-paper', tenant.colours.paper)
}
