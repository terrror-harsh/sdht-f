import { readFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'

const sourcePath = process.argv[2]
const identityMapFlagIndex = process.argv.indexOf('--identity-map')
const identityMapPath = identityMapFlagIndex >= 0 ? process.argv[identityMapFlagIndex + 1] : undefined
const apply = process.argv.includes('--apply')

if (!sourcePath || sourcePath.startsWith('--')) {
  throw new Error(
    'Usage: node scripts/import-firestore-export.mjs <export.json> [--identity-map <map.json>] [--apply]',
  )
}
if (identityMapFlagIndex >= 0 && !identityMapPath) {
  throw new Error('Provide a JSON file path after --identity-map.')
}

const roles = new Set(['admin', 'volunteer', 'veterinarian', 'ngo'])
const tableFields = {
  dogs: {
    sdhtId: 'sdht_id', name: 'name', sex: 'sex', breed: 'breed',
    estimatedBirthDate: 'estimated_birth_date', color: 'color',
    currentLocation: 'current_location', latitude: 'latitude', longitude: 'longitude',
    healthStatus: 'health_status', status: 'status', photoPath: 'photo_path',
    createdBy: 'created_by',
  },
  health_records: {
    dogId: 'dog_id', recordType: 'record_type', observedAt: 'observed_at',
    diagnosis: 'diagnosis', symptoms: 'symptoms', severity: 'severity',
    notes: 'notes', createdBy: 'created_by',
  },
  rescue_cases: {
    dogId: 'dog_id', reportedBy: 'reported_by', assignedVolunteerId: 'assigned_volunteer_id',
    ngoId: 'ngo_id', status: 'status', severity: 'severity', title: 'title',
    description: 'description', location: 'location', latitude: 'latitude',
    longitude: 'longitude', resolvedAt: 'resolved_at',
  },
  vaccinations: {
    dogId: 'dog_id', vaccineName: 'vaccine_name', administeredAt: 'administered_at',
    dueAt: 'due_at', veterinarianId: 'veterinarian_id', notes: 'notes',
  },
  ngos: { name: 'name', email: 'email', phone: 'phone', area: 'area', status: 'status' },
  volunteers: {
    profileId: 'profile_id', userId: 'profile_id', ngoId: 'ngo_id', area: 'area', status: 'status',
  },
  veterinarians: {
    profileId: 'profile_id', userId: 'profile_id', licenseNumber: 'license_number',
    specialty: 'specialty', clinicName: 'clinic_name', status: 'status',
  },
  notifications: {
    recipientId: 'recipient_id', title: 'title', message: 'message',
    readAt: 'read_at', link: 'link',
  },
  health_reports: {
    dogId: 'dog_id', reporterId: 'reporter_id', category: 'category',
    severity: 'severity', description: 'description', location: 'location',
    status: 'status', photoPath: 'photo_path',
  },
  audit_logs: {
    actorId: 'actor_id', action: 'action', entityType: 'entity_type',
    entityId: 'entity_id', details: 'details',
  },
}
const importOrder = [
  'ngos',
  'users',
  'dogs',
  'volunteers',
  'veterinarians',
  'healthRecords',
  'rescueCases',
  'vaccinations',
  'healthReports',
  'notifications',
  'auditLogs',
]
const tableNames = {
  users: 'profiles',
  healthRecords: 'health_records',
  rescueCases: 'rescue_cases',
  healthReports: 'health_reports',
  auditLogs: 'audit_logs',
}

function sourceValue(record, key, column) {
  if (Object.hasOwn(record, key)) return record[key]
  if (Object.hasOwn(record, column)) return record[column]
  return undefined
}

function mapIdentity(value, identityMap, fieldName) {
  if (value === undefined || value === null || value === '') return null
  const mapped = identityMap[value]
  if (!mapped) throw new Error(`Missing identity-map entry for ${fieldName} "${value}".`)
  if (!/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(mapped)) {
    throw new Error(`Identity-map entry for ${fieldName} "${value}" is not a UUID.`)
  }
  return mapped
}

function timestamp(value, fieldName) {
  if (value === undefined || value === null || value === '') return null
  const date =
    typeof value === 'object' && typeof value.seconds === 'number'
      ? new Date(value.seconds * 1000 + Math.floor((value.nanoseconds ?? 0) / 1e6))
      : new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid timestamp for ${fieldName}.`)
  return date.toISOString()
}

function dateOnly(value, fieldName) {
  const normalized = timestamp(value, fieldName)
  return normalized ? normalized.slice(0, 10) : null
}

function jsonObject(value, label) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value
  throw new Error(`${label} must be a JSON object.`)
}

function makeProfile(record, identityMap) {
  const legacyId = String(record.id ?? '')
  if (!legacyId) throw new Error('Every exported user needs its Firebase document id as "id".')
  const id = mapIdentity(legacyId, identityMap, 'user')
  const role = record.role
  if (!roles.has(role)) throw new Error(`User "${legacyId}" has an unsupported role.`)
  const displayName = record.displayName ?? record.display_name ?? record.email?.split('@')[0]
  if (typeof displayName !== 'string' || !displayName.trim()) {
    throw new Error(`User "${legacyId}" is missing a display name.`)
  }
  const profile = {
    id,
    legacy_id: legacyId,
    display_name: displayName.trim(),
    role,
    legacy_data: record,
  }
  const createdAt = sourceValue(record, 'createdAt', 'created_at')
  const updatedAt = sourceValue(record, 'updatedAt', 'updated_at')
  if (createdAt !== undefined) profile.created_at = timestamp(createdAt, 'profiles.created_at')
  if (updatedAt !== undefined) profile.updated_at = timestamp(updatedAt, 'profiles.updated_at')
  return profile
}

function makeRecord(table, record, identityMap) {
  const id = String(record.id ?? '')
  if (!id) throw new Error(`Every ${table} document needs its Firestore document id as "id".`)
  const output = { id, legacy_id: id, legacy_data: record }
  const createdAt = sourceValue(record, 'createdAt', 'created_at')
  const updatedAt = sourceValue(record, 'updatedAt', 'updated_at')
  if (createdAt !== undefined) output.created_at = timestamp(createdAt, `${table}.created_at`)
  if (updatedAt !== undefined) output.updated_at = timestamp(updatedAt, `${table}.updated_at`)
  const fields = tableFields[table] ?? {}

  for (const [sourceKey, column] of Object.entries(fields)) {
    const value = sourceValue(record, sourceKey, column)
    if (value === undefined) continue

    if (['created_by', 'reported_by', 'profile_id', 'recipient_id', 'reporter_id', 'actor_id'].includes(column)) {
      output[column] = mapIdentity(value, identityMap, column)
    } else if (['observed_at', 'resolved_at', 'administered_at', 'due_at', 'read_at'].includes(column)) {
      output[column] = timestamp(value, `${table}.${column}`)
    } else if (column === 'estimated_birth_date') {
      output[column] = dateOnly(value, `${table}.${column}`)
    } else if (['latitude', 'longitude'].includes(column)) {
      const number = value === null ? null : Number(value)
      if (number !== null && !Number.isFinite(number)) throw new Error(`Invalid ${column} on ${table}/${id}.`)
      output[column] = number
    } else {
      output[column] = value
    }
  }

  if (table === 'rescue_cases' && !output.status) output.status = 'open'
  if (table === 'health_records' && !output.symptoms) output.symptoms = []
  if (table === 'audit_logs' && !output.details) output.details = {}
  if (table === 'notifications') {
    if (!output.recipient_id) throw new Error(`Notification "${id}" has no recipientId.`)
    if (typeof output.title !== 'string' || typeof output.message !== 'string') {
      throw new Error(`Notification "${id}" must have a title and message.`)
    }
  }
  return output
}

const exportData = jsonObject(JSON.parse(await readFile(sourcePath, 'utf8')), 'Firestore export')
const identityMap = identityMapPath
  ? jsonObject(JSON.parse(await readFile(identityMapPath, 'utf8')), 'Identity map')
  : {}
const supportedCollections = new Set(importOrder)
for (const collectionName of Object.keys(exportData)) {
  if (!supportedCollections.has(collectionName)) {
    throw new Error(`Unsupported Firestore collection "${collectionName}". Add an explicit schema mapping before importing it.`)
  }
}
const batches = []
const seenIds = new Map()

for (const collectionName of importOrder) {
  const records = exportData[collectionName]
  if (records === undefined) continue
  if (!Array.isArray(records)) throw new Error(`Firestore collection "${collectionName}" must be an array.`)
  const table = tableNames[collectionName] ?? collectionName
  if (table !== 'profiles' && !Object.hasOwn(tableFields, table)) {
    throw new Error(`Unsupported Firestore collection "${collectionName}".`)
  }
  const rows = records.map((record) => {
    const source = jsonObject(record, `${collectionName} record`)
    const data = Object.hasOwn(source, 'data')
      ? jsonObject(source.data, `${collectionName}/${source.id} data`)
      : source
    const document = data === source ? source : { ...data, id: source.id }
    const mapped = collectionName === 'users'
      ? makeProfile(document, identityMap)
      : makeRecord(table, document, identityMap)
    const id = mapped.id
    const key = `${table}:${id}`
    if (seenIds.has(key)) throw new Error(`Duplicate record id "${id}" in ${table}.`)
    seenIds.set(key, true)
    return mapped
  })
  if (rows.length) batches.push({ table, rows })
}

const counts = Object.fromEntries(batches.map(({ table, rows }) => [table, rows.length]))
console.log(`${apply ? 'Import plan' : 'Dry run'}: ${JSON.stringify(counts, null, 2)}`)

if (!apply) {
  console.log('No rows were written. Review this plan, then rerun with --apply to import.')
  process.exit(0)
}

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the local process environment.')
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

for (const { table, rows } of batches) {
  for (let offset = 0; offset < rows.length; offset += 100) {
    const { error } = await supabase
      .from(table)
      .upsert(rows.slice(offset, offset + 100), { onConflict: table === 'profiles' ? 'id' : 'legacy_id' })
    if (error) throw new Error(`Import failed for ${table}: ${error.message}`)
  }
}

console.log('Import completed. Verify destination row counts and relationships before switching users.')
