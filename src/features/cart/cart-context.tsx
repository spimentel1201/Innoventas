import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { MAX_QTY_PER_ITEM, MAX_QTY_TOTAL_CART } from '@/lib/config'
import { clamp } from '@/lib/utils'
import { useAuth } from '@/features/auth/auth-context'
import type { CartItem, Product } from '@/types/domain'
import {
  cartPersistence,
  cartStorage,
  deleteDbItem,
  upsertDbItem,
  clearDbCart,
  mergeCarts,
  toCartItem,
} from './cart-api'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

interface CartContextValue {
  items: CartItem[]
  hydrated: boolean
  itemCount: number
  addItem: (product: Product, quantity?: number) => void
  updateQuantity: (productId: string, quantity: number) => void
  removeItem: (productId: string) => void
  clear: () => void
  setItemQuantity: (productId: string, quantity: number) => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [items, setItems] = useState<CartItem[]>([])
  const [hydrated, setHydrated] = useState(false)
  const userRef = useRef(user)
  userRef.current = user

  useEffect(() => {
    let cancelled = false
    const label = user?.id
    void (async () => {
      const localItems = cartStorage.load()
      if (label) {
        try {
          const dbItems = await cartPersistence.loadDbCart(label)
          const merged = await mergeCarts(localItems, dbItems, label)
          if (!cancelled) setItems(merged)
        } catch {
          if (!cancelled) {
            setItems(localItems)
            toast.error('No se pudo cargar tu carrito guardado; usando el local.')
          }
        }
      } else if (!cancelled) {
        setItems(localItems)
      }
      if (!cancelled) setHydrated(true)
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const commit = useCallback((updater: (prev: CartItem[]) => CartItem[]) => {
    setItems((prev) => {
      const next = updater(prev)
      cartStorage.save(next)
      return next
    })
  }, [])

  const addItem = useCallback(
    (product: Product, quantity = 1) => {
      if (product.stock <= 0) {
        toast.error('Este producto está agotado.')
        return
      }
      const userId = userRef.current?.id
      commit((prev) => {
        const existing = prev.find((it) => it.productId === product.id)
        const currentQty = existing?.quantity ?? 0
        const totalQty = prev.reduce((acc, it) => acc + it.quantity, 0)
        if (totalQty + quantity > MAX_QTY_TOTAL_CART && !existing) {
          toast.error('El carrito alcanzó el máximo de artículos.')
          return prev
        }
        const freshQty = clamp(currentQty + quantity, 1, Math.min(MAX_QTY_PER_ITEM, product.stock))
        if (freshQty === currentQty) {
          toast.info(`Solo hay ${product.stock} en stock; ya agregaste ${currentQty}.`)
          return prev
        }
        const rest = prev.filter((it) => it.productId !== product.id)
        const item: CartItem = existing
          ? { ...existing, quantity: freshQty }
          : { ...toCartItem(product, freshQty) }
        // conservar snapshot fresco del producto
        item.name = product.name
        item.slug = product.slug
        item.brand = product.brand
        item.imageUrl = product.imageUrl
        if (userId) {
          void upsertDbItem(supabase as unknown as SupabaseClient<Database>, userId, product.id, freshQty).catch(() =>
            toast.error('No se pudo guardar en tu cuenta; el carrito queda local.'),
          )
        }
        return [...rest, item].sort((a, b) => a.name.localeCompare(b.name))
      })
      toast.success(`${product.name} agregado al carrito`)
    },
    [commit],
  )

  const setItemQuantity = useCallback(
    (productId: string, quantity: number) => {
      const userId = userRef.current?.id
      if (quantity >= MAX_QTY_PER_ITEM) quantity = MAX_QTY_PER_ITEM
      if (quantity <= 0) {
        commit((prev) => prev.filter((it) => it.productId !== productId))
        if (userId) void deleteDbItem(supabase as unknown as SupabaseClient<Database>, userId, productId).catch(() => undefined)
        return
      }
      commit((prev) => {
        const next = prev.map((it) => (it.productId === productId ? { ...it, quantity } : it))
        if (userId) {
          void upsertDbItem(supabase as unknown as SupabaseClient<Database>, userId, productId, quantity).catch(() =>
            toast.error('No se pudo sincronizar la cantidad.'),
          )
        }
        return next
      })
    },
    [commit],
  )

  const updateQuantity = useCallback(
    (productId: string, delta: number) => {
      const current = items.find((it) => it.productId === productId)
      if (!current) return
      setItemQuantity(productId, current.quantity + delta)
    },
    [items, setItemQuantity],
  )

  const removeItem = useCallback(
    (productId: string) => {
      const userId = userRef.current?.id
      commit((prev) => prev.filter((it) => it.productId !== productId))
      if (userId) {
        void deleteDbItem(supabase as unknown as SupabaseClient<Database>, userId, productId).catch(() =>
          toast.error('No se pudo eliminar en tu cuenta.'),
        )
      }
      toast.success('Producto eliminado del carrito')
    },
    [commit],
  )

  const clear = useCallback(() => {
    const userId = userRef.current?.id
    commit(() => [])
    if (userId) void clearDbCart(supabase as unknown as SupabaseClient<Database>, userId).catch(() => undefined)
  }, [commit])

  const value = useMemo<CartContextValue>(() => {
    const itemCount = items.reduce((acc, it) => acc + it.quantity, 0)
    return {
      items,
      hydrated,
      itemCount,
      addItem,
      updateQuantity,
      setItemQuantity,
      removeItem,
      clear,
    }
  }, [items, hydrated, addItem, updateQuantity, setItemQuantity, removeItem, clear])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>')
  return ctx
}
