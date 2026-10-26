import { render, screen, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { CartProvider, useCart } from './cart-context'
import type { Product } from '@/types/domain'

vi.mock('./cart-api', () => ({
  cartPersistence: { loadDbCart: vi.fn(async () => []) },
  cartStorage: {
    load: vi.fn(() => []),
    save: vi.fn(),
  },
  deleteDbItem: vi.fn(async () => undefined),
  upsertDbItem: vi.fn(async () => undefined),
  clearDbCart: vi.fn(async () => undefined),
  mergeCarts: vi.fn(async (local: unknown[]) => local),
  toCartItem: vi.fn((p: Product, q: number) => ({
    productId: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    imageUrl: p.imageUrl,
    quantity: q,
  })),
}))

vi.mock('@/features/auth/auth-context', () => ({
  useAuth: () => ({ user: null }),
}))

const product: Product = {
  id: 'p1',
  name: 'Laptop Nova',
  slug: 'laptop-nova',
  description: '',
  brand: 'TechNova',
  price: 9999,
  compareAtPrice: null,
  stock: 5,
  specifications: {},
  status: 'published',
  createdAt: new Date().toISOString(),
  categorySlug: 'laptops',
  categoryName: 'Laptops',
  imageUrl: null,
  offerDiscountPercent: null,
  offerPrice: null,
  offerEndsAt: null,
}

/** Consumidor de prueba que expone la API del contexto al mock local. */
let api: ReturnType<typeof useCart> | null
function Consumer() {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  api = useCart()
  return <div data-testid="state">{JSON.stringify({ count: api?.itemCount, hydrated: api?.hydrated })}</div>
}

describe('CartProvider (flujo local sin usuario)', () => {
  beforeEach(() => {
    api = null
    vi.clearAllMocks()
  })

  it('arranca vacío e hidratado', async () => {
    render(
      <CartProvider>
        <Consumer />
      </CartProvider>,
    )
    await act(async () => undefined)
    expect(api?.hydrated).toBe(true)
    expect(api?.items).toEqual([])
  })

  it('agrega, respeta stock tope y elimina', async () => {
    render(
      <CartProvider>
        <Consumer />
      </CartProvider>,
    )
    await act(async () => undefined)

    act(() => api?.addItem(product, 2))
    expect(api?.items).toHaveLength(1)
    expect(api?.itemCount).toBe(2)

    // producto agotado no entra
    act(() => api?.addItem({ ...product, id: 'p2', stock: 0 }, 1))
    expect(api?.items).toHaveLength(1)

    // límite: setItemQuantity acota a MAX_QTY_PER_ITEM = 10
    act(() => api?.setItemQuantity('p1', 25))
    expect(api?.items[0]?.quantity).toBe(10)

    act(() => api?.removeItem('p1'))
    expect(api?.items).toHaveLength(0)
  })

  it('poner cantidad 0 elimina el renglón', async () => {
    render(
      <CartProvider>
        <Consumer />
      </CartProvider>,
    )
    await act(async () => undefined)
    act(() => api?.addItem(product, 1))
    act(() => api?.setItemQuantity('p1', 0))
    expect(api?.items).toHaveLength(0)
  })

  it('clear vacía todo', async () => {
    render(
      <CartProvider>
        <Consumer />
      </CartProvider>,
    )
    await act(async () => undefined)
    act(() => api?.addItem(product, 2))
    act(() => api?.clear())
    expect(api?.items).toHaveLength(0)
    expect(screen.getByTestId('state')).toBeInTheDocument()
  })
})
