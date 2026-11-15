import { useState } from 'react'
import { CircleAlert, LogOut, RefreshCw, ShieldCheck } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'

export function SessionLoading() {
  return (
    <main className="session-state">
      <span className="large-spinner" aria-hidden="true" />
      <h1>Verifying your SDHT access</h1>
      <p>Checking your Supabase session and assigned role…</p>
    </main>
  )
}

export function PendingRole() {
  const { session, signOut } = useAuth()
  const [error, setError] = useState('')

  async function handleSignOut() {
    setError('')
    try {
      await signOut()
    } catch (reason) {
      console.error('Could not sign out the pending account.', reason)
      setError('Could not sign out. Check your connection and try again.')
    }
  }

  return (
    <main className="session-state">
      <div className="state-icon pending-icon"><ShieldCheck size={25} /></div>
      <p className="eyebrow">ACCESS REVIEW</p>
      <h1>Your account is awaiting a role</h1>
      <p>
        {session.status === 'pending-role' ? session.user.email : 'This account'} is authenticated,
        but no SDHT role is assigned. Ask an administrator to create or verify your user profile in
        the SDHT database before accessing records.
      </p>
      {error && <p className="inline-feedback error-feedback" role="alert">{error}</p>}
      <div className="state-actions">
        <button className="secondary-button" type="button" onClick={() => window.location.reload()}>
          <RefreshCw size={16} /> Check again
        </button>
        <button className="primary-button" type="button" onClick={handleSignOut}>
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </main>
  )
}

export function SessionError({ message }: { message: string }) {
  const { signOut } = useAuth()
  const [error, setError] = useState('')

  async function handleSignOut() {
    setError('')
    try {
      await signOut()
    } catch (reason) {
      console.error('Could not sign out after a session error.', reason)
      setError('Could not sign out. Check your connection and try again.')
    }
  }

  return (
    <main className="session-state">
      <div className="state-icon error-icon"><CircleAlert size={24} /></div>
      <p className="eyebrow">ACCESS COULD NOT BE VERIFIED</p>
      <h1>We could not load your workspace</h1>
      <p>{message}</p>
      {error && <p className="inline-feedback error-feedback" role="alert">{error}</p>}
      <div className="state-actions">
        <button className="secondary-button" type="button" onClick={() => window.location.reload()}>
          <RefreshCw size={16} /> Try again
        </button>
        <button className="primary-button" type="button" onClick={handleSignOut}>
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </main>
  )
}

export function UnauthorizedPage() {
  return (
    <main className="session-state">
      <div className="state-icon error-icon"><ShieldCheck size={24} /></div>
      <p className="eyebrow">ROLE RESTRICTED</p>
      <h1>You don’t have access to this section</h1>
      <p>Your role does not permit this action. If you believe this is a mistake, contact an SDHT administrator.</p>
    </main>
  )
}
