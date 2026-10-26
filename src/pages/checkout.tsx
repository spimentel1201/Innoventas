import { useEffect } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { BadgeCheck, Landmark, HandCoins, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FieldError, Input, Label, Textarea } from '@/components/ui/field'
import { PageSpinner } from '@/components/ui/spinner'
import { checkoutSchema, type CheckoutInput } from '@/lib/validations/checkout'
import { PAYMENT_METHOD_LABELS } from '@/lib/constants'
import { FREE_SHIPPING_THRESHOLD, SHIPPING_COST } from '@/lib/config'
import { formatMoney } from '@/lib/utils'
import { useCart } from '@/features/cart/cart-context'
import { useProductsByIds } from '@/features/products/hooks'
import { placeOrder } from '@/features/orders/api'
import { CartSkeleton } from '@/features/cart/cart-skeleton'
import { toast } from 'sonner'

function CartTotals() {
  const { items } = useCart()
  const products = useProductsByIds(items.map((it) => it.productId))
  const byId = new Map((products.data ?? []).map((p) => [p.id, p]))
  const subtotal = items.reduce((acc, it) => {
    const p = byId.get(it.productId)
    if (!p) return acc
    return acc + (p.offerPrice ?? p.price) * it.quantity
  }, 0)
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <h2 className="font-display text-lg font-semibold text-slate-900">Tu pedido</h2>
      <ul className="mt-3 space-y-2 text-sm text-slate-600">
        {items.map((it) => {
          const p = byId.get(it.productId)
          if (!p) return null
          const price = p.offerPrice ?? p.price
          return (
            <li key={it.productId} className="flex items-center justify-between gap-3">
              <span className="min-w-0 flex-1 truncate">
                {p.name} <span className="text-slate-400">×{it.quantity}</span>
              </span>
              <span className="tabular-nums">{formatMoney(price * it.quantity)}</span>
            </li>
          )
        })}
      </ul>
      <hr className="my-3 border-slate-100" />
      <div className="space-y-1 text-sm">
        <p className="flex justify-between text-slate-600"><span>Subtotal</span><span className="tabular-nums">{formatMoney(subtotal)}</span></p>
        <p className="flex justify-between text-slate-600">
          <span>Envío</span>
          <span className="tabular-nums">{shipping === 0 ? 'Gratis' : formatMoney(shipping)}</span>
        </p>
        <p className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
          <span>Total</span>
          <span className="tabular-nums">{formatMoney(subtotal + shipping)}</span>
        </p>
      </div>
      <p className="mt-3 text-xs text-slate-400">Estimación de referencia; el total final lo calcula y guarda el servidor.</p>
    </div>
  )
}

