import { useState, type FormEvent } from 'react'
import { ArrowRight, HeartPulse, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getAuthErrorMessage, useAuth } from '../auth/AuthProvider'

export function SignInPage() {
  const { signIn, resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState<'sign-in' | 'reset' | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setBusy('sign-in')
    try {
      await signIn(email.trim(), password)
    } catch (reason) {
      setError(getAuthErrorMessage(reason))
    } finally {
      setBusy(null)
    }
  }

  async function handlePasswordReset() {
    setError('')
    setSuccess('')
    if (!email.trim()) {
      setError('Enter your account email first.')
      return
    }

    setBusy('reset')
    try {
      await resetPassword(email.trim())
      setSuccess('If this email belongs to an account, Supabase has sent a password reset link.')
    } catch (reason) {
      setError(getAuthErrorMessage(reason))
    } finally {
      setBusy(null)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <div className="auth-brand">
          <span className="auth-logo"><HeartPulse size={23} strokeWidth={2.2} /></span>
          <span>SDHT <small>Street Dog Health Twin</small></span>
        </div>
        <div className="auth-brand-copy">
          <p className="eyebrow-dark">CARE, CONNECTED</p>
          <h1>Better street-dog care starts with a clearer picture.</h1>
          <p>One trusted workspace for the people working to keep dogs safer and healthier.</p>
        </div>
        <div className="auth-assurance"><ShieldCheck size={17} /> Protected by Supabase Authentication and role-based access</div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <p className="eyebrow">WELCOME BACK</p>
          <h2>Sign in to SDHT</h2>
          <p className="auth-subtitle">Use the team account provided by your administrator.</p>

          <form className="auth-form" onSubmit={handleSignIn}>
            <label htmlFor="sign-in-email">Email address</label>
            <input
              id="sign-in-email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="name@organization.org"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <div className="password-label-row">
              <label htmlFor="sign-in-password">Password</label>
              <button type="button" className="text-button" onClick={handlePasswordReset} disabled={busy !== null}>
                {busy === 'reset' ? 'Sending link…' : 'Forgot password?'}
              </button>
            </div>
            <input
              id="sign-in-password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
            />
            {error && <p className="inline-feedback error-feedback" role="alert">{error}</p>}
            {success && <p className="inline-feedback success-feedback" role="status">{success}</p>}
            <button className="primary-button auth-submit" type="submit" disabled={busy !== null}>
              {busy === 'sign-in' ? <span className="button-spinner" /> : <>Sign in securely <ArrowRight size={17} /></>}
            </button>
          </form>

          <p className="auth-footnote">
            Need an account? <Link to="/sign-up">Sign up</Link>. An administrator assigns your role.
          </p>
          <div className="auth-security"><ShieldCheck size={15} /> Your account role is verified against your SDHT profile.</div>
        </div>
      </section>
    </main>
  )
}
