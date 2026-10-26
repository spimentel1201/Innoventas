import type { OrderStatus, PaymentMethod } from '@/types/database'

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
]

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendiente de pago',
  paid: 'Pagado',
  processing: 'Preparando envío',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

export const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  paid: 'bg-sky-100 text-sky-800 border-sky-200',
  processing: 'bg-violet-100 text-violet-800 border-violet-200',
  shipped: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  delivered: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
}

export const ORDER_STATUS_ICONS: Record<OrderStatus, string> = {
  pending: '⏳',
  paid: '💳',
  processing: '📦',
  shipped: '🚚',
  delivered: '✅',
  cancelled: '✖️',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  transfer: 'Transferencia bancaria (Yape, Plin o interbancaria)',
  cod: 'Contra entrega (efectivo al recibir)',
  demo_card: 'Tarjeta demo (pago simulado)',
}

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Más recientes' },
  { value: 'price_asc', label: 'Precio: menor a mayor' },
  { value: 'price_desc', label: 'Precio: mayor a menor' },
  { value: 'name_asc', label: 'Nombre (A–Z)' },
] as const

export type SortOption = (typeof SORT_OPTIONS)[number]['value']

export const CHAT_SUGGESTIONS = [
  '¿Qué laptops tienen disponibles?',
  '¿Cuánto tarda el envío?',
  '¿Cómo rastreo mi pedido?',
  'Política de cambios y garantías',
]

export const POLICY_SLUGS = ['privacidad', 'envios', 'cambios', 'garantias'] as const
export type PolicySlug = (typeof POLICY_SLUGS)[number]
