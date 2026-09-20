import type { Listing } from './types'

export function visitorTaxonomyFor(listing: Pick<Listing, 'category' | 'searchTags' | 'visitorTaxonomy'>) {
  if (listing.visitorTaxonomy?.length) return listing.visitorTaxonomy
  const searchable = `${listing.category} ${listing.searchTags.join(' ')}`.toLowerCase()
  const audiences: string[] = []
  const add = (label: string, pattern: RegExp) => { if (pattern.test(searchable)) audiences.push(label) }
  add('Families with children', /famil|under 5|play/)
  add('Couples', /romantic|couple/)
  add('Groups', /group/)
  add('Visitors with access needs', /access|wheel|hearing|step-free/)
  add('Dog owners', /dog/)
  add('Wet-weather planners', /rainy|indoor/)
  add('Outdoor explorers', /outdoor|garden|park|walk/)
  add('Food and drink visitors', /food|restaurant|café|cafe|drink|distill/)
  add('Short-break visitors', /overnight|hotel|accommodation|stay/)
  if (!audiences.length) audiences.push('First-time visitors', 'Local residents')
  return audiences
}
