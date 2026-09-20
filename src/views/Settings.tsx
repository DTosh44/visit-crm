import { BellRing, Building2, Check, CreditCard, Database, Globe2, KeyRound, Palette, RotateCcw, ShieldCheck, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { useCRM } from '../store'
import { Button, Field, PageHeader } from '../components/UI'

const sections = [
  { id: 'workspace', label: 'Workspace', icon: Building2 },
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'billing', label: 'Billing & invoices', icon: CreditCard },
  { id: 'reminders', label: 'Reminder schedule', icon: BellRing },
  { id: 'website', label: 'Website connection', icon: Globe2 },
  { id: 'team', label: 'Team & permissions', icon: UsersRound },
  { id: 'security', label: 'Security', icon: ShieldCheck },
]

export function Settings() {
  const { resetDemo } = useCRM()
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
            <div className="settings-form"><Field label="Destination name"><input defaultValue="Shakespeare’s England" /></Field><div className="form-grid two"><Field label="Default timezone"><select defaultValue="Europe/London"><option>Europe/London</option></select></Field><Field label="Financial year starts"><select defaultValue="September"><option>September</option><option>April</option><option>January</option></select></Field></div><div className="form-grid two"><Field label="Membership year starts"><select defaultValue="1 September"><option>1 September</option></select></Field><Field label="Default currency"><select defaultValue="GBP"><option>GBP — Pound sterling</option></select></Field></div><Field label="Workspace address"><textarea rows={3} defaultValue="Shakespeare’s England Ltd, Stratford-upon-Avon, Warwickshire" /></Field></div>
          </>}
          {section === 'branding' && <><header><div><h2>Branding</h2><p>Apply the destination’s identity to invoices, agreements and the business portal.</p></div></header><div className="brand-upload"><span>SE</span><div><strong>Workspace logo</strong><p>PNG, SVG or JPG. Recommended 512 × 512px.</p><Button variant="secondary" size="sm">Replace logo</Button></div></div><div className="settings-form"><div className="form-grid two"><Field label="Primary colour"><div className="colour-input"><input type="color" defaultValue="#12233f" /><input defaultValue="#12233F" /></div></Field><Field label="Accent colour"><div className="colour-input"><input type="color" defaultValue="#e2655f" /><input defaultValue="#E2655F" /></div></Field></div></div></>}
          {section === 'billing' && <><header><div><h2>Billing & invoices</h2><p>Invoice identity, payment instructions and tax defaults.</p></div></header><div className="settings-form"><div className="form-grid two"><Field label="Invoice prefix"><input defaultValue="SE-2026-" /></Field><Field label="Payment terms"><select defaultValue="30"><option value="14">14 days</option><option value="30">30 days</option></select></Field></div><Field label="Payment instructions"><textarea rows={4} defaultValue={'Please pay by bank transfer, quoting the invoice number as your reference.\nBank details: Shown securely on issued invoices.'} /></Field><label className="settings-checkbox"><input type="checkbox" defaultChecked /><span><strong>Apply 20% VAT by default</strong><small>Can be changed on individual invoice lines.</small></span></label></div></>}
          {section === 'reminders' && <><header><div><h2>Automatic reminder schedule</h2><p>Reminders run only on successfully sent, unpaid invoices.</p></div></header><div className="reminder-settings"><div><span>1</span><Field label="First reminder"><div className="suffix-input"><input type="number" defaultValue="7" /><em>days overdue</em></div></Field><label><input type="checkbox" defaultChecked />Enabled</label></div><div><span>2</span><Field label="Second reminder"><div className="suffix-input"><input type="number" defaultValue="14" /><em>days overdue</em></div></Field><label><input type="checkbox" defaultChecked />Enabled</label></div><div><span>3</span><Field label="Final reminder"><div className="suffix-input"><input type="number" defaultValue="28" /><em>days overdue</em></div></Field><label><input type="checkbox" defaultChecked />Enabled</label></div></div><div className="settings-note"><BellRing size={17} /><p>Payment status and reminder pauses are checked again immediately before each message is sent.</p></div></>}
          {section === 'website' && <><header><div><h2>Website connection</h2><p>Approved listing data flows to the public site; private CRM fields never do.</p></div></header><div className="connection-card"><span className="connection-icon"><Globe2 size={22} /></span><div><strong>shakespeares-england.co.uk</strong><p>GitHub repository · Connected to preview workflow</p></div><span className="connected"><i />Connected</span></div><div className="settings-form"><Field label="Website repository"><input defaultValue="DTosh44/shakespeares-england-website" readOnly /></Field><div className="form-grid two"><Field label="Production branch"><input defaultValue="main" /></Field><Field label="Preview branch pattern"><input defaultValue="preview/*" /></Field></div></div><div className="settings-note"><KeyRound size={17} /><p>CRM data, signed agreements and secrets are stored outside the website repository.</p></div></>}
          {section === 'team' && <><header><div><h2>Team & permissions</h2><p>Control who can see financial records, publish content and change settings.</p></div><Button size="sm">Invite team member</Button></header><div className="team-list">{[['Darren Tosh','Administrator','DT'],['Vicki Zamudio','Membership & travel trade','VZ'],['Hannah Ward','Content editor','HW'],['Sian Cooper','Membership coordinator','SC']].map(([name,role,initial]) => <div key={name}><span>{initial}</span><p><strong>{name}</strong><small>{role}</small></p><button>Manage</button></div>)}</div></>}
          {section === 'security' && <><header><div><h2>Security & data</h2><p>Manage access controls, audit history and this demonstration data.</p></div></header><div className="security-row"><span><ShieldCheck size={18} /></span><div><strong>Multi-factor authentication</strong><p>Required for workspace administrators and finance users.</p></div><button className="switch on"><span /></button></div><div className="security-row"><span><Database size={18} /></span><div><strong>Audit history</strong><p>Important record changes retain the user and timestamp.</p></div><Button variant="secondary" size="sm">View log</Button></div><div className="danger-zone"><div><strong>Reset demonstration data</strong><p>Restore the original sample records and remove changes stored in this browser.</p></div><Button variant="danger" size="sm" icon={RotateCcw} onClick={() => { if (window.confirm('Reset all demo data? This cannot be undone.')) resetDemo() }}>Reset demo</Button></div></>}
          <footer className="settings-footer"><span>{saved && <><Check size={14} />Settings saved</>}</span><Button onClick={save}>Save changes</Button></footer>
        </section>
      </div>
    </div>
  )
}
