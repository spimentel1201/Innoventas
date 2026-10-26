import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FieldError, Input, Label } from '@/components/ui/field'
import { PageSpinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/states'
import { useTrackOrderMutation } from '@/features/orders/hooks'
import { OrderStatusBadge, OrderTimeline, PlacedOrderTotals } from '@/features/orders/components'
import { PAYMENT_METHOD_LABELS } from '@/lib/constants'
import { formatDateTime, formatMoney } from '@/lib/utils'
import type { TrackOrderResult } from '@/types/domain'
import type { PaymentMethod } from '@/types/database'
import { PLACEHOLDER_IMAGE } from '@/lib/config'

/** Seguimiento público de pedidos: número de pedido + correo (protegido por RPC track_order). */
export function OrderTrackingPage() {
  const [orderNumber, setOrderNumber] = useState('')
  const [email, setEmail] = useState('')
  const [result, setResult] = useState<TrackOrderResult | null>(null)
  const [searched, setSearched] = useState(false)
  const [formError, setFormError] = useState('')
  const mutation = useTrackOrderMutation()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const number = orderNumber.trim()
    const mail = email.trim()
    if (!number || !mail) {
      setFormError('Escribe el número de pedido y el correo con el que compraste.')
      return
    }
    if (!/^[A-Za-z]{2,5}-\d{6}-\d{4,6}$/.test(number)) {
      // Formato esperado: INV-AAAAMM-###### (se explica bajo el formulario).
      setFormError('El número de pedido parece incorrecto. Ejemplo: INV-202610-000012')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      setFormError('Escribe un correo válido.')
      return
    }
    setFormError('')
    mutation.mutate(
      { orderNumber: number, email: mail },
      {
        onSuccess: (data) => {
          setResult(data)
          setSearched(true)
        },
        onError: () => setSearched(true),
      },
    )
  }

  const notFound = searched && !mutation.isPending && !result

  return (
    <div className="container max-w-3xl pb-16">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
          Seguimiento de pedidos
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Consulta el estado de tu pedido con el número que recibiste al confirmar la compra.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card"
        noValidate
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="track-order">Número de pedido</Label>
            <Input
              id="track-order"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="INV-202610-000012"
              autoComplete="off"
            />
          </div>
          <div>
            <Label htmlFor="track-email">Correo de compra</Label>
            <Input
              id="track-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              autoComplete="email"
            />
          </div>
        </div>
        <FieldError message={formError} />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="submit" loading={mutation.isPending}>
            Buscar pedido
          </Button>
          <p className="text-xs text-slate-400">
            El número aparece en la pantalla de confirmación y en «Mis pedidos» (formato INV‑AAAAMM‑######).
          </p>
        </div>
      </form>

      {mutation.isError && (
        <div className="mt-6">
          <EmptyState
            icon={Package}
            title="No se pudo consultar"
            description={
              mutation.error instanceof Error
                ? mutation.error.message
                : 'Ocurrió un error al buscar el pedido. Inténtalo de nuevo.'
            }
          />
        </div>
      )}

      {notFound && (
        <div className="mt-6">
          <EmptyState
            icon={Package}
            title="Pedido no encontrado"
            description="Verifica el número y el correo. El pedido debe existir con exactamente ese correo de contacto."
            action={
              <Link
                to="/contacto"
                className="inline-flex h-10 items-center rounded-lg bg-brand-600 px-5 text-sm font-medium text-white hover:bg-brand-700"
              >
                Contactar soporte
              </Link>
            }
          />
        </div>
      )}

      {mutation.isPending && searched && <PageSpinner label="Buscando tu pedido…" />}

      {result && (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Pedido</p>
              <p className="font-display text-lg font-bold text-slate-900">{result.order_number}</p>
            </div>
            <OrderStatusBadge status={result.status} />
          </div>

          <div className="mt-4"><OrderTimeline status={result.status} /></div>

          <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
            <p>Solicitado: <strong>{formatDateTime(result.created_at)}</strong></p>
            <p>Última actualización: <strong>{formatDateTime(result.updated_at)}</strong></p>
            {result.shipping.city && (
              <p>Destino: <strong>{result.shipping.city}{result.shipping.country ? `, ${result.shipping.country}` : ''}</strong></p>
            )}
          </div>

          <h2 className="mt-6 font-display text-base font-semibold text-slate-900">Artículos</h2>
          <ul className="mt-2 divide-y divide-slate-100">
            {result.items.map((it, i) => (
              <li key={`${it.slug}-${i}`} className="flex items-center gap-4 py-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                  <img src={it.image_url ?? PLACEHOLDER_IMAGE(it.product_name)} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{it.product_name}</p>
                  <p className="text-xs text-slate-500">
                    {it.brand} · {it.quantity} × {formatMoney(it.unit_price_final)}
                  </p>
                </div>
                <p className="text-sm font-semibold tabular-nums text-slate-900">{formatMoney(it.line_total)}</p>
              </li>
            ))}
          </ul>

          <hr className="my-4 border-slate-100" />
          <PlacedOrderTotals
            subtotal={result.totals.subtotal}
            discountTotal={result.totals.discount_total}
            shippingTotal={result.totals.shipping_total}
            total={result.totals.total}
          />
        </section>
      )}

      <p className="mt-6 text-xs text-slate-400">
        ¿Tienes cuenta? En <Link to="/cuenta/pedidos" className="text-brand-700 underline">Mis pedidos</Link> verás tu
        historial sin necesidad del correo. Métodos de pago disponibles: {Object.values(PAYMENT_METHOD_LABELS).join(' · ')} (demo).
      </p>
    </div>
  )
}
