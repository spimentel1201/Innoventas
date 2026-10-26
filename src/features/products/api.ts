import { supabase } from '@/lib/supabase'
import { sanitizeSearchQuery } from '@/lib/utils'
import type { SortOption } from '@/lib/constants'
import type { Product, ProductImage, Category, BestSeller } from '@/types/domain'
import { mapProductRow, mapProducts } from './mappers'

export interface ProductFilters {
  q?: string
  category?: string
  brand?: string
  minPrice?: number
  maxPrice?: number
  inStockOnly?: boolean
  sort: SortOption
  page: number
  pageSize: number
}

function sortExpression(sort: SortOption): { column: string; ascending: boolean } {
  switch (sort) {
    case 'price_asc':
      return { column: 'offer_price', ascending: true }
    case 'price_desc':
      return { column: 'offer_price', ascending: false }
    case 'name_asc':
      return { column: 'name', ascending: true }
    default:
      return { column: 'created_at', ascending: false }
  }
}

export async function fetchProducts(filters: ProductFilters): Promise<{ items: Product[]; total: number }> {
  let query = supabase.from('published_products').select('*', { count: 'exact' })

  const q = sanitizeSearchQuery(filters.q ?? '')
  if (q) {
    query = query.or(
      `name.ilike.*${q}*,description.ilike.*${q}*,brand.ilike.*${q}*,category_name.ilike.*${q}*`,
    )
  }
  if (filters.category) query = query.eq('category_slug', filters.category)
  if (filters.brand) query = query.eq('brand', filters.brand)
  if (typeof filters.minPrice === 'number' && Number.isFinite(filters.minPrice))
    query = query.gte('price', filters.minPrice)
  if (typeof filters.maxPrice === 'number' && Number.isFinite(filters.maxPrice))
    query = query.lte('price', filters.maxPrice)
  if (filters.inStockOnly) query = query.gte('stock', 1)

  const order = sortExpression(filters.sort)
  const from = (filters.page - 1) * filters.pageSize
  const { data, error, count } = await query
    .order(order.column, { ascending: order.ascending, nullsFirst: false })
    .range(from, from + filters.pageSize - 1)
  if (error) throw new Error(error.message)
  return { items: mapProducts(data ?? []), total: count ?? 0 }
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  // Vista con seguridad de invocador: respeta las políticas RLS de products.
  const { data, error } = await supabase
    .from('published_products')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? mapProductRow(data) : null
}

export async function fetchProductImages(productId: string): Promise<ProductImage[]> {
  const { data, error } = await supabase
    .from('product_images')
    .select('id, url, alt, position, is_primary')
    .eq('product_id', productId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as ProductImage[]
}

export async function fetchRelatedProducts(
  categoryId: string,
  excludeSlug: string,
  limit = 4,
): Promise<Product[]> {
  const { data, error } = await supabase
    .from('published_products')
    .select('*')
    .eq('category_id', categoryId)
    .neq('slug', excludeSlug)
    .gte('stock', 1)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return mapProducts(data ?? [])
}

export async function fetchNewestProducts(limit = 8): Promise<Product[]> {
  const { data, error } = await supabase
    .from('published_products')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return mapProducts(data ?? [])
}

export async function fetchOfferProducts(limit = 8): Promise<Product[]> {
  const { data, error } = await supabase
    .from('published_products')
    .select('*')
    .not('offer_price', 'is', null)
    .order('offer_discount_percent', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return mapProducts(data ?? [])
}

export async function fetchProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return []
  const { data, error } = await supabase
    .from('published_products')
    .select('*')
    .in('id', ids.slice(0, 200))
  if (error) throw new Error(error.message)
  return mapProducts(data ?? [])
}

export async function fetchCategories(): Promise<Category[]> {
  const [{ data: cats, error }, { data: counts, error: countErr }] = await Promise.all([
    supabase
      .from('categories')
      .select('id, slug, name, description, icon, is_active')
      .eq('is_active', true)
      .order('name'),
    supabase.from('category_counts').select('id, product_count').limit(500),
  ])
  if (error) throw new Error(error.message)
  const countMap = new Map(
    (countErr ? [] : (counts ?? [])).map((row) => [row.id, Number(row.product_count)] as [string, number]),
  )
  return (cats ?? []).map((row) => ({
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    description: row.description as string,
    icon: (row.icon as string) ?? 'Package',
    productCount: countMap.get(row.id as string) ?? 0,
  }))
}

export async function fetchBrands(): Promise<string[]> {
  const { data, error } = await supabase.from('published_products').select('brand').limit(1000)
  if (error) throw new Error(error.message)
  return [...new Set((data ?? []).map((row) => row.brand as string))].sort((a, b) => a.localeCompare(b))
}

export async function fetchBestSellers(limit = 8): Promise<BestSeller[]> {
  // Los más vendidos SIEMPRE se calculan en el servidor a partir de ventas reales
  // de la tabla order_items. Si aún no hay ventas se devuelve [] y la página lo comunica.
  // La función devuelve jsonb con columnas snake_case por eso se mapea a camelCase.
  const { data, error } = await supabase.rpc('best_selling_products', { p_limit: limit })
  if (error) throw new Error(error.message)
  const rows = (Array.isArray(data) ? data : []) as Array<Record<string, unknown>>
  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    slug: String(r.slug),
    brand: String(r.brand),
    price: Number(r.price),
    // la primera foto disponible del producto (primary y luego posiciones)
    imageUrl: (r.image_url as string) ?? null,
    units: Number(r.units),
    offerPrice: r.offer_price != null ? Number(r.offer_price) : null,
    offerDiscountPercent: r.offer_discount_percent != null ? Number(r.offer_discount_percent) : null,
  }))
}
