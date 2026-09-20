import { tenant } from '../tenant'

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={compact ? 'vale-mark compact' : 'vale-mark'} aria-hidden="true">
      <svg viewBox="0 0 48 48" role="img">
        <path d="M8 8h9l7 21L31 8h9L27 40h-7L8 8Z" fill="currentColor" />
        <path d="M12 34c7-5 16-6 25-2" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </span>
  )
}

export function BrandLogo({ inverse = false, compact = false }: { inverse?: boolean; compact?: boolean }) {
  return (
    <span className={`vale-logo${inverse ? ' inverse' : ''}${compact ? ' compact' : ''}`}>
      <BrandMark compact={compact} />
      {!compact && <span className="vale-wordmark"><small>Visit</small><strong>{tenant.shortName}</strong></span>}
    </span>
  )
}
