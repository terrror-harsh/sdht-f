import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowUpRight,
  HeartPulse,
  PawPrint,
  RefreshCw,
  ShieldAlert,
  Syringe,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type { UserRole } from '../auth/AuthProvider'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'
import type { TableName } from '../lib/database.types'

type Metric = {
  label: string
  description: string
  collection: TableName
  path: string
  icon: typeof PawPrint
  roles: UserRole[]
  filter?: 'active-rescues' | 'critical-reports'
  tone: 'teal' | 'blue' | 'amber' | 'red' | 'navy'
}

const metrics: Metric[] = [
  {
    label: 'Total dogs',
    description: 'Registered dog profiles',
    collection: 'dogs',
    path: 'dogs',
    icon: PawPrint,
    roles: ['admin', 'volunteer', 'veterinarian', 'ngo'],
    tone: 'teal',
  },
  {
    label: 'Active rescues',
    description: 'Cases awaiting closure',
    collection: 'rescue_cases',
    path: 'rescues',
    icon: Activity,
    roles: ['admin', 'volunteer', 'ngo'],
    filter: 'active-rescues',
    tone: 'blue',
  },
  {
    label: 'Health reports',
    description: 'Reports recorded in SDHT',
    collection: 'health_reports',
    path: 'reports',
    icon: HeartPulse,
    roles: ['admin', 'volunteer', 'veterinarian', 'ngo'],
    tone: 'navy',
  },
  {
    label: 'Critical cases',
    description: 'Reports marked critical',
    collection: 'health_reports',
    path: 'reports',
    icon: ShieldAlert,
    roles: ['admin', 'veterinarian'],
    filter: 'critical-reports',
    tone: 'red',
  },
  {
    label: 'Vaccinations',
    description: 'Vaccination records',
    collection: 'vaccinations',
    path: 'vaccinations',
    icon: Syringe,
    roles: ['admin', 'veterinarian'],
    tone: 'amber',
  },
  {
    label: 'Volunteers',
    description: 'Registered volunteer records',
    collection: 'volunteers',
    path: 'volunteers',
    icon: Users,
    roles: ['admin', 'ngo'],
    tone: 'teal',
  },
]

type MetricValue = number | null

export function DashboardPage() {
  const { session } = useAuth()
  const [values, setValues] = useState<Record<string, MetricValue>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const role = session.status === 'signed-in' ? session.role : null
  const visibleMetrics = useMemo(
    () => metrics.filter((metric) => role && metric.roles.includes(role)),
    [role],
  )

  const loadMetrics = useCallback(async () => {
    const client = supabase
    if (!client) {
      setError('Supabase is not configured.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    try {
      const results = await Promise.all(
        visibleMetrics.map(async (metric) => {
          let countQuery
          if (metric.filter === 'active-rescues') {
            countQuery = client
              .from('rescue_cases')
              .select('id', { count: 'exact', head: true })
              .in('status', ['open', 'assigned', 'in_progress'])
          } else if (metric.filter === 'critical-reports') {
            countQuery = client
              .from('health_reports')
              .select('id', { count: 'exact', head: true })
              .eq('severity', 'critical')
          } else {
            countQuery = client.from(metric.collection).select('id', { count: 'exact', head: true })
          }

          const { count, error: queryError } = await countQuery
          if (queryError) throw queryError
          return [metric.label, count ?? 0] as const
        }),
      )
      setValues(Object.fromEntries(results))
    } catch (reason) {
      console.error('Could not load SDHT dashboard metrics.', reason)
      setError('Dashboard counts could not be loaded. Check your Supabase access and try again.')
    } finally {
      setLoading(false)
    }
  }, [visibleMetrics])

  useEffect(() => {
    void loadMetrics()
  }, [loadMetrics])

  const displayName = session.status === 'signed-in' ? session.displayName : 'team member'
  const today = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date())

  return (
    <div className="page-stack">
      <div className="dashboard-welcome">
        <div>
          <p className="eyebrow">SDHT OVERVIEW</p>
          <h1>Good day, {displayName}</h1>
          <p className="muted-text">A live view of records your role is allowed to access.</p>
        </div>
        <div className="dashboard-date">
          <span>Today</span>
          <strong>{today}</strong>
        </div>
      </div>

      <div className="dashboard-section-heading">
        <div>
          <h2>At a glance</h2>
          <p>Counts are read directly from the SDHT database. No sample values or synthetic trends.</p>
        </div>
        <button className="icon-text-button" type="button" onClick={() => void loadMetrics()} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'spin-icon' : ''} />
          {loading ? 'Refreshing' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="inline-feedback error-feedback" role="alert">
          <ShieldAlert size={17} /> {error}
          <button type="button" className="text-button" onClick={() => void loadMetrics()}>Retry</button>
        </div>
      )}

      <div className="metric-grid">
        {visibleMetrics.map((metric) => {
          const Icon = metric.icon
          const value = values[metric.label]
          return (
            <Link className="metric-card" to={`/app/${metric.path}`} key={metric.label}>
              <span className={`metric-icon tone-${metric.tone}`}><Icon size={19} strokeWidth={1.9} /></span>
              <span className="metric-label">{metric.label}</span>
              <strong className="metric-value">
                {loading ? <span className="metric-skeleton" aria-label="Loading count" /> : error ? '—' : value ?? '—'}
              </strong>
              <span className="metric-description">{metric.description}</span>
              <ArrowUpRight className="metric-arrow" size={16} aria-hidden="true" />
            </Link>
          )
        })}
      </div>

      {!loading && !error && (
        <section className="analytics-empty">
          <div className="analytics-empty-icon"><Activity size={20} /></div>
          <div>
            <h2>Historical analytics</h2>
            <p>
              Charts will appear when timestamped health and rescue history is available. SDHT
              does not draw trend lines from current totals.
            </p>
          </div>
        </section>
      )}
    </div>
  )
}
