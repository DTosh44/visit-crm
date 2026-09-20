import { CalendarDays, Check, ChevronDown, Circle, Filter, ListTodo, Plus, Search, UserRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useCRM } from '../store'
import type { CRMTask, Organisation } from '../types'
import { dateLabel } from '../utils'
import { Avatar, Badge, Button, PageHeader } from '../components/UI'

export function Tasks({ onAdd, openOrganisation }: { onAdd: () => void; openOrganisation: (organisation: Organisation) => void }) {
  const { data, toggleTask } = useCRM()
  const [query, setQuery] = useState('')
  const [assignee, setAssignee] = useState('All team')
  const [showCompleted, setShowCompleted] = useState(false)
  const tasks = useMemo(() => data.tasks.filter((task) => {
    const org = data.organisations.find((item) => item.id === task.organisationId)
    return (showCompleted || !task.completed) && (assignee === 'All team' || task.assignee === assignee) && (!query || [task.title, org?.name, task.category].join(' ').toLowerCase().includes(query.toLowerCase()))
  }).sort((a,b) => a.dueDate.localeCompare(b.dueDate)), [data.tasks, data.organisations, query, assignee, showCompleted])

  const overdue = tasks.filter((task) => !task.completed && task.dueDate < '2026-09-20')
  const today = tasks.filter((task) => !task.completed && task.dueDate === '2026-09-20')
  const upcoming = tasks.filter((task) => !task.completed && task.dueDate > '2026-09-20')
  const completed = tasks.filter((task) => task.completed)
  const groups: Array<{ title: string; tasks: CRMTask[]; tone?: string }> = [
    { title: 'Overdue', tasks: overdue, tone: 'red' }, { title: 'Today', tasks: today, tone: 'blue' }, { title: 'Upcoming', tasks: upcoming }, { title: 'Completed', tasks: completed, tone: 'green' },
  ]

  return (
    <div>
      <PageHeader eyebrow="Workspace" title="Tasks" description="Keep every follow-up, renewal and content action moving." actions={<Button icon={Plus} onClick={onAdd}>Add task</Button>} />
      <section className="task-summary">
        <div><span className="summary-icon coral"><ListTodo size={18} /></span><p><strong>{data.tasks.filter((item) => !item.completed).length}</strong><small>Open tasks</small></p></div>
        <div><span className="summary-dot red" /><p><strong>{data.tasks.filter((item) => !item.completed && item.dueDate < '2026-09-20').length}</strong><small>Overdue</small></p></div>
        <div><span className="summary-dot blue" /><p><strong>{data.tasks.filter((item) => !item.completed && item.dueDate === '2026-09-20').length}</strong><small>Due today</small></p></div>
        <div><span className="summary-dot green" /><p><strong>{data.tasks.filter((item) => item.completed).length}</strong><small>Completed</small></p></div>
      </section>
      <section className="panel tasks-panel">
        <div className="table-toolbar"><div className="table-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks..." /></div><div className="toolbar-filters"><label className="select-wrap"><UserRound size={15} /><select value={assignee} onChange={(event) => setAssignee(event.target.value)}><option>All team</option>{Array.from(new Set(data.tasks.map((item) => item.assignee))).map((name) => <option key={name}>{name}</option>)}</select><ChevronDown size={14} /></label><label className="completed-toggle"><input type="checkbox" checked={showCompleted} onChange={(event) => setShowCompleted(event.target.checked)} />Show completed</label><button className="filter-button"><Filter size={15} />Filters</button></div></div>
        <div className="task-groups">{groups.map((group) => group.tasks.length > 0 && <section className="task-group" key={group.title}>
          <header><div><i className={group.tone ?? ''} /><h3>{group.title}</h3><span>{group.tasks.length}</span></div><button><ChevronDown size={16} /></button></header>
          {group.tasks.map((task) => {
            const org = data.organisations.find((item) => item.id === task.organisationId)
            return <div className={`task-row ${task.completed ? 'completed' : ''}`} key={task.id}>
              <button className="task-check" onClick={() => toggleTask(task.id)}>{task.completed ? <Check size={14} /> : <Circle size={14} />}</button>
              <div className="task-title"><strong>{task.title}</strong>{org && <button onClick={() => openOrganisation(org)}>{org.name}</button>}</div>
              <Badge tone="grey">{task.category}</Badge>
              <span className="task-assignee"><Avatar name={task.assignee} size="sm" />{task.assignee}</span>
              <span className={`task-due ${dateLabel(task.dueDate).includes('overdue') ? 'overdue' : ''}`}><CalendarDays size={14} />{task.dueTime ? `${dateLabel(task.dueDate)}, ${task.dueTime}` : dateLabel(task.dueDate)}</span>
              <Badge>{task.priority}</Badge>
            </div>
          })}
        </section>)}</div>
        {!tasks.length && <div className="inline-empty">No tasks match these filters.</div>}
      </section>
    </div>
  )
}
