import { CalendarDays, Check, ChevronDown, Circle, Edit3, ListTodo, Plus, Search, Trash2, UserRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useCRM } from '../store'
import type { CRMTask, Organisation } from '../types'
import { dateLabel } from '../utils'
import { Avatar, Badge, Button, Field, Modal, PageHeader } from '../components/UI'

export function Tasks({ onAdd, openOrganisation }: { onAdd: () => void; openOrganisation: (organisation: Organisation) => void }) {
  const { data, toggleTask, updateTask, deleteTask } = useCRM()
  const [query, setQuery] = useState('')
  const [assignee, setAssignee] = useState('All team')
  const [showCompleted, setShowCompleted] = useState(false)
  const [priority,setPriority]=useState('All priorities')
  const [collapsed,setCollapsed]=useState<string[]>([])
  const [editing,setEditing]=useState<CRMTask|null>(null)
  const todayValue=new Date().toISOString().slice(0,10)
  const tasks = useMemo(() => data.tasks.filter((task) => {
    const org = data.organisations.find((item) => item.id === task.organisationId)
    return (showCompleted || !task.completed) && (assignee === 'All team' || task.assignee === assignee) && (priority==='All priorities'||task.priority===priority) && (!query || [task.title, org?.name, task.category].join(' ').toLowerCase().includes(query.toLowerCase()))
  }).sort((a,b) => a.dueDate.localeCompare(b.dueDate)), [data.tasks, data.organisations, query, assignee,priority,showCompleted])

  const overdue = tasks.filter((task) => !task.completed && task.dueDate < todayValue)
  const today = tasks.filter((task) => !task.completed && task.dueDate === todayValue)
  const upcoming = tasks.filter((task) => !task.completed && task.dueDate > todayValue)
  const completed = tasks.filter((task) => task.completed)
  const groups: Array<{ title: string; tasks: CRMTask[]; tone?: string }> = [
    { title: 'Overdue', tasks: overdue, tone: 'red' }, { title: 'Today', tasks: today, tone: 'blue' }, { title: 'Upcoming', tasks: upcoming }, { title: 'Completed', tasks: completed, tone: 'green' },
  ]

  return (
    <div>
      <PageHeader eyebrow="Workspace" title="Tasks" description="Keep every follow-up, renewal and content action moving." actions={<Button icon={Plus} onClick={onAdd}>Add task</Button>} />
      <section className="task-summary">
        <div><span className="summary-icon coral"><ListTodo size={18} /></span><p><strong>{data.tasks.filter((item) => !item.completed).length}</strong><small>Open tasks</small></p></div>
        <div><span className="summary-dot red" /><p><strong>{data.tasks.filter((item) => !item.completed && item.dueDate < todayValue).length}</strong><small>Overdue</small></p></div>
        <div><span className="summary-dot blue" /><p><strong>{data.tasks.filter((item) => !item.completed && item.dueDate === todayValue).length}</strong><small>Due today</small></p></div>
        <div><span className="summary-dot green" /><p><strong>{data.tasks.filter((item) => item.completed).length}</strong><small>Completed</small></p></div>
      </section>
      <section className="panel tasks-panel">
        <div className="table-toolbar"><div className="table-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks..." /></div><div className="toolbar-filters"><label className="select-wrap"><UserRound size={15} /><select value={assignee} onChange={(event) => setAssignee(event.target.value)}><option>All team</option>{Array.from(new Set(data.tasks.map((item) => item.assignee))).map((name) => <option key={name}>{name}</option>)}</select><ChevronDown size={14} /></label><label className="select-wrap"><select value={priority} onChange={(event)=>setPriority(event.target.value)}><option>All priorities</option><option>High</option><option>Medium</option><option>Low</option></select><ChevronDown size={14}/></label><label className="completed-toggle"><input type="checkbox" checked={showCompleted} onChange={(event) => setShowCompleted(event.target.checked)} />Show completed</label></div></div>
        <div className="task-groups">{groups.map((group) => group.tasks.length > 0 && <section className="task-group" key={group.title}>
          <header><div><i className={group.tone ?? ''} /><h3>{group.title}</h3><span>{group.tasks.length}</span></div><button onClick={()=>setCollapsed((items)=>items.includes(group.title)?items.filter((item)=>item!==group.title):[...items,group.title])} aria-label={`${collapsed.includes(group.title)?'Expand':'Collapse'} ${group.title}`}><ChevronDown size={16} /></button></header>
          {!collapsed.includes(group.title)&&group.tasks.map((task) => {
            const org = data.organisations.find((item) => item.id === task.organisationId)
            return <div className={`task-row ${task.completed ? 'completed' : ''}`} key={task.id}>
              <button className="task-check" onClick={() => toggleTask(task.id)} aria-label={`${task.completed?'Mark as incomplete':'Mark as complete'}: ${task.title}`}>{task.completed ? <Check size={14} /> : <Circle size={14} />}</button>
              <div className="task-title"><strong>{task.title}</strong>{org && <button onClick={() => openOrganisation(org)}>{org.name}</button>}</div>
              <Badge tone="grey">{task.category}</Badge>
              <span className="task-assignee"><Avatar name={task.assignee} size="sm" />{task.assignee}</span>
              <span className={`task-due ${dateLabel(task.dueDate).includes('overdue') ? 'overdue' : ''}`}><CalendarDays size={14} />{task.dueTime ? `${dateLabel(task.dueDate)}, ${task.dueTime}` : dateLabel(task.dueDate)}</span>
              <Badge>{task.priority}</Badge>
              <span className="event-row-actions"><button className="icon-button" onClick={()=>setEditing(task)} aria-label={`Edit ${task.title}`}><Edit3 size={15}/></button><button className="icon-button danger" onClick={()=>{if(window.confirm(`Delete ${task.title}?`))deleteTask(task.id)}} aria-label={`Delete ${task.title}`}><Trash2 size={15}/></button></span>
            </div>
          })}
        </section>)}</div>
        {!tasks.length && <div className="inline-empty">No tasks match these filters.</div>}
      </section>
      {editing&&<Modal title="Edit task" subtitle="Update ownership, timing and priority." onClose={()=>setEditing(null)} width="sm"><form className="form-stack" onSubmit={(event)=>{event.preventDefault();updateTask(editing.id,editing);setEditing(null)}}><Field label="Task"><input required value={editing.title} onChange={(e)=>setEditing({...editing,title:e.target.value})}/></Field><Field label="Organisation"><select value={editing.organisationId??''} onChange={(e)=>setEditing({...editing,organisationId:e.target.value||undefined})}><option value="">No organisation</option>{data.organisations.map((org)=><option value={org.id} key={org.id}>{org.name}</option>)}</select></Field><div className="form-grid two"><Field label="Due date"><input type="date" value={editing.dueDate} onChange={(e)=>setEditing({...editing,dueDate:e.target.value})}/></Field><Field label="Due time"><input type="time" value={editing.dueTime??''} onChange={(e)=>setEditing({...editing,dueTime:e.target.value})}/></Field><Field label="Priority"><select value={editing.priority} onChange={(e)=>setEditing({...editing,priority:e.target.value as CRMTask['priority']})}><option>High</option><option>Medium</option><option>Low</option></select></Field><Field label="Assignee"><input value={editing.assignee} onChange={(e)=>setEditing({...editing,assignee:e.target.value})}/></Field><Field label="Category"><select value={editing.category} onChange={(e)=>setEditing({...editing,category:e.target.value as CRMTask['category']})}><option>Follow-up</option><option>Renewal</option><option>Content</option><option>Finance</option><option>General</option></select></Field></div><div className="modal-actions"><Button type="button" variant="secondary" onClick={()=>setEditing(null)}>Cancel</Button><Button type="submit">Save task</Button></div></form></Modal>}
    </div>
  )
}
