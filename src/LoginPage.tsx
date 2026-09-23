import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ProductLogo } from './components/BrandLogo'
import { DEFAULT_PASSWORD, seedUsers, useAuth } from './auth'
import { tenant } from './tenant'

export function LoginPage() {
  const { signIn, productionAuth, passwordRecovery, requestPasswordReset, updatePassword } = useAuth()
  const [email, setEmail] = useState(productionAuth ? '' : seedUsers[0].email)
  const [password, setPassword] = useState(productionAuth ? '' : DEFAULT_PASSWORD)
  const [passwordConfirmation,setPasswordConfirmation]=useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [notice,setNotice]=useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    const message = await signIn(email, password)
    setError(message ?? '')
    setSubmitting(false)
  }

  const reset=async()=>{
    if(!email.trim()){setError('Enter your email address first.');return}
    setSubmitting(true);setError('');setNotice('')
    const message=await requestPasswordReset(email)
    if(message)setError(message);else setNotice('If this email belongs to a workspace account, a password-reset link has been sent.')
    setSubmitting(false)
  }

  const savePassword=async(event:FormEvent)=>{
    event.preventDefault();setError('');setNotice('')
    if(password.length<12){setError('Use at least 12 characters.');return}
    if(password!==passwordConfirmation){setError('The passwords do not match.');return}
    setSubmitting(true);const message=await updatePassword(password);if(message)setError(message);setSubmitting(false)
  }

  return (
    <main className="login-page">
      <section className="login-story">
        <a className="login-back" href="/"><ArrowLeft size={16} /> View destination website</a>
        <ProductLogo inverse />
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
          <h2>{passwordRecovery?'Choose a new password':'Welcome back'}</h2>
          <p>{passwordRecovery?'Secure your account before continuing.':`Sign in to the ${tenant.name} workspace.`}</p>
          {passwordRecovery?<form onSubmit={savePassword}>
            <label>New password<div className="password-input"><input type={showPassword?'text':'password'} autoComplete="new-password" minLength={12} value={password} onChange={(event)=>setPassword(event.target.value)} required aria-invalid={Boolean(error)}/><button type="button" onClick={()=>setShowPassword((value)=>!value)} aria-label={showPassword?'Hide password':'Show password'}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>
            <label>Confirm new password<input type="password" autoComplete="new-password" minLength={12} value={passwordConfirmation} onChange={(event)=>setPasswordConfirmation(event.target.value)} required aria-invalid={Boolean(error)}/></label>
            {error&&<div id="login-error" className="login-error" role="alert">{error}</div>}
            <button className="login-submit" disabled={submitting} aria-busy={submitting}>{submitting?'Saving…':'Save password and continue'}<ArrowRight size={17}/></button>
          </form>:<form onSubmit={submit}>
            <label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required aria-invalid={Boolean(error)} aria-describedby={error ? 'login-error' : undefined} /></label>
            <label>Password<div className="password-input"><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required aria-invalid={Boolean(error)} aria-describedby={error ? 'login-error' : undefined} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
            <div className="login-options"><span>Secure session on this device</span>{productionAuth&&<button type="button" disabled={submitting} onClick={()=>void reset()}>Forgot password?</button>}</div>
            {error && <div id="login-error" className="login-error" role="alert">{error}</div>}
            {notice&&<div className="login-notice" role="status">{notice}</div>}
            <button className="login-submit" disabled={submitting} aria-busy={submitting}>{submitting ? 'Signing in…' : 'Sign in'}<ArrowRight size={17} /></button>
          </form>}

          {!passwordRecovery&&!productionAuth && <div className="workspace-access">
            <div><ShieldCheck size={17} /><span><strong>Workspace access</strong><small>Select an account for this workspace. The access password is {DEFAULT_PASSWORD}</small></span></div>
            <div className="workspace-users">{seedUsers.map((item) => <button key={item.id} onClick={() => { setEmail(item.email); setPassword(DEFAULT_PASSWORD); setError('') }} className={email === item.email ? 'active' : ''}><span style={{ background: item.colour }}>{item.initials}</span><span><strong>{item.name}</strong><small>{item.role}</small></span></button>)}</div>
          </div>}
        </div>
        <footer>Secure workspace for {tenant.legalName}</footer>
      </section>
    </main>
  )
}
