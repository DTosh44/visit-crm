import { X, type LucideIcon } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { classNames, initials } from '../utils'

export function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  icon?: LucideIcon
}) {
  return (
    <button className={classNames('button', `button-${variant}`, `button-${size}`, className)} {...props}>
      {Icon && <Icon size={size === 'sm' ? 15 : 17} strokeWidth={2} />}
      {children}
    </button>
  )
}

const toneByLabel: Record<string, string> = {
  Active: 'green', Published: 'green', Paid: 'green', Signed: 'green', Happy: 'green', Won: 'green',
  Renewing: 'amber', Sent: 'blue', Viewed: 'blue', 'In review': 'blue', OK: 'blue', Qualified: 'blue',
  Overdue: 'red', 'Needs attention': 'red', Declined: 'red', 'Changes requested': 'red', Expired: 'red',
  Draft: 'grey', Prospect: 'purple', Proposal: 'purple', Decision: 'amber', 'New lead': 'grey',
  'Free listing': 'teal', Void: 'grey', Lapsed: 'grey', High: 'red', Medium: 'amber', Low: 'grey',
}

export function Badge({ children, tone, dot = false }: { children: ReactNode; tone?: string; dot?: boolean }) {
  const label = String(children)
  return <span className={classNames('badge', `badge-${tone ?? toneByLabel[label] ?? 'grey'}`)}>{dot && <i />}{children}</span>
}

export function Avatar({ name, colour, size = 'md' }: { name: string; colour?: string; size?: 'sm' | 'md' | 'lg' }) {
  return <span className={classNames('avatar', `avatar-${size}`)} style={{ '--avatar-colour': colour ?? '#365c7d' } as React.CSSProperties}>{initials(name)}</span>
}

export function Progress({ value, colour }: { value: number; colour?: string }) {
  return (
    <div className="progress" aria-label={`${value}% complete`}>
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: colour }} />
    </div>
  )
}

export function Modal({ title, subtitle, onClose, children, width = 'md' }: {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  width?: 'sm' | 'md' | 'lg'
}) {
  return (
    <div className="overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={classNames('modal', `modal-${width}`)} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header">
          <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
          <button className="icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button>
        </header>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  )
}

export function Drawer({ title, subtitle, onClose, children, width = 'wide' }: {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  width?: 'standard' | 'wide'
}) {
  return (
    <div className="overlay drawer-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className={classNames('drawer', `drawer-${width}`)} role="dialog" aria-modal="true" aria-label={title}>
        <header className="drawer-header">
          <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
          <button className="icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button>
        </header>
        <div className="drawer-body">{children}</div>
      </aside>
    </div>
  )
}

export function PageHeader({ eyebrow, title, description, actions }: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>
}

export function EmptyState({ icon: Icon, title, description, action }: {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}) {
  return <div className="empty-state"><span className="empty-icon"><Icon size={23} /></span><h3>{title}</h3><p>{description}</p>{action}</div>
}

export function StatDelta({ value, label, positive = true }: { value: string; label: string; positive?: boolean }) {
  return <span className={classNames('stat-delta', positive ? 'positive' : 'negative')}><strong>{value}</strong> {label}</span>
}

export function Tabs<T extends string>({ items, active, onChange }: { items: T[]; active: T; onChange: (item: T) => void }) {
  return <div className="tabs" role="tablist">{items.map((item) => <button key={item} role="tab" aria-selected={active === item} className={active === item ? 'active' : ''} onClick={() => onChange(item)}>{item}</button>)}</div>
}
