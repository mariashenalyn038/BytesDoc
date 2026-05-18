'use client'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Browser-only Supabase client used by the invite-acceptance flow.
// The rest of the app talks to Supabase via the backend API; this client is
// only needed for flows that consume Supabase Auth session tokens delivered
// in the URL hash (invite, magic-link, recovery).

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let cached: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (cached) return cached
  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — set both in Vercel env vars.'
    )
  }
  cached = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  return cached
}
