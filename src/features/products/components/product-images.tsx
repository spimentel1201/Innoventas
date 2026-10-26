import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProductImage } from '@/types/domain'
import { PLACEHOLDER_IMAGE } from '@/lib/config'

export function ProductImages({ images, name }: { images: ProductImage[]; name: string }) {
  const sorted = [...images].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.position - b.position)
  const [active, setActive] = useState(0)
  const current = sorted[active] ?? null

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        {current ? (
          <img
            src={current.url || PLACEHOLDER_IMAGE(name)}
            alt={current.alt || `Imagen de ${name}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-100 text-slate-400">
            <ImageOff className="h-8 w-8" aria-hidden />
            <span className="text-xs">Imagen demostrativa no disponible</span>
          </div>
        )}
      </div>
      {sorted.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {sorted.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Ver imagen ${i + 1} de ${name}`}
              className={cn(
                'h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition',
                i === active ? 'border-brand-600' : 'border-transparent hover:border-slate-300',
              )}
            >
              <img src={img.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
