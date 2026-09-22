import { X, type LucideIcon } from 'lucide-react'
import { useEffect, useId, useRef, type ButtonHTMLAttributes, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import { classNames, initials } from '../utils'

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function useDialogAccessibility<T extends HTMLElement>(onClose: () => void, active = true) {
  const ref = useRef<T>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!active) return
    const node = ref.current
    if (!node) return

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const getFocusable = () => Array.from(node.querySelectorAll<HTMLElement>(focusableSelector))
      .filter((element) => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true')

    const frame = window.requestAnimationFrame(() => {
      if (node.contains(document.activeElement)) return
      const first = getFocusable()[0]
      if (first) first.focus()
      else node.focus()
    })

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = getFocusable()
      if (!focusable.length) {
        event.preventDefault()
        node.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    node.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      node.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      if (previousFocus?.isConnected) window.requestAnimationFrame(() => previousFocus.focus())
    }
  }, [active])

  return ref
}

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
      {Icon && <Icon size={size === 'sm' ? 15 : 17} strokeWidth={2} aria-hidden="true" />}
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
  return <span className={classNames('badge', `badge-${tone ?? toneByLabel[label] ?? 'grey'}`)}>{dot && <i aria-hidden="true" />}{children}</span>
}

export function Avatar({ name, colour, size = 'md' }: { name: string; colour?: string; size?: 'sm' | 'md' | 'lg' }) {
  return <span aria-hidden="true" className={classNames('avatar', `avatar-${size}`)} style={{ '--avatar-colour': colour ?? '#365c7d' } as React.CSSProperties}>{initials(name)}</span>
}

export function Progress({ value, colour }: { value: number; colour?: string }) {
  const boundedValue = Math.max(0, Math.min(100, value))
  return (
    <div className="progress" role="progressbar" aria-label="Completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(boundedValue)} aria-valuetext={`${Math.round(boundedValue)}% complete`}>
      <span style={{ width: `${boundedValue}%`, background: colour }} />
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
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useDialogAccessibility<HTMLElement>(onClose)
  return (
    <div className="overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} tabIndex={-1} className={classNames('modal', `modal-${width}`)} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={subtitle ? descriptionId : undefined}>
        <header className="modal-header">
          <div><h2 id={titleId}>{title}</h2>{subtitle && <p id={descriptionId}>{subtitle}</p>}</div>
          <button type="button" className="icon-button" onClick={onClose} aria-label={`Close ${title}`}><X size={19} aria-hidden="true" /></button>
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
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useDialogAccessibility<HTMLElement>(onClose)
  return (
    <div className="overlay drawer-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside ref={dialogRef} tabIndex={-1} className={classNames('drawer', `drawer-${width}`)} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={subtitle ? descriptionId : undefined}>
        <header className="drawer-header">
          <div><h2 id={titleId}>{title}</h2>{subtitle && <p id={descriptionId}>{subtitle}</p>}</div>
          <button type="button" className="icon-button" onClick={onClose} aria-label={`Close ${title}`}><X size={19} aria-hidden="true" /></button>
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
  return <div className="empty-state"><span className="empty-icon"><Icon size={23} aria-hidden="true" /></span><h3>{title}</h3><p>{description}</p>{action}</div>
}

export function StatDelta({ value, label, positive = true }: { value: string; label: string; positive?: boolean }) {
  return <span className={classNames('stat-delta', positive ? 'positive' : 'negative')}><strong>{value}</strong> {label}</span>
}

export function Tabs<T extends string>({ items, active, onChange }: { items: T[]; active: T; onChange: (item: T) => void }) {
  const tabsRef = useRef<HTMLDivElement>(null)
  const onKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index
    if (event.key === 'ArrowRight') next = (index + 1) % items.length
    else if (event.key === 'ArrowLeft') next = (index - 1 + items.length) % items.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = items.length - 1
    else return
    event.preventDefault()
    onChange(items[next])
    window.requestAnimationFrame(() => tabsRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus())
  }
  return <div className="tabs" role="tablist" aria-label="Sections" ref={tabsRef}>{items.map((item, index) => <button type="button" key={item} role="tab" aria-selected={active === item} tabIndex={active === item ? 0 : -1} className={active === item ? 'active' : ''} onKeyDown={(event) => onKeyDown(event, index)} onClick={() => onChange(item)}>{item}</button>)}</div>
}