export function CheckoutPage() {
  const navigate = useNavigate()
  const { items, hydrated } = useCart()
  const products = useProductsByIds(items.map((it) => it.productId))
  const byId = new Map((products.data ?? []).map((p) => [p.id, p]))

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      shipping: { fullName: '', phone: '', line1: '', line2: '', city: '', state: '', postalCode: '', country: 'Perú', notes: '' },
      paymentMethod: undefined as unknown as 'transfer' | 'cod' | 'demo_card',
    },
  })

  // Si todo se eliminó, no tiene sentido quedarse aquí.
  useEffect(() => {
    if (hydrated && items.length === 0) navigate('/carrito', { replace: true })
  }, [hydrated, items.length, navigate])

  const onSubmit = handleSubmit(async (values) => {
    const payload = {
      items: items
        .filter((it) => byId.has(it.productId) && byId.get(it.productId)!.stock > 0)
        .map((it) => ({ productId: it.productId, quantity: it.quantity })),
      shipping: {
        fullName: values.shipping.fullName,
        phone: values.shipping.phone,
        line1: values.shipping.line1,
        line2: values.shipping.line2 || undefined,
        city: values.shipping.city,
        state: values.shipping.state,
        postalCode: values.shipping.postalCode,
        country: values.shipping.country,
        notes: values.shipping.notes || undefined,
      },
      paymentMethod: values.paymentMethod,
    }

    try {
      const order = await placeOrder(payload)
      toast.success(`Pedido ${order.orderNumber} registrado`)
      navigate(`/pedido-confirmado/${order.orderNumber}`, { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo crear el pedido.')
    }
  })

  if (!hydrated) return <CartSkeleton />
  if (products.isLoading && items.length > 0) return <PageSpinner label="Verificando precios actuales…" />

  if (items.length === 0) return <Navigate to="/carrito" replace />

  return (
    <div className="container pb-16">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Checkout</h1>
        <nav className="mt-2 flex items-center gap-2 text-xs text-slate-500">
          <Link to="/carrito" className="hover:text-brand-700">Carrito</Link>
          <span aria-hidden>›</span>
          <span className="font-semibold text-brand-700">Envío y pago</span>
          <span aria-hidden>›</span>
          <span>Confirmación</span>
        </nav>
      </header>

      <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1fr_360px]" noValidate>
        <div className="space-y-8">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card" aria-labelledby="addr-title">
            <h2 id="addr-title" className="font-display text-lg font-semibold text-slate-900">Dirección de envío</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="f-name">Nombre completo de quien recibe</Label>
                <Input id="f-name" {...register('shipping.fullName')} aria-invalid={Boolean(errors.shipping?.fullName)} />
                <FieldError message={errors.shipping?.fullName?.message} />
              </div>
              <div>
                <Label htmlFor="f-phone">Teléfono</Label>
                <Input id="f-phone" inputMode="tel" placeholder="55 0000 0000" {...register('shipping.phone')} aria-invalid={Boolean(errors.shipping?.phone)} />
                <FieldError message={errors.shipping?.phone?.message} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="f-line1">Calle y número</Label>
                <Input id="f-line1" {...register('shipping.line1')} aria-invalid={Boolean(errors.shipping?.line1)} />
                <FieldError message={errors.shipping?.line1?.message} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="f-line2">Interior, referencia (opcional)</Label>
                <Input id="f-line2" {...register('shipping.line2')} />
              </div>
              <div>
                <Label htmlFor="f-city">Ciudad</Label>
                <Input id="f-city" {...register('shipping.city')} aria-invalid={Boolean(errors.shipping?.city)} />
                <FieldError message={errors.shipping?.city?.message} />
              </div>
              <div>
                <Label htmlFor="f-state">Estado</Label>
                <Input id="f-state" {...register('shipping.state')} aria-invalid={Boolean(errors.shipping?.state)} />
                <FieldError message={errors.shipping?.state?.message} />
              </div>
              <div>
                <Label htmlFor="f-zip">Código postal</Label>
                <Input id="f-zip" inputMode="numeric" {...register('shipping.postalCode')} aria-invalid={Boolean(errors.shipping?.postalCode)} />
                <FieldError message={errors.shipping?.postalCode?.message} />
              </div>
              <div>
                <Label htmlFor="f-country">País</Label>
                <Input id="f-country" {...register('shipping.country')} aria-invalid={Boolean(errors.shipping?.country)} />
                <FieldError message={errors.shipping?.country?.message} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="f-notes">Notas para el repartidor (opcional)</Label>
                <Textarea id="f-notes" rows={2} {...register('shipping.notes')} />
                <FieldError message={errors.shipping?.notes?.message} />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card" aria-labelledby="pay-title">
            <h2 id="pay-title" className="font-display text-lg font-semibold text-slate-900">Método de pago</h2>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              Pagos de demostración: no se procesan cobros reales ni se almacenan datos de tarjetas.
            </p>
            <div className="mt-4 space-y-3">
              {(
                [
                  { value: 'transfer', icon: Landmark, label: PAYMENT_METHOD_LABELS.transfer, hint: 'Se te comparten los CLABE al confirmar.' },
                  { value: 'cod', icon: HandCoins, label: PAYMENT_METHOD_LABELS.cod, hint: 'Paga recibiendo tu paquete.' },
                  { value: 'demo_card', icon: BadgeCheck, label: PAYMENT_METHOD_LABELS.demo_card, hint: 'Marca el pedido como pagado en la demostración.' },
                ] as const
              ).map(({ value, icon: Icon, label, hint }) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-brand-300 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50/50"
                >
                  <input
                    type="radio"
                    value={value}
                    className="mt-1 h-4 w-4 text-brand-600"
                    {...register('paymentMethod')}
                  />
                  <Icon className="mt-0.5 h-5 w-5 text-brand-700" aria-hidden />
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">{label}</span>
                    <span className="block text-xs text-slate-500">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
            <FieldError message={errors.paymentMethod?.message} />
          </section>
        </div>

        <div className="space-y-4">
          <CartTotals />
          <Button type="submit" className="h-12 w-full text-base" loading={isSubmitting || products.isFetching}>
            Confirmar pedido
          </Button>
          <p className="text-center text-xs text-slate-400">
            Al confirmar, el servidor valida cantidades, recalcula precios con ofertas vigentes y descuenta inventario de forma atómica.
          </p>
        </div>
      </form>
    </div>
  )
}
