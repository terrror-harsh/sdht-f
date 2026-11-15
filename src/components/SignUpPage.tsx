import { useState, type FormEvent } from 'react'
import { ArrowRight, HeartPulse, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getAuthErrorMessage, useAuth } from '../auth/AuthProvider'

export function SignUpPage() {
  const { signUp } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmationRequired, setConfirmationRequired] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('The passwords do not match.')
      return
    }

    setBusy(true)
    try {
      const needsConfirmation = await signUp(displayName, email.trim(), password)
      setConfirmationRequired(needsConfirmation)
    } catch (reason) {
      setError(getAuthErrorMessage(reason))
    } finally {
      setBusy(false)
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
          <h1>Join the people working to keep dogs safer and healthier.</h1>
          <p>Create an account to request access to the SDHT workspace.</p>
        </div>
        <div className="auth-assurance"><ShieldCheck size={17} /> Protected by Supabase Authentication and role-based access</div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <p className="eyebrow">NEW ACCOUNT</p>
          <h2>Create your SDHT account</h2>
          {confirmationRequired ? (
            <>
              <p className="inline-feedback success-feedback" role="status">
                Account created. Check your email to confirm your address, then sign in.
              </p>
              <p className="auth-footnote">
                An administrator must assign your SDHT role before you can access records.
              </p>
            </>
          ) : (
            <>
              <p className="auth-subtitle">An administrator assigns access after registration.</p>
              <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
                <label htmlFor="sign-up-name">Full name</label>
                <input
                  id="sign-up-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  maxLength={100}
                  required
                />
                <label htmlFor="sign-up-email">Email address</label>
                <input
                  id="sign-up-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@organization.org"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
                <label htmlFor="sign-up-password">Password</label>
                <input
                  id="sign-up-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={6}
                  required
                />
                <label htmlFor="sign-up-confirm-password">Confirm password</label>
                <input
                  id="sign-up-confirm-password"
                  name="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={6}
                  required
                />
                {error && <p className="inline-feedback error-feedback" role="alert">{error}</p>}
                <button className="primary-button auth-submit" type="submit" disabled={busy}>
                  {busy ? <span className="button-spinner" /> : <>Create account <ArrowRight size={17} /></>}
                </button>
              </form>
            </>
          )}
          <p className="auth-footnote">
            Already have an account? <Link to="/sign-in">Sign in</Link>
          </p>
          <div className="auth-security"><ShieldCheck size={15} /> Roles are assigned separately by an SDHT administrator.</div>
        </div>
      </section>
    </main>
  )
}
