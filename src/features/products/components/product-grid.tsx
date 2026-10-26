import { PackageSearch } from 'lucide-react'
import { ProductCard } from './product-card'
import { GridSkeleton } from '@/components/ui/spinner'
import { EmptyState, ErrorState } from '@/components/ui/states'
import type { Product } from '@/types/domain'

const gridClass = {
  4: 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4',
  3: 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3',
  2: 'grid grid-cols-1 gap-5 sm:grid-cols-2',
} as const

export function ProductGrid({
  products,
  isLoading,
  error,
  onRetry,
  emptyTitle = 'Sin productos',
  emptyDescription = 'No encontramos productos con estos criterios. Ajusta los filtros o revisa más tarde.',
  cols = 4,
}: {
  products: Product[]
  isLoading?: boolean
  error?: unknown
  onRetry?: () => void
  emptyTitle?: string
  emptyDescription?: string
  cols?: keyof typeof gridClass
}) {
  if (isLoading) return <GridSkeleton count={8} />
  if (error)
    return <ErrorState onRetry={onRetry} description={error instanceof Error ? error.message : undefined} />
  if (products.length === 0)
    return <EmptyState title={emptyTitle} description={emptyDescription} icon={PackageSearch} />
  return (
    <div className={gridClass[cols]}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  )
}
