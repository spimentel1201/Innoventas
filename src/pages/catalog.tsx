import { useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SlidersHorizontal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import { EmptyState } from '@/components/ui/states'
import { ProductFilters, type FilterState } from '@/features/products/components/product-filters'
import { ProductGrid } from '@/features/products/components/product-grid'
import { useBrands, useCategories, useProductList } from '@/features/products/hooks'
import type { SortOption } from '@/lib/constants'
import { useDebounce } from '@/hooks/use-debounce'

const PAGE_SIZE = 12

const HINT = 'Los datos provienen de la vista published_products en Supabase (catálogo en vivo).'

function filtersFromParams(params: URLSearchParams): FilterState {
  const min = params.get('minPrice')
  const max = params.get('maxPrice')
  const sortRaw = params.get('sort')
  const sort: SortOption =
    sortRaw === 'price_asc' || sortRaw === 'price_desc' || sortRaw === 'name_asc' ? sortRaw : 'newest'
  return {
    category: params.get('category') ?? '',
    brand: params.get('brand') ?? '',
    minPrice: min ?? '',
    maxPrice: max ?? '',
    inStockOnly: params.get('inStock') === '1' || params.get('inStockOnly') === 'true',
    sort,
  }
}

export function CatalogPage() {
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => filtersFromParams(params), [params])
  const q = params.get('q') ?? ''
  const page = Math.max(1, Number(params.get('page') ?? 1) || 1)
  const debouncedQ = useDebounce(q, 400)

  const list = useProductList({
    q: debouncedQ,
    category: filters.category || undefined,
    brand: filters.brand || undefined,
    minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
    maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
    inStockOnly: filters.inStockOnly,
    sort: filters.sort,
    page,
    pageSize: PAGE_SIZE,
  })

  const { data: categories } = useCategories()
  const { data: brands } = useBrands()

  const totalPages = Math.max(1, Math.ceil((list.data?.total ?? 0) / PAGE_SIZE))

  // Si quedó fuera de rango tras limpiar filtros, vuelve a la página 1.
  useEffect(() => {
    if (!list.isFetching && list.data && totalPages > 1 && page > totalPages) {
      const copy = new URLSearchParams(params)
      copy.set('page', String(totalPages))
      setParams(copy, { replace: true })
    }
  }, [list.isFetching, list.data, totalPages, page, params, setParams])

  const patchParams = (patch: Partial<FilterState>, extra?: Record<string, string | null>) => {
    const copy = new URLSearchParams(params)
    const remove = ['page']
    if ('q' in patch) remove.push('q')
    for (const key of remove) copy.delete(key)
    for (const [k, v] of Object.entries(patch)) {
      const val = v == null || v === '' || v === false ? null : String(v)
      if (val !== null) copy.set(k, val)
      else copy.delete(k)
    }
    if (extra) {
      for (const [k, v] of Object.entries(extra)) {
        if (v === null) copy.delete(k)
        else copy.set(k, v)
      }
    }
    setParams(copy, { replace: false })
  }

  const onFilterChange = (patch: Partial<FilterState>) => {
    const next: Partial<FilterState> = { ...patch }
    if (patch.sort !== undefined) {
      patchParams({ sort: patch.sort })
      return
    }
    patchParams(next, { page: null })
  }

  const onClear = () => patchParams({ category: '', brand: '', minPrice: '', maxPrice: '', inStockOnly: false, sort: 'newest' }, { page: null })

  const activeFiltersCount = [
    filters.category,
    filters.brand,
    filters.minPrice,
    filters.maxPrice,
    filters.inStockOnly ? '1' : '',
  ].filter(Boolean).length

  return (
    <div className="container pb-16">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Catálogo</h1>
        <p className="mt-1 text-sm text-slate-500">{HINT}</p>
      </header>

      {q && (
        <div className="mb-4 flex items-center gap-2 text-sm text-slate-600">
          Resultados para <Badge tone="brand">“{q}”</Badge>
          <button type="button" className="text-xs text-brand-600 hover:underline" onClick={() => patchParams({}, { q: null, page: null })}>
            limpiar búsqueda
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <div className="hidden lg:block">
          <ProductFilters
            categories={categories ?? []}
            brands={brands ?? []}
            value={filters}
            onChange={onFilterChange}
            onClear={onClear}
          />
        </div>

        <details className="lg:hidden" open={false}>
          <summary className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-card">
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            Filtros
            {activeFiltersCount > 0 && <Badge tone="brand">{activeFiltersCount} activos</Badge>}
          </summary>
          <div className="mt-3">
            <ProductFilters
              mobile
              categories={categories ?? []}
              brands={brands ?? []}
              value={filters}
              onChange={onFilterChange}
              onClear={onClear}
            />
          </div>
        </details>

        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-500" aria-live="polite">
              {list.isPlaceholderData ? 'Actualizando…' : `${list.data?.total ?? 0} productos encontrados`}
            </p>
            <p className="text-xs text-slate-400">
              <Link to="/seguimiento" className="hover:underline">¿Ya compraste? Dale seguimiento a tu pedido →</Link>
            </p>
          </div>

          <ProductGrid
            products={list.data?.items ?? []}
            isLoading={list.isLoading || list.isFetching && list.isPlaceholderData}
            error={list.error}
            onRetry={() => void list.refetch()}
            emptyTitle={q ? 'Sin resultados para tu búsqueda' : 'Catálogo vacío'}
            emptyDescription={
              q
                ? 'Prueba con otras palabras o revisa las categorías disponibles.'
                : 'Aún no hay productos publicados en Supabase o falta configurar la conexión.'
            }
          />

          <div className="mt-6">
            <Pagination page={page} totalPages={totalPages} onPageChange={(p) => patchParams({}, { page: String(p) })} />
          </div>
        </div>
      </div>
    </div>
  )
}
