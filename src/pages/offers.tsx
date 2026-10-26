import { ProductGrid } from '@/features/products/components/product-grid'
import { useOfferProducts } from '@/features/products/hooks'
import { PageSpinner } from '@/components/ui/spinner'
import { ErrorState } from '@/components/ui/states'

export function OffersPage() {
  const { data, isLoading, error, refetch } = useOfferProducts(24)

  if (isLoading) return <PageSpinner label="Cargando ofertas…" />

  return (
    <div className="container pb-16">
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-brand-700 to-accent-600 px-6 py-8 text-white">
        <p className="font-display text-2xl font-bold md:text-3xl">Ofertas vigentes</p>
        <p className="mt-2 max-w-2xl text-sm text-brand-100">
          Descuentos con fecha de inicio y de cierre verificadas en servidor. Cuando la oferta termina,
          el precio regresa automáticamente — nunca dependemos del cliente para calcular precios.
        </p>
      </div>

      {error ? (
        <ErrorState description={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />
      ) : (
        <ProductGrid
          products={data ?? []}
          cols={3}
          emptyTitle="No hay ofertas activas"
          emptyDescription="Las ofertas tienen vigencia real (fechas de inicio y cierre); vuelve cuando se publique la próxima campaña."
        />
      )}
    </div>
  )
}
