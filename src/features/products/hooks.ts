import { useQuery, keepPreviousData } from '@tanstack/react-query'
import type { BestSeller, ProductImage } from '@/types/domain'
import type { ProductFilters } from './api'
import {
  fetchBestSellers,
  fetchBrands,
  fetchCategories,
  fetchNewestProducts,
  fetchOfferProducts,
  fetchProductBySlug,
  fetchProductImages,
  fetchProducts,
  fetchProductsByIds,
  fetchRelatedProducts,
} from './api'

export function useProductList(filters: ProductFilters) {
  return useQuery({
    queryKey: ['products', 'list', filters] as const,
    queryFn: () => fetchProducts(filters),
    placeholderData: keepPreviousData,
  })
}

export function useProductDetail(slug: string) {
  return useQuery({
    queryKey: ['products', 'detail', slug] as const,
    queryFn: () => fetchProductBySlug(slug),
  })
}

export function useProductImages(productId: string | undefined) {
  return useQuery({
    queryKey: ['products', 'images', productId] as const,
    queryFn: () => fetchProductImages(productId as string),
    enabled: Boolean(productId),
  })
}

export function useRelatedProducts(categoryId: string | undefined, excludeSlug: string) {
  return useQuery({
    queryKey: ['products', 'related', categoryId, excludeSlug] as const,
    queryFn: () => fetchRelatedProducts(categoryId as string, excludeSlug),
    enabled: Boolean(categoryId),
  })
}

export function useNewestProducts(limit = 8) {
  return useQuery({
    queryKey: ['products', 'newest', limit] as const,
    queryFn: () => fetchNewestProducts(limit),
  })
}

export function useOfferProducts(limit = 8) {
  return useQuery({
    queryKey: ['products', 'offers', limit] as const,
    queryFn: () => fetchOfferProducts(limit),
  })
}

export function useProductsByIds(ids: string[] | undefined) {
  const normalized = (ids ?? []).join(',')
  return useQuery({
    queryKey: ['products', 'by-ids', normalized] as const,
    queryFn: () => fetchProductsByIds(normalized ? normalized.split(',') : []),
    enabled: normalized.length > 0,
  })
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'] as const,
    queryFn: fetchCategories,
  })
}

export function useBrands() {
  return useQuery({
    queryKey: ['brands'] as const,
    queryFn: fetchBrands,
  })
}

export function useBestSellers(limit = 8) {
  return useQuery({
    queryKey: ['products', 'best-sellers', limit] as const,
    queryFn: () => fetchBestSellers(limit),
  })
}

export type { BestSeller, ProductImage }
