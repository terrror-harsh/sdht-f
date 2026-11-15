import { useState, type FormEvent } from 'react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { getAuthErrorMessage, useAuth } from './auth/AuthProvider'
import { appModules, type AppModule } from './app/navigation'
import { AppShell } from './components/AppShell'
import { DashboardPage } from './components/DashboardPage'
import { SupabaseSetup } from './components/SupabaseSetup'
import { SessionError, SessionLoading, PendingRole, UnauthorizedPage } from './components/SessionStates'
import { SignInPage } from './components/SignInPage'
import { SignUpPage } from './components/SignUpPage'
import { WorkspacePage } from './components/WorkspacePage'
import { useAuth as useAuthSession } from './auth/AuthProvider'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { Activity, CircleAlert, KeyRound, ScanHeart, ShieldCheck } from 'lucide-react'

function AccountSettingsPage() {
  const { session, resetPassword } = useAuthSession()
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  if (session.status !== 'signed-in') return null
  const accountEmail = session.user.email

  async function sendResetLink() {
    if (!accountEmail) {
      setError('A verified email is required to send a password reset link.')
      return
    }

    setBusy(true)
    setError('')
    setFeedback('')
    try {
      await resetPassword(accountEmail)
      setFeedback('Password reset instructions were sent if this address is eligible.')
    } catch (reason) {
      console.error('Could not send an account password reset email.', reason)
      setError(getAuthErrorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page-stack">
      <div className="page-heading-row">
        <div><p className="eyebrow">PERSONAL SETTINGS</p><h1>Account settings</h1><p className="muted-text">Review your verified account identity and access level.</p></div>
      </div>
      <section className="settings-card">
        <div className="settings-icon"><ShieldCheck size={20} /></div>
        <div className="settings-fields">
          <div><span>Display name</span><strong>{session.displayName}</strong></div>
          <div><span>Email</span><strong>{session.user.email ?? 'No verified email'}</strong></div>
          <div><span>Assigned role</span><strong className="role-pill">{session.role}</strong></div>
          <div><span>Account created</span><strong>{session.user.created_at ?? 'Unavailable'}</strong></div>
        </div>
        {error && <p className="inline-feedback error-feedback" role="alert">{error}</p>}
        {feedback && <p className="inline-feedback success-feedback" role="status">{feedback}</p>}
        <button className="secondary-button" type="button" onClick={sendResetLink} disabled={busy}>
          <KeyRound size={16} /> {busy ? 'Sending…' : 'Send password reset link'}
        </button>
      </section>
    </div>
  )
}

function AccountActivityPage() {
  const { session } = useAuthSession()
  if (session.status !== 'signed-in') return null

  return (
    <div className="page-stack">
      <div className="page-heading-row">
        <div><p className="eyebrow">SECURITY</p><h1>Account activity</h1><p className="muted-text">Session details reported by Supabase Authentication.</p></div>
      </div>
      <section className="settings-card">
        <div className="settings-icon"><Activity size={20} /></div>
        <div className="settings-fields">
          <div><span>Signed-in account</span><strong>{session.user.email}</strong></div>
          <div><span>Last sign-in</span><strong>{session.user.last_sign_in_at ?? 'Unavailable'}</strong></div>
          <div><span>Authentication provider</span><strong>{session.user.identities?.map((identity) => identity.provider).join(', ') || 'email'}</strong></div>
          <div><span>Session state</span><strong className="status-verified">Verified</strong></div>
        </div>
      </section>
    </div>
  )
}

function SystemSettingsPage() {
  return (
    <div className="page-stack">
      <div className="page-heading-row">
        <div><p className="eyebrow">ADMINISTRATION</p><h1>System settings</h1><p className="muted-text">Service configuration status for this application.</p></div>
      </div>
      <section className="settings-card">
        <div className="settings-icon"><ShieldCheck size={20} /></div>
        <div className="settings-fields">
          <div><span>Supabase client configuration</span><strong className={isSupabaseConfigured ? 'status-verified' : 'status-missing'}>{isSupabaseConfigured ? 'Configured' : 'Missing'}</strong></div>
          <div><span>Supabase Authentication</span><strong>{supabase ? 'Client initialized' : 'Unavailable'}</strong></div>
          <div><span>Supabase PostgreSQL</span><strong>{supabase ? 'Client initialized' : 'Unavailable'}</strong></div>
          <div><span>AI scan service</span><strong className="status-missing">Not configured in this milestone</strong></div>
        </div>
        <p className="settings-note">Client initialization does not confirm service availability. Supabase access policies are checked when each operation runs.</p>
      </section>
    </div>
  )
}

function ScannerServicePage() {
  return (
    <div className="service-state">
      <div className="service-state-icon"><ScanHeart size={23} /></div>
      <p className="eyebrow">AI HEALTH SCANNER</p>
      <h1>Scanner integration is not configured</h1>
      <p>
        No image is uploaded or analyzed from this screen. The protected AI endpoint and its
        response contract must be connected before SDHT can display an assessment.
      </p>
      <div className="service-disclaimer"><CircleAlert size={17} /> AI output must support—not replace—a veterinarian’s assessment.</div>
    </div>
  )
}

function PasswordRecoveryPage() {
  const { updatePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('The passwords do not match.')
      return
    }

    setBusy(true)
    try {
      await updatePassword(password)
      setSuccess(true)
    } catch (reason) {
      console.error('Could not update the account password.', reason)
      setError(getAuthErrorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <p className="eyebrow">ACCOUNT SECURITY</p>
          <h2>Choose a new password</h2>
          {success ? (
            <>
              <p className="inline-feedback success-feedback" role="status">Your password has been updated.</p>
              <Link className="primary-button auth-submit" to="/app/dashboard">Continue to SDHT</Link>
            </>
          ) : (
            <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
              <label htmlFor="new-password">New password</label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                required
              />
              <label htmlFor="confirm-password">Confirm new password</label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={6}
                required
              />
              {error && <p className="inline-feedback error-feedback" role="alert">{error}</p>}
              <button className="primary-button auth-submit" type="submit" disabled={busy}>
                {busy ? <span className="button-spinner" /> : 'Update password'}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  )
}

function ModuleContent({ module }: { module: AppModule }) {
  switch (module.path) {
    case 'dashboard':
      return <DashboardPage />
    case 'settings':
      return <AccountSettingsPage />
    case 'account-activity':
      return <AccountActivityPage />
    case 'system-settings':
      return <SystemSettingsPage />
    case 'scanner':
      return <ScannerServicePage />
    default:
      return module.collection ? <WorkspacePage module={module} /> : <UnauthorizedPage />
  }
}

function AuthenticatedRoutes() {
  const { session } = useAuth()
  if (session.status !== 'signed-in') return null

  return (
    <Routes>
      <Route path="/app" element={<AppShell />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        {appModules.map((module) => (
          <Route
            path={module.path}
            key={module.path}
            element={
              module.roles.includes(session.role)
                ? <ModuleContent module={module} />
                : <UnauthorizedPage />
            }
          />
        ))}
        <Route path="forbidden" element={<UnauthorizedPage />} />
        <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
      </Route>
      <Route path="/sign-in" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
    </Routes>
  )
}

function ApplicationRoutes() {
  const { session } = useAuth()
  const location = useLocation()

  if (location.pathname === '/reset-password') return <PasswordRecoveryPage />
  if (session.status === 'loading') return <SessionLoading />
  if (session.status === 'unconfigured') return <SupabaseSetup />
  if (session.status === 'pending-role') return <PendingRole />
  if (session.status === 'error') return <SessionError message={session.message} />

  if (session.status === 'signed-out') {
    return (
      <Routes>
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/sign-up" element={<SignUpPage />} />
        <Route path="*" element={<Navigate to="/sign-in" replace />} />
      </Routes>
    )
  }

  return <AuthenticatedRoutes />
}

export default function App() {
  return (
    <div className="app-root">
      <ApplicationRoutes />
    </div>
  )
}
