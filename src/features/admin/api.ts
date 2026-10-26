import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AdminDashboardStats, Product, ProductImage, TrackOrderResult } from '@/types/domain'
import type { Database } from '@/types/database'
import { invokeEdgeFunction } from '@/lib/edge'

/* ---------- Productos (Edge Function admin-products) ---------- */

export interface AdminProductPayload {
  action: 'product.create' | 'product.update'
  id?: string
  name: string
  slug: string
  categoryId: string
  brand: string
  price: number
  compareAtPrice?: number | null
  stock: number
  status: 'draft' | 'published'
  description: string
  specifications: Record<string, string>
}

export async function adminSaveProduct(
  payload: AdminProductPayload,
): Promise<{ productId: string; slug: string }> {
  // La Edge Function espera { action, id?, data }, nunca los campos sueltos.
  const { action, id, ...data } = payload
  const body: Record<string, unknown> = { action, data }
  if (action === 'product.update') body.id = id
  return invokeEdgeFunction('admin-products', body)
}

export async function adminDeleteProduct(id: string): Promise<{ ok: boolean }> {
  return invokeEdgeFunction('admin-products', { action: 'product.delete', id })
}

export async function adminSetStock(id: string, stock: number): Promise<{ ok: boolean }> {
  return invokeEdgeFunction('admin-products', { action: 'stock.set', id, stock })
}

export async function adminCreateImage(input: {
  productId: string
  url: string
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp'
  alt?: string
  makePrimary?: boolean
}): Promise<{ imageId: string }> {
  return invokeEdgeFunction('admin-products', { action: 'image.create', ...input })
}

export async function adminDeleteImage(imageId: string): Promise<{ ok: boolean }> {
  return invokeEdgeFunction('admin-products', { action: 'image.delete', imageId })
}

export async function adminSetPrimaryImage(
  productId: string,
  imageId: string,
): Promise<{ ok: boolean }> {
  return invokeEdgeFunction('admin-products', { action: 'image.primary', productId, imageId })
}

export async function adminCreateOffer(input: {
  productId: string
  discountPercent: number
  startsAt: string
  endsAt: string
}): Promise<{ offerId: string }> {
  return invokeEdgeFunction('admin-products', { action: 'offer.create', ...input })
}

export async function adminEndOffer(offerId: string): Promise<{ ok: boolean }> {
  return invokeEdgeFunction('admin-products', { action: 'offer.end', offerId })
}

/* ---------- Consultas admin (RLS: solo admins leen) ---------- */

export interface AdminProductRow {
  id: string
  name: string
  slug: string
  brand: string
  price: number
  compare_at_price: number | null
  stock: number
  status: string
  description: string
  specifications: unknown
  category_id: string
  created_at: string
  updated_at: string
}

export function useAdminProducts(q: string = '') {
  return useQuery({
    queryKey: ['admin', 'products', q] as const,
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(
          'id, name, slug, brand, price, compare_at_price, stock, status, description, specifications, category_id, created_at, updated_at',
        )
        .order('created_at', { ascending: false })
        .limit(200)
      if (q) query = query.ilike('name', `%${q}%`)
      const { data, error } = await query
      if (error) throw new Error(error.message)
      return data as unknown as AdminProductRow[]
    },
    placeholderData: keepPreviousData,
  })
}

export function useAdminImages(productId: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'images', productId] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_images')
        .select('id, url, alt, position, is_primary, product_id')
        .eq('product_id', productId as string)
        .order('position')
      if (error) throw new Error(error.message)
      return data as unknown as Array<ProductImage & { product_id: string }>
    },
    enabled: Boolean(productId),
  })
}

export function useAdminOffers() {
  return useQuery({
    queryKey: ['admin', 'offers'] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offers')
        .select('id, product_id, discount_percent, starts_at, ends_at, is_active, product:products(name, slug)')
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw new Error(error.message)
      return data as unknown as Array<{
        id: string
        product_id: string
        discount_percent: number
        starts_at: string
        ends_at: string
        is_active: boolean
        product: { name: string; slug: string } | { name: string; slug: string }[]
      }>
    },
  })
}

/* ---------- Soporte ---------- */

export function useAdminSupport() {
  return useQuery({
    queryKey: ['admin', 'support'] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw new Error(error.message)
      return data as unknown as Array<{
        id: string
        name: string
        email: string
        subject: string
        message: string
        status: string
        created_at: string
        updated_at: string
      }>
    },
  })
}

export function useUpdateSupportStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'open' | 'answered' | 'closed' }) => {
      const { error } = await supabase.from('support_requests').update({ status }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'support'] }),
  })
}

/* ---------- Dashboard ---------- */

export function useAdminDashboard() {
  return useQuery({
    queryKey: ['admin', 'dashboard'] as const,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_dashboard')
      if (error) throw new Error(error.message)
      return data as unknown as AdminDashboardStats
    },
  })
}

/** Carga un producto (RLS admin) para editar en el formulario. */
export async function fetchAdminProductById(id: string): Promise<AdminProductRow | null> {
  const { data, error } = await supabase.from('products').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return (data as unknown as AdminProductRow) ?? null
}

export type { Product, Database }
