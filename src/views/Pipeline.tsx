import { CalendarDays, CircleDollarSign, Edit3, GripVertical, Plus, Search, Trash2, TrendingUp, UserRound } from 'lucide-react'
import { useMemo, useState, type DragEvent } from 'react'
import { useCRM } from '../store'
import type { Opportunity, PipelineStage } from '../types'
import { currency, dateLabel } from '../utils'
import { Avatar, Badge, Button, Field, Modal, PageHeader } from '../components/UI'

const stages: PipelineStage[] = ['New lead', 'Qualified', 'Proposal', 'Decision', 'Won']
const stageColours: Record<PipelineStage, string> = { 'New lead': '#6b7788', Qualified: '#3773b9', Proposal: '#6858ce', Decision: '#d28d30', Won: '#278362' }

export function Pipeline({createRequest=0}:{createRequest?:number}) {
  const { data, moveOpportunity, addOpportunity, updateOpportunity, deleteOpportunity } = useCRM()
  const [query, setQuery] = useState('')
  const [dragOver, setDragOver] = useState<PipelineStage | null>(null)
  const [adding,setAdding]=useState(Boolean(createRequest))
  const [editingId,setEditingId]=useState<string|null>(null)
  const [draft,setDraft]=useState({organisationName:'',contactName:'',stage:'New lead' as PipelineStage,proposedLevel:data.levels[0]?.name??'',value:data.levels[0]?.price??0,probability:15,source:'Website enquiry',nextAction:'Arrange discovery call',nextActionDate:new Date().toISOString().slice(0,10),owner:'Morgan Lee'})
  const edit=(item:Opportunity)=>{setDraft({organisationName:item.organisationName,contactName:item.contactName,stage:item.stage,proposedLevel:item.proposedLevel,value:item.value,probability:item.probability,source:item.source,nextAction:item.nextAction,nextActionDate:item.nextActionDate,owner:item.owner});setEditingId(item.id);setAdding(true)}
  const close=()=>{setAdding(false);setEditingId(null)}
  const opportunities = useMemo(() => data.opportunities.filter((item) => [item.organisationName,item.contactName,item.source,item.owner,item.proposedLevel].join(' ').toLowerCase().includes(query.toLowerCase())), [data.opportunities, query])
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
      <PageHeader eyebrow="Sales" title="Membership pipeline" description="Move prospective members from first conversation to onboarding." actions={<Button icon={Plus} onClick={()=>setAdding(true)}>Add opportunity</Button>} />

      <section className="pipeline-summary">
        <div><span className="summary-icon purple"><CircleDollarSign size={18} /></span><p><small>Open pipeline</small><strong>{currency.format(totalValue)}</strong></p></div>
        <div><span className="summary-icon blue"><TrendingUp size={18} /></span><p><small>Weighted value</small><strong>{currency.format(weightedValue)}</strong></p></div>
        <div><p><small>Live opportunities</small><strong>{opportunities.filter((item) => item.stage !== 'Won').length}</strong></p></div>
        <div><p><small>Won this month</small><strong>{currency.format(opportunities.filter((item) => item.stage === 'Won').reduce((sum, item) => sum + item.value, 0))}</strong></p></div>
        <div className="pipeline-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search membership pipeline" placeholder="Search pipeline..." /></div>
      </section>

      <section className="kanban">
        {stages.map((stage) => {
          const items = opportunities.filter((item) => item.stage === stage)
          const value = items.reduce((sum, item) => sum + item.value, 0)
          return <div className={`kanban-column ${dragOver === stage ? 'drag-over' : ''}`} key={stage} onDragOver={(event) => { event.preventDefault(); setDragOver(stage) }} onDragLeave={() => setDragOver(null)} onDrop={(event) => onDrop(event, stage)}>
            <header style={{ '--stage-colour': stageColours[stage] } as React.CSSProperties}><div><i /><strong>{stage}</strong><span>{items.length}</span></div><small>{currency.format(value)}</small></header>
            <div className="kanban-cards">
              {items.map((item) => <article className="opportunity-card" key={item.id} draggable onDragStart={(event) => { event.dataTransfer.setData('opportunityId', item.id); event.dataTransfer.effectAllowed = 'move' }}>
                <div className="opportunity-top"><Badge tone={stage === 'Won' ? 'green' : 'grey'}>{item.proposedLevel}</Badge><span><button className="icon-button" onClick={()=>edit(item)} aria-label={`Edit ${item.organisationName}`}><Edit3 size={14}/></button><button className="icon-button danger" onClick={()=>{if(window.confirm(`Delete ${item.organisationName} from the pipeline?`))deleteOpportunity(item.id)}} aria-label={`Delete ${item.organisationName}`}><Trash2 size={14}/></button></span></div>
                <h3>{item.organisationName}</h3>
                <p className="opportunity-contact"><UserRound size={14} />{item.contactName}</p>
                <div className="opportunity-value"><strong>{currency.format(item.value)}</strong><span>{item.probability}% probability</span></div>
                <div className="opportunity-progress" role="progressbar" aria-label={`${item.organisationName} probability`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.probability}><span style={{ width: `${item.probability}%`, background: stageColours[stage] }} /></div>
                <div className="opportunity-action"><small>Next action</small><p>{item.nextAction}</p><span className={dateLabel(item.nextActionDate).includes('overdue') ? 'overdue' : ''}><CalendarDays size={13} />{dateLabel(item.nextActionDate)}</span></div>
                <footer><span className="source-tag">{item.source}</span><span><Avatar name={item.owner} size="sm" />{item.stageEnteredAt?Math.max(0,Math.floor((Date.now()-new Date(item.stageEnteredAt).getTime())/86400000)):item.daysInStage}d</span><GripVertical size={16} /></footer>
              </article>)}
              {!items.length && <div className="kanban-empty"><p>Drop an opportunity here</p></div>}
              <button className="kanban-add" onClick={()=>{setDraft((current)=>({...current,stage}));setAdding(true)}}><Plus size={15} />Add opportunity</button>
            </div>
          </div>
        })}
      </section>
      <p className="drag-hint"><GripVertical size={14} />Drag cards between stages, or choose Edit on a card and change its Stage without dragging.</p>
      {adding&&<Modal title={editingId?'Edit opportunity':'Add opportunity'} subtitle="Maintain the value, stage, owner and next action." onClose={close}><form className="form-stack" onSubmit={(event)=>{event.preventDefault();if(editingId)updateOpportunity(editingId,draft);else addOpportunity(draft);close()}}><div className="form-grid two"><Field label="Organisation"><input required autoFocus value={draft.organisationName} onChange={(e)=>setDraft({...draft,organisationName:e.target.value})}/></Field><Field label="Contact"><input required value={draft.contactName} onChange={(e)=>setDraft({...draft,contactName:e.target.value})}/></Field><Field label="Stage"><select value={draft.stage} onChange={(e)=>setDraft({...draft,stage:e.target.value as PipelineStage})}>{stages.map((stage)=><option key={stage}>{stage}</option>)}</select></Field><Field label="Proposed membership"><select value={draft.proposedLevel} onChange={(e)=>{const level=data.levels.find((item)=>item.name===e.target.value);setDraft({...draft,proposedLevel:e.target.value,value:level?.price??draft.value})}}>{data.levels.filter((level)=>level.active).map((level)=><option key={level.id}>{level.name}</option>)}</select></Field><Field label="Value"><input type="number" min="0" value={draft.value} onChange={(e)=>setDraft({...draft,value:Number(e.target.value)})}/></Field><Field label="Probability"><input type="number" min="0" max="100" value={draft.probability} onChange={(e)=>setDraft({...draft,probability:Number(e.target.value)})}/></Field><Field label="Next action"><input value={draft.nextAction} onChange={(e)=>setDraft({...draft,nextAction:e.target.value})}/></Field><Field label="Next action date"><input type="date" value={draft.nextActionDate} onChange={(e)=>setDraft({...draft,nextActionDate:e.target.value})}/></Field></div><div className="modal-actions"><Button type="button" variant="secondary" onClick={close}>Cancel</Button><Button type="submit">{editingId?'Save changes':'Add opportunity'}</Button></div></form></Modal>}
    </div>
  )
}
