import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Download,
  LoaderCircle,
  Search,
  ShieldAlert,
  BellRing,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import type { AppModule } from '../app/navigation'
import type { Json } from '../lib/database.types'

type WorkspaceRecord = {
  id: string
  fields: Record<string, unknown>
}

const pageSize = 10

function formatValue(value: unknown): string {
  if (value === undefined || value === null || value === '') return '—'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value instanceof Date) return value.toLocaleString()
  if (typeof value === 'object' && value !== null && 'seconds' in value && typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000).toLocaleString()
  }
  if (Array.isArray(value)) return value.map(formatValue).join(', ')
  return JSON.stringify(value)
}

function exportValue(value: unknown): string {
  const formatted = formatValue(value)
  const safe = /^[=+\-@\t\r]/.test(formatted) ? `'${formatted}` : formatted
  return `"${safe.replaceAll('"', '""')}"`
}

function asLegacyFields(value: Json): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) return value
  return {}
}

function toWorkspaceRecord<T extends { id: string; legacy_data: Json }>(row: T): WorkspaceRecord {
  const { id, legacy_data, ...databaseFields } = row
  const fields: Record<string, unknown> = {
    ...asLegacyFields(legacy_data),
    ...databaseFields,
  }
  if ('read_at' in row) {
    delete fields.read_at
    fields.readAt = row.read_at
  }
  return { id, fields }
}

