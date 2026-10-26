import type { SupabaseClient } from '@supabase/supabase-js'
import { CART_STORAGE_KEY } from '@/lib/config'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import type { CartItem, Product } from '@/types/domain'
import { mapProductRow } from '@/features/products/mappers'

type Client = SupabaseClient<Database>

/* ---------- Persistencia local (invitados + respaldo rápido) ---------- */

export const cartStorage = {
  load(): CartItem[] {
    try {
      const raw = window.localStorage.getItem(CART_STORAGE_KEY)
      if (!raw) return []
      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      return parsed.filter(
        (it): it is CartItem =>
          typeof it === 'object' &&
          it !== null &&
          typeof (it as CartItem).productId === 'string' &&
          typeof (it as CartItem).quantity === 'number',
      )
    } catch {
      return []
    }
  },
  save(items: CartItem[]) {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
    } catch {
      /* almacenamiento no disponible: el carrito vive solo en memoria */
    }
  },
  clear() {
    try {
      window.localStorage.removeItem(CART_STORAGE_KEY)
    } catch {
      /* noop */
    }
  },
}

/* ---------- Persistencia en Supabase (usuarios autenticados) ---------- */

/** Devuelve { product_id, quantity } del usuario. */
export async function loadDbCart(userId: string): Promise<CartItem[]> {
  const { data, error } = await supabase
    .from('cart_items')
    .select('product_id, quantity')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as Array<{ product_id: string; quantity: number }>
  if (rows.length === 0) return []
  const ids = rows.map((r) => r.product_id)
  const { data: products, error: pErr } = await supabase
    .from('published_products')
    .select('*')
    .in('id', ids)
  if (pErr) throw new Error(pErr.message)
  const byId = new Map((products ?? []).map((p) => [p.id, mapProductRow(p as never)]) as Array<[string, Product]>)
  // Los productos ya no publicados se descartan del carrito remoto.
  return rows
    .filter((r) => {
      const p = byId.get(r.product_id)
      return p && p.stock > 0
    })
    .map((r) => toCartItem(byId.get(r.product_id) as Product, r.quantity))
}

export function toCartItem(p: Product, quantity: number): CartItem {
  return {
    productId: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    imageUrl: p.imageUrl,
    quantity: Math.max(1, quantity),
  }
}

export async function upsertDbItem(
  client: Client,
  userId: string,
  productId: string,
  quantity: number,
) {
  const { error } = await client
    .from('cart_items')
    .upsert({ user_id: userId, product_id: productId, quantity }, { onConflict: 'user_id,product_id' })
  if (error) throw new Error(error.message)
}

export async function deleteDbItem(client: Client, userId: string, productId: string) {
  const { error } = await client
    .from('cart_items')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', productId)
  if (error) throw new Error(error.message)
}

export async function clearDbCart(client: Client, userId: string) {
  const { error } = await client.from('cart_items').delete().eq('user_id', userId)
  if (error) throw new Error(error.message)
}

async function replaceAllDb(client: Client, userId: string, items: CartItem[]) {
  await clearDbCart(client, userId)
  if (items.length === 0) return
  const { error } = await client
    .from('cart_items')
    .insert(items.map((it) => ({ user_id: userId, product_id: it.productId, quantity: it.quantity })))
  if (error) throw new Error(error.message)
}

/** Fusiona carrito local (este dispositivo) con el guardado en la base de datos. */
export async function mergeCarts(local: CartItem[], db: CartItem[], userId: string): Promise<CartItem[]> {
  const merged = new Map<string, CartItem>()
  for (const it of db) merged.set(it.productId, { ...it })
  for (const it of local) {
    const existing = merged.get(it.productId)
    merged.set(it.productId, existing ? { ...it, quantity: Math.max(existing.quantity, it.quantity) } : { ...it })
  }
  // Reponer datos faltantes para artículos que solo existen en la base de datos
  const missing = [...merged.values()].filter((it) => !it.name || !it.slug)
  if (missing.length > 0) {
    const { data, error } = await supabase
      .from('published_products')
      .select('*')
      .in('id', missing.map((m) => m.productId))
    if (!error) {
      for (const row of (data ?? []) as never[]) {
        const product = mapProductRow(row)
        const it = merged.get(product.id)
        if (it) merged.set(product.id, { ...it, ...toCartItem(product, it.quantity) })
      }
    }
  }
  const result = [...merged.values()]
  // Persistir la fusión para que todos los dispositivos queden iguales
  try {
    await replaceAllDb(supabase as unknown as Client, userId, result)
  } catch {
    /* no bloquear el login por fallos de sincronización */
  }
  return result
}

export const cartPersistence = { loadDbCart, upsertDbItem, deleteDbItem, clearDbCart, replaceAllDb, toCartItem }
