# SDHT

Street Dog Health Twin is a React, TypeScript, and Vite application using Supabase Authentication and PostgreSQL. The existing sign-in, role-aware navigation, dashboard counts, record workspaces, notification updates, search, sorting, status filtering, and CSV export are backed by Supabase.

## Local setup

1. Create a Supabase project. The workspace `.env.local` file is a gitignored blank template; if it is missing, copy `.env.example` to `.env.local`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the project API settings. The anon/publishable key is intended for browser use; never use the service-role key in a `VITE_*` variable.
3. In the Supabase SQL Editor, apply [`supabase/migrations/20260101000000_initial_schema.sql`](./supabase/migrations/20260101000000_initial_schema.sql) first, then [`supabase/migrations/20261114000000_storage.sql`](./supabase/migrations/20261114000000_storage.sql). Back up the project first and do not rerun the initial schema migration if its tables already exist.
4. Enable Email provider under Authentication settings. Configure the Site URL and allowlist `http://localhost:5173/sign-in` and `http://localhost:5173/reset-password`, plus the matching paths on your deployed domain.
5. Create the initial administrator in Supabase Auth. Then, in the SQL Editor, assign its profile (replace the email):

   ```sql
   insert into public.profiles (id, display_name, role)
   select id, coalesce(raw_user_meta_data->>'display_name', split_part(email, '@', 1)), 'admin'
   from auth.users
   where email = 'admin@example.org'
   on conflict (id) do update
     set display_name = excluded.display_name, role = excluded.role;
   ```

6. Users can register at `/sign-up`; Supabase Auth stores their name as user metadata and sends email confirmation when enabled. Signup does not grant workspace access. An administrator must create the matching `public.profiles` row and assign one supported role: `admin`, `volunteer`, `veterinarian`, or `ngo`. The profile ID must be the new Supabase Auth user's UUID.
7. Restart the Vite server after changing environment variables:

   ```powershell
   npm install
   npm run dev
   ```

Run `npm run build` to type-check and create the production bundle.

## Database and access control

The SQL migrations create the relational tables, foreign keys, indexes, role helper, Row Level Security policies, and a private `sdht-media` Storage bucket. It preserves the role permissions previously enforced by Firestore rules. Profiles are keyed by Supabase Auth user IDs. The browser uses only the public key; PostgreSQL and Storage RLS are the authorization boundary.

| Firestore collection | Supabase table |
| --- | --- |
| `users` | `profiles` |
| `dogs` | `dogs` |
| `rescueCases` | `rescue_cases` |
| `healthRecords` | `health_records` |
| `vaccinations` | `vaccinations` |
| `ngos` | `ngos` |
| `volunteers` | `volunteers` |
| `veterinarians` | `veterinarians` |
| `notifications` | `notifications` |
| `healthReports` | `health_reports` |
| `auditLogs` | `audit_logs` |

`profiles.id` is a Supabase Auth UUID. Other records keep their Firestore document IDs as text IDs, with a unique `legacy_id`; each imported row also stores its original JSON in `legacy_data`.

## Importing existing Firestore data

No Firebase project credentials or data export were available during this code migration, so no existing records or accounts have been imported. Do not switch production users until the source data has been exported, the destination has been verified, and account recovery has been planned.

The read-only exporter covers these Firestore collections: `users`, `dogs`, `rescueCases`, `healthRecords`, `vaccinations`, `ngos`, `volunteers`, `veterinarians`, `notifications`, `healthReports`, and `auditLogs`. It uses Google Application Default Credentials and does not modify Firebase. First grant a dedicated operator read-only Firestore access and authenticate locally with Google Cloud ADC; do not put a service-account JSON file in the repository. For example, with Google Cloud CLI installed, run `gcloud auth application-default login`, then:

```powershell
$env:FIREBASE_PROJECT_ID = "your-firebase-project-id"
node scripts\export-firestore.mjs .\sdht-firestore-export.json
Remove-Item Env:\FIREBASE_PROJECT_ID
```

The output file is created only if it does not already exist. Keep a second untouched backup of the export. The importer accepts the exporter’s JSON shape (each collection is an array of `{ "id": "...", "data": { ... } }` documents), maps known fields into relational columns, and retains each complete source document in `legacy_data`. Unsupported collections or records that fail validation stop the import rather than being silently skipped.

Create Supabase Auth accounts before importing profiles; Firebase password hashes are not imported, so users will need Supabase invitations or password resets. Create a local identity map from Firebase UID to the corresponding Supabase Auth UUID:

```json
{
  "firebase-user-id": "supabase-auth-user-uuid"
}
```

Back up the source and verify the SQL migration first. The importer is dry-run by default; `--apply` performs idempotent upserts in batches. It uses a service-role key only in the local Node process to bypass RLS for this one-time administrative import. Set the environment variables in the current PowerShell process; do not put the service-role key in the app environment, source control, or chat:

```powershell
$env:SUPABASE_URL = "https://your-project.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "<local-only-service-role-key>"
node scripts\import-firestore-export.mjs .\sdht-firestore-export.json --identity-map .\identity-map.json
node scripts\import-firestore-export.mjs .\sdht-firestore-export.json --identity-map .\identity-map.json --apply
Remove-Item Env:\SUPABASE_URL
Remove-Item Env:\SUPABASE_SERVICE_ROLE_KEY
```

The import is not a single cross-table transaction. Run it against a backed-up, empty destination, review the dry-run counts, then verify table counts and relationships before cutover. Resolve any constraint errors and rerun; upserts use the preserved legacy IDs.

## Existing integration boundaries

The current application used Firebase Authentication and Firestore only; it had no Firebase Storage upload flow or Realtime subscription. The private Supabase bucket is prepared at your request, but the existing UI has no upload/download workflow and does not use it. Its RLS supports objects stored under `dogs/<record-id>/...` and `health-reports/<record-id>/...`. Existing image URL/path values are retained in imported document data, but binary files are not copied. If the source Firebase project has files, export and verify them separately, then migrate them before retiring that project.

The AI scanner remains unavailable until its protected endpoint URL, authentication requirements, and response schema are configured. Dashboard trends are not fabricated; historical charts appear only when suitable timestamped data and analytics are implemented.
