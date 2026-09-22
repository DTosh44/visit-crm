import { CalendarDays, CheckCircle2, Edit3, MapPin, Plus, Search, Trash2, X } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { supabase, useAuth } from '../auth'
import { tenant } from '../tenant'
import { imageLibrary } from '../siteData'
import { useCRM } from '../store'
import type { DestinationEvent, EventDraft, EventFormat, EventRecurrence, EventStatus } from '../types'
import { Badge, Button, EmptyState, PageHeader } from '../components/UI'

const categories = ['Music & Shows','Festivals & Seasonal','Food & Drink','Family','Arts & Culture','Talks & Workshops','Tours & Heritage','Outdoors & Sport','Wellbeing','Social']
const formats: EventFormat[] = ['One-off and short run','Ongoing events','Online events']
const blankEvent = (submittedBy: string): EventDraft => ({
  title:'', category:'Festivals & Seasonal', format:'One-off and short run', description:'', startDate:new Date().toISOString().slice(0,10), endDate:new Date().toISOString().slice(0,10), startTime:'10:00', endTime:'16:00',
  venueName:'', address:'', town:'Valechester', postcode:'', price:'Free', bookingUrl:'', contactName:'', contactEmail:'',
  image:'theatre', accessibility:'', status:'Draft', submittedBy, recurrence:'None', recurrenceUntil:'',
})

function EventEditor({ event, onClose }: { event?: DestinationEvent; onClose: () => void }) {
  const { data, createEvent, updateEvent } = useCRM()
  const { user } = useAuth()
  const [draft, setDraft] = useState<EventDraft>(event ? { ...event } : blankEvent(user?.name ?? 'Destination team'))
  const set = <K extends keyof EventDraft>(key: K, value: EventDraft[K]) => setDraft((current) => ({ ...current, [key]: value }))
  const [error,setError]=useState('')
  const submit = (formEvent: FormEvent) => { formEvent.preventDefault();setError('');if(draft.endDate<draft.startDate){setError('The end date must be on or after the start date.');return}if(draft.endDate===draft.startDate&&draft.endTime<=draft.startTime){setError('The end time must be after the start time.');return}if((draft.recurrence??'None')!=='None'&&draft.recurrenceUntil&&draft.recurrenceUntil<draft.startDate){setError('The repeat-until date must be on or after the start date.');return}if(!event&&data.events.some((item)=>item.title.toLowerCase()===draft.title.toLowerCase()&&item.startDate===draft.startDate&&item.venueName.toLowerCase()===draft.venueName.toLowerCase())){setError('A matching event already exists for this date and venue.');return} if (event) updateEvent(event.id, draft); else createEvent(draft); onClose() }
  const uploadImage=async(file?:File)=>{if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type))return;if(supabase){const safe=file.name.toLowerCase().replace(/[^a-z0-9._-]+/g,'-');const path=`${tenant.id}/${event?.id??'draft'}/${Date.now()}-${safe}`;const {error:uploadError}=await supabase.storage.from('event-media').upload(path,file,{contentType:file.type});if(!uploadError){set('image',supabase.storage.from('event-media').getPublicUrl(path).data.publicUrl);return}}const reader=new FileReader();reader.onload=()=>set('image',String(reader.result));reader.readAsDataURL(file)}
  return <div className="modal-backdrop" role="presentation"><form className="event-editor-modal" onSubmit={submit} role="dialog" aria-modal="true" aria-label={event ? `Edit ${event.title}` : 'Add event'}>
    <header><div><span className="eyebrow">Website content</span><h2>{event ? 'Edit event' : 'Add event'}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close"><X size={20}/></button></header>
    <div className="event-form-grid">
      <label className="event-field-wide">Event title<input required value={draft.title} onChange={(e)=>set('title',e.target.value)}/></label>
      <label>Category<select value={draft.category} onChange={(e)=>set('category',e.target.value)}>{categories.map((item)=><option key={item}>{item}</option>)}</select></label>
      <label>Event format<select value={draft.format} onChange={(e)=>set('format',e.target.value as EventFormat)}>{formats.map((item)=><option key={item}>{item}</option>)}</select></label>
      <label>Status<select value={draft.status} onChange={(e)=>set('status',e.target.value as EventStatus)}><option>Draft</option><option>In review</option><option>Changes requested</option><option>Withdrawn</option><option>Published</option></select></label>
      <label className="event-field-wide">Description<textarea required rows={4} value={draft.description} onChange={(e)=>set('description',e.target.value)}/></label>
      <label>Start date<input required type="date" value={draft.startDate} onChange={(e)=>set('startDate',e.target.value)}/></label>
      <label>End date<input required type="date" value={draft.endDate} onChange={(e)=>set('endDate',e.target.value)}/></label>
      <label>Start time<input required type="time" value={draft.startTime} onChange={(e)=>set('startTime',e.target.value)}/></label>
      <label>End time<input required type="time" value={draft.endTime} onChange={(e)=>set('endTime',e.target.value)}/></label>
      <label>Repeats<select value={draft.recurrence??'None'} onChange={(e)=>set('recurrence',e.target.value as EventRecurrence)}><option>None</option><option>Daily</option><option>Weekly</option><option>Monthly</option></select></label>
      {(draft.recurrence??'None')!=='None'&&<label>Repeat until<input required type="date" min={draft.startDate} value={draft.recurrenceUntil??draft.endDate} onChange={(e)=>set('recurrenceUntil',e.target.value)}/></label>}
      <label className="event-field-wide">Venue name<input required value={draft.venueName} onChange={(e)=>set('venueName',e.target.value)} placeholder="Any venue — membership is not required"/></label>
      <label>Town or area<input required value={draft.town} onChange={(e)=>set('town',e.target.value)}/></label>
      <label>Postcode<input required value={draft.postcode} onChange={(e)=>set('postcode',e.target.value)}/></label>
      <label className="event-field-wide">Address<input required value={draft.address} onChange={(e)=>set('address',e.target.value)}/></label>
      <label>Ticket information<input required value={draft.price} onChange={(e)=>set('price',e.target.value)} placeholder="Free or From £10"/></label>
      <label>Booking URL<input type="url" value={draft.bookingUrl} onChange={(e)=>set('bookingUrl',e.target.value)}/></label>
      <label>Organiser name<input required value={draft.contactName} onChange={(e)=>set('contactName',e.target.value)}/></label>
      <label>Organiser email<input required type="email" value={draft.contactEmail} onChange={(e)=>set('contactEmail',e.target.value)}/></label>
      <label>Image style<select value={draft.image.startsWith('data:')?'uploaded':draft.image} onChange={(e)=>e.target.value!=='uploaded'&&set('image',e.target.value)}>{Object.keys(imageLibrary).filter((key)=>key!=='hero').map((key)=><option key={key}>{key}</option>)}{draft.image.startsWith('data:')&&<option value="uploaded">Uploaded image</option>}</select></label>
      <label>Upload event image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e)=>uploadImage(e.target.files?.[0])}/></label>
      <label className="event-field-wide">Accessibility information<textarea rows={3} value={draft.accessibility} onChange={(e)=>set('accessibility',e.target.value)}/></label>
      <label className="event-field-wide">Moderation note<textarea rows={3} value={draft.moderationNote??''} onChange={(e)=>set('moderationNote',e.target.value)} placeholder="Feedback for the organiser or an internal approval note"/></label>
    </div>
    {error&&<p className="form-error" role="alert">{error}</p>}<footer><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit">Save event</Button></footer>
  </form></div>
}

