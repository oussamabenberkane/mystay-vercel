import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

/**
 * Returns a human-readable reason if the service-role configuration is missing
 * or still the dev placeholder, otherwise `null`. Used to fail loudly (throw in
 * `createAdminClient`) and to let user-facing server actions surface a clear
 * error string instead of silently hitting a 401 on every admin/push/loyalty
 * code path.
 */
export function serviceRoleConfigError(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) return 'NEXT_PUBLIC_SUPABASE_URL is not set.'
  if (!key || key.startsWith('placeholder')) {
    return 'Server not configured: SUPABASE_SERVICE_ROLE_KEY is missing or a placeholder. Add the real service-role key (Supabase dashboard → Project Settings → API) to .env.local and restart the dev server.'
  }
  return null
}

/**
 * Service-role Supabase client — bypasses RLS. Server-only; never import into
 * client code. Throws loudly when the service-role key is absent or a
 * placeholder so misconfiguration is obvious instead of failing silently.
 */
export function createAdminClient() {
  const reason = serviceRoleConfigError()
  if (reason) throw new Error(reason)

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
