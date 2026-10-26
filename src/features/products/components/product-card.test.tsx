import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ProductCard } from './product-card'
import type { Product } from '@/types/domain'

vi.mock('@/features/cart/cart-context', () => ({
  useCart: () => ({ addItem: vi.fn() }),
}))

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    name: 'Laptop Nova',
    slug: 'laptop-nova',
    description: '',
    brand: 'TechNova',
    price: 12_999,
    compareAtPrice: null,
    stock: 10,
    specifications: {},
    status: 'published',
    createdAt: new Date().toISOString(),
    categorySlug: 'laptops',
    categoryName: 'Laptops',
    imageUrl: null,
    offerDiscountPercent: null,
    offerPrice: null,
    offerEndsAt: null,
    ...overrides,
  }
}

function renderCard(product: Product) {
  return render(
    <MemoryRouter>
      <ProductCard product={product} />
    </MemoryRouter>,
  )
}

describe('ProductCard', () => {
  it('muestra nombre, marca y precio formateado', () => {
    renderCard(makeProduct())
    expect(screen.getByText('Laptop Nova')).toBeInTheDocument()
    expect(screen.getByText('TechNova')).toBeInTheDocument()
    expect(screen.getAllByText(/12,999\.00/).length).toBeGreaterThan(0)
  })

  it('muestra badge −% cuando hay oferta vigente', () => {
    renderCard(makeProduct({ offerDiscountPercent: 15, offerPrice: 11_049.15 }))
    expect(screen.getByText('−15%')).toBeInTheDocument()
  })

  it('marca agotado cuando stock 0 y deshabilita agregar', () => {
    renderCard(makeProduct({ stock: 0 }))
    expect(screen.getByText('Agotado')).toBeInTheDocument()
    expect(screen.getByLabelText(/agregar .* carrito/i)).toBeDisabled()
  })

  it('marca stock bajo', () => {
    renderCard(makeProduct({ stock: 3 }))
    expect(screen.getByText(/Quedan solo 3 unidades/)).toBeInTheDocument()
  })

  it('usa placeholder textual cuando no hay imageUrl', () => {
    renderCard(makeProduct())
    expect(screen.getByText('Sin imagen demostrativa para Laptop Nova')).toBeInTheDocument()
  })

  it('muestra la imagen del producto cuando existe', () => {
    renderCard(makeProduct({ imageUrl: 'https://ejemplo.com/laptop.png' }))
    const imgs = screen.getAllByRole('img')
    expect(imgs.some((img) => (img as HTMLImageElement).src === 'https://ejemplo.com/laptop.png')).toBe(true)
  })

  it('agregar al carrito funciona con stock disponible', () => {
    renderCard(makeProduct())
    fireEvent.click(screen.getByLabelText(/agregar .* carrito/i))
    expect(screen.getByLabelText(/agregar .* carrito/i)).toBeEnabled()
  })
})
