import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { BrandLogo } from './components/BrandLogo'
import { DEMO_PASSWORD, demoUsers, useAuth } from './auth'
import { tenant } from './tenant'

export function LoginPage() {
  const { signIn, productionAuth } = useAuth()
  const [email, setEmail] = useState(demoUsers[0].email)
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    const message = await signIn(email, password)
    setError(message ?? '')
    setSubmitting(false)
  }

  return (
    <main className="login-page">
      <section className="login-story">
        <a className="login-back" href="/"><ArrowLeft size={16} /> View destination website</a>
        <BrandLogo inverse />
        <div className="login-story-copy">
          <span className="login-kicker">Destination workspace</span>
          <h1>One place to grow a place.</h1>
          <p>Relationships, membership, content and performance—connected to the website visitors see.</p>
          <ul>
            <li><CheckCircle2 size={17} /> Publish approved listings directly to the visitor website</li>
            <li><CheckCircle2 size={17} /> Keep membership, finance and content work together</li>
            <li><CheckCircle2 size={17} /> Give every team member the right level of access</li>
          </ul>
        </div>
        <span className="login-story-footer">{tenant.strapline}</span>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <span className="login-lock"><LockKeyhole size={22} /></span>
          <h2>Welcome back</h2>
          <p>Sign in to the {tenant.name} workspace.</p>
          <form onSubmit={submit}>
            <label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
            <label>Password<div className="password-input"><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
            <div className="login-options"><label><input type="checkbox" defaultChecked /> Keep me signed in</label><button type="button">Forgot password?</button></div>
            {error && <div className="login-error">{error}</div>}
            <button className="login-submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}<ArrowRight size={17} /></button>
          </form>

          {!productionAuth && <div className="demo-access">
            <div><ShieldCheck size={17} /><span><strong>Demo access</strong><small>Choose a role. All demo accounts use {DEMO_PASSWORD}</small></span></div>
            <div className="demo-users">{demoUsers.map((item) => <button key={item.id} onClick={() => { setEmail(item.email); setPassword(DEMO_PASSWORD); setError('') }} className={email === item.email ? 'active' : ''}><span style={{ background: item.colour }}>{item.initials}</span><span><strong>{item.name}</strong><small>{item.role}</small></span></button>)}</div>
          </div>}
        </div>
        <footer>Secure workspace for {tenant.legalName}</footer>
      </section>
    </main>
  )
}
