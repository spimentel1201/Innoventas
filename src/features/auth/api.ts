import type { ProfileInput } from '@/lib/validations/auth'
import { supabase } from '@/lib/supabase'
import type { UserRole } from '@/types/database'

export async function login(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(mapAuthError(error.message))
}

export function mapAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.'
  if (m.includes('email not confirmed')) return 'Tu correo aún no está confirmado. Revisa tu bandeja de entrada.'
  if (m.includes('already registered')) return 'Ese correo ya está registrado. Inicia sesión.'
  if (m.includes('rate limit')) return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.'
  if (m.includes('password should be at least')) return 'La contraseña debe tener al menos 6 caracteres.'
  return message || 'Ocurrió un error inesperado.'
}

export async function register(fullName: string, email: string, password: string) {
  const { error, data } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${window.location.origin}/login`,
    },
  })
  if (error) throw new Error(mapAuthError(error.message))
  return { needsEmailConfirmation: !data.session }
}

export async function logout() {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/recuperar-password`,
  })
  if (error) throw new Error(mapAuthError(error.message))
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw new Error(mapAuthError(error.message))
}

export async function updateProfile(userId: string, values: ProfileInput) {
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: values.fullName,
      phone: values.phone ? values.phone : null,
    })
    .eq('id', userId)
  if (error) throw new Error(error.message)
}

export interface Profile {
  id: string
  email: string
  fullName: string
  phone: string | null
  role: UserRole
}

export function toProfile(row: { id: string; email: string; full_name: string; phone: string | null; role: UserRole }): Profile {
  return { id: row.id, email: row.email, fullName: row.full_name, phone: row.phone, role: row.role }
}

/** Consulta el rol en la base de datos (el cliente JAMÁS define roles; solo los muestra).
 *  La autorización real la valida el servidor: RLS + Edge Functions. */
export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone, role')
    .eq('id', userId)
    .maybeSingle()
  if (error) return null
  return data ? toProfile(data as { id: string; email: string; full_name: string; phone: string | null; role: UserRole }) : null
}
