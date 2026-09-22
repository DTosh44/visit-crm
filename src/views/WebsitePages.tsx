import { ArrowDown, ArrowUp, Edit3, Eye, FileText, History, Plus, RotateCcw, Send, Sparkles, Trash2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Badge, Button, Field, Modal, PageHeader } from '../components/UI'
import { useCRM } from '../store'
import type { WebsiteBlockType, WebsitePage, WebsitePageBlock, WebsitePageContent } from '../types'

const blankContent = (): WebsitePageContent => ({ eyebrow: '', title: '', description: '', heroImage: '', metaTitle: '', metaDescription: '', navigationLabel: '', showInNavigation: false, blocks: [] })
const newBlock = (type: WebsiteBlockType): WebsitePageBlock => ({ id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type, heading: '', body: '', buttonLabel: type === 'Button' ? 'Learn more' : '', buttonUrl: type === 'Button' ? '/' : '' })

export function WebsitePages({createRequest=0}:{createRequest?:number}) {
  const { data, createWebsitePage, updateWebsitePageDraft, publishWebsitePage, discardWebsitePageDraft, restoreWebsitePageVersion, deleteWebsitePage } = useCRM()
  const [editing, setEditing] = useState<WebsitePage | null>(null)
  const [creating, setCreating] = useState(Boolean(createRequest))
  const [query, setQuery] = useState('')
  const pages = useMemo(() => data.websitePages.filter((page) => !query || `${page.name} ${page.path} ${page.draft.title}`.toLowerCase().includes(query.toLowerCase())), [data.websitePages, query])
  const edit = (page: WebsitePage) => setEditing(structuredClone(page))
  const preview = (page: WebsitePage) => window.open(`${page.path}${page.path.includes('?') ? '&' : '?'}preview=true`, '_blank', 'noopener,noreferrer')
  const copyBrief = async (page: WebsitePage) => {
    const prompt = `Update the Visit CRM website page with ID "${page.id}" at "${page.path}". Keep the existing structured page schema and return only the fields that should change. Current draft:\n${JSON.stringify(page.draft, null, 2)}`
    await navigator.clipboard.writeText(prompt)
  }
  return <div>
    <PageHeader eyebrow="Website CMS" title="Pages" description="Manage every website route as a private draft, preview it in context, then publish when approved." actions={<Button icon={Plus} onClick={() => setCreating(true)}>New landing page</Button>} />
    <section className="cms-summary-grid">
      <article><FileText size={18}/><span><strong>{data.websitePages.length}</strong><small>Managed pages</small></span></article>
      <article><Edit3 size={18}/><span><strong>{data.websitePages.filter((page) => page.status !== 'Published').length}</strong><small>Drafts awaiting publication</small></span></article>
      <article><History size={18}/><span><strong>{data.websitePages.reduce((total, page) => total + page.versions.length, 0)}</strong><small>Saved versions</small></span></article>
      <article><Sparkles size={18}/><span><strong>AI-ready</strong><small>Stable page and block IDs</small></span></article>
    </section>
    <section className="panel data-panel">
      <div className="table-toolbar"><div className="table-search"><FileText size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pages and routes..." /></div></div>
      <div className="table-scroll"><table className="data-table cms-page-table"><thead><tr><th>Page</th><th>Route</th><th>Template</th><th>Updated</th><th>Status</th><th>Actions</th></tr></thead><tbody>{pages.map((page) => <tr key={page.id}><td><div className="org-cell"><FileText size={18}/><div><strong>{page.name}</strong><small>{page.draft.title}</small></div></div></td><td><code>{page.path}</code></td><td>{page.template}</td><td>{page.updatedAt}</td><td><Badge>{page.status}</Badge>{page.published && <small className="published-version">Live v{page.version}</small>}</td><td><div className="event-row-actions">{page.status !== 'Published' && <Button size="sm" icon={Send} onClick={() => publishWebsitePage(page.id)}>Publish</Button>}<button className="icon-button" onClick={() => preview(page)} title="Preview draft" aria-label={`Preview ${page.name}`}><Eye size={16}/></button>{page.status === 'Draft changes' && <button className="icon-button" onClick={() => confirm(`Discard draft changes to ${page.name}?`) && discardWebsitePageDraft(page.id)} title="Discard draft" aria-label={`Discard draft changes to ${page.name}`}><RotateCcw size={16}/></button>}<button className="icon-button" onClick={() => void copyBrief(page)} title="Copy AI editing prompt" aria-label={`Copy AI editing prompt for ${page.name}`}><Sparkles size={16}/></button><button className="icon-button" onClick={() => edit(page)} title="Edit page" aria-label={`Edit ${page.name}`}><Edit3 size={16}/></button>{page.template === 'Landing page' && <button className="icon-button danger" onClick={() => confirm(`Delete ${page.name}?`) && deleteWebsitePage(page.id)} title="Delete page" aria-label={`Delete ${page.name}`}><Trash2 size={16}/></button>}</div></td></tr>)}</tbody></table></div>
    </section>
    {editing && <WebsitePageEditor page={editing} onClose={() => setEditing(null)} onSave={(draft) => { updateWebsitePageDraft(editing.id, draft); setEditing(null) }} onRestore={(version) => { restoreWebsitePageVersion(editing.id, version); setEditing(null) }} />}
    {creating && <NewPageModal existingPaths={data.websitePages.map((page) => page.path)} onClose={() => setCreating(false)} onCreate={(name, path, content) => { const page = createWebsitePage({ name, path, content }); setCreating(false); edit(page) }} />}
  </div>
}

