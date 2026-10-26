import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Store } from 'lucide-react'

/** Tarjeta centrada para formularios de autenticación. */
export function AuthCard({ title, subtitle, children, footer }: {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="container flex max-w-md flex-col justify-center pb-20">
      <Link to="/" className="mb-6 flex items-center gap-2 self-start" aria-label="Ir al inicio de InnovVentas">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
          <Store className="h-5 w-5" aria-hidden />
        </span>
        <span className="font-display text-lg font-bold text-slate-900">
          Innov<span className="text-brand-600">Ventas</span>
        </span>
      </Link>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <h1 className="font-display text-xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        <div className="mt-5">{children}</div>
      </div>
      {footer && <div className="mt-4 text-center text-sm text-slate-500">{footer}</div>}
      <p className="mt-6 text-center text-xs text-slate-400">
        Tienda de demostración: los datos viven solo en el proyecto de Supabase que configures.
      </p>
    </div>
  )
}
