import { History, RotateCcw } from 'lucide-react'
import { changedFieldSummary, revisionActionLabel } from '../cmsPages'
import type { CmsPageRevision } from '../types'

export function PageRevisionHistory({ revisions, onRestore, busy = false }: {
  revisions: CmsPageRevision[]
  onRestore: (revisionId: number) => void
  busy?: boolean
}) {
  return <section className="cms-version-history" aria-label="Page change history">
    <header><History size={16}/><strong>Change history</strong></header>
    {revisions.length === 0 ? <p className="cms-empty-blocks">No recorded changes yet.</p> : revisions.map((revision) =>
      <div key={revision.id}>
        <span>
          <strong>{revisionActionLabel(revision.action)}{revision.action === 'published' || revision.action === 'imported_published' ? ` · v${revision.version}` : ''}</strong>
          <small>{new Date(revision.createdAt).toLocaleString('en-GB')} · {revision.actorName}</small>
          {revision.changedFields.length > 0 && <small>Changed: {changedFieldSummary(revision.changedFields)}</small>}
        </span>
        {revision.snapshot && (revision.action === 'published' || revision.action === 'imported_published') &&
          <button type="button" disabled={busy} onClick={() => onRestore(revision.id)}><RotateCcw size={13}/>Restore as draft</button>}
      </div>)}
  </section>
}
