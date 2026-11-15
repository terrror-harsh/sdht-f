import { open, writeFile } from 'node:fs/promises'
import { applicationDefault, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const outputPath = process.argv[2]
const projectId = process.env.FIREBASE_PROJECT_ID

if (!outputPath || outputPath.startsWith('--')) {
  throw new Error('Usage: node scripts/export-firestore.mjs <new-output.json>')
}
if (!projectId) {
  throw new Error('Set FIREBASE_PROJECT_ID in the local process environment.')
}

const collections = [
  'users',
  'dogs',
  'rescueCases',
  'healthRecords',
  'vaccinations',
  'ngos',
  'volunteers',
  'veterinarians',
  'notifications',
  'healthReports',
  'auditLogs',
]

function serialize(value) {
  if (value === null || typeof value !== 'object') return value
  if (value instanceof Date) return value.toISOString()

  if (value.constructor?.name === 'Timestamp') {
    return { seconds: value.seconds, nanoseconds: value.nanoseconds }
  }
  if (value.constructor?.name === 'GeoPoint') {
    return { latitude: value.latitude, longitude: value.longitude }
  }
  if (typeof value.path === 'string' && typeof value.get === 'function') {
    return { firestoreDocumentPath: value.path }
  }
  if (typeof value.toBase64 === 'function') {
    return { firestoreBytesBase64: value.toBase64() }
  }
  if (Array.isArray(value)) return value.map(serialize)

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, serialize(child)]),
  )
}

const app = initializeApp({
  credential: applicationDefault(),
  projectId,
})
const firestore = getFirestore(app)
const exportData = {}

for (const collectionName of collections) {
  const snapshot = await firestore.collection(collectionName).get()
  exportData[collectionName] = snapshot.docs.map((document) => ({
    id: document.id,
    data: serialize(document.data()),
  }))
  console.log(`${collectionName}: ${snapshot.size} documents read`)
}

const output = JSON.stringify(exportData, null, 2)
const file = await open(outputPath, 'wx')
try {
  await writeFile(file, output, 'utf8')
} finally {
  await file.close()
}

console.log(`Read-only export written to ${outputPath}. Source collections were not changed.`)
