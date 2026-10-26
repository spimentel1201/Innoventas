import { CardSkeleton } from '@/components/ui/spinner'

export function CartSkeleton() {
  return (
    <div className="container pb-16">
      <div className="mb-6 h-8 w-40 rounded-lg bg-slate-200 animate-pulse" />
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} lines={1} />
          ))}
        </div>
        <div className="h-56 rounded-2xl bg-slate-100 animate-pulse" />
      </div>
    </div>
  )
}
