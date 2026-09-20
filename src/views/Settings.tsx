import { BellRing, Building2, Check, CreditCard, Database, Globe2, KeyRound, Palette, RotateCcw, ShieldCheck, SlidersHorizontal, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { useCRM } from '../store'
import { Button, Field, PageHeader } from '../components/UI'
import { tenant, type FeatureKey } from '../tenant'
import { useFeatures } from '../features'
import { demoUsers, useAuth } from '../auth'

const sections = [
  { id: 'workspace', label: 'Workspace', icon: Building2 },
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'modules', label: 'Modules & features', icon: SlidersHorizontal },
  { id: 'billing', label: 'Billing & invoices', icon: CreditCard },
  { id: 'reminders', label: 'Reminder schedule', icon: BellRing },
  { id: 'website', label: 'Website connection', icon: Globe2 },
  { id: 'team', label: 'Team & permissions', icon: UsersRound },
  { id: 'security', label: 'Security', icon: ShieldCheck },
]

const moduleGroups: Array<{ title: string; description: string; modules: Array<{ key: FeatureKey; name: string; detail: string; available: boolean }> }> = [
  { title: 'Core workspace', description: 'The everyday tools used by the destination team.', modules: [
    { key: 'organisations', name: 'Organisations & contacts', detail: 'Member, partner and prospect records with multiple contacts.', available: true },
    { key: 'tasks', name: 'Tasks & follow-ups', detail: 'Shared next actions, deadlines and ownership.', available: true },
    { key: 'salesPipeline', name: 'Sales pipeline', detail: 'Lead stages, values, sources and next actions.', available: true },
  ] },
  { title: 'Membership & finance', description: 'Enable these for membership-funded destinations.', modules: [
    { key: 'memberships', name: 'Membership', detail: 'Custom tiers, benefits and benefit usage.', available: true },
    { key: 'agreements', name: 'Agreements', detail: 'Issue and retain membership contracts.', available: true },
    { key: 'billing', name: 'Billing', detail: 'Invoices, manual payment tracking and reminders.', available: true },
    { key: 'businessPortal', name: 'Business portal', detail: 'Let partners manage their own contacts and submissions.', available: false },
  ] },
  { title: 'Website & content', description: 'Choose what powers the public visitor experience.', modules: [
    { key: 'publicWebsite', name: 'Destination website', detail: 'Public website using approved CRM content.', available: true },
    { key: 'listings', name: 'Listings CMS', detail: 'Edit, approve and publish business listings.', available: true },
    { key: 'events', name: 'What’s on', detail: 'Calendar, event listings and date-led discovery.', available: true },
    { key: 'itineraries', name: 'Guides & itineraries', detail: 'Trip ideas, trails and itinerary content.', available: true },
    { key: 'aiWebsiteEditor', name: 'Prompt-based website editor', detail: 'Preview and publish main-site changes through ChatGPT.', available: false },
  ] },
  { title: 'Specialist modules', description: 'Add these when they match the destination strategy.', modules: [
    { key: 'socialInsights', name: 'Social performance', detail: 'Manual or connected channel metrics on the dashboard.', available: true },
    { key: 'travelTrade', name: 'Travel trade', detail: 'Buyer database, FAMs, trade activity and follow-up.', available: false },
    { key: 'reviewIntelligence', name: 'Review intelligence', detail: 'Searchable visitor themes, sentiment and evidence tags.', available: false },
  ] },
]

