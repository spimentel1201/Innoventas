import { Star } from 'lucide-react'
import { Label, Select } from '@/components/ui/field'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from './checkbox'
import { cn, formatMoney } from '@/lib/utils'
import { FREE_SHIPPING_THRESHOLD } from '@/lib/config'
import type { SortOption } from '@/lib/constants'
import type { Category } from '@/types/domain'

export interface FilterState {
  category: string
  brand: string
  minPrice: string
  maxPrice: string
  inStockOnly: boolean
  sort: SortOption
}

export function ProductFilters({
  categories,
  brands,
  value,
  onChange,
  onClear,
  mobile = false,
}: {
  categories: Category[]
  brands: string[]
  value: FilterState
  onChange: (patch: Partial<FilterState>) => void
  onClear: () => void
  mobile?: boolean
}) {
  return (
    <aside
      className={cn(
        'h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-card',
        mobile && 'rounded-none border-0 shadow-none',
      )}
      aria-label="Filtros del catálogo"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-base font-semibold text-slate-900">Filtros</h2>
        <button type="button" onClick={onClear} className="text-xs font-medium text-brand-600 hover:underline">
          Limpiar
        </button>
      </div>

      <div className="space-y-5">
        <div>
          <Label htmlFor="filter-category">Categoría</Label>
          <Select
            id="filter-category"
            value={value.category}
            onChange={(e) => onChange({ category: e.target.value })}
          >
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name} ({c.productCount})
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="filter-brand">Marca</Label>
          <Select id="filter-brand" value={value.brand} onChange={(e) => onChange({ brand: e.target.value })}>
            <option value="">Todas</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label>Precio (S/)</Label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              placeholder="Mín"
              className="h-9 w-full rounded-lg border border-slate-300 px-2 text-sm"
              value={value.minPrice}
              onChange={(e) => onChange({ minPrice: e.target.value })}
              aria-label="Precio mínimo"
            />
            <span className="text-slate-400">–</span>
            <input
              type="number"
              min={0}
              placeholder="Máx"
              className="h-9 w-full rounded-lg border border-slate-300 px-2 text-sm"
              value={value.maxPrice}
              onChange={(e) => onChange({ maxPrice: e.target.value })}
              aria-label="Precio máximo"
            />
          </div>
        </div>

        <Checkbox
          id="filter-stock"
          label="Solo productos disponibles"
          checked={value.inStockOnly}
          onChange={(checked) => onChange({ inStockOnly: checked })}
        />

        <div>
          <Label htmlFor="filter-sort">Ordenar por</Label>
          <Select id="filter-sort" value={value.sort} onChange={(e) => onChange({ sort: e.target.value as SortOption })}>
            <option value="newest">Más recientes</option>
            <option value="price_asc">Precio: menor a mayor</option>
            <option value="price_desc">Precio: mayor a menor</option>
            <option value="name_asc">Nombre (A–Z)</option>
          </Select>
        </div>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-3">
        <Badge tone="brand" className="gap-1">
          <Star className="h-3 w-3" /> Envío gratis desde {formatMoney(FREE_SHIPPING_THRESHOLD)}
        </Badge>
      </div>
    </aside>
  )
}