export function Events({createRequest=0}:{createRequest?:number}) {
  const { data, publishEvent, deleteEvent } = useCRM()
  const [query,setQuery]=useState(''); const [status,setStatus]=useState('All'); const [editing,setEditing]=useState<DestinationEvent|null|undefined>(createRequest?null:undefined)
  const filtered=useMemo(()=>data.events.filter((event)=>{
    const matchesQuery=!query.trim()||[event.title,event.category,event.venueName,event.town,event.submittedBy].join(' ').toLowerCase().includes(query.toLowerCase())
    return matchesQuery&&(status==='All'||event.status===status)
  }),[data.events,query,status])
  const published=data.events.filter((event)=>event.status==='Published').length
  const review=data.events.filter((event)=>event.status==='In review').length
  return <div>
    <PageHeader eyebrow="Website" title="Events" description="Review, edit and publish events from members, independent venues and community organisers." actions={<Button icon={Plus} onClick={()=>setEditing(null)}>Add event</Button>}/>
    <section className="summary-strip event-summary"><div><CalendarDays size={18}/><p><strong>{data.events.length}</strong><small>Total events</small></p></div><div><p><strong>{published}</strong><small>Published</small></p></div><div><p><strong>{review}</strong><small>Awaiting review</small></p></div><div><p><strong>{new Set(data.events.map((event)=>event.venueName)).size}</strong><small>Venues</small></p></div></section>
    <section className="panel data-panel events-panel">
      <div className="table-toolbar"><div className="table-search"><Search size={17}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search events, venues or organisers..."/></div><label className="select-wrap"><select aria-label="Filter events by status" value={status} onChange={(e)=>setStatus(e.target.value)}><option>All</option><option>Published</option><option>Draft</option><option>In review</option><option>Changes requested</option><option>Withdrawn</option></select></label></div>
      {filtered.length ? <div className="table-scroll"><table className="data-table events-table"><thead><tr><th>Event</th><th>Date</th><th>Venue</th><th>Submitted by</th><th>Status</th><th/></tr></thead><tbody>{filtered.map((event)=><tr key={event.id}>
        <td><div className="event-name-cell"><img src={imageLibrary[event.image]??event.image??imageLibrary.theatre} alt=""/><div><strong>{event.title}</strong><small>{event.category}</small></div></div></td>
        <td><strong>{new Date(`${event.startDate}T12:00:00`).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</strong><small>{event.startTime}–{event.endTime}</small></td>
        <td><strong>{event.venueName}</strong><small><MapPin size={12}/>{event.town}</small></td>
        <td>{event.submittedBy}</td><td><Badge>{event.status}</Badge></td>
        <td><div className="event-row-actions">{event.status!=='Published'&&<button className="publish-icon" onClick={()=>publishEvent(event.id)} title="Publish"><CheckCircle2 size={17}/></button>}<button className="icon-button" onClick={()=>setEditing(event)} aria-label={`Edit ${event.title}`}><Edit3 size={17}/></button><button className="icon-button danger" onClick={()=>{if(window.confirm(`Delete ${event.title}?`))deleteEvent(event.id)}} aria-label={`Delete ${event.title}`}><Trash2 size={17}/></button></div></td>
      </tr>)}</tbody></table></div>:<EmptyState icon={Search} title="No events found" description="Try changing the search or status filter."/>}
      <footer className="table-footer"><span>Showing {filtered.length} of {data.events.length} events</span></footer>
    </section>
    {editing!==undefined&&<EventEditor event={editing??undefined} onClose={()=>setEditing(undefined)}/>} 
  </div>
}