export function Settings() {
  const { resetDemo } = useCRM()
  const { features, setFeature } = useFeatures()
  const { productionAuth } = useAuth()
  const [section, setSection] = useState('workspace')
  const [saved, setSaved] = useState(false)
  const save = () => { setSaved(true); window.setTimeout(() => setSaved(false), 1800) }

  return (
    <div>
      <PageHeader eyebrow="Manage" title="Settings" description="Configure this destination workspace without changing another customer’s setup." />
      <div className="settings-layout">
        <nav className="settings-nav">{sections.map(({ id, label, icon: Icon }) => <button key={id} className={section === id ? 'active' : ''} onClick={() => setSection(id)}><Icon size={17} />{label}</button>)}</nav>
        <section className="panel settings-content">
          {section === 'workspace' && <>
            <header><div><h2>Workspace details</h2><p>Core details used across the CRM, portal and destination website.</p></div></header>
            <div className="settings-form"><Field label="Destination name"><input defaultValue={tenant.name} /></Field><div className="form-grid two"><Field label="Default timezone"><select defaultValue="Europe/London"><option>Europe/London</option></select></Field><Field label="Financial year starts"><select defaultValue="September"><option>September</option><option>April</option><option>January</option></select></Field></div><div className="form-grid two"><Field label="Membership year starts"><select defaultValue="1 September"><option>1 September</option></select></Field><Field label="Default currency"><select defaultValue="GBP"><option>GBP — Pound sterling</option></select></Field></div><Field label="Workspace address"><textarea rows={3} defaultValue={`${tenant.legalName}, ${tenant.location}`} /></Field></div>
          </>}
          {section === 'branding' && <><header><div><h2>Branding</h2><p>One identity across the website, CRM, invoices, agreements and partner portal.</p></div></header><div className="brand-upload"><span>VV</span><div><strong>Destination logo</strong><p>SVG preferred. Automatically adapted for light and dark surfaces.</p><Button variant="secondary" size="sm">Replace logo</Button></div></div><div className="settings-form"><div className="form-grid two"><Field label="Primary colour"><div className="colour-input"><input type="color" defaultValue={tenant.colours.primary} /><input defaultValue={tenant.colours.primary.toUpperCase()} /></div></Field><Field label="Accent colour"><div className="colour-input"><input type="color" defaultValue={tenant.colours.accent} /><input defaultValue={tenant.colours.accent.toUpperCase()} /></div></Field></div><Field label="Brand strapline"><input defaultValue={tenant.strapline} /></Field></div></>}
          {section === 'modules' && <><header><div><h2>Modules & features</h2><p>Configure one product around this destination. Disabled modules disappear from navigation and public pages.</p></div><span className="configuration-badge">Configuration, not custom code</span></header><div className="module-groups">{moduleGroups.map((group) => <section key={group.title}><div><h3>{group.title}</h3><p>{group.description}</p></div><div>{group.modules.map((module) => <label className={`module-toggle${!module.available ? ' unavailable' : ''}`} key={module.key}><span><strong>{module.name}{!module.available && <em>Roadmap</em>}</strong><small>{module.detail}</small></span><input type="checkbox" checked={features[module.key]} disabled={!module.available} onChange={(event) => setFeature(module.key, event.target.checked)} /><i><b /></i></label>)}</div></section>)}</div></>}
          {section === 'billing' && <><header><div><h2>Billing & invoices</h2><p>Invoice identity, payment instructions and tax defaults.</p></div></header><div className="settings-form"><div className="form-grid two"><Field label="Invoice prefix"><input defaultValue="VV-2026-" /></Field><Field label="Payment terms"><select defaultValue="30"><option value="14">14 days</option><option value="30">30 days</option></select></Field></div><Field label="Payment instructions"><textarea rows={4} defaultValue={'Please pay by bank transfer, quoting the invoice number as your reference.\nBank details: Shown securely on issued invoices.'} /></Field><label className="settings-checkbox"><input type="checkbox" defaultChecked /><span><strong>Apply 20% VAT by default</strong><small>Can be changed on individual invoice lines.</small></span></label></div></>}
          {section === 'reminders' && <><header><div><h2>Automatic reminder schedule</h2><p>Reminders run only on successfully sent, unpaid invoices.</p></div></header><div className="reminder-settings"><div><span>1</span><Field label="First reminder"><div className="suffix-input"><input type="number" defaultValue="7" /><em>days overdue</em></div></Field><label><input type="checkbox" defaultChecked />Enabled</label></div><div><span>2</span><Field label="Second reminder"><div className="suffix-input"><input type="number" defaultValue="14" /><em>days overdue</em></div></Field><label><input type="checkbox" defaultChecked />Enabled</label></div><div><span>3</span><Field label="Final reminder"><div className="suffix-input"><input type="number" defaultValue="28" /><em>days overdue</em></div></Field><label><input type="checkbox" defaultChecked />Enabled</label></div></div><div className="settings-note"><BellRing size={17} /><p>Payment status and reminder pauses are checked again immediately before each message is sent.</p></div></>}
          {section === 'website' && <><header><div><h2>Website connection</h2><p>Approved listing data flows to the public site; private CRM fields never do.</p></div></header><div className="connection-card"><span className="connection-icon"><Globe2 size={22} /></span><div><strong>visitvalechester.example</strong><p>Shared repository · Tenant configuration · Preview workflow</p></div><span className="connected"><i />Connected</span></div><div className="settings-form"><Field label="Application repository"><input defaultValue="DTosh44/visit-crm" readOnly /></Field><div className="form-grid two"><Field label="Production branch"><input defaultValue="main" /></Field><Field label="Tenant key"><input defaultValue={tenant.id} /></Field></div></div><div className="settings-note"><KeyRound size={17} /><p>CRM data, user accounts, signed agreements and secrets stay outside the public website build.</p></div></>}
          {section === 'team' && <><header><div><h2>Team & permissions</h2><p>Control who can see financial records, publish content and change settings.</p></div><Button size="sm">Invite team member</Button></header><div className="auth-mode-note"><ShieldCheck size={17} /><span><strong>{productionAuth ? 'Secure account service connected' : 'Demonstration accounts active'}</strong><small>{productionAuth ? 'Invitations create secure, tenant-scoped accounts.' : 'Connect Supabase to replace these browser-only demo accounts with secure invitations.'}</small></span></div><div className="team-list">{demoUsers.map((person) => <div key={person.id}><span style={{ background: person.colour }}>{person.initials}</span><p><strong>{person.name}</strong><small>{person.role}</small></p><button>Manage</button></div>)}</div></>}
          {section === 'security' && <><header><div><h2>Security & data</h2><p>Manage access controls, audit history and this demonstration data.</p></div></header><div className="security-row"><span><ShieldCheck size={18} /></span><div><strong>Multi-factor authentication</strong><p>Required for workspace administrators and finance users.</p></div><button className="switch on"><span /></button></div><div className="security-row"><span><Database size={18} /></span><div><strong>Audit history</strong><p>Important record changes retain the user and timestamp.</p></div><Button variant="secondary" size="sm">View log</Button></div><div className="danger-zone"><div><strong>Reset demonstration data</strong><p>Restore the original sample records and remove changes stored in this browser.</p></div><Button variant="danger" size="sm" icon={RotateCcw} onClick={() => { if (window.confirm('Reset all demo data? This cannot be undone.')) resetDemo() }}>Reset demo</Button></div></>}
          <footer className="settings-footer"><span>{saved && <><Check size={14} />Settings saved</>}</span><Button onClick={save}>Save changes</Button></footer>
        </section>
      </div>
    </div>
  )
}
