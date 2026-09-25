import type { CmsPageRevision, ContentPage, WebsitePage, WebsitePageContent } from './types'

export interface CmsPageRow {
  tenant_id: string
  id: string
  kind: 'website_page' | 'content_page'
  name: string
  path: string
  template: string
  draft: Record<string, unknown>
  published: Record<string, unknown> | null
  version: number
  revision: number
  updated_at: string
  published_at: string | null
  deleted_at: string | null
}

export interface CmsRevisionRow {
  id: number
  page_id: string
  kind: CmsPageRow['kind']
  action: CmsPageRevision['action']
  version: number
  page_revision: number
  snapshot: Record<string, unknown> | null
  changed_fields: string[]
  actor_id: string | null
  actor_name: string
  source_revision_id: number | null
  created_at: string
}

export function contentPageSnapshot(page: ContentPage) {
  return { type: page.type, title: page.title, slug: page.slug, summary: page.summary,
    body: page.body, image: page.image, metaTitle: page.metaTitle ?? '', metaDescription: page.metaDescription ?? '' }
}

export function cmsRevisionFromRow(row: CmsRevisionRow): CmsPageRevision {
  return { id: row.id, action: row.action, version: row.version, pageRevision: row.page_revision,
    snapshot: row.snapshot ?? undefined, changedFields: row.changed_fields ?? [],
    actorId: row.actor_id ?? undefined, actorName: row.actor_name, sourceRevisionId: row.source_revision_id ?? undefined,
    createdAt: row.created_at }
}

export function cmsPagesFromRows(rows: CmsPageRow[], revisionRows: CmsRevisionRow[]) {
  const byPage = new Map<string, CmsPageRevision[]>()
  for (const row of revisionRows) {
    const existing = byPage.get(row.page_id) ?? []
    existing.push(cmsRevisionFromRow(row))
    byPage.set(row.page_id, existing)
  }
  const websitePages: WebsitePage[] = []
  const contentPages: ContentPage[] = []
  for (const row of rows) {
    if (row.deleted_at) continue
    const revisions = (byPage.get(row.id) ?? []).sort((a, b) => b.id - a.id)
    const status = row.published === null ? 'Draft' : JSON.stringify(row.draft) === JSON.stringify(row.published) ? 'Published' : 'Draft changes'
    if (row.kind === 'website_page') {
      const versions = revisions.filter((item) => ['published', 'imported_published'].includes(item.action) && item.snapshot)
        .slice(0, 20).map((item) => ({ version: item.version, revisionId: item.id,
          publishedAt: item.createdAt, publishedBy: item.actorName, content: item.snapshot as unknown as WebsitePageContent }))
      websitePages.push({ id: row.id, name: row.name, path: row.path, template: row.template as WebsitePage['template'],
        status, draft: row.draft as unknown as WebsitePageContent,
        published: row.published ? row.published as unknown as WebsitePageContent : undefined,
        version: row.version, revision: row.revision, versions, revisions,
        updatedAt: row.updated_at.slice(0, 10), publishedAt: row.published_at ?? undefined })
    } else {
      const draft = row.draft as unknown as ContentPage
      contentPages.push({ id: row.id, type: draft.type, title: draft.title, slug: draft.slug,
        summary: draft.summary, body: draft.body, image: draft.image,
        metaTitle: draft.metaTitle ?? '', metaDescription: draft.metaDescription ?? '',
        status, published: row.published ? row.published as ContentPage['published'] : undefined,
        version: row.version, revision: row.revision, revisions,
        updatedAt: row.updated_at.slice(0, 10), publishedAt: row.published_at ?? undefined })
    }
  }
  return { websitePages, contentPages }
}

const fieldLabels: Record<string, string> = {
  eyebrow: 'Eyebrow', title: 'Title', description: 'Introduction', heroImage: 'Hero image',
  metaTitle: 'SEO title', metaDescription: 'SEO description', navigationLabel: 'Navigation label',
  showInNavigation: 'Navigation visibility', blocks: 'Page sections', type: 'Type', slug: 'URL slug',
  summary: 'Summary', body: 'Body', image: 'Image', page: 'Page',
}

export function changedFieldSummary(fields: string[]) {
  return fields.length ? fields.map((field) => fieldLabels[field] ?? field).join(', ') : 'No content fields changed'
}

export function revisionActionLabel(action: CmsPageRevision['action']) {
  return ({ created: 'Draft created', draft_saved: 'Draft saved', published: 'Published',
    restored: 'Restored to draft', discarded: 'Draft discarded', deleted: 'Page deleted',
    imported_published: 'Existing published version imported', imported_draft: 'Existing draft imported' })[action]
}
