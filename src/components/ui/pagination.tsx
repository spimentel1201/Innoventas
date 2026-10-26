import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

function pagesToShow(current: number, total: number): number[] {
  const pages = new Set<number>([1, total, current - 1, current, current + 1])
  const list = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  return list
}

export function Pagination({ page, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null
  return (
    <nav className={cn('flex items-center justify-center gap-1', className)} aria-label="Paginación">
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-brand-300 disabled:opacity-40"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Página anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {pagesToShow(page, totalPages).map((p, idx, arr) => (
        <span key={p} className="flex items-center gap-1">
          {idx > 0 && p - arr[idx - 1] > 1 && <span className="px-1 text-slate-400">…</span>}
          <button
            type="button"
            onClick={() => onPageChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-medium',
              p === page
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300',
            )}
          >
            {p}
          </button>
        </span>
      ))}
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-brand-300 disabled:opacity-40"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Página siguiente"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  )
}
