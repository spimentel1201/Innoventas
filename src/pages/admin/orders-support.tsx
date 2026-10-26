import { useState } from 'react'
import { OrderStatusBadge } from '@/features/orders/components'
import { useAdminOrders, useAdminSetOrderStatus } from '@/features/orders/hooks'
import { useUpdateSupportStatus, useAdminSupport } from '@/features/admin/api'
import { Label, Select } from '@/components/ui/field'
import { PageSpinner } from '@/components/ui/spinner'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { Button } from '@/components/ui/button'
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS } from '@/lib/constants'
import { formatDateTime, formatMoney } from '@/lib/utils'
import type { OrderStatus } from '@/types/database'

/* ---------------- Pedidos ---------------- */

export function AdminOrdersPage() {
  const [status, setStatus] = useState<OrderStatus | 'all'>('all')
  const { data: orders, isLoading, isError, error, refetch } = useAdminOrders(status)
  const setStatusMutation = useAdminSetOrderStatus()

  return (
    <div>
      <h1 className="font-display text-xl font-bold text-slate-900">Pedidos</h1>
      <p className="mt-1 text-sm text-slate-500">
        Cambia el estado de cada pedido; el servidor valida permisos y reintegra stock al cancelar.
      </p>

      <div className="mt-4 max-w-xs">
        <Label htmlFor="orders-status">Filtrar por estado</Label>
        <Select id="orders-status" value={status} onChange={(e) => setStatus(e.target.value as OrderStatus | 'all')}>
          <option value="all">Todos</option>
          {ORDER_STATUS_FLOW.map((s) => (
            <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
          ))}
        </Select>
      </div>

      {isLoading && <PageSpinner label="Cargando pedidos…" />}
      {isError && <ErrorState description={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />}

      {orders && (
        orders.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No hay pedidos" description="Cuando haya compras aparecerán aquí." />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th scope="col" className="px-4 py-3">Pedido</th>
                  <th scope="col" className="px-4 py-3">Cliente</th>
                  <th scope="col" className="px-4 py-3">Fecha</th>
                  <th scope="col" className="px-4 py-3">Total</th>
                  <th scope="col" className="px-4 py-3">Estado actual</th>
                  <th scope="col" className="px-4 py-3">Cambiar a</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-medium text-slate-900">{o.order_number}</td>
                    <td className="px-4 py-3 text-slate-600">{o.email}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(o.created_at)}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatMoney(Number(o.total))}
                      <span className="ml-1 text-xs text-slate-400">({o.item_count})</span>
                    </td>
                    <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
                    <td className="px-4 py-3">
                      <Select
                        aria-label={`Cambiar estado de ${o.order_number}`}
                        value={o.status}
                        disabled={o.status === 'delivered' || o.status === 'cancelled'}
                        onChange={(e) =>
                          setStatusMutation.mutate({ orderId: o.id, status: e.target.value as OrderStatus })
                        }
                        className="h-8 min-w-[9rem] text-xs"
                      >
                        {(ORDER_STATUS_FLOW as OrderStatus[]).map((s) => (
                          <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
                        ))}
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
      {setStatusMutation.isError && (
        <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {setStatusMutation.error instanceof Error ? setStatusMutation.error.message : 'No se pudo cambiar el estado.'}
        </p>
      )}
    </div>
  )
}

/* ---------------- Soporte ---------------- */

const SUPPORT_STATUS_LABELS: Record<string, string> = {
  open: 'Abierta',
  answered: 'Respondida',
  closed: 'Cerrada',
}

export function AdminSupportPage() {
  const { data, isLoading, isError, error, refetch } = useAdminSupport()
  const updateStatus = useUpdateSupportStatus()
  const [openMsg, setOpenMsg] = useState<string | null>(null)

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-xl font-bold text-slate-900">Solicitudes de soporte</h1>
      <p className="mt-1 text-sm text-slate-500">Mensajes del formulario de contacto. Actualiza el estado tras responder.</p>

      {isLoading && <PageSpinner label="Cargando solicitudes…" />}
      {isError && <ErrorState description={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />}

      {data && data.length === 0 && (
        <EmptyState title="Sin solicitudes" description="Cuando alguien escriba por contacto aparecerá aquí." />
      )}

      <ul className="mt-5 space-y-3">
        {data?.map((req) => (
          <li key={req.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  {req.subject} · <span className="font-normal text-slate-600">{req.name}</span>
                </p>
                <p className="text-xs text-slate-500">
                  {req.email} · {formatDateTime(req.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    req.status === 'open'
                      ? 'bg-amber-100 text-amber-800'
                      : req.status === 'answered'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {SUPPORT_STATUS_LABELS[req.status] ?? req.status}
                </span>
                <Select
                  aria-label={`Cambiar estado de solicitud de ${req.name}`}
                  value={req.status}
                  disabled={updateStatus.isPending}
                  onChange={(e) =>
                    updateStatus.mutate({ id: req.id, status: e.target.value as 'open' | 'answered' | 'closed' })
                  }
                  className="h-8 text-xs"
                >
                  <option value="open">Abierta</option>
                  <option value="answered">Respondida</option>
                  <option value="closed">Cerrada</option>
                </Select>
                <Button size="sm" variant="outline" type="button" onClick={() => setOpenMsg(openMsg === req.id ? null : req.id)}>
                  {openMsg === req.id ? 'Ocultar' : 'Ver mensaje'}
                </Button>
              </div>
            </div>
            {openMsg === req.id && (
              <p className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                {req.message}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
