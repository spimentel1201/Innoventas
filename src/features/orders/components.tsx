import { cn, formatMoney, formatDateTime } from '@/lib/utils'
import {
  ORDER_STATUS_FLOW,
  ORDER_STATUS_ICONS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STYLES,
} from '@/lib/constants'
import type { Order } from '@/types/domain'
import type { OrderStatus } from '@/types/database'
import { Badge } from '@/components/ui/badge'

export function OrderStatusBadge({ status, className }: { status: string; className?: string }) {
  const known = (ORDER_STATUS_FLOW as string[]).includes(status)
  const label = known ? ORDER_STATUS_LABELS[status as OrderStatus] : status
  const style = known ? ORDER_STATUS_STYLES[status as OrderStatus] : 'bg-slate-100 text-slate-700 border-slate-200'
  return (
    <Badge tone="neutral" className={cn(style, className)}>
      {known && <span aria-hidden>{ORDER_STATUS_ICONS[status as OrderStatus]}</span>}
      {label}
    </Badge>
  )
}

export function OrderTimeline({ status }: { status: string }) {
  if (status === 'cancelled') {
    return (
      <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800" role="status">
        Este pedido fue cancelado.
      </p>
    )
  }
  const steps = ORDER_STATUS_FLOW.filter((s) => s !== 'cancelled')
  const currentIndex = steps.indexOf(status as (typeof steps)[number])
  return (
    <ol className="flex flex-wrap items-center gap-1.5 text-xs" aria-label="Estado del pedido">
      {steps.map((step, i) => (
        <li key={step} className="flex items-center gap-1.5">
          <span
            className={cn(
              'flex items-center gap-1 rounded-full border px-2.5 py-1 font-medium',
              i <= currentIndex ? ORDER_STATUS_STYLES[step] : 'border-slate-200 bg-slate-50 text-slate-400',
            )}
          >
            <span aria-hidden>{ORDER_STATUS_ICONS[step]}</span>
            {ORDER_STATUS_LABELS[step]}
          </span>
          {i < steps.length - 1 && <span aria-hidden className="text-slate-300">›</span>}
        </li>
      ))}
    </ol>
  )
}

export function PlacedOrderTotals({
  subtotal,
  discountTotal,
  shippingTotal,
  total,
  compact = false,
}: {
  subtotal: number
  discountTotal: number
  shippingTotal: number
  total: number
  compact?: boolean
}) {
  const rows: Array<[string, number]> = [
    ['Subtotal', subtotal],
    ...(discountTotal > 0 ? ([['Ahorro por ofertas', -discountTotal]] as Array<[string, number]>) : []),
    ['Envío', shippingTotal],
  ]
  return (
    <div className={cn('text-sm', compact ? 'space-y-1' : 'space-y-1.5')}>
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between text-slate-600">
          <span>{label}</span>
          <span className={cn('tabular-nums', value < 0 && 'text-emerald-600')}>{formatMoney(value)}</span>
        </div>
      ))}
      <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
        <span>Total</span>
        <span className="tabular-nums">{formatMoney(total)}</span>
      </div>
    </div>
  )
}

export function PlacedOrderSummaryMeta({
  createdAt,
  ...props
}: { createdAt: string } & Partial<Order>) {
  return (
    <p className="text-xs text-slate-500" title={props.orderNumber}>
      Pedido registrado el {formatDateTime(createdAt)}
    </p>
  )
}
