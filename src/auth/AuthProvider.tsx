import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { AppRole } from '../lib/database.types'

export const userRoles = ['admin', 'volunteer', 'veterinarian', 'ngo'] as const
export type UserRole = AppRole

type SessionState =
  | { status: 'loading'; user: null; role: null }
  | { status: 'unconfigured'; user: null; role: null }
  | { status: 'signed-out'; user: null; role: null }
  | { status: 'pending-role'; user: User; role: null }
  | { status: 'signed-in'; user: User; role: UserRole; displayName: string }
  | { status: 'error'; user: User | null; role: null; message: string }

type AuthContextValue = {
  session: SessionState
  signIn: (email: string, password: string) => Promise<void>
  signUp: (displayName: string, email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function isAppRole(value: unknown): value is UserRole {
  return userRoles.some((role) => role === value)
}

export function getAuthErrorMessage(error: unknown) {
  const code =
    typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
      ? error.code
      : ''
  const message =
    typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
      ? error.message
      : ''

  if (code === 'invalid_credentials' || message.includes('Invalid login credentials')) {
    return 'The email or password is incorrect.'
  }
  if (code === 'email_not_confirmed') return 'Confirm your email address before signing in.'
  if (code === 'user_banned') return 'This account has been disabled. Contact your administrator.'
  if (code === 'user_already_exists') return 'Could not create this account. Try signing in or resetting your password.'
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') {
    return 'Too many attempts. Wait a few minutes and try again.'
  }
  if (/failed to fetch|network/i.test(message)) {
    return 'Could not reach Supabase. Check your connection and try again.'
  }
  if (message.includes('valid email')) return 'Enter a valid email address.'
  return message || 'Authentication failed. Please try again.'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>(() =>
    isSupabaseConfigured
      ? { status: 'loading', user: null, role: null }
      : { status: 'unconfigured', user: null, role: null },
  )

  useEffect(() => {
    const client = supabase
    if (!client) {
      setSession({ status: 'unconfigured', user: null, role: null })
      return
    }

    let active = true
    let requestVersion = 0

    const resolveProfile = async (user: User, version: number) => {
      const { data: profile, error } = await client
        .from('profiles')
        .select('display_name, role')
        .eq('id', user.id)
        .maybeSingle()

      if (!active || version !== requestVersion) return
      if (error) {
        console.error('Could not load the signed-in Supabase profile.', error)
        setSession({
          status: 'error',
          user,
          role: null,
          message: 'Could not verify your account role. Check access or contact an administrator.',
        })
        return
      }
      if (!profile) {
        setSession({ status: 'pending-role', user, role: null })
        return
      }
      if (!isAppRole(profile.role)) {
        setSession({
          status: 'error',
          user,
          role: null,
          message: 'Your account has no supported role. Contact an administrator.',
        })
        return
      }

      setSession({
        status: 'signed-in',
        user,
        role: profile.role,
        displayName:
          typeof profile.display_name === 'string' && profile.display_name.trim()
            ? profile.display_name
            : user.user_metadata.display_name || user.email?.split('@')[0] || 'Team member',
      })
    }

    const applySession = (authSession: Session | null) => {
      const version = ++requestVersion
      if (!authSession?.user) {
        setSession({ status: 'signed-out', user: null, role: null })
        return
      }
      setSession({ status: 'loading', user: null, role: null })
      window.setTimeout(() => {
        void resolveProfile(authSession.user, version).catch((error: unknown) => {
          console.error('Could not verify the signed-in Supabase profile.', error)
          if (active && version === requestVersion) {
            setSession({
              status: 'error',
              user: authSession.user,
              role: null,
              message: 'Could not verify your account role. Check access or contact an administrator.',
            })
          }
        })
      }, 0)
    }

    const { data: authListener } = client.auth.onAuthStateChange((_event, authSession) => {
      applySession(authSession)
    })

    void client.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) {
        console.error('Could not restore the Supabase session.', error)
        setSession({
          status: 'error',
          user: null,
          role: null,
          message: 'Could not verify your sign-in session. Reload the page and try again.',
        })
        return
      }
      applySession(data.session)
    }).catch((error: unknown) => {
      console.error('Could not restore the Supabase session.', error)
      if (active) {
        setSession({
          status: 'error',
          user: null,
          role: null,
          message: 'Could not verify your sign-in session. Reload the page and try again.',
        })
      }
    })

    return () => {
      active = false
      requestVersion += 1
      authListener.subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase is not configured.')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signUp = useCallback(async (displayName: string, email: string, password: string) => {
    if (!supabase) throw new Error('Supabase is not configured.')
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName.trim() },
        emailRedirectTo: `${window.location.origin}/sign-in`,
      },
    })
    if (error) throw error
    return data.session === null
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) throw new Error('Supabase is not configured.')
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    if (!supabase) throw new Error('Supabase is not configured.')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
  }, [])

  const updatePassword = useCallback(async (password: string) => {
    if (!supabase) throw new Error('Supabase is not configured.')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
  }, [])

  const value = useMemo(
    () => ({ session, signIn, signUp, signOut, resetPassword, updatePassword }),
    [session, signIn, signUp, signOut, resetPassword, updatePassword],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider.')
  return context
}
