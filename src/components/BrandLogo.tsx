import { useCRM } from '../store'

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
  const {data}=useCRM()
  const words=data.workspace.destinationName.trim().split(/\s+/)
  const prefix=words[0]?.toLowerCase()==='visit'?'Visit':''
  const name=prefix?words.slice(1).join(' '):data.workspace.destinationName
  return (
    <span className={`vale-logo${inverse ? ' inverse' : ''}${compact ? ' compact' : ''}`} role="img" aria-label={data.workspace.destinationName}>
      <BrandMark compact={compact} />
      {!compact && <span className="vale-wordmark"><small>{prefix}</small><strong>{name}</strong></span>}
    </span>
  )
}

export function ProductLogo({ inverse = false }: { inverse?: boolean }) {
  return <span className={`made-logo${inverse ? ' inverse' : ''}`} role="img" aria-label="VisitMade">
    <span className="made-mark" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M9 36V12h7l8 12 8-12h7v24h-7V23l-8 12-8-12v13H9Z" fill="currentColor"/><path d="M12 39c8-4 16-4 24 0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg></span>
    <span className="made-wordmark"><small>Visit</small><strong>Made</strong></span>
  </span>
}
