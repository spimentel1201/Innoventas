import type { Order, TrackOrderResult } from '@/types/domain'
import type { OrderStatus, PaymentMethod } from '@/types/database'
import { supabase } from '@/lib/supabase'
import { invokeEdgeFunction, EdgeError } from '@/lib/edge'

/* ---------- Tipos internos ---------- */

interface OrderItemRow {
  id: string
  product_id: string | null
  product_name: string
  brand: string
  slug: string
  image_url: string | null
  unit_price: number
  discount_percent: number
  unit_price_final: number
  quantity: number
  line_total: number
}

interface OrderRow {
  id: string
  order_number: string
  status: string
  payment_method: string
  subtotal: number
  discount_total: number
  shipping_total: number
  total: number
  item_count: number
  email: string
  created_at: string
  updated_at: string
  order_items: OrderItemRow[] | null
}

function mapOrder(row: OrderRow): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    paymentMethod: row.payment_method,
    subtotal: Number(row.subtotal),
    discountTotal: Number(row.discount_total),
    shippingTotal: Number(row.shipping_total),
    total: Number(row.total),
    itemCount: Number(row.item_count),
    email: row.email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: (row.order_items ?? []).map((it) => ({
      id: it.id,
      productId: it.product_id,
      productName: it.product_name,
      brand: it.brand,
      slug: it.slug,
      imageUrl: it.image_url,
      unitPrice: Number(it.unit_price),
      discountPercent: Number(it.discount_percent),
      unitPriceFinal: Number(it.unit_price_final),
      quantity: Number(it.quantity),
      lineTotal: Number(it.line_total),
    })),
  }
}

function handleEdgeError(err: unknown, fallback: string): Error {
  if (err instanceof EdgeError) {
    const map: Record<string, string> = {
      AUTH_REQUIRED: 'Inicia sesión para completar tu compra.',
      EMPTY_CART: 'Tu carrito está vacío.',
      INSUFFICIENT_STOCK: 'Stock insuficiente',
      PRODUCT_UNAVAILABLE: 'Producto no disponible',
      INVALID_SHIPPING: 'Revisa la dirección de envío.',
      INVALID_PAYMENT: 'Método de pago no válido.',
    }
    if (err.code === 'INSUFFICIENT_STOCK') {
      return new Error(`Stock insuficiente: ${err.detail ?? 'producto'}. Ajusta las cantidades.`)
    }
    if (err.code === 'PRODUCT_UNAVAILABLE') {
      return new Error(`${err.detail ?? 'Un producto'} ya no está disponible. Revísalo en el carrito.`)
    }
    if (map[err.code]) return new Error(map[err.code])
    return new Error(err.message)
  }
  return err instanceof Error ? err : new Error(fallback)
}

/** Crea un pedido vía Edge Function. El servidor recalcula precios, ofertas y stock. */
export async function placeOrder(payload: {
  items: Array<{ productId: string; quantity: number }>
  shipping: { fullName: string; phone: string; line1: string; line2?: string; city: string; state: string; postalCode: string; country: string; notes?: string }
  paymentMethod: PaymentMethod
}): Promise<Order> {
  try {
    const res = await invokeEdgeFunction<{ order: OrderRow & { order_items: OrderItemRow[] } }>('create-order', payload)
    return mapOrder(res.order)
  } catch (err) {
    throw handleEdgeError(err, 'No se pudo crear el pedido. Inténtalo de nuevo.')
  }
}

export async function fetchMyOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapOrder(row as unknown as OrderRow))
}

export async function fetchOrderByNumber(orderNumber: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('order_number', orderNumber)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? mapOrder(data as unknown as OrderRow) : null
}

export async function trackOrderByNumberAndEmail(
  orderNumber: string,
  email: string,
): Promise<TrackOrderResult | null> {
  const { data, error } = await supabase.rpc('track_order', {
    p_order_number: orderNumber.trim(),
    p_email: email.trim(),
  })
  if (error) throw new Error(error.message)
  return (data as TrackOrderResult | null) ?? null
}

/* ---------- Administración (RLS de solo lectura consultada en la tabla; cambios vía RPC segura) ---------- */

export async function adminSetOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  const { error } = await supabase.rpc('admin_set_order_status', { p_order: orderId, p_status: status })
  const message = error?.message ?? ''
  if (message.includes('PERMISSION_DENIED')) throw new Error('No tienes permisos de administrador.')
  if (error) throw new Error(error.message)
}
