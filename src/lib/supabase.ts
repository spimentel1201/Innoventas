import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** Indica si el frontend tiene credenciales de Supabase configuradas. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const SUPABASE_URL = (supabaseUrl ?? 'https://placeholder.supabase.co') as string
export const SUPABASE_ANON_KEY = (supabaseAnonKey ?? 'placeholder-anon-key') as string

/**
 * Cliente único de Supabase para toda la app.
 * Los datos reales viven en el proyecto de Supabase configurado en .env —
 * esta app nunca presenta datos localmente como si fueran reales.
 */
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
