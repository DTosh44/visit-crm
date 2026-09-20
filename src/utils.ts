export const currency = {format(value:number){let code='GBP';try{const saved=JSON.parse(localStorage.getItem('visit-valechester-crm-v4')??'null') as {workspace?:{currency?:string}}|null;code=saved?.workspace?.currency??code}catch{/* Use the destination default. */}return new Intl.NumberFormat('en-GB',{style:'currency',currency:code,minimumFractionDigits:0,maximumFractionDigits:2}).format(value)}}

export function formatDate(value?: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!value) return 'Not set'
  const date = value.length === 10 ? new Date(`${value}T12:00:00`) : new Date(value)
  return new Intl.DateTimeFormat('en-GB', options).format(date)
}

export function timeAgo(value: string) {
  const date = new Date(value)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(value, { day: 'numeric', month: 'short' })
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase()
}

export function daysUntil(value: string) {
  if (!value) return null
  const day = new Date(`${value}T12:00:00`)
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  return Math.ceil((day.getTime() - today.getTime()) / 86400000)
}

export function dateLabel(value: string) {
  const diff = daysUntil(value)
  if (diff === null) return 'No date'
  if (diff < 0) return `${Math.abs(diff)}d overdue`
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return formatDate(value, { day: 'numeric', month: 'short' })
}

export function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}
