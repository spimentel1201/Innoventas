import type { ReactNode } from 'react'
import { AlertTriangle, Inbox, RotateCcw } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from './button'

function isIconComponent(node: unknown): node is LucideIcon {
  // Los iconos de lucide son objetos forwardRef (con `render`), no funciones planas.
  return (
    (typeof node === 'function') ||
    (typeof node === 'object' && node !== null && 'render' in (node as Record<string, unknown>))
  )
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  note,
}: {
  title: string
  description?: string
  action?: ReactNode
  /** Acepta un nodo ya renderizado o el componente de icono de lucide. */
  icon?: ReactNode | LucideIcon
  note?: string
}) {
  const IconComponent = isIconComponent(icon) ? icon : null
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-card">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        {IconComponent ? <IconComponent className="h-7 w-7" aria-hidden /> : icon === null || icon === undefined ? <Inbox className="h-7 w-7" /> : ((icon as ReactNode))}
      </div>
      <h3 className="font-display text-lg font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>}
      {note && <p className="mt-2 text-xs text-slate-400">{note}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({
  title = 'Algo salió mal',
  description,
  onRetry,
}: {
  title?: string
  description?: string
  onRetry?: () => void
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-6 py-12 text-center"
    >
      <AlertTriangle className="mb-3 h-8 w-8 text-rose-500" aria-hidden />
      <h3 className="font-display text-lg font-semibold text-rose-900">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-rose-700">{description}</p>}
      {onRetry && (
        <Button variant="outline" className="mt-5" onClick={onRetry} type="button">
          <RotateCcw className="h-4 w-4" /> Reintentar
        </Button>
      )}
    </div>
  )
}
