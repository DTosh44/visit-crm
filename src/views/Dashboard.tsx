import {
  ArrowRight, Banknote, BedDouble, Building2, CalendarClock, Check, CircleAlert,
  CircleDollarSign, Eye, GripVertical, MapPinned, MoreHorizontal, PoundSterling,
  Settings2, Sparkles, Star, TrendingUp, UserPlus, UsersRound, WalletCards, X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useCRM } from '../store'
import type { Organisation, ViewKey } from '../types'
import { currency, dateLabel, formatDate, timeAgo } from '../utils'
import { Avatar, Badge, Button } from '../components/UI'
import { supabase, useAuth } from '../auth'

type WidgetId = 'active-members'|'new-members'|'membership-income'|'visitor-volume'|'visitor-spend'|'overnight-stays'|'pipeline'|'outstanding'|'bank-balance'|'member-tiers'|'review-trends'|'renewals'|'tasks'|'activity'
const DEFAULT_WIDGETS: WidgetId[] = ['active-members','new-members','membership-income','visitor-volume','visitor-spend','overnight-stays','pipeline','outstanding','bank-balance','member-tiers','review-trends','renewals','tasks','activity']
const widgetNames: Record<WidgetId,string> = {
  'active-members':'Active members','new-members':'New members','membership-income':'Membership income','visitor-volume':'Visitor volume','visitor-spend':'Visitor spend','overnight-stays':'Overnight stays','pipeline':'Open pipeline','outstanding':'Outstanding invoices','bank-balance':'Bank balance','member-tiers':'Members by tier','review-trends':'Visitor review trends','renewals':'Upcoming renewals','tasks':'My tasks','activity':'Recent activity'
}
const metricWidgets: WidgetId[] = ['active-members','new-members','membership-income','visitor-volume','visitor-spend','overnight-stays','pipeline','outstanding','bank-balance']

function loadWidgets(userId: string) { try { const saved=localStorage.getItem(`vv-dashboard-${userId}`); return saved ? JSON.parse(saved) as WidgetId[] : DEFAULT_WIDGETS } catch { return DEFAULT_WIDGETS } }

