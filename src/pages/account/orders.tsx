import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, PackageSearch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageSpinner } from '@/components/ui/spinner'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { useMyOrders } from '@/features/orders/hooks'
import { OrderStatusBadge, OrderTimeline, PlacedOrderTotals } from '@/features/orders/components'
import { PAYMENT_METHOD_LABELS } from '@/lib/constants'
import { cn, formatDateTime, formatMoney } from '@/lib/utils'
import type { PaymentMethod } from '@/types/database'
import { PLACEHOLDER_IMAGE } from '@/lib/config'

export function AccountOrdersPage() {
  const { data: orders, isLoading, isError, error, refetch } = useMyOrders()
  const [openId, setOpenId] = useState<string | null>(null)

  if (isLoading) return <PageSpinner label="Cargando tus pedidos…" />

  if (isError)
    return (
      <ErrorState
        title="No se pudieron cargar tus pedidos"
        description={error instanceof Error ? error.message : undefined}
        onRetry={() => void refetch()}
      />
    )

  if (!orders?.length)
    return (
      <EmptyState
        icon={PackageSearch}
        title="Aún no tienes pedidos"
        description="Cuando realices tu primera compra aparecerá aquí con su estado y detalle completo."
        action={
          <Link to="/catalogo">
            <Button>Explorar el catálogo</Button>
          </Link>
        }
      />
    )

  return (
    <div className="container max-w-4xl pb-16">
      <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Mis pedidos</h1>
      <p className="mt-1 text-sm text-slate-500">Historial completo de tus compras. Toca un pedido para ver el detalle.</p>

      <ul className="mt-6 space-y-3">
        {orders.map((order) => {
          const open = openId === order.id
          return (
            <li key={order.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : order.id)}
                aria-expanded={open}
                className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="font-display text-sm font-bold text-slate-900">{order.orderNumber}</p>
                  <p className="text-xs text-slate-500">
                    {formatDateTime(order.createdAt)} · {order.itemCount} artículo{order.itemCount === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold tabular-nums text-slate-900">{formatMoney(order.total)}</span>
                  <OrderStatusBadge status={order.status} />
                  <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform', open && 'rotate-180')} aria-hidden />
                </div>
              </button>

              {open && (
                <div className="border-t border-slate-100 px-5 py-4">
                  <OrderTimeline status={order.status} />
                  <p className="mt-3 text-xs text-slate-500">
                    Pago: {PAYMENT_METHOD_LABELS[order.paymentMethod as PaymentMethod] ?? order.paymentMethod}
                  </p>
                  <ul className="mt-3 divide-y divide-slate-100">
                    {order.items.map((it) => (
                      <li key={it.id} className="flex items-center gap-4 py-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                          <img src={it.imageUrl ?? PLACEHOLDER_IMAGE(it.productName)} alt="" className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          {it.slug ? (
                            <Link to={`/producto/${it.slug}`} className="block truncate text-sm font-medium text-slate-900 hover:text-brand-700">
                              {it.productName}
                            </Link>
                          ) : (
                            <p className="truncate text-sm font-medium text-slate-900">{it.productName}</p>
                          )}
                          <p className="text-xs text-slate-500">
                            {it.brand} · {it.quantity} × {formatMoney(it.unitPriceFinal)}
                            {it.discountPercent > 0 && <span className="text-emerald-600"> (−{it.discountPercent}%)</span>}
                          </p>
                        </div>
                        <p className="text-sm font-semibold tabular-nums text-slate-900">{formatMoney(it.lineTotal)}</p>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 max-w-xs">
                    <PlacedOrderTotals
                      compact
                      subtotal={order.subtotal}
                      discountTotal={order.discountTotal}
                      shippingTotal={order.shippingTotal}
                      total={order.total}
                    />
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
