import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Boxes, BarChart3, ShoppingBag, Wallet, Inbox } from 'lucide-react'
import { PageSpinner } from '@/components/ui/spinner'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { useAdminDashboard } from '@/features/admin/api'
import { formatMoney } from '@/lib/utils'

function StatCard({ icon: Icon, label, value, tone }: {
  icon: typeof Boxes
  label: string
  value: string
  tone: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}>
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 font-display text-2xl font-bold tabular-nums text-slate-900">{value}</p>
    </div>
  )
}

export function AdminDashboardPage() {
  const { data, isLoading, isError, error, refetch } = useAdminDashboard()

  if (isLoading) return <PageSpinner label="Cargando estadísticas…" />
  if (isError)
    return (
      <ErrorState
        title="No se pudo cargar el resumen"
        description={error instanceof Error ? error.message : undefined}
        onRetry={() => void refetch()}
      />
    )
  if (!data) return <EmptyState icon={Inbox} title="Sin estadísticas todavía" />

  return (
    <div>
      <h1 className="font-display text-xl font-bold text-slate-900">Resumen</h1>
      <p className="mt-1 text-sm text-slate-500">Métricas calculadas por la función RPC segura admin_dashboard.</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={Boxes} label="Publicados" value={String(data.products_published)} tone="bg-emerald-50 text-emerald-600" />
        <StatCard icon={BarChart3} label="Borradores" value={String(data.products_draft)} tone="bg-slate-100 text-slate-500" />
        <StatCard icon={AlertTriangle} label="Stock bajo (≤ 5)" value={String(data.low_stock)} tone="bg-amber-50 text-amber-600" />
        <StatCard icon={ShoppingBag} label="Pedidos totales" value={String(data.orders_total)} tone="bg-brand-50 text-brand-600" />
        <StatCard icon={Wallet} label="Ingresos (30 días)" value={formatMoney(data.revenue_30d)} tone="bg-cyan-50 text-cyan-600" />
        <StatCard icon={Inbox} label="Soporte abierto" value={String(data.open_support)} tone="bg-rose-50 text-rose-600" />
      </div>

      {data.orders_pending > 0 && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm text-amber-900">
            Tienes <strong>{data.orders_pending}</strong> pedido{data.orders_pending === 1 ? '' : 's'} pendiente{data.orders_pending === 1 ? '' : 's'}
            {' '}de pago o preparación.
          </p>
          <Link to="/admin/pedidos" className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-900 underline">
            Ir a pedidos <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      )}

      <nav className="mt-6 grid gap-3 sm:grid-cols-3" aria-label="Acciones rápidas">
        <Link to="/admin/productos" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition-colors hover:border-brand-300">
          <p className="font-display text-sm font-bold text-slate-900">Productos</p>
          <p className="mt-1 text-xs text-slate-500">Crear, editar, publicar y gestionar inventario.</p>
        </Link>
        <Link to="/admin/ofertas" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition-colors hover:border-brand-300">
          <p className="font-display text-sm font-bold text-slate-900">Ofertas</p>
          <p className="mt-1 text-xs text-slate-500">Descuentos por rango de fechas.</p>
        </Link>
        <Link to="/admin/soporte" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition-colors hover:border-brand-300">
          <p className="font-display text-sm font-bold text-slate-900">Soporte</p>
          <p className="mt-1 text-xs text-slate-500">Solicitudes del formulario de contacto.</p>
        </Link>
      </nav>
    </div>
  )
}
