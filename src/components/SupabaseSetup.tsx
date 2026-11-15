import { CircleAlert, ExternalLink, HeartPulse } from 'lucide-react'

const requiredVariables = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']

export function SupabaseSetup() {
  return (
    <main className="setup-page">
      <section className="setup-card">
        <div className="setup-logo"><HeartPulse size={22} /> SDHT</div>
        <div className="setup-status"><CircleAlert size={18} /> Supabase configuration required</div>
        <h1>Connect your Supabase project</h1>
        <p>
          Authentication and role-protected data are unavailable until this app is connected to
          your Supabase project. No demo account or sample records are being used.
        </p>
        <ol className="setup-steps">
          <li>Copy <code>.env.example</code> to <code>.env.local</code> in the project root.</li>
          <li>Set the project URL and public anon/publishable key listed below.</li>
          <li>Apply the SQL migration in <code>supabase/migrations</code> and configure Auth URL settings.</li>
          <li>Create accounts in Supabase Auth and assign each an allowed role in <code>public.profiles</code>.</li>
          <li>Restart the Vite dev server and sign in with the account.</li>
        </ol>
        <div className="env-list">
          {requiredVariables.map((variable) => <code key={variable}>{variable}</code>)}
        </div>
        <a
          className="setup-link"
          href="https://supabase.com/dashboard/"
          target="_blank"
          rel="noreferrer"
        >
          Open Supabase Dashboard <ExternalLink size={14} />
        </a>
        <p className="setup-note">
          The anon/publishable key is intended for client apps and is protected by RLS. Never put
          service-role keys, private keys, or AI provider secrets in <code>VITE_*</code> variables.
        </p>
      </section>
    </main>
  )
}
