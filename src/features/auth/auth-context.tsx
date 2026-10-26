import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { fetchProfile, type Profile } from './api'

interface AuthContextValue {
  user: User | null
  session: Session | null
  profile: Profile | null
  isProfileLoading: boolean
  isAdmin: boolean
  /** Vuelve a leer el perfil (rol y datos) desde la base de datos. */
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileResolved, setProfileResolved] = useState(false)

  useEffect(() => {
    let active = true
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return
        setSession(data.session)
      })
      .finally(() => {
        if (active) setAuthReady(true)
      })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (!newSession) setProfile(null)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  // Perfil (incluye el rol leído desde la BD; la autorización real la aplica el servidor).
  const userId = session?.user?.id ?? null
  useEffect(() => {
    let active = true
    setProfileResolved(false)
    if (userId) {
      void fetchProfile(userId)
        .then((p) => {
          if (active) setProfile(p)
        })
        .finally(() => {
          if (active) setProfileResolved(true)
        })
    }
    return () => {
      active = false
    }
  }, [userId])

  const refreshProfile = useCallback(async () => {
    if (!session?.user) return
    const p = await fetchProfile(session.user.id)
    setProfile(p)
  }, [session?.user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      toast.error('No se pudo cerrar sesión. Inténtalo de nuevo.')
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      profile,
      // True hasta que la sesión y el perfil (rol) estén resueltos. Evita
      // decidir el guard de admin en un render intermedio sin perfil.
      isProfileLoading: !authReady || (session?.user != null && !profileResolved),
      isAdmin: profile?.role === 'admin',
      refreshProfile,
      signOut: handleSignOut,
    }),
    [session, profile, authReady, profileResolved, refreshProfile, handleSignOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
