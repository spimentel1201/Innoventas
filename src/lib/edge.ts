import { supabase } from './supabase'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

export class EdgeError extends Error {
  code: string
  detail?: string
  status: number

  constructor(payload: { error?: string; detail?: string; message?: string } | null, status: number) {
    super(payload?.detail ?? payload?.message ?? payload?.error ?? 'Error en el servidor')
    this.name = 'EdgeError'
    this.code = payload?.error ?? 'EDGE_ERROR'
    this.detail = payload?.detail
    this.status = status
  }
}

/** Devuelve una sesión con token vigente; refresca si está por expirar o ya expiró. */
async function getValidSession() {
  const { data } = await supabase.auth.getSession()
  const session = data.session
  if (!session) return null
  const expiresAtMs = (session.expires_at ?? 0) * 1000
  if (Date.now() >= expiresAtMs - 60_000) {
    const { data: refreshed } = await supabase.auth.refreshSession()
    return refreshed.session ?? null
  }
  return session
}

/** Invoca una Edge Function con headers de autenticación correctos
 *  (Bearer del usuario si hay sesión; apikey anónima para invitados). */
export async function invokeEdgeFunction<TResponse>(
  name: string,
  body?: unknown,
  init?: { method?: 'POST' | 'GET' | 'DELETE'; headers?: Record<string, string> },
): Promise<TResponse> {
  const session = await getValidSession()
  const hasBody = body !== undefined
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: init?.method ?? 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
    body: hasBody ? JSON.stringify(body) : undefined,
  })
  const payload = res.headers.get('content-type')?.includes('application/json')
    ? await res.json().catch(() => null)
    : null
  if (!res.ok) throw new EdgeError(payload as { error?: string; detail?: string } | null, res.status)
  return payload as TResponse
}

export type { SupabaseClient }
