import type { WebsitePage, WebsitePageContent } from './types'

const content = (
  eyebrow: string,
  title: string,
  description: string,
  navigationLabel: string,
  showInNavigation = true,
  heroImage = '',
): WebsitePageContent => ({
  eyebrow,
  title,
  description,
  heroImage,
  metaTitle: title.replace(/\.$/, ''),
  metaDescription: description,
  navigationLabel,
  showInNavigation,
  blocks: [],
})

const page = (
  id: string,
  name: string,
  path: string,
  template: WebsitePage['template'],
  published: WebsitePageContent,
): WebsitePage => ({
  id,
  name,
  path,
  template,
  status: 'Published',
  draft: structuredClone(published),
  published,
  version: 1,
  versions: [{ version: 1, publishedAt: '2026-09-22T00:00:00.000Z', publishedBy: 'System', content: structuredClone(published) }],
  updatedAt: '2026-09-22',
  publishedAt: '2026-09-22T00:00:00.000Z',
})

export const initialWebsitePages: WebsitePage[] = [
  page('webpage-home', 'Homepage', '/', 'Home', content('Find your kind of remarkable', 'A town with stories in every direction.', 'Past, present, perfectly placed.', 'Home', true, 'hero')),
  page('webpage-events', "What's on", '/events', 'Collection', content("What's on", 'Make a date of Valechester.', 'Markets, live performance, family evenings and the kind of local events worth building a trip around.', "What's on", true, 'restaurant')),
  page('webpage-guides', 'Visitor guides', '/guides', 'Collection', content('Ideas and inspiration', 'Guides for your visit.', 'Practical recommendations to help you choose what to do.', 'Ideas & inspiration', true)),
  page('webpage-itineraries', 'Itineraries', '/itineraries', 'Collection', content('Ideas and inspiration', 'Itineraries for your visit.', 'Ready made plans for making the most of your time in Valechester.', 'Itineraries', false)),
  page('webpage-trails', 'Trails', '/trails', 'Collection', content('Ideas and inspiration', 'Trails for your visit.', 'Follow Valechester stories, landmarks and landscapes at your own pace.', 'Trails', false)),
  page('webpage-plan', 'Trip planner', '/plan', 'Service', content('Trip planner', 'Shape your Valechester.', 'Choose the pace and the things you enjoy. We’ll turn published destination listings into a practical starting itinerary.', 'Plan your visit', true, 'hero')),
  page('webpage-saved', 'Saved places', '/saved', 'Service', content('Your trip', 'Saved places', 'Keep the places that catch your eye together while you shape your Valechester visit.', 'Saved places', false)),
  page('webpage-contact', 'Contact', '/contact', 'Service', content('Talk to the team', 'Contact Visit Valechester', 'Send your enquiry to the Valechester team.', 'Contact', false)),
  page('webpage-account', 'Event organiser account', '/account', 'Service', content('Event organisers', 'Welcome back.', 'Submit events and keep track of their approval status.', 'Event organiser login', false)),
  page('webpage-submit-event', 'Submit an event', '/submit-event', 'Service', content("Add to what's on", 'Submit an event.', 'Send your event to the destination team for review.', 'Submit an event', false)),
  page('webpage-accessibility', 'Accessibility', '/accessibility', 'Information', content('Accessibility statement', 'Accessible Valechester', 'How we support inclusive visits and accessible use of this website.', 'Accessibility', false)),
  page('webpage-privacy', 'Privacy', '/privacy', 'Information', content('Visitor information', 'Privacy', 'How Visit Valechester handles visitor information.', 'Privacy', false)),
  page('webpage-cookies', 'Cookies', '/cookies', 'Information', content('Visitor information', 'Cookies', 'How this website uses cookies and local storage.', 'Cookies', false)),
]

export function websitePageContent(page: WebsitePage, preview: boolean) {
  return preview ? page.draft : page.published
}

export function websitePageForPath(pages: WebsitePage[], path: string) {
  return pages.find((page) => page.path === path)
}

