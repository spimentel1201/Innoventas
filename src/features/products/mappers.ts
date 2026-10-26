import type { Json, PublishedProductRow } from '@/types/database'
import { asObject, type Product } from '@/types/domain'

export function mapProductRow(row: PublishedProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? '',
    brand: row.brand,
    price: Number(row.price),
    compareAtPrice: row.compare_at_price != null ? Number(row.compare_at_price) : null,
    stock: Number(row.stock),
    specifications: asObject(row.specifications as Json),
    status: (row.status === 'published' ? 'published' : 'draft') as Product['status'],
    createdAt: row.created_at,
    categorySlug: row.category_slug,
    categoryName: row.category_name,
    imageUrl: row.image_url ?? null,
    offerDiscountPercent: row.offer_discount_percent != null ? Number(row.offer_discount_percent) : null,
    offerPrice: row.offer_price != null ? Number(row.offer_price) : null,
    offerEndsAt: row.offer_ends_at,
  }
}

export function mapProducts(rows: readonly PublishedProductRow[]): Product[] {
  return rows.map((row) => mapProductRow(row))
}
