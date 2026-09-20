import { CalendarDays, CircleDollarSign, Filter, GripVertical, MoreHorizontal, Plus, Search, TrendingUp, UserRound } from 'lucide-react'
import { useMemo, useState, type DragEvent } from 'react'
import { useCRM } from '../store'
import type { PipelineStage } from '../types'
import { currency, dateLabel } from '../utils'
import { Avatar, Badge, Button, PageHeader } from '../components/UI'

const stages: PipelineStage[] = ['New lead', 'Qualified', 'Proposal', 'Decision', 'Won']
const stageColours: Record<PipelineStage, string> = { 'New lead': '#6b7788', Qualified: '#3773b9', Proposal: '#6858ce', Decision: '#d28d30', Won: '#278362' }

export function Pipeline() {
  const { data, moveOpportunity } = useCRM()
  const [query, setQuery] = useState('')
  const [dragOver, setDragOver] = useState<PipelineStage | null>(null)
  const opportunities = useMemo(() => data.opportunities.filter((item) => item.organisationName.toLowerCase().includes(query.toLowerCase())), [data.opportunities, query])
  const totalValue = opportunities.filter((item) => item.stage !== 'Won').reduce((sum, item) => sum + item.value, 0)
  const weightedValue = opportunities.filter((item) => item.stage !== 'Won').reduce((sum, item) => sum + item.value * item.probability / 100, 0)

  const onDrop = (event: DragEvent, stage: PipelineStage) => {
    event.preventDefault()
    const id = event.dataTransfer.getData('opportunityId')
    if (id) moveOpportunity(id, stage)
    setDragOver(null)
  }

  return (
    <div className="pipeline-page">
      <PageHeader eyebrow="Sales" title="Membership pipeline" description="Move prospective members from first conversation to onboarding." actions={<><Button variant="secondary" icon={Filter}>Filters</Button><Button icon={Plus}>Add opportunity</Button></>} />

      <section className="pipeline-summary">
        <div><span className="summary-icon purple"><CircleDollarSign size={18} /></span><p><small>Open pipeline</small><strong>{currency.format(totalValue)}</strong></p></div>
        <div><span className="summary-icon blue"><TrendingUp size={18} /></span><p><small>Weighted value</small><strong>{currency.format(weightedValue)}</strong></p></div>
        <div><p><small>Live opportunities</small><strong>{opportunities.filter((item) => item.stage !== 'Won').length}</strong></p></div>
        <div><p><small>Won this month</small><strong>{currency.format(opportunities.filter((item) => item.stage === 'Won').reduce((sum, item) => sum + item.value, 0))}</strong></p></div>
        <div className="pipeline-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pipeline..." /></div>
      </section>

      <section className="kanban">
        {stages.map((stage) => {
          const items = opportunities.filter((item) => item.stage === stage)
          const value = items.reduce((sum, item) => sum + item.value, 0)
          return <div className={`kanban-column ${dragOver === stage ? 'drag-over' : ''}`} key={stage} onDragOver={(event) => { event.preventDefault(); setDragOver(stage) }} onDragLeave={() => setDragOver(null)} onDrop={(event) => onDrop(event, stage)}>
            <header style={{ '--stage-colour': stageColours[stage] } as React.CSSProperties}><div><i /><strong>{stage}</strong><span>{items.length}</span></div><small>{currency.format(value)}</small></header>
            <div className="kanban-cards">
              {items.map((item) => <article className="opportunity-card" key={item.id} draggable onDragStart={(event) => { event.dataTransfer.setData('opportunityId', item.id); event.dataTransfer.effectAllowed = 'move' }}>
                <div className="opportunity-top"><Badge tone={stage === 'Won' ? 'green' : 'grey'}>{item.proposedLevel}</Badge><button className="icon-button"><MoreHorizontal size={16} /></button></div>
                <h3>{item.organisationName}</h3>
                <p className="opportunity-contact"><UserRound size={14} />{item.contactName}</p>
                <div className="opportunity-value"><strong>{currency.format(item.value)}</strong><span>{item.probability}% probability</span></div>
                <div className="opportunity-progress"><span style={{ width: `${item.probability}%`, background: stageColours[stage] }} /></div>
                <div className="opportunity-action"><small>Next action</small><p>{item.nextAction}</p><span className={dateLabel(item.nextActionDate).includes('overdue') ? 'overdue' : ''}><CalendarDays size={13} />{dateLabel(item.nextActionDate)}</span></div>
                <footer><span className="source-tag">{item.source}</span><span><Avatar name={item.owner} size="sm" />{item.daysInStage}d</span><GripVertical size={16} /></footer>
              </article>)}
              {!items.length && <div className="kanban-empty"><p>Drop an opportunity here</p></div>}
              <button className="kanban-add"><Plus size={15} />Add opportunity</button>
            </div>
          </div>
        })}
      </section>
      <p className="drag-hint"><GripVertical size={14} />Drag cards between stages to update the sales pipeline.</p>
    </div>
  )
}
