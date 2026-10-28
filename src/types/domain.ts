import type { Json, ProductStatus } from './database'

export function asObject(value: Json | null | undefined): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const out: Record<string, string> = {}
  for (const [key, val] of Object.entries(value)) {
    if (val != null && typeof val !== 'object') out[key] = String(val)
  }
  return out
}

/** Producto enriquecido que consume el frontend (derivado de published_products + oferta). */
export interface Product {
  id: string
  name: string
  slug: string
  description: string
  brand: string
  price: number
  compareAtPrice: number | null
  stock: number
  specifications: Record<string, string>
  status: ProductStatus
  createdAt: string
  categorySlug: string
  categoryName: string
  imageUrl: string | null
  offerDiscountPercent: number | null
  offerPrice: number | null
  offerEndsAt: string | null
}

export interface ProductImage {
  id: string
  url: string
  alt: string
  position: number
  isPrimary: boolean
}

export interface Category {
  id: string
  slug: string
  name: string
  description: string
  icon: string
  productCount: number
}

export interface CartItem {
  productId: string
  slug: string
  name: string
  brand: string
  imageUrl: string | null
  quantity: number
}

export interface OrderShippingAddress {
  fullName: string
  phone: string
  line1: string
  line2?: string
  city: string
  state: string
  postalCode: string
  country: string
  notes?: string
}

export interface OrderItem {
  id: string
  productId: string | null
  productName: string
  brand: string
  slug: string
  imageUrl: string | null
  unitPrice: number
  discountPercent: number
  unitPriceFinal: number
  quantity: number
  lineTotal: number
}

export interface Order {
  id: string
  orderNumber: string
  status: string
  paymentMethod: string
  subtotal: number
  discountTotal: number
  shippingTotal: number
  total: number
  itemCount: number
  email: string
  createdAt: string
  updatedAt: string
  items: OrderItem[]
}

export interface BestSeller {
  id: string
  name: string
  slug: string
  brand: string
  price: number
  imageUrl: string | null
  units: number
  offerPrice: number | null
  offerDiscountPercent: number | null
}

export interface TrackOrderResult {
  order_number: string
  status: string
  created_at: string
  updated_at: string
  items: Array<{
    product_name: string
    brand: string
    slug: string
    image_url: string | null
    unit_price_final: number
    quantity: number
    line_total: number
  }>
  totals: {
    subtotal: number
    discount_total: number
    shipping_total: number
    total: number
  }
  shipping: {
    city: string | null
    country: string | null
  }
}

export interface AdminDashboardStats {
  products_published: number
  products_draft: number
  low_stock: number
  orders_total: number
  orders_pending: number
  revenue_30d: number
  open_support: number
}

// ── Chat: origen de la respuesta y constructor de kit ─────────────────────────

/** Origen de la respuesta: Azure CQA (A), búsqueda interna en la BD (W) o fallback (F). */
export type ChatAnswerMode = 'azure' | 'fallback' | 'recommendation' | 'catalog' | 'kit'

/** Opción de un paso del kit (con precio final ya resuelto, oferta incluida). */
export interface KitOption {
  id: string
  slug: string
  name: string
  price: number
  stock: number
}

/** Producto elegido dentro del kit. */
export interface KitSelection {
  id: string
  slug: string
  name: string
  price: number
  category: string
}

/** Estado del pedido guiado; viaja en `metadata.kit` del último mensaje del asistente. */
export interface KitState {
  profile: string
  categories: string[]
  stepIndex: number
  selections: KitSelection[]
  options: KitOption[]
  status: 'choosing' | 'done'
  total: number
}

export interface ChatMessageMetadata {
  mode?: ChatAnswerMode
  kit?: KitState
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  confidence: number | null
  createdAt: string
  metadata?: ChatMessageMetadata | null
}

export interface ChatResponse {
  conversationId: string
  message: { id: string; role: string; content: string; created_at: string; confidence: number | null }
  mode: 'azure' | 'fallback'
  confidence: number | null
}
