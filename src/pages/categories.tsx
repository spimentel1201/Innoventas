import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { SectionHeader } from '@/components/common/section-header'
import { CategoryIcon } from '@/components/common/category-icon'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { useCategories } from '@/features/products/hooks'

export function CategoriesPage() {
  const { data, isLoading, error, refetch } = useCategories()

  return (
    <div className="container pb-16">
      <SectionHeader
        title="Categorías"
        subtitle="Todas las categorías con sus productos activos en el catálogo"
      />
      {error && <ErrorState onRetry={() => void refetch()} />}
      {isLoading && null}
      {!isLoading && !error && (!data || data.length === 0) && (
        <EmptyState title="No hay categorías activas" description="Ejecuta la semilla de demostración en Supabase." />
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((c) => (
          <Link
            key={c.id}
            to={`/catalogo?category=${c.slug}`}
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-panel"
          >
            <div className="flex items-start justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition group-hover:bg-brand-100">
                <CategoryIcon name={c.icon} />
              </span>
              <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" aria-hidden />
            </div>
            <h2 className="mt-4 font-display text-lg font-semibold text-slate-900">{c.name}</h2>
            <p className="mt-1 line-clamp-2 text-sm text-slate-500">{c.description}</p>
            <p className="mt-3 text-xs font-medium text-brand-700">{c.productCount} productos publicados</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
