import type { ContentPage, PublishedContentPage } from './types'

export function contentSnapshot(page: ContentPage): PublishedContentPage {
  return {
    type: page.type,
    title: page.title,
    slug: page.slug,
    summary: page.summary,
    body: page.body,
    image: page.image,
    metaTitle: page.metaTitle,
    metaDescription: page.metaDescription,
  }
}

export function publishedPage(page: ContentPage): ContentPage | null {
  if (!page.published) return page.status === 'Published' ? page : null
  return { ...page, ...page.published, status: 'Published' }
}

export function publishedPages(pages: ContentPage[]) {
  return pages.map(publishedPage).filter((page): page is ContentPage => Boolean(page))
}
