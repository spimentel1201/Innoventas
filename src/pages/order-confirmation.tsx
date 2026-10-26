import { Link, useParams } from 'react-router-dom'
import { CheckCircle2, Package, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageSpinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/states'
import { OrderStatusBadge, OrderTimeline, PlacedOrderTotals } from '@/features/orders/components'
import { useOrderDetail } from '@/features/orders/hooks'
import { PAYMENT_METHOD_LABELS } from '@/lib/constants'
import { formatDateTime, formatMoney } from '@/lib/utils'
import type { PaymentMethod } from '@/types/database'
import { PLACEHOLDER_IMAGE } from '@/lib/config'

export function OrderConfirmationPage() {
  const { orderNumber = '' } = useParams()
  const { data: order, isLoading } = useOrderDetail(orderNumber)

  if (isLoading) return <PageSpinner label="Cargando tu pedido…" />

  if (!order)
    return (
      <EmptyState
        title="No pudimos encontrar este pedido"
        description={`El pedido ${orderNumber} no existe o no pertenece a tu sesión actual. Verifícalo en seguimiento.`}
        icon={Package}
        action={
          <Link to="/seguimiento" className="inline-flex h-10 items-center rounded-lg bg-brand-600 px-5 text-sm font-medium text-white hover:bg-brand-700">
            Ir a seguimiento
          </Link>
        }
      />
    )

  const paidSimulated = order.paymentMethod === 'demo_card'

  return (
    <div className="container max-w-3xl pb-16">
      <div className="rounded-3xl bg-gradient-to-br from-emerald-600 to-emerald-500 px-8 py-10 text-center text-white shadow-panel">
        <CheckCircle2 className="mx-auto mb-3 h-14 w-14" aria-hidden />
        <h1 className="font-display text-2xl font-bold md:text-3xl">¡Pedido confirmado!</h1>
        <p className="mt-2 text-sm text-emerald-50">
          Número de pedido: <strong className="tracking-wide">{order.orderNumber}</strong>
        </p>
        <p className="mt-1 text-xs text-emerald-100">
          Guarda este número para rastrearlo en cualquier momento.
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <OrderStatusBadge status={order.status} />
          <p className="text-xs text-slate-500">Registrado el {formatDateTime(order.createdAt)}</p>
        </div>
        <div className="mt-4">
          <OrderTimeline status={order.status} />
        </div>
        <p className="mt-4 text-sm text-slate-600">
          Método de pago: <strong>{PAYMENT_METHOD_LABELS[order.paymentMethod as PaymentMethod] ?? order.paymentMethod}</strong>
        </p>
        {paidSimulated && (
          <p className="mt-1 text-xs text-slate-400">
            Pago simulado para la demostración: no se realizó ningún cobro real.
          </p>
        )}
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <h2 className="mb-3 font-display text-lg font-semibold text-slate-900">Artículos</h2>
        <ul className="divide-y divide-slate-100">
          {order.items.map((it) => (
            <li key={it.id} className="flex items-center gap-4 py-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                <img src={it.imageUrl ?? PLACEHOLDER_IMAGE(it.productName)} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{it.productName}</p>
                <p className="text-xs text-slate-500">
                  {it.brand} · {it.quantity} × {formatMoney(it.unitPriceFinal)}
                  {it.discountPercent > 0 && <span className="text-emerald-600"> (−{it.discountPercent}%)</span>}
                </p>
              </div>
              <p className="text-sm font-semibold tabular-nums text-slate-900">{formatMoney(it.lineTotal)}</p>
            </li>
          ))}
        </ul>
        <hr className="my-4 border-slate-100" />
        <div className="max-w-xs">
          <PlacedOrderTotals
            subtotal={order.subtotal}
            discountTotal={order.discountTotal}
            shippingTotal={order.shippingTotal}
            total={order.total}
          />
        </div>
      </section>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button variant="outline" type="button" onClick={() => (window.location.href = '/seguimiento')}>
          Guardar número y seguir
        </Button>
        <Link
          to="/catalogo"
          className="inline-flex h-10 items-center rounded-lg bg-brand-600 px-5 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Sparkles className="mr-1.5 h-4 w-4" aria-hidden />
          Seguir comprando
        </Link>
      </div>
    </div>
  )
}
