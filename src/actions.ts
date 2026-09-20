export function downloadFile(filename: string, content: string, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function csvCell(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

export function downloadCsv(filename: string, rows: unknown[][]) {
  downloadFile(filename, rows.map((row) => row.map(csvCell).join(',')).join('\n'), 'text/csv;charset=utf-8')
}

export function openEmail(to: string | string[], subject: string, body = '') {
  const recipients = Array.isArray(to) ? to.filter(Boolean).join(',') : to
  window.location.href = `mailto:${recipients}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export function printHtml(title: string, html: string) {
  const popup = window.open('', '_blank', 'noopener,noreferrer')
  if (!popup) return false
  popup.document.write(`<!doctype html><html><head><title>${title}</title><style>body{font:15px system-ui;margin:40px;color:#22152b}h1{font-family:Georgia,serif}table{width:100%;border-collapse:collapse}td,th{padding:10px;border-bottom:1px solid #ddd;text-align:left}.total{font-size:20px;font-weight:700}</style></head><body>${html}</body></html>`)
  popup.document.close()
  popup.focus()
  popup.print()
  return true
}
