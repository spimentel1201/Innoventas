import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { PageSpinner } from '@/components/ui/spinner'
import { useAuth } from './auth-context'

function AuthGate({ requireAdmin, children }: { requireAdmin: boolean; children?: ReactNode }) {
  const { user, isAdmin, isProfileLoading } = useAuth()
  const location = useLocation()

  if (isProfileLoading) return <PageSpinner label="Verificando sesión…" />

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />

  if (requireAdmin && !isAdmin) return <Navigate to="/" replace />

  return children ? <>{children}</> : <Outlet />
}

export function RequireAuth({ children }: { children?: ReactNode }) {
  return <AuthGate requireAdmin={false}>{children}</AuthGate>
}

export function RequireAdmin({ children }: { children?: ReactNode }) {
  return <AuthGate requireAdmin={true}>{children}</AuthGate>
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (user) return <Navigate to="/cuenta" replace />
  return <>{children}</>
}
