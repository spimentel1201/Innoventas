import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { BadgeCheck, PercentCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { FieldError, Input, Label } from '@/components/ui/field'
import { PageSpinner } from '@/components/ui/spinner'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { adminCreateOffer, adminEndOffer, useAdminOffers, useAdminProducts } from '@/features/admin/api'
import { offerFormSchema, type OfferFormInput } from '@/lib/validations/product'
import { EdgeError } from '@/lib/edge'
import { formatDateTime, formatMoney } from '@/lib/utils'

function activeRange(startsAt: string, endsAt: string, isActive: boolean): boolean {
  if (!isActive) return false
  const now = Date.now()
  return new Date(startsAt).getTime() <= now && new Date(endsAt).getTime() >= now
}

export function AdminOffersPage() {
  const qc = useQueryClient()
  const offers = useAdminOffers()
  const products = useAdminProducts('')

  const [endingId, setEndingId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OfferFormInput>({
    resolver: zodResolver(offerFormSchema),
    defaultValues: { product: '', discountPercent: 10, startsAt: '', endsAt: '' },
  })

  const createOffer = useMutation({
    mutationFn: (values: OfferFormInput) =>
      adminCreateOffer({
        productId: values.product,
        discountPercent: values.discountPercent,
        startsAt: new Date(values.startsAt).toISOString(),
        endsAt: new Date(values.endsAt).toISOString(),
      }),
    onSuccess: () => {
      toast.success('Oferta creada.')
      reset({ product: '', discountPercent: 10, startsAt: '', endsAt: '' })
      void qc.invalidateQueries({ queryKey: ['admin', 'offers'] })
      void qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (err) => {
      if (err instanceof EdgeError && err.code === 'INVALID_DATES') {
        toast.error('La fecha de fin debe ser posterior a la de inicio.')
      } else {
        toast.error(err instanceof Error ? err.message : 'No se pudo crear la oferta.')
      }
    },
  })

  const endOffer = useMutation({
    mutationFn: (offerId: string) => adminEndOffer(offerId),
    onSuccess: () => {
      toast.info('Oferta desactivada.')
      void qc.invalidateQueries({ queryKey: ['admin', 'offers'] })
      void qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'No se pudo finalizar la oferta.'),
  })

  const productOptions = useMemo(() => {
    const seen = new Set<string>()
    return (products.data ?? []).filter((p) => {
      if (seen.has(p.id)) return false
      seen.add(p.id)
      return true
    })
  }, [products.data])

  return (
    <div className="max-w-5xl">
      <h1 className="font-display text-xl font-bold text-slate-900">Ofertas</h1>
      <p className="mt-1 text-sm text-slate-500">
        Descuentos con vigencia por fechas. El precio final lo calcula la vista SQL; solo hay una oferta activa por
        ventana.
      </p>

      {/* Formulario */}
      <form
        onSubmit={handleSubmit((values) => createOffer.mutate(values))}
        noValidate
        className="mt-5 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="sm:col-span-2">
          <Label htmlFor="off-product">Producto</Label>
          <select
            id="off-product"
            className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"
            {...register('product')}
          >
            <option value="">Selecciona…</option>
            {productOptions.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <FieldError message={errors.product?.message} />
        </div>
        <div>
          <Label htmlFor="off-discount">Descuento (%)</Label>
          <Input id="off-discount" type="number" min="1" max="90" step="1" {...register('discountPercent')} />
          <FieldError message={errors.discountPercent?.message} />
        </div>
        <div>
          <Label htmlFor="off-starts">Inicio</Label>
          <Input id="off-starts" type="datetime-local" {...register('startsAt')} />
          <FieldError message={errors.startsAt?.message} />
        </div>
        <div>
          <Label htmlFor="off-ends">Fin</Label>
          <Input id="off-ends" type="datetime-local" {...register('endsAt')} />
          <FieldError message={errors.endsAt?.message} />
        </div>
        <div className="flex items-end">
          <Button type="submit" className="w-full" loading={isSubmitting || createOffer.isPending}>
            <PercentCircle className="h-4 w-4" aria-hidden /> Crear oferta
          </Button>
        </div>
      </form>

      {/* Lista */}
      <h2 className="mt-8 font-display text-base font-semibold text-slate-900">Historial de ofertas</h2>
      {offers.isLoading && <PageSpinner label="Cargando ofertas…" />}
      {offers.isError && <ErrorState onRetry={() => void offers.refetch()} />}
      {offers.data && offers.data.length === 0 && (
        <EmptyState title="Sin ofertas registradas" description="Crea la primera con el formulario de arriba." />
      )}
      {offers.data && offers.data.length > 0 && (
        <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <th scope="col" className="px-4 py-3">Producto</th>
                <th scope="col" className="px-4 py-3">Descuento</th>
                <th scope="col" className="px-4 py-3">Vigencia</th>
                <th scope="col" className="px-4 py-3">Estado</th>
                <th scope="col" className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {offers.data.map((offer) => {
                const active = activeRange(offer.starts_at, offer.ends_at, offer.is_active)
                return (
                  <tr key={offer.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {Array.isArray(offer.product) ? offer.product[0]?.name : offer.product?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      <span className="font-semibold text-emerald-700">−{offer.discount_percent}%</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatDateTime(offer.starts_at)} → {formatDateTime(offer.ends_at)}
                    </td>
                    <td className="px-4 py-3">
                      {offer.is_active ? (
                        active ? (
                          <span className="flex items-center gap-1 text-xs font-medium text-emerald-700">
                            <BadgeCheck className="h-4 w-4" aria-hidden /> Vigente
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-slate-500">Agendada / terminada</span>
                        )
                      ) : (
                        <span className="text-xs font-medium text-rose-600">Finalizada</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {offer.is_active && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-rose-600"
                          loading={endOffer.isPending && endingId === offer.id}
                          onClick={() => { setEndingId(offer.id); endOffer.mutate(offer.id) }}
                          type="button"
                        >
                          Finalizar
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-slate-400">
        Ejemplo revisable: un producto de {formatMoney(999)} con −15% se vende a {formatMoney(999 * 0.85)}.
      </p>
    </div>
  )
}
