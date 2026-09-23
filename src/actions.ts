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

export function parseCsv(input:string){
  const rows:string[][]=[];let row:string[]=[];let value='';let quoted=false
  for(let index=0;index<input.length;index++){const char=input[index];const next=input[index+1];if(char==='"'){if(quoted&&next==='"'){value+='"';index++}else quoted=!quoted}else if(char===','&&!quoted){row.push(value);value=''}else if((char==='\n'||char==='\r')&&!quoted){if(char==='\r'&&next==='\n')index++;row.push(value);if(row.some((cell)=>cell.trim()))rows.push(row);row=[];value=''}else value+=char}
  row.push(value);if(row.some((cell)=>cell.trim()))rows.push(row)
  return rows
}

export function openEmail(to: string | string[], subject: string, body = '') {
  const recipients = Array.isArray(to) ? to.filter(Boolean).join(',') : to
  window.location.href = `mailto:${recipients}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)
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

export function downloadCalendarEvent(event:{id:string;title:string;description:string;startDate:string;endDate:string;startTime:string;endTime:string;venueName:string;address:string;town:string}){
  const stamp=(date:string,time:string)=>`${date.replaceAll('-','')}T${time.replace(':','')}00`
  const escape=(value:string)=>value.replaceAll('\\','\\\\').replaceAll(',','\\,').replaceAll(';','\\;').replaceAll('\n','\\n')
  downloadFile(`${event.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}.ics`,['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Visit Destination//Events//EN','BEGIN:VEVENT',`UID:${event.id}@destination`,`DTSTAMP:${stamp(new Date().toISOString().slice(0,10),new Date().toTimeString().slice(0,5))}Z`,`DTSTART:${stamp(event.startDate,event.startTime)}`,`DTEND:${stamp(event.endDate,event.endTime)}`,`SUMMARY:${escape(event.title)}`,`DESCRIPTION:${escape(event.description)}`,`LOCATION:${escape(`${event.venueName}, ${event.address}, ${event.town}`)}`,'END:VEVENT','END:VCALENDAR'].join('\r\n'),'text/calendar;charset=utf-8')
}