export function WorkspacePage({ module }: { module: AppModule }) {
  const { session } = useAuth()
  const [records, setRecords] = useState<WorkspaceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortKey, setSortKey] = useState('')
  const [sortDescending, setSortDescending] = useState(false)
  const [page, setPage] = useState(0)
  const [actionError, setActionError] = useState('')
  const [updatingId, setUpdatingId] = useState('')
  const [toast, setToast] = useState('')

  const uid = session.status === 'signed-in' ? session.user.id : ''

  const loadRecords = useCallback(async () => {
    const client = supabase
    if (!client || !module.collection) {
      setError('Supabase is not configured for this section.')
      setRecords([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    setActionError('')
    try {
      if (module.path === 'notifications') {
        const result = await client
          .from('notifications')
          .select('*')
          .eq('recipient_id', uid)
          .limit(100)
        if (result.error) throw result.error
        setRecords((result.data ?? []).map((row) => toWorkspaceRecord(row)))
      } else {
        const result = await client.from(module.collection).select('*').limit(100)
        if (result.error) throw result.error
        setRecords((result.data ?? []).map((row) => toWorkspaceRecord(row)))
      }
    } catch (reason) {
      console.error(`Could not load ${module.label} from Supabase.`, reason)
      setRecords([])
      setError(`Could not load ${module.label.toLowerCase()}. Check your Supabase access and try again.`)
    } finally {
      setLoading(false)
    }
  }, [module.collection, module.label, module.path, uid])

  useEffect(() => {
    void loadRecords()
  }, [loadRecords])

  const columns = useMemo(() => {
    const keys = new Set<string>()
    for (const record of records) {
      Object.keys(record.fields).forEach((key) => keys.add(key))
    }
    return [...keys].filter((key) => key !== 'recipientId').sort((a, b) => a.localeCompare(b))
  }, [records])

  const statuses = useMemo(
    () => [...new Set(records.map((record) => record.fields.status).filter((value): value is string => typeof value === 'string'))].sort(),
    [records],
  )

  const filteredRecords = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase()
    const result = records.filter((record) => {
      const matchesStatus = statusFilter === 'all' || record.fields.status === statusFilter
      const matchesSearch =
        !normalizedSearch ||
        [record.id, ...columns.map((column) => formatValue(record.fields[column]))]
          .join(' ')
          .toLocaleLowerCase()
          .includes(normalizedSearch)
      return matchesStatus && matchesSearch
    })

    if (sortKey) {
      result.sort((left, right) => {
        const leftValue = formatValue(left.fields[sortKey])
        const rightValue = formatValue(right.fields[sortKey])
        const order = leftValue.localeCompare(rightValue, undefined, { numeric: true, sensitivity: 'base' })
        return sortDescending ? -order : order
      })
    }
    return result
  }, [columns, records, search, sortDescending, sortKey, statusFilter])

  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / pageSize))
  const currentPage = Math.min(page, pageCount - 1)
  const pageRecords = filteredRecords.slice(currentPage * pageSize, (currentPage + 1) * pageSize)

  function toggleSort(key: string) {
    if (sortKey === key) setSortDescending((value) => !value)
    else {
      setSortKey(key)
      setSortDescending(false)
    }
    setPage(0)
  }

  async function markAsRead(record: WorkspaceRecord) {
    const client = supabase
    if (!client) {
      setActionError('Supabase is not configured.')
      return
    }
    setUpdatingId(record.id)
    setActionError('')
    try {
      const { data: updated, error: updateError } = await client
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', record.id)
        .eq('recipient_id', uid)
        .select('id')
        .maybeSingle()
      if (updateError) throw updateError
      if (!updated) throw new Error('The notification was not found or is not accessible.')
      setToast('Notification marked as read.')
      await loadRecords()
    } catch (reason) {
      console.error('Could not mark the notification as read.', reason)
      setActionError('Could not update this notification. Check your access and try again.')
    } finally {
      setUpdatingId('')
    }
  }

  function exportCsv() {
    if (!columns.length || !filteredRecords.length) return
    try {
      const header = ['id', ...columns].map(exportValue).join(',')
      const rows = filteredRecords.map((record) =>
        [record.id, ...columns.map((column) => record.fields[column])].map(exportValue).join(','),
      )
      const blob = new Blob([`\uFEFF${[header, ...rows].join('\r\n')}`], { type: 'text/csv;charset=utf-8' })
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = `${module.path}-export.csv`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
      setToast('CSV export downloaded.')
    } catch (reason) {
      console.error(`Could not export ${module.label}.`, reason)
      setActionError('The CSV export could not be created. Try again.')
    }
  }

  return (
    <div className="page-stack">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">SDHT WORKSPACE</p>
          <h1>{module.label}</h1>
          <p className="muted-text">{module.description}</p>
        </div>
        <button className="secondary-button" type="button" onClick={() => void loadRecords()} disabled={loading}>
          <LoaderCircle size={16} className={loading ? 'spin-icon' : ''} />
          {loading ? 'Loading' : 'Refresh'}
        </button>
      </div>

      <section className="data-panel">
        <div className="table-toolbar">
          <label className="search-field">
            <Search size={16} />
            <input
              type="search"
              placeholder={`Search ${module.label.toLowerCase()}…`}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(0)
              }}
            />
          </label>
          <div className="table-toolbar-actions">
            {statuses.length > 0 && (
              <label className="select-field">
                <span className="sr-only">Filter by status</span>
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value)
                    setPage(0)
                  }}
                >
                  <option value="all">All statuses</option>
                  {statuses.map((status) => <option value={status} key={status}>{status}</option>)}
                </select>
              </label>
            )}
            <button className="secondary-button" type="button" onClick={exportCsv} disabled={!filteredRecords.length || loading}>
              <Download size={15} /> Export CSV
            </button>
          </div>
        </div>

        {error && (
          <div className="table-error" role="alert">
            <ShieldAlert size={18} />
            <span>{error}</span>
            <button className="text-button" type="button" onClick={() => void loadRecords()}>Retry</button>
          </div>
        )}
        {actionError && <p className="inline-feedback error-feedback" role="alert">{actionError}</p>}
        {toast && (
          <p className="inline-feedback success-feedback table-toast" role="status">
            {toast}<button className="text-button" type="button" onClick={() => setToast('')}>Dismiss</button>
          </p>
        )}

        {loading ? (
          <div className="table-loading" aria-label={`Loading ${module.label}`}>
            {Array.from({ length: 5 }, (_, index) => <span className="table-skeleton" key={index} />)}
          </div>
        ) : !error && filteredRecords.length === 0 ? (
          <div className="table-empty">
            <span className="empty-icon"><BellRing size={21} /></span>
            <h2>{records.length === 0 ? `No ${module.label.toLowerCase()} records` : 'No matching records'}</h2>
            <p>
              {records.length === 0
                ? 'The SDHT database returned no records for this section and your account role.'
                : 'Try a different search term or status filter.'}
            </p>
            {(search || statusFilter !== 'all') && (
              <button
                className="text-button"
                type="button"
                onClick={() => {
                  setSearch('')
                  setStatusFilter('all')
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : !error ? (
          <>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Record ID</th>
                    {columns.map((column) => (
                      <th scope="col" key={column} aria-sort={sortKey === column ? (sortDescending ? 'descending' : 'ascending') : 'none'}>
                        <button className="sort-button" type="button" onClick={() => toggleSort(column)}>
                          {column.replaceAll(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase())}
                          {sortKey === column && (sortDescending ? <ArrowDown size={13} /> : <ArrowUp size={13} />)}
                        </button>
                      </th>
                    ))}
                    {module.path === 'notifications' && <th scope="col">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {pageRecords.map((record) => (
                    <tr key={record.id}>
                      <td><span className="record-id">{record.id}</span></td>
                      {columns.map((column) => (
                        <td key={column}>
                          {column.toLowerCase().includes('status') ? (
                            <span className={`table-status ${String(record.fields[column] ?? '').toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`}>
                              {formatValue(record.fields[column])}
                            </span>
                          ) : (
                            <span className="table-cell-value" title={formatValue(record.fields[column])}>{formatValue(record.fields[column])}</span>
                          )}
                        </td>
                      ))}
                      {module.path === 'notifications' && (
                        <td>
                          {record.fields.readAt ? (
                            <span className="read-indicator"><Check size={14} /> Read</span>
                          ) : (
                            <button
                              className="table-action"
                              type="button"
                              onClick={() => void markAsRead(record)}
                              disabled={updatingId === record.id}
                            >
                              {updatingId === record.id ? 'Saving…' : 'Mark read'}
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-pagination">
              <span>
                Showing {filteredRecords.length === 0 ? 0 : currentPage * pageSize + 1}–
                {Math.min((currentPage + 1) * pageSize, filteredRecords.length)} of {filteredRecords.length}
                {records.length === 100 ? ' (first 100 loaded)' : ''}
              </span>
              <div>
                <button
                  className="pagination-button"
                  type="button"
                  aria-label="Previous page"
                  onClick={() => setPage((value) => Math.max(0, value - 1))}
                  disabled={currentPage === 0}
                >
                  <ChevronLeft size={16} />
                </button>
                <span>Page {currentPage + 1} of {pageCount}</span>
                <button
                  className="pagination-button"
                  type="button"
                  aria-label="Next page"
                  onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
                  disabled={currentPage >= pageCount - 1}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        ) : null}
      </section>
    </div>
  )
}
