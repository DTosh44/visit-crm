import { Copy, Edit3, Eye, FileText, Plus, RotateCcw, Send, Search, Trash2, UploadCloud } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { useCRM } from '../store'
import type { ContentPage } from '../types'
import { Badge, Button, Field, Modal, PageHeader } from '../components/UI'
import { PageRevisionHistory } from '../components/PageRevisionHistory'
import { imageLibrary } from '../siteData'

type PageDraft = Omit<ContentPage, 'id' | 'updatedAt'>
const blank: PageDraft = { type: 'Guide', title: '', slug: '', summary: '', body: '', image: 'hero', status: 'Draft', metaTitle: '', metaDescription: '', version: 0 }
const message = (error: unknown) => error instanceof Error ? error.message : String(error)

export function Content({ createRequest = 0 }: { createRequest?: number }) {
  const { data, createContentPage, updateContentPage, publishContentPage, discardContentDraft, restoreContentPageVersion, deleteContentPage } = useCRM()
  const [query, setQuery] = useState('')
  const [type, setType] = useState('All')
  const [editing, setEditing] = useState<ContentPage | PageDraft | null>(createRequest ? { ...blank } : null)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)
  const pages = useMemo(() => data.contentPages.filter((page) => (type === 'All' || page.type === type) && (!query || [page.title, page.summary, page.slug].join(' ').toLowerCase().includes(query.toLowerCase()))), [data.contentPages, query, type])
  const pageUrl = (page: Pick<ContentPage, 'type' | 'slug'>) => `/${page.type === 'Itinerary' ? 'itineraries' : `${page.type.toLowerCase()}s`}/${page.slug}`
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true); setActionError('')
    try { await action() } catch (failure) { setActionError(message(failure)) } finally { setBusy(false) }
  }
  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!editing) return
    const duplicate = data.contentPages.some((page) => page.slug === editing.slug && (!('id' in editing) || page.id !== editing.id))
    if (duplicate) { setError('That URL slug is already in use. Choose a unique slug.'); return }
    setBusy(true); setError('')
    try {
      if ('id' in editing) await updateContentPage(editing.id, editing)
      else await createContentPage(editing)
      setEditing(null)
    } catch (failure) { setError(message(failure)) } finally { setBusy(false) }
  }
  const duplicate = (page: ContentPage) => {
    const copy: PageDraft = { type: page.type, title: `${page.title} copy`, slug: `${page.slug}-copy-${Date.now().toString().slice(-4)}`, summary: page.summary, body: page.body, image: page.image, status: 'Draft', metaTitle: page.metaTitle, metaDescription: page.metaDescription, version: 0 }
    void run(async () => { const created = await createContentPage(copy); setEditing(created) })
  }
  const uploadImage = (file?: File) => {
    if (!file || !editing) return
    if (file.size > 2 * 1024 * 1024) { setError('Choose an image smaller than 2 MB.'); return }
    const reader = new FileReader()
    reader.onload = () => { setEditing((current) => current ? { ...current, image: String(reader.result) } : current); setError('') }
    reader.onerror = () => setError('The image could not be read.')
    reader.readAsDataURL(file)
  }
  const restore = (page: ContentPage, revisionId: number) => {
    if (!confirm('Restore this published version as a new draft?')) return
    setBusy(true); setError('')
    void restoreContentPageVersion(page.id, revisionId).then(() => setEditing(null)).catch((failure) => setError(message(failure))).finally(() => setBusy(false))
  }

  return <div>
    <PageHeader eyebrow="Website content" title="Guides, itineraries and trails" description="Every edit is saved as a private draft. Preview it, then publish when it is ready for visitors." actions={<Button icon={Plus} onClick={() => setEditing({ ...blank })}>New page</Button>} />
    {actionError && <p className="form-error" role="alert">{actionError}</p>}
    <section className="panel data-panel">
      <div className="table-toolbar"><div className="table-search"><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search content..." /></div><label className="select-wrap"><select aria-label="Filter content by type" value={type} onChange={(event) => setType(event.target.value)}><option>All</option><option>Guide</option><option>Itinerary</option><option>Trail</option></select></label></div>
      <div className="table-scroll"><table className="data-table"><thead><tr><th>Page</th><th>Type</th><th>URL</th><th>Updated</th><th>Status</th><th/></tr></thead><tbody>{pages.map((page) => <tr key={page.id}>
        <td><div className="org-cell"><FileText size={18}/><div><strong>{page.title}</strong><small>{page.summary}</small></div></div></td><td>{page.type}</td><td>{pageUrl(page)}</td><td>{page.updatedAt}</td><td><Badge>{page.status}</Badge>{page.publishedAt && <small className="published-version">Live v{page.version ?? 1}</small>}</td>
        <td><div className="event-row-actions">
          {page.status !== 'Published' && <Button size="sm" icon={Send} disabled={busy} onClick={() => void run(() => publishContentPage(page.id))}>Publish</Button>}
          <button className="icon-button" onClick={() => window.open(`${pageUrl(page)}?preview=true`, '_blank', 'noopener,noreferrer')} aria-label={`Preview ${page.title}`} title="Preview draft"><Eye size={16}/></button>
          {page.status === 'Draft changes' && <button className="icon-button" disabled={busy} onClick={() => { if (confirm(`Discard the draft changes to ${page.title}?`)) void run(() => discardContentDraft(page.id)) }} aria-label={`Discard draft changes to ${page.title}`} title="Discard draft"><RotateCcw size={16}/></button>}
          <button className="icon-button" disabled={busy} onClick={() => duplicate(page)} aria-label={`Duplicate ${page.title}`}><Copy size={16}/></button>
          <button className="icon-button" onClick={() => setEditing({ ...page })} aria-label={`Edit ${page.title}`}><Edit3 size={16}/></button>
          <button className="icon-button danger" disabled={busy} onClick={() => { if (confirm(`Delete ${page.title}?`)) void run(() => deleteContentPage(page.id)) }} aria-label={`Delete ${page.title}`}><Trash2 size={16}/></button>
        </div></td>
      </tr>)}</tbody></table></div>
    </section>
    {editing && <Modal title={'id' in editing ? `Edit ${editing.title}` : 'New inspiration page'} subtitle="Saving creates a private draft. The live page will not change until you publish." onClose={() => setEditing(null)}>
      <form className="form-stack" onSubmit={(event) => { void save(event) }}>
        <div className="form-grid two"><Field label="Type"><select value={editing.type} onChange={(event) => setEditing({ ...editing, type: event.target.value as ContentPage['type'] })}><option>Guide</option><option>Itinerary</option><option>Trail</option></select></Field><Field label="Publication"><div className="draft-state"><Badge>{editing.status}</Badge><span>{editing.published ? 'A previous version remains live' : 'Not yet live'}</span></div></Field></div>
        <Field label="Title"><input required value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value, slug: editing.slug || event.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') })} /></Field>
        <Field label="URL slug"><input required value={editing.slug} onChange={(event) => setEditing({ ...editing, slug: event.target.value })} /></Field>
        <Field label="Header image"><select value={Object.hasOwn(imageLibrary, editing.image) ? editing.image : 'uploaded'} onChange={(event) => event.target.value !== 'uploaded' && setEditing({ ...editing, image: event.target.value })}>{Object.keys(imageLibrary).map((item) => <option key={item}>{item}</option>)}{!Object.hasOwn(imageLibrary, editing.image) && <option value="uploaded">Uploaded image</option>}</select></Field>
        <label className="upload-zone compact"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => uploadImage(event.target.files?.[0])}/><UploadCloud size={20}/><strong>Upload a header image</strong><span>JPG, PNG or WebP, up to 2 MB</span></label>
        <Field label="Summary"><textarea required rows={3} value={editing.summary} onChange={(event) => setEditing({ ...editing, summary: event.target.value })}/></Field>
        <div className="form-grid two"><Field label="SEO title"><input maxLength={60} value={editing.metaTitle ?? ''} onChange={(event) => setEditing({ ...editing, metaTitle: event.target.value })}/></Field><Field label="SEO description"><textarea maxLength={160} rows={2} value={editing.metaDescription ?? ''} onChange={(event) => setEditing({ ...editing, metaDescription: event.target.value })}/></Field></div>
        <Field label="Page content" hint="Separate sections with a blank line. Lines beginning with ## become section headings."><textarea required rows={9} value={editing.body} onChange={(event) => setEditing({ ...editing, body: event.target.value })}/></Field>
        {'id' in editing && editing.revisions && <PageRevisionHistory revisions={editing.revisions} busy={busy} onRestore={(revisionId) => restore(editing, revisionId)} />}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" disabled={busy}>Save draft</Button></div>
      </form>
    </Modal>}
  </div>
}
