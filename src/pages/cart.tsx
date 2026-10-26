import { Link } from 'react-router-dom'
import { ImageIcon, Trash2, Truck } from 'lucide-react'
import { useProductsByIds } from '@/features/products/hooks'
import { useCart } from '@/features/cart/cart-context'
import { Button } from '@/components/ui/button'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { CartSkeleton } from '@/features/cart/cart-skeleton'
import { PlacedOrderTotals } from '@/features/orders/components'
import { PLACEHOLDER_IMAGE, FREE_SHIPPING_THRESHOLD, SHIPPING_COST } from '@/lib/config'
import { formatMoney } from '@/lib/utils'

export function CartPage() {
  const { items, hydrated, setItemQuantity, removeItem, clear } = useCart()
  const products = useProductsByIds(items.map((it) => it.productId))
  const byId = new Map((products.data ?? []).map((p) => [p.id, p]))

  if (!hydrated) return <CartSkeleton />

  const lines = items
    .map((it) => ({ item: it, product: byId.get(it.productId) }))
    .sort((a, b) => a.item.name.localeCompare(b.item.name))
  const unavailable = lines.filter((l) => !l.product)
  const available = lines.filter((l) => l.product)

  const subtotal = available.reduce(
    (acc, l) => acc + (l.product!.offerPrice ?? l.product!.price) * l.item.quantity,
    0,
  )
  const savings = available.reduce((acc, l) => {
    if (l.product!.offerPrice == null) return acc
    return acc + (l.product!.price - l.product!.offerPrice) * l.item.quantity
  }, 0)
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0 ? 0 : SHIPPING_COST
  const freeShippingMiss = subtotal > 0 && subtotal < FREE_SHIPPING_THRESHOLD

  if (items.length === 0) {
    return (
      <EmptyState
        title="Tu carrito está vacío"
        description="Agrega productos desde el catálogo: se sincronizan con tu cuenta de Supabase si iniciaste sesión."
        icon={Truck}
        action={
          <Link to="/catalogo" className="inline-flex h-10 items-center rounded-lg bg-brand-600 px-5 text-sm font-medium text-white hover:bg-brand-700">
            Explorar catálogo
          </Link>
        }
      />
    )
  }

  return (
    <div className="container pb-16">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Carrito</h1>
        <button type="button" onClick={clear} className="text-sm font-medium text-rose-600 hover:underline">
          Vaciar carrito
        </button>
      </header>

      {products.error && <ErrorState onRetry={() => void products.refetch()} />}

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {available.map(({ item, product }) => {
            const price = product!.offerPrice ?? product!.price
            return (
              <div
                key={item.productId}
                className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:flex-row sm:items-center"
              >
                <Link to={`/producto/${item.slug}`} className="shrink-0">
                  <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-slate-100 bg-slate-50 sm:h-24 sm:w-24">
                    <img
                      src={item.imageUrl ?? PLACEHOLDER_IMAGE(item.name)}
                      alt={item.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </Link>
                <div className="min-w-0 flex-1">
                  <Link to={`/producto/${item.slug}`} className="font-display text-sm font-semibold text-slate-900 hover:text-brand-700 md:text-base">
                    {item.name}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {item.brand} · Stock disponible: {product!.stock}
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <QuantityStepper
                      value={item.quantity}
                      max={Math.min(10, Math.max(product!.stock, 1))}
                      onChange={(v) => setItemQuantity(item.productId, v)}
                      label={`Cantidad de ${item.name}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId)}
                      aria-label={`Eliminar ${item.name} del carrito`}
                      className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {product!.offerPrice != null && (
                    <p className="mt-1.5 text-xs text-emerald-700">
                      Oferta aplicada: {formatMoney(product!.price)} → {formatMoney(product!.offerPrice)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-base font-bold text-slate-900">{formatMoney(price * item.quantity)}</p>
                  {product!.offerPrice != null && (
                    <p className="text-xs text-slate-400">({formatMoney(product!.price * item.quantity)} sin oferta)</p>
                  )}
                </div>
              </div>
            )
          })}

          {unavailable.map(({ item }) => (
            <div key={item.productId} className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <ImageIcon className="h-5 w-5 shrink-0" aria-hidden />
              <p className="flex-1">
                <strong>{item.name}</strong> ya no está disponible en el catálogo y no se incluirá en el checkout.
              </p>
              <button type="button" onClick={() => removeItem(item.productId)} className="text-xs font-semibold hover:underline">
                Quitar
              </button>
            </div>
          ))}

          {freeShippingMiss && (
            <p className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
              <Truck className="mr-1.5 inline h-4 w-4" aria-hidden />
              Te faltan <strong>{formatMoney(FREE_SHIPPING_THRESHOLD - subtotal)}</strong> para envío gratis.
            </p>
          )}
        </div>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="font-display text-lg font-semibold text-slate-900">Resumen</h2>
          <div className="mt-4">
            <PlacedOrderTotals subtotal={subtotal} discountTotal={savings} shippingTotal={shipping} total={subtotal + shipping} />
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Totales de referencia. El servidor recalcula precios y stock al confirmar — el cliente no define el total final.
          </p>
          <Link
            to="/checkout"
            className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-xl bg-brand-600 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Continuar al checkout
          </Link>
        </aside>
      </div>
    </div>
  )
}
