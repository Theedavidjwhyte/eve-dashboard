import { createClient, SupabaseClient } from "@supabase/supabase-js"

// Anon key is safe to hardcode — it only works with Row Level Security
// and cannot access anything beyond what the RLS policies allow
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://zavbdlbssuurddmmknfs.supabase.co"

const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphdmJkbGJzc3V1cmRkbW1rbmZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNzg3MjAsImV4cCI6MjA5MDY1NDcyMH0.AwtfpNNgRXzUbeFyabiRgEZJeUM7ho2ZKcFNiypSYNM"

// Sync status type — used throughout the app
export type SyncStatus = "idle" | "syncing" | "synced" | "error" | "local" | "offline"

// Whether Supabase is configured and available
export const supabaseConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY)

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (!client) {
    try {
      client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          storageKey: "eve-auth-session",
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      })
    } catch (e) {
      console.warn("[supabase] failed to create client:", e)
      return null
    }
  }
  return client
}
