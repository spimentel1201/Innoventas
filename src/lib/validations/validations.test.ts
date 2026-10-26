import { describe, expect, it } from 'vitest'
import { checkoutSchema } from './checkout'
import { loginSchema, registerSchema, profileSchema } from './auth'
import { productFormSchema, offerFormSchema } from './product'

describe('checkoutSchema', () => {
  it('acepta un envío válido', () => {
    const res = checkoutSchema.safeParse({
      shipping: {
        fullName: 'Ana López', phone: '5512345678', line1: 'Av. Reforma 100',
        line2: '', city: 'CDMX', state: 'CDMX', postalCode: '01000', country: 'México', notes: '',
      },
      paymentMethod: 'transfer',
    })
    expect(res.success).toBe(true)
  })

  it('rechaza postal code inválido', () => {
    const res = checkoutSchema.safeParse({
      shipping: {
        fullName: 'Ana López', phone: '5512345678', line1: 'Av. Reforma 100',
        line2: '', city: 'CDMX', state: 'CDMX', postalCode: 'AB', country: 'México',
      },
      paymentMethod: 'cod',
    })
    expect(res.success).toBe(false)
  })
})

describe('auth schemas', () => {
  it('login exige contraseña', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false)
  })

  it('registro exige contraseñas coincidentes y con número', () => {
    const ok = registerSchema.safeParse({ fullName: 'Ana López', email: 'a@b.com', password: 'abc12345', confirmPassword: 'abc12345' })
    expect(ok.success).toBe(true)
    const bad = registerSchema.safeParse({ fullName: 'Ana López', email: 'a@b.com', password: 'abcdefgh', confirmPassword: 'abcdefgh' })
    expect(bad.success).toBe(false) // sin número
    const mismatch = registerSchema.safeParse({ fullName: 'Ana', email: 'a@b.com', password: 'abc12345', confirmPassword: 'zyx54321' })
    expect(mismatch.success).toBe(false)
  })

  it('perfil tolera teléfono vacío', () => {
    expect(profileSchema.safeParse({ fullName: 'Ana López', phone: '' }).success).toBe(true)
    expect(profileSchema.safeParse({ fullName: 'Ana López', phone: '55-123-45' }).success).toBe(true)
    expect(profileSchema.safeParse({ fullName: 'Ana López', phone: 'abc!' }).success).toBe(false)
  })
})

describe('productFormSchema', () => {
  const base = {
    name: 'Laptop Nova', slug: 'laptop-nova', category: 'cat-1', brand: 'TechNova',
    price: 19999, stock: 10, status: 'published', description: 'Una laptop confiable para trabajar.', specs: [],
  }

  it('acepta producto válido sin compareAtPrice', () => {
    expect(productFormSchema.safeParse(base).success).toBe(true)
  })

  it('exige compareAtPrice > price', () => {
    expect(productFormSchema.safeParse({ ...base, compareAtPrice: 1000 }).success).toBe(false)
    expect(productFormSchema.safeParse({ ...base, compareAtPrice: 25000 }).success).toBe(true)
  })

  it('acepta compareAtPrice vacía (el formulario no debe bloquear el guardado)', () => {
    // Regresión: coerce de '' daba 0 y el refine compareAtPrice > price fallaba.
    expect(productFormSchema.safeParse({ ...base, compareAtPrice: '' }).success).toBe(true)
  })

  it('rechaza specs duplicadas', () => {
    const res = productFormSchema.safeParse({
      ...base,
      specs: [{ key: 'RAM', value: '16 GB' }, { key: 'ram', value: '32 GB' }],
    })
    expect(res.success).toBe(false)
  })

  it('valida formato de slug', () => {
    expect(productFormSchema.safeParse({ ...base, slug: 'Laptop NOVA!' }).success).toBe(false)
  })
})

describe('offerFormSchema', () => {
  it('exige fin posterior a inicio', () => {
    const res = offerFormSchema.safeParse({
      product: 'p1', discountPercent: 15,
      startsAt: '2026-01-10T00:00', endsAt: '2026-01-05T00:00',
    })
    expect(res.success).toBe(false)
  })

  it('limita descuento 1..90', () => {
    expect(offerFormSchema.safeParse({ product: 'p1', discountPercent: 95, startsAt: '2026-01-01', endsAt: '2026-01-10' }).success).toBe(false)
    expect(offerFormSchema.safeParse({ product: 'p1', discountPercent: 50, startsAt: '2026-01-01', endsAt: '2026-01-10' }).success).toBe(true)
  })
})
