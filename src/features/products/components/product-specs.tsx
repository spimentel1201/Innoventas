import { Product } from '@/types/domain'

export function ProductSpecs({ product }: { product: Product }) {
  const entries = Object.entries(product.specifications)
  if (entries.length === 0) return null
  return (
    <section aria-labelledby="specs-title" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <h2 id="specs-title" className="mb-3 font-display text-lg font-semibold text-slate-900">
        Especificaciones
      </h2>
      <dl className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-baseline justify-between gap-4 border-b border-slate-100 py-1.5">
            <dt className="text-sm text-slate-500">{key}</dt>
            <dd className="text-sm font-medium text-slate-900 text-right">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
