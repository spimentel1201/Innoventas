import { useQuery } from '@tanstack/react-query'
import { Trophy } from 'lucide-react'
import { ProductGrid } from '@/features/products/components/product-grid'
import { fetchBestSellers } from '@/features/products/api'
import type { BestSeller, Product } from '@/types/domain'

function asProduct(b: BestSeller): Product {
  return {
    id: b.id,
    name: b.name,
    slug: b.slug,
    description: '',
    brand: b.brand,
    price: b.price,
    compareAtPrice: null,
    stock: 99,
    specifications: {},
    status: 'published',
    createdAt: '',
    categorySlug: '',
    categoryName: '',
    imageUrl: b.imageUrl,
    offerDiscountPercent: b.offerDiscountPercent,
    offerPrice: b.offerPrice,
    offerEndsAt: null,
  }
}

export function BestSellersPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['best-sellers', 16] as const,
    queryFn: () => fetchBestSellers(16),
  })

  return (
    <div className="container pb-16">
      <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8">
        <p className="flex items-center gap-2 font-display text-2xl font-bold text-amber-900">
          <Trophy className="h-6 w-6" aria-hidden /> Los más vendidos
        </p>
        <p className="mt-2 max-w-2xl text-sm text-amber-800">
          Este ranking se calcula SIEMPRE en servidor, juntando las cantidades registradas en
          <code className="mx-1 rounded bg-amber-100 px-1">order_items</code> de pedidos no cancelados.
          Sin ventas registradas, no hay lista: no se inventan datos.
        </p>
      </div>

      {error && <ProductGrid error={error} products={[]} onRetry={() => void refetch()} />}

      {!error && data && data.length > 0 && <ProductGrid products={data.map(asProduct)} />}

      {!error && !isLoading && (!data || data.length === 0) && (
        <ProductGrid
          products={[]}
          emptyTitle="Aún no hay ventas registradas"
          emptyDescription="El ranking aparecerá cuando el primer pedido se confirme. Puedes crear ventas de prueba con `seed_demo_sales` (opcional y marcadas como DEMO)."
        />
      )}
      {isLoading && (
        <div className="py-8 text-center text-sm text-slate-400">Calculando ranking…</div>
      )}
    </div>
  )
}
