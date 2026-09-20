import {
  ArrowRight, BarChart3, Building2, CalendarClock, Check, CircleAlert, CircleDollarSign,
  Eye, FileCheck2, FilePenLine, Mail, MoreHorizontal, PlayCircle, PoundSterling, Sparkles,
  TrendingUp, UserPlus, UsersRound,
} from 'lucide-react'
import { useMemo } from 'react'
import { useCRM } from '../store'
import type { Organisation, SocialMetric, ViewKey } from '../types'
import { currency, dateLabel, formatDate, timeAgo } from '../utils'
import { Avatar, Badge, Button, Progress, StatDelta } from '../components/UI'
import { useAuth } from '../auth'
import { useFeatures } from '../features'

const activityIcons = {
  note: UserPlus,
  email: Mail,
  invoice: PoundSterling,
  listing: FilePenLine,
  agreement: FileCheck2,
  task: Check,
}

const socialMetricPresentation: Record<SocialMetric['id'], { icon: typeof UsersRound; className: string }> = {
  followers: { icon: UsersRound, className: 'followers' },
  reach: { icon: Eye, className: 'reach' },
  videoViews: { icon: PlayCircle, className: 'video' },
  engagements: { icon: BarChart3, className: 'engage' },
}

export function Dashboard({ navigate, openOrganisation }: { navigate: (view: ViewKey) => void; openOrganisation: (org: Organisation) => void }) {
  const { data, toggleTask } = useCRM()
  const { user } = useAuth()
  const { features } = useFeatures()
  const openTasks = data.tasks.filter((task) => !task.completed)
  const overdueInvoices = data.invoices.filter((invoice) => invoice.status === 'Overdue')
  const unpaidTotal = data.invoices.filter((invoice) => invoice.status === 'Sent' || invoice.status === 'Overdue').reduce((total, invoice) => total + invoice.total, 0)
  const renewals = data.organisations.filter((org) => org.status === 'Renewing' || org.renewalDate.startsWith('2026-09') || org.renewalDate.startsWith('2026-10')).slice(0, 4)
  const membershipValue = data.organisations.filter((org) => org.status === 'Active' || org.status === 'Renewing').reduce((total, org) => total + org.annualValue, 0)
  const [firstName] = (user?.name ?? 'there').split(' ')
  const tierColours: Record<string, string> = { 'Tier 1': '#a86b78', 'Tier 2': '#7a9a83', 'Tier 3': '#f0785e', 'Tier 4': '#6d294f' }
  const tiers = ['Tier 1','Tier 2','Tier 3','Tier 4'].map((name) => {
    const level = data.levels.find((item) => item.name === name)
    return { name, members: level?.members ?? 0, colour: tierColours[name] }
  })
  const tierTotal = tiers.reduce((sum, tier) => sum + tier.members, 0)
  const socialMetrics = data.socialMetrics ?? []
  const socialSource = socialMetrics[0]?.source ?? 'Connected social accounts'
  const socialPeriod = socialMetrics[0]?.period ?? 'No reporting period available'

  const pipelineValue = useMemo(() => data.opportunities.filter((opp) => opp.stage !== 'Won').reduce((total, opp) => total + opp.value, 0), [data.opportunities])

  return (
    <div className="dashboard-page">
      <section className="dashboard-welcome">
        <div>
          <span className="eyebrow">Sunday, 20 September</span>
          <h1>Good morning, {firstName}</h1>
          <p>Here’s what needs your attention across Visit Valechester.</p>
        </div>
        <Button icon={Sparkles} variant="secondary" onClick={() => navigate('tasks')}>Plan my day</Button>
      </section>

      <section className="attention-strip">
        <div className="attention-title"><span><CircleAlert size={18} /></span><div><strong>Today’s focus</strong><small>{openTasks.length} open actions across the team</small></div></div>
        <button onClick={() => navigate('billing')}><strong>{overdueInvoices.length}</strong><span>overdue invoices</span><ArrowRight size={15} /></button>
        <button onClick={() => navigate('memberships')}><strong>{renewals.length}</strong><span>renewals approaching</span><ArrowRight size={15} /></button>
        <button onClick={() => navigate('listings')}><strong>{data.listings.filter((listing) => listing.status === 'In review' || listing.status === 'Changes requested').length}</strong><span>content reviews</span><ArrowRight size={15} /></button>
      </section>

      <section className="stat-grid">
        <article className="stat-card">
          <div className="stat-card-top"><span className="stat-icon purple"><Building2 size={19} /></span><button aria-label="More options"><MoreHorizontal size={18} /></button></div>
          <p>Active members</p><h2>{tierTotal}</h2><StatDelta value="+4.2%" label="vs last year" />
        </article>
        <article className="stat-card">
          <div className="stat-card-top"><span className="stat-icon green"><CircleDollarSign size={19} /></span><button aria-label="More options"><MoreHorizontal size={18} /></button></div>
          <p>Membership income</p><h2>£74.2k</h2><StatDelta value="£5.8k" label="to target" />
        </article>
        <article className="stat-card">
          <div className="stat-card-top"><span className="stat-icon amber"><CalendarClock size={19} /></span><button aria-label="More options"><MoreHorizontal size={18} /></button></div>
          <p>Open pipeline</p><h2>{currency.format(pipelineValue)}</h2><StatDelta value="8" label="live opportunities" />
        </article>
        <article className="stat-card">
          <div className="stat-card-top"><span className="stat-icon coral"><PoundSterling size={19} /></span><button aria-label="More options"><MoreHorizontal size={18} /></button></div>
          <p>Outstanding</p><h2>{currency.format(unpaidTotal)}</h2><StatDelta value={`${overdueInvoices.length} overdue`} label="need attention" positive={false} />
        </article>
      </section>

      {(features.memberships || features.socialInsights) && <section className={`dashboard-insights-grid${features.memberships && features.socialInsights ? '' : ' single'}`}>
        {features.memberships && <article className="panel tier-overview">
          <header className="panel-header"><div><h3>Members by tier</h3><p>{tierTotal} paying members across four configurable levels</p></div><button className="text-button" onClick={() => navigate('memberships')}>Manage tiers <ArrowRight size={14} /></button></header>
          <div className="tier-stack" aria-label="Membership tier proportions">{tiers.map((tier) => <span key={tier.name} style={{ width: `${tierTotal ? (tier.members / tierTotal) * 100 : 0}%`, background: tier.colour }} title={`${tier.name}: ${tier.members}`} />)}</div>
          <div className="tier-counts">{tiers.map((tier) => <button key={tier.name} onClick={() => navigate('memberships')}><i style={{ background: tier.colour }} /><span><small>{tier.name}</small><strong>{tier.members}</strong><em>members</em></span></button>)}</div>
        </article>}

        {features.socialInsights && <article className="panel social-overview">
          <header className="panel-header"><div><h3>Social performance</h3><p>{socialSource} figures used as demo data</p></div><span className="data-source-badge"><i />Imported</span></header>
          <div className="social-metrics">
            {socialMetrics.map((metric) => {
              const presentation = socialMetricPresentation[metric.id]
              const Icon = presentation.icon
              return <div key={metric.id}><span className={`social-metric-icon ${presentation.className}`}><Icon size={17} /></span><p><small>{metric.label}</small><strong>{metric.displayValue}</strong><em>{metric.context}</em></p></div>
            })}
          </div>
          <footer className="social-footer"><span>Reporting period: {socialPeriod}</span><button onClick={() => navigate('settings')}>Manage data sources <ArrowRight size={13} /></button></footer>
        </article>}
      </section>}

      <section className="dashboard-grid dashboard-grid-main">
        <article className="panel revenue-panel">
          <header className="panel-header">
            <div><h3>Membership income</h3><p>Performance across the membership year</p></div>
            <select aria-label="Chart period"><option>2026/27</option><option>2025/26</option></select>
          </header>
          <div className="revenue-summary"><div><small>Confirmed</small><strong>£74,210</strong></div><div><small>Target</small><strong>£80,000</strong></div><div className="target-status"><TrendingUp size={16} /><span>92.8% of annual target</span></div></div>
          <div className="chart-wrap" aria-label="Cumulative membership income chart">
            <div className="chart-y"><span>£80k</span><span>£60k</span><span>£40k</span><span>£20k</span><span>£0</span></div>
            <svg viewBox="0 0 720 210" preserveAspectRatio="none" role="img">
              <defs>
                <linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#5c57d6" stopOpacity=".24"/><stop offset="100%" stopColor="#5c57d6" stopOpacity="0"/></linearGradient>
              </defs>
              {[15,60,105,150,195].map((y) => <line key={y} x1="0" y1={y} x2="720" y2={y} stroke="#e9edf4" strokeWidth="1" />)}
              <path d="M0 175 C58 168 76 148 126 142 S208 126 250 111 S330 100 376 84 S455 66 502 56 S582 45 626 31 S685 25 720 19 L720 210 L0 210 Z" fill="url(#revenueFill)" />
              <path d="M0 175 C58 168 76 148 126 142 S208 126 250 111 S330 100 376 84 S455 66 502 56 S582 45 626 31 S685 25 720 19" fill="none" stroke="#5c57d6" strokeWidth="3" strokeLinecap="round" />
              <path d="M0 165 L90 145 L180 126 L270 107 L360 88 L450 69 L540 50 L630 31 L720 12" fill="none" stroke="#b9c0cf" strokeWidth="2" strokeDasharray="6 7" />
              <circle cx="720" cy="19" r="5" fill="#fff" stroke="#5c57d6" strokeWidth="3" />
            </svg>
            <div className="chart-x"><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span><span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span></div>
          </div>
          <div className="chart-legend"><span><i className="solid" />Confirmed income</span><span><i className="dashed" />Target trajectory</span></div>
        </article>

        <article className="panel task-panel">
          <header className="panel-header"><div><h3>My tasks</h3><p>Next actions and follow-ups</p></div><button className="text-button" onClick={() => navigate('tasks')}>View all <ArrowRight size={14} /></button></header>
          <div className="dashboard-tasks">
            {openTasks.slice(0, 5).map((task) => {
              const org = data.organisations.find((item) => item.id === task.organisationId)
              return <div className="dashboard-task" key={task.id}>
                <button className="task-check" onClick={() => toggleTask(task.id)} aria-label={`Complete ${task.title}`}><Check size={13} /></button>
                <div><strong>{task.title}</strong><span>{org?.name ?? task.category}</span></div>
                <small className={dateLabel(task.dueDate).includes('overdue') ? 'overdue' : ''}>{dateLabel(task.dueDate)}</small>
              </div>
            })}
          </div>
          <footer className="panel-footer"><button onClick={() => navigate('tasks')}><Check size={14} /> {openTasks.length} tasks remaining</button></footer>
        </article>
      </section>

      <section className="dashboard-grid dashboard-grid-lower">
        <article className="panel renewals-panel">
          <header className="panel-header"><div><h3>Upcoming renewals</h3><p>Members requiring action soon</p></div><button className="text-button" onClick={() => navigate('memberships')}>View all <ArrowRight size={14} /></button></header>
          <div className="compact-table">
            {renewals.map((org) => (
              <button className="compact-row" key={org.id} onClick={() => openOrganisation(org)}>
                <Avatar name={org.name} colour={org.colour} size="sm" />
                <span className="compact-main"><strong>{org.name}</strong><small>{org.tier}</small></span>
                <span className="compact-date"><strong>{formatDate(org.renewalDate, { day: 'numeric', month: 'short' })}</strong><small>{org.status}</small></span>
                <Badge>{org.health}</Badge>
              </button>
            ))}
          </div>
        </article>

        <article className="panel activity-panel">
          <header className="panel-header"><div><h3>Recent activity</h3><p>The latest across your workspace</p></div><button className="icon-button" aria-label="More"><MoreHorizontal size={18} /></button></header>
          <div className="activity-list">
            {data.activities.slice(0, 5).map((activity) => {
              const Icon = activityIcons[activity.type]
              const org = data.organisations.find((item) => item.id === activity.organisationId)
              return <div className="activity-item" key={activity.id}>
                <span className={`activity-icon ${activity.type}`}><Icon size={15} /></span>
                <div><strong>{activity.title}</strong><p>{activity.detail}</p><small>{org?.name ? `${org.name} · ` : ''}{activity.user} · {timeAgo(activity.timestamp)}</small></div>
              </div>
            })}
          </div>
        </article>

        <article className="panel health-panel">
          <header className="panel-header"><div><h3>Member health</h3><p>Relationship pulse across members</p></div></header>
          <div className="health-ring-wrap">
            <div className="health-ring"><div><strong>83%</strong><span>positive</span></div></div>
            <div className="health-legend"><span><i className="happy" /><strong>Happy</strong><em>77</em></span><span><i className="okay" /><strong>OK</strong><em>17</em></span><span><i className="attention" /><strong>Needs attention</strong><em>5</em></span></div>
          </div>
          <div className="health-action"><div><CircleAlert size={17} /><span><strong>5 members</strong> need attention</span></div><button onClick={() => navigate('organisations')}>Review <ArrowRight size={14} /></button></div>
        </article>
      </section>

      <section className="dashboard-progress panel">
        <div><span className="stat-icon purple"><TrendingUp size={18} /></span><div><strong>Annual membership target</strong><small>{currency.format(membershipValue)} represented in this demo workspace</small></div></div>
        <Progress value={92.8} colour="#5c57d6" />
        <strong>£74.2k / £80k</strong>
      </section>
    </div>
  )
}
