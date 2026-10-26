import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface QuantityStepperProps {
  value: number
  min?: number
  max: number
  disabled?: boolean
  onChange: (value: number) => void
  label?: string
}

export function QuantityStepper({
  value,
  min = 1,
  max,
  disabled = false,
  onChange,
  label = 'Cantidad',
}: QuantityStepperProps) {
  const set = (next: number) => {
    const bounded = Math.max(min, Math.min(max, next))
    if (bounded !== value) onChange(bounded)
  }
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-lg border border-slate-300 bg-white',
        disabled && 'opacity-50',
      )}
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-l-lg text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed"
        onClick={() => set(value - 1)}
        disabled={disabled || value <= min}
        aria-label="Reducir cantidad"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="w-9 text-center text-sm font-semibold text-slate-900" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-r-lg text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed"
        onClick={() => set(value + 1)}
        disabled={disabled || value >= max}
        aria-label="Agregar cantidad"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}