export function Dashboard({ navigate, openOrganisation }: { navigate: (view: ViewKey) => void; openOrganisation: (org: Organisation) => void }) {
  const { data, toggleTask } = useCRM(); const { user } = useAuth()
  const [widgets,setWidgets] = useState<WidgetId[]>(() => loadWidgets(user?.id ?? 'default'))
  const bankConnected = localStorage.getItem('vv-bank-connected') === 'true'
  const [configure,setConfigure] = useState(false); const [saved,setSaved] = useState(false); const [dragging,setDragging] = useState<WidgetId|null>(null)
  const openTasks=data.tasks.filter((task)=>!task.completed); const overdueInvoices=data.invoices.filter((i)=>i.status==='Overdue')
  const unpaidTotal=data.invoices.filter((i)=>i.status==='Sent'||i.status==='Overdue').reduce((t,i)=>t+i.total,0)
  const renewals=data.organisations.filter((org)=>org.status==='Renewing'||org.renewalDate.startsWith('2026-09')||org.renewalDate.startsWith('2026-10')).slice(0,4)
  const membershipValue=data.organisations.filter((org)=>org.status==='Active'||org.status==='Renewing').reduce((t,o)=>t+o.annualValue,0)
  const activeMembers=data.organisations.filter((org)=>(org.status==='Active'||org.status==='Renewing')&&org.tier!=='Free Listing').length
  const newMembers=data.organisations.filter((org)=>org.membershipStart>='2026-06-20').length
  const pipelineValue=useMemo(()=>data.opportunities.filter((o)=>o.stage!=='Won').reduce((t,o)=>t+o.value,0),[data.opportunities])
  const [firstName]=(user?.name??'there').split(' ')
  useEffect(()=>{ if(!supabase||!user)return; void supabase.from('user_preferences').select('dashboard_widgets').eq('user_id',user.id).eq('tenant_id',user.tenantId).maybeSingle().then(({data:preferences})=>{if(preferences?.dashboard_widgets)setWidgets(preferences.dashboard_widgets as WidgetId[])}) },[user])
  const saveLayout=()=>{localStorage.setItem(`vv-dashboard-${user?.id??'default'}`,JSON.stringify(widgets));if(supabase&&user)void supabase.from('user_preferences').upsert({user_id:user.id,tenant_id:user.tenantId,dashboard_widgets:widgets,updated_at:new Date().toISOString()},{onConflict:'user_id,tenant_id'});setSaved(true);setTimeout(()=>setSaved(false),1600)}
  const dropOn=(target:WidgetId)=>{if(!dragging||dragging===target)return;setWidgets((current)=>{const next=current.filter((id)=>id!==dragging);next.splice(next.indexOf(target),0,dragging);return next});setDragging(null)}
  const toggleWidget=(id:WidgetId)=>setWidgets((current)=>current.includes(id)?current.filter((item)=>item!==id):[...current,id])

  const metric=(id:WidgetId)=>{
    const map: Record<WidgetId,{value:string;detail:string;icon:typeof Building2;tone:string}> = {
      'active-members':{value:String(activeMembers),detail:'current paid members',icon:Building2,tone:'purple'},
      'new-members':{value:String(newMembers),detail:'joined in the last 3 months',icon:UserPlus,tone:'green'},
      'membership-income':{value:currency.format(membershipValue),detail:'92.8% of annual target',icon:CircleDollarSign,tone:'green'},
      'visitor-volume':{value:'5.8m',detail:'+3.6% year on year',icon:UsersRound,tone:'purple'},
      'visitor-spend':{value:'£412m',detail:'£71 average day spend',icon:Banknote,tone:'green'},
      'overnight-stays':{value:'1.24m',detail:'2.3 nights average stay',icon:BedDouble,tone:'amber'},
      'pipeline':{value:currency.format(pipelineValue),detail:`${data.opportunities.filter((o)=>o.stage!=='Won').length} live opportunities`,icon:CalendarClock,tone:'amber'},
      'outstanding':{value:currency.format(unpaidTotal),detail:`${overdueInvoices.length} invoices overdue`,icon:PoundSterling,tone:'coral'},
      'bank-balance':{value:bankConnected?'£186,420':'Not connected',detail:bankConnected?'Available balance · refreshed 8 mins ago':'Connect an Open Banking provider',icon:WalletCards,tone:'purple'},
      'member-tiers':{value:'',detail:'',icon:Building2,tone:'purple'},'review-trends':{value:'',detail:'',icon:Star,tone:'amber'},'renewals':{value:'',detail:'',icon:CalendarClock,tone:'amber'},'tasks':{value:'',detail:'',icon:Check,tone:'green'},'activity':{value:'',detail:'',icon:Eye,tone:'purple'}
    }; const item=map[id], Icon=item.icon
    return <article className="dashboard-widget metric-widget"><div className="widget-top"><span className={`stat-icon ${item.tone}`}><Icon size={19}/></span><GripVertical size={17}/></div><p>{widgetNames[id]}</p><h2>{item.value}</h2><small>{item.detail}</small>{id==='bank-balance'&&<button className="widget-link" onClick={()=>navigate('settings')}>{bankConnected?'Manage connection':'Set up connection'} <ArrowRight size={13}/></button>}</article>
  }
  const panel=(id:WidgetId)=>{
    if(id==='member-tiers') return <article className="dashboard-widget panel wide-widget"><div className="widget-heading"><div><h3>Members by level</h3><p>Paying membership mix</p></div><GripVertical size={17}/></div><div className="tier-counts compact">{data.levels.filter((level)=>['level-001','level-002','level-003','level-004'].includes(level.id)).map((level)=><button key={level.id} onClick={()=>navigate('memberships')}><i/><span><small>{level.name}</small><strong>{level.members}</strong><em>members</em></span></button>)}</div></article>
    if(id==='review-trends') return <article className="dashboard-widget panel wide-widget"><div className="widget-heading"><div><h3>Visitor review trends</h3><p>Recurring themes across published listings</p></div><GripVertical size={17}/></div><div className="review-trend-list"><span><Star size={15}/><strong>Friendly teams</strong><em>mentioned 482 times</em></span><span><Star size={15}/><strong>Beautiful grounds</strong><em>up 18%</em></span><span><CircleAlert size={15}/><strong>Parking clarity</strong><em>needs attention at 3 venues</em></span></div><button className="widget-link" onClick={()=>navigate('listings')}>Review taxonomy and evidence <ArrowRight size={13}/></button></article>
    if(id==='renewals') return <article className="dashboard-widget panel"><div className="widget-heading"><div><h3>Upcoming renewals</h3><p>Members requiring action</p></div><GripVertical size={17}/></div><div className="compact-table">{renewals.map((org)=><button className="compact-row" key={org.id} onClick={()=>openOrganisation(org)}><Avatar name={org.name} colour={org.colour} size="sm"/><span className="compact-main"><strong>{org.name}</strong><small>{org.tier}</small></span><span className="compact-date"><strong>{formatDate(org.renewalDate,{day:'numeric',month:'short'})}</strong><small>{org.status}</small></span></button>)}</div></article>
    if(id==='tasks') return <article className="dashboard-widget panel"><div className="widget-heading"><div><h3>My tasks</h3><p>Next actions and follow-ups</p></div><GripVertical size={17}/></div><div className="dashboard-tasks">{openTasks.slice(0,5).map((task)=><div className="dashboard-task" key={task.id}><button className="task-check" onClick={()=>toggleTask(task.id)}><Check size={13}/></button><div><strong>{task.title}</strong><span>{task.category}</span></div><small className={dateLabel(task.dueDate).includes('overdue')?'overdue':''}>{dateLabel(task.dueDate)}</small></div>)}</div></article>
    return <article className="dashboard-widget panel"><div className="widget-heading"><div><h3>Recent activity</h3><p>The latest across the workspace</p></div><GripVertical size={17}/></div><div className="activity-list">{data.activities.slice(0,5).map((activity)=><div className="activity-item" key={activity.id}><span className={`activity-icon ${activity.type}`}><Eye size={15}/></span><div><strong>{activity.title}</strong><p>{activity.detail}</p><small>{activity.user} · {timeAgo(activity.timestamp)}</small></div></div>)}</div></article>
  }

  return <div className="dashboard-page configurable-dashboard">
    <section className="dashboard-welcome"><div><span className="eyebrow">Sunday, 20 September</span><h1>Good morning, {firstName}</h1><p>Your membership, visitor economy and team priorities in one place.</p></div><div className="dashboard-actions"><Button icon={Sparkles} variant="secondary" onClick={()=>navigate('tasks')}>Plan my day</Button><Button icon={Settings2} onClick={()=>setConfigure(true)}>Customise dashboard</Button></div></section>
    <section className="attention-strip"><div className="attention-title"><span><CircleAlert size={18}/></span><div><strong>Today’s focus</strong><small>{openTasks.length} open actions across the team</small></div></div><button onClick={()=>navigate('billing')}><strong>{overdueInvoices.length}</strong><span>overdue invoices</span><ArrowRight size={15}/></button><button onClick={()=>navigate('memberships')}><strong>{renewals.length}</strong><span>renewals approaching</span><ArrowRight size={15}/></button><button onClick={()=>navigate('events')}><strong>{data.events.filter((event)=>event.status==='In review'||event.status==='Changes requested').length}</strong><span>event reviews</span><ArrowRight size={15}/></button></section>
    <section className="dashboard-widget-grid">{widgets.map((id)=><div key={id} draggable onDragStart={()=>setDragging(id)} onDragOver={(e)=>e.preventDefault()} onDrop={()=>dropOn(id)} className={metricWidgets.includes(id)?'metric-slot':'panel-slot'}>{metricWidgets.includes(id)?metric(id):panel(id)}</div>)}</section>
    {configure&&<div className="dashboard-config-overlay" onMouseDown={(e)=>e.target===e.currentTarget&&setConfigure(false)}><section className="dashboard-config"><header><div><h2>Customise your dashboard</h2><p>Choose the information you need, then drag cards into your preferred order. This layout is saved to your account.</p></div><button onClick={()=>setConfigure(false)}><X size={20}/></button></header><div className="widget-picker">{(Object.keys(widgetNames) as WidgetId[]).map((id)=><label key={id} className={widgets.includes(id)?'selected':''}><input type="checkbox" checked={widgets.includes(id)} onChange={()=>toggleWidget(id)}/><span><Check size={13}/></span>{widgetNames[id]}</label>)}</div><div className="layout-order"><h3>Display order</h3>{widgets.map((id)=><div draggable onDragStart={()=>setDragging(id)} onDragOver={(e)=>e.preventDefault()} onDrop={()=>dropOn(id)} key={id}><GripVertical size={16}/><span>{widgetNames[id]}</span></div>)}</div><footer><button className="reset-layout" onClick={()=>setWidgets(DEFAULT_WIDGETS)}>Restore recommended layout</button><Button onClick={()=>{saveLayout();setTimeout(()=>setConfigure(false),500)}}>{saved?'Saved':'Save my dashboard'}</Button></footer></section></div>}
  </div>
}
