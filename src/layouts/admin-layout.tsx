import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, LogOut, MessageSquare, Package, Percent, ShoppingBag, Truck } from 'lucide-react'
import { useAuth } from '@/features/auth/auth-context'
import { cn } from '@/lib/utils'
import { SITE } from '@/lib/config'

const LINKS = [
  { to: '/admin', label: 'Resumen', icon: LayoutDashboard, end: true },
  { to: '/admin/productos', label: 'Productos', icon: Package, end: false },
  { to: '/admin/ofertas', label: 'Ofertas', icon: Percent, end: false },
  { to: '/admin/pedidos', label: 'Pedidos', icon: ShoppingBag, end: false },
  { to: '/admin/soporte', label: 'Soporte', icon: MessageSquare, end: false },
]

export function AdminLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="border-b border-slate-200 p-5">
          <NavLink to="/" className="font-display text-lg font-bold text-slate-900">
            Innov<span className="text-brand-600">Ventas</span>
          </NavLink>
          <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">Panel de administración</p>
        </div>
        <nav className="flex-1 space-y-1 p-3" aria-label="Administración">
          {LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium',
                  isActive ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
          <div className="my-3 border-t border-slate-100" />
          <NavLink
            to="/"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            <Truck className="h-4 w-4" />
            Ver tienda
          </NavLink>
        </nav>
        <div className="border-t border-slate-200 p-4">
          <p className="mb-1 truncate text-sm font-medium text-slate-900">{profile?.fullName ?? 'Admin'}</p>
          <p className="mb-3 truncate text-xs text-slate-500">{profile?.email}</p>
          <button
            type="button"
            onClick={() => void signOut().then(() => navigate('/'))}
            className="flex items-center gap-2 text-sm text-rose-600 hover:underline"
          >
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-8">
          <p className="font-display text-sm font-semibold text-slate-900">
            {SITE.name} · Administración
          </p>
          <nav className="flex items-center gap-4 lg:hidden" aria-label="Admin móvil">
            {LINKS.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end} className="text-xs font-medium text-slate-600">
                {label}
              </NavLink>
            ))}
          </nav>
        </header>
        <main className="min-w-0 flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