function WebsitePageEditor({ page, onClose, onSave, onRestore }: { page: WebsitePage; onClose: () => void; onSave: (draft: WebsitePageContent) => void; onRestore: (version: number) => void }) {
  const [draft, setDraft] = useState<WebsitePageContent>(structuredClone(page.draft))
  const set = <K extends keyof WebsitePageContent>(key: K, value: WebsitePageContent[K]) => setDraft((current) => ({ ...current, [key]: value }))
  const updateBlock = (id: string, changes: Partial<WebsitePageBlock>) => set('blocks', draft.blocks.map((block) => block.id === id ? { ...block, ...changes } : block))
  const move = (index: number, direction: number) => { const next = [...draft.blocks]; const target = index + direction; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; set('blocks', next) }
  return <Modal title={`Edit ${page.name}`} subtitle={`${page.path} · Changes stay private until published.`} width="lg" onClose={onClose}>
    <form className="form-stack" onSubmit={(event) => { event.preventDefault(); onSave(draft) }}>
      <div className="form-grid two"><Field label="Eyebrow"><input value={draft.eyebrow} onChange={(event) => set('eyebrow', event.target.value)} /></Field><Field label="Navigation label"><input value={draft.navigationLabel} onChange={(event) => set('navigationLabel', event.target.value)} /></Field></div>
      <Field label="Page title"><input required value={draft.title} onChange={(event) => set('title', event.target.value)} /></Field>
      <Field label="Introduction"><textarea required rows={3} value={draft.description} onChange={(event) => set('description', event.target.value)} /></Field>
      <Field label="Hero image" hint="Use an image library key or a full image URL."><input value={draft.heroImage ?? ''} onChange={(event) => set('heroImage', event.target.value)} placeholder="hero" /></Field>
      <div className="form-grid two"><Field label="SEO title"><input maxLength={60} value={draft.metaTitle} onChange={(event) => set('metaTitle', event.target.value)} /></Field><Field label="SEO description"><textarea maxLength={160} rows={2} value={draft.metaDescription} onChange={(event) => set('metaDescription', event.target.value)} /></Field></div>
      <label className="cms-nav-toggle"><input type="checkbox" checked={draft.showInNavigation} onChange={(event) => set('showInNavigation', event.target.checked)} /><span><strong>Show in primary navigation</strong><small>The published label and route will be added to the visitor website menu.</small></span></label>
      <section className="cms-block-editor"><header><div><strong>Reusable page sections</strong><small>Blocks keep prompted changes predictable and design-safe.</small></div><div>{(['Text','Callout','Image','Button'] as WebsiteBlockType[]).map((type) => <button type="button" key={type} onClick={() => set('blocks', [...draft.blocks, newBlock(type)])}><Plus size={13}/>{type}</button>)}</div></header>{draft.blocks.length ? draft.blocks.map((block, index) => <article key={block.id}><header><span><code>{block.id}</code><Badge>{block.type}</Badge></span><div><button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move block up"><ArrowUp size={14}/></button><button type="button" onClick={() => move(index, 1)} disabled={index === draft.blocks.length - 1} aria-label="Move block down"><ArrowDown size={14}/></button><button type="button" className="danger" onClick={() => set('blocks', draft.blocks.filter((item) => item.id !== block.id))} aria-label="Delete block"><Trash2 size={14}/></button></div></header><Field label="Heading"><input value={block.heading} onChange={(event) => updateBlock(block.id, { heading: event.target.value })} /></Field><Field label="Body"><textarea rows={3} value={block.body} onChange={(event) => updateBlock(block.id, { body: event.target.value })} /></Field>{block.type === 'Image' && <Field label="Image URL or library key"><input value={block.image ?? ''} onChange={(event) => updateBlock(block.id, { image: event.target.value })} /></Field>}{block.type === 'Button' && <div className="form-grid two"><Field label="Button label"><input value={block.buttonLabel ?? ''} onChange={(event) => updateBlock(block.id, { buttonLabel: event.target.value })} /></Field><Field label="Button URL"><input value={block.buttonUrl ?? ''} onChange={(event) => updateBlock(block.id, { buttonUrl: event.target.value })} /></Field></div>}</article>) : <p className="cms-empty-blocks">No additional sections. The page’s functional template will appear below its introduction.</p>}</section>
      {page.versions.length > 0 && <section className="cms-version-history"><header><History size={16}/><strong>Version history</strong></header>{page.versions.slice(0, 5).map((version) => <div key={version.version}><span><strong>Version {version.version}</strong><small>{new Date(version.publishedAt).toLocaleString('en-GB')} · {version.publishedBy}</small></span>{version.version !== page.version && <button type="button" onClick={() => confirm(`Restore version ${version.version} as a new draft?`) && onRestore(version.version)}><RotateCcw size={13}/>Restore as draft</button>}</div>)}</section>}
      <div className="modal-actions"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit">Save draft</Button></div>
    </form>
  </Modal>
}

function NewPageModal({ existingPaths, onClose, onCreate }: { existingPaths: string[]; onClose: () => void; onCreate: (name: string, path: string, content: WebsitePageContent) => void }) {
  const [name, setName] = useState(''); const [path, setPath] = useState('/'); const [error, setError] = useState('')
  const submit = (event: FormEvent) => { event.preventDefault(); const normalized = `/${path.replace(/^\/+|\/+$/g, '')}`; if (existingPaths.includes(normalized)) { setError('That website route is already managed.'); return } const draft = blankContent(); draft.title = name; draft.metaTitle = name; draft.navigationLabel = name; onCreate(name, normalized, draft) }
  return <Modal title="New landing page" subtitle="Create a structured route that can be edited manually or through an AI change prompt." onClose={onClose}><form className="form-stack" onSubmit={submit}><Field label="Internal page name"><input autoFocus required value={name} onChange={(event) => setName(event.target.value)} /></Field><Field label="Website route"><input required value={path} onChange={(event) => setPath(event.target.value)} placeholder="/campaign" /></Field>{error && <p className="form-error" role="alert">{error}</p>}<div className="modal-actions"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit">Create draft</Button></div></form></Modal>
}
