import { useState, type FormEvent } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, LogOut, Menu, Package, Search, ShoppingCart, Truck, User, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, initials } from '@/lib/utils'
import { SITE } from '@/lib/config'
import { useAuth } from '@/features/auth/auth-context'
import { useCart } from '@/features/cart/cart-context'

export const NAV_LINKS = [
  { to: '/', label: 'Inicio' },
  { to: '/catalogo', label: 'Catálogo' },
  { to: '/ofertas', label: 'Ofertas' },
  { to: '/mas-vendidos', label: 'Más vendidos' },
  { to: '/categorias', label: 'Categorías' },
  { to: '/faq', label: 'Ayuda' },
] as const

function SearchForm({ className, autoFocus, onSubmitted }: { className?: string; autoFocus?: boolean; onSubmitted?: () => void }) {
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const query = q.trim()
    navigate(query ? `/catalogo?q=${encodeURIComponent(query)}` : '/catalogo')
    setQ('')
    onSubmitted?.()
  }
  return (
    <form onSubmit={submit} className={cn('relative', className)} role="search">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        type="search"
        placeholder="Buscar productos, marcas…"
        aria-label="Buscar productos"
        autoFocus={autoFocus}
        className="h-10 w-full rounded-full border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
      />
    </form>
  )
}

function AccountMenu() {
  const { user, profile, isAdmin, signOut } = useAuth()
  const [open, setOpen] = useState(false)

  if (!user) {
    return (
      <div className="hidden items-center gap-2 md:flex">
        <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
          Ingresar
        </Link>
        <Link to="/registro" className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">
          Crear cuenta
        </Link>
      </div>
    )
  }

  return (
    <div className="relative hidden md:block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1.5 pl-1.5 pr-3 text-sm shadow-card hover:border-brand-300"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
          {initials(profile?.fullName || (user.email ?? 'U'))}
        </span>
        <span className="max-w-24 truncate text-slate-700">{profile?.fullName || 'Mi cuenta'}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-panel"
          onMouseLeave={() => setOpen(false)}
        >
          <Link to="/cuenta" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" role="menuitem">
            <User className="h-4 w-4" /> Mi perfil
          </Link>
          <Link to="/cuenta/pedidos" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" role="menuitem">
            <Package className="h-4 w-4" /> Mis pedidos
          </Link>
          {isAdmin && (
            <Link to="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50" role="menuitem">
              <LayoutDashboard className="h-4 w-4" /> Panel admin
            </Link>
          )}
          <Link to="/seguimiento" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" role="menuitem">
            <Truck className="h-4 w-4" /> Seguimiento
          </Link>
          <hr className="my-1 border-slate-100" />
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              void signOut().then(() => {
                window.location.href = '/'
              })
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
            role="menuitem"
          >
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}

function MobileDrawer({ onClose }: { onClose: () => void }) {
  const { user, isAdmin } = useAuth()
  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-label="Menú de navegación">
      <div className="absolute inset-0 bg-slate-950/40" onClick={onClose} aria-hidden />
      <div className="absolute left-0 top-0 h-full w-80 max-w-[85vw] overflow-y-auto bg-white p-5 shadow-panel">
        <div className="mb-6 flex items-center justify-between">
          <span className="font-display text-lg font-bold text-brand-700">{SITE.name}</span>
          <button onClick={onClose} aria-label="Cerrar menú" className="rounded-lg p-2 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <SearchForm className="mb-6" onSubmitted={onClose} />
        <nav className="flex flex-col gap-1">
          {NAV_LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3 py-2.5 text-sm font-medium',
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-50',
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
          <hr className="my-2 border-slate-100" />
          {user ? (
            <>
              <Link to="/cuenta" onClick={onClose} className="rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                Mi cuenta
              </Link>
              {isAdmin && (
                <Link to="/admin" onClick={onClose} className="rounded-lg px-3 py-2.5 text-sm font-medium text-brand-700 hover:bg-brand-50">
                  Panel admin
                </Link>
              )}
            </>
          ) : (
            <>
              <Link to="/login" onClick={onClose} className="rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                Ingresar
              </Link>
              <Link to="/registro" onClick={onClose} className="rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                Crear cuenta
              </Link>
            </>
          )}
        </nav>
      </div>
    </div>
  )
}

export function Header() {
  const { itemCount } = useCart()
  const [drawer, setDrawer] = useState(false)

  return (
    <>
      <div className="bg-brand-950 py-2 text-center text-xs text-brand-100">
        <Truck className="mr-1 inline h-3.5 w-3.5" aria-hidden />
        Envío gratis en compras mayores a <strong>S/ 1,500</strong> · Cambios y devoluciones en 5 días
      </div>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="container flex h-16 items-center gap-4">
          <button type="button" className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden" onClick={() => setDrawer(true)} aria-label="Abrir menú">
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="Ir al inicio">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 font-display text-lg font-bold text-white">I</span>
            <span className="font-display text-lg font-bold tracking-tight text-slate-900">
              Innov<span className="text-brand-600">Ventas</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Principal">
            {NAV_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive ? 'text-brand-700' : 'text-slate-600 hover:text-slate-900',
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <SearchForm className="hidden w-64 lg:block" />
            <Link
              to="/carrito"
              className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 shadow-card hover:border-brand-300"
              aria-label={`Carrito, ${itemCount} artículos`}
            >
              <ShoppingCart className="h-5 w-5" aria-hidden />
              {itemCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[11px] font-bold text-white">
                  {itemCount}
                </span>
              )}
            </Link>
            <AccountMenu />
          </div>
        </div>
      </header>
      {drawer && <MobileDrawer onClose={() => setDrawer(false)} />}
    </>
  )
}
