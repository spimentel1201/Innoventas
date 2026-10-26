import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-brand-600', className)} aria-hidden />
}

export function PageSpinner({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500" role="status">
      <Spinner />
      <span>{label}</span>
    </div>
  )
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card" aria-hidden>
      <div className="mb-3 aspect-[16/10] w-full rounded-lg bg-slate-200 animate-pulse" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="mb-2 h-3.5 rounded bg-slate-100 animate-pulse" style={{ width: `${85 - i * 15}%` }} />
      ))}
    </div>
  )
}

export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}
