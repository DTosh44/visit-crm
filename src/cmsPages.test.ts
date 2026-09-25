import { describe, expect, it } from 'vitest'
import { cmsPagesFromRows, changedFieldSummary, type CmsPageRow, type CmsRevisionRow } from './cmsPages'

const website: CmsPageRow = {
  tenant_id: 'tenant', id: 'home', kind: 'website_page', name: 'Home', path: '/', template: 'Home',
  draft: { title: 'New title' }, published: { title: 'Old title' }, version: 2, revision: 5,
  updated_at: '2026-09-25T10:00:00Z', published_at: '2026-09-24T10:00:00Z', deleted_at: null,
}
const published: CmsRevisionRow = {
  id: 10, page_id: 'home', kind: 'website_page', action: 'published', version: 2, page_revision: 4,
  snapshot: { title: 'Old title' }, changed_fields: ['title'], actor_id: 'editor-1', actor_name: 'Darren',
  source_revision_id: null, created_at: '2026-09-24T10:00:00Z',
}

describe('database-backed CMS page mapping', () => {
  it('keeps draft and live content separate and exposes attributed history', () => {
    const { websitePages } = cmsPagesFromRows([website], [published])
    expect(websitePages[0]).toMatchObject({ status: 'Draft changes', draft: { title: 'New title' }, published: { title: 'Old title' }, version: 2, revision: 5 })
    expect(websitePages[0].versions[0]).toMatchObject({ revisionId: 10, version: 2, publishedBy: 'Darren' })
    expect(websitePages[0].revisions?.[0]).toMatchObject({ action: 'published', actorId: 'editor-1', actorName: 'Darren', changedFields: ['title'] })
  })

  it('omits deleted pages and treats missing published snapshots as drafts', () => {
    const { websitePages } = cmsPagesFromRows([{ ...website, published: null }, { ...website, id: 'deleted', deleted_at: '2026-09-25T11:00:00Z' }], [])
    expect(websitePages).toHaveLength(1)
    expect(websitePages[0].status).toBe('Draft')
    expect(websitePages[0].published).toBeUndefined()
  })

  it('names changed fields for the editor', () => {
    expect(changedFieldSummary(['title', 'blocks'])).toBe('Title, Page sections')
  })
})
