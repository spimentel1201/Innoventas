import { z } from 'zod'

export const specRowSchema = z.object({
  key: z.string().trim().min(1, 'Nombre requerido').max(40),
  value: z.string().trim().min(1, 'Valor requerido').max(120),
})

export const productFormSchema = z
  .object({
    name: z.string().trim().min(3, 'Mínimo 3 caracteres').max(80, 'Máximo 80'),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Usa minúsculas, números y guiones (ej. novabook-pro-14)')
      .min(3)
      .max(80),
    category: z.string().min(1, 'Selecciona una categoría'),
    brand: z.string().trim().min(2, 'Marca obligatoria').max(40),
    price: z.coerce.number().min(0.01, 'Precio mayor a 0').max(1_000_000),
    // '' vacía se transforma a undefined ANTES del coerce: así un campo vacío
    // no bloquea (coerce de '' daría 0 y fallaría el refine compareAtPrice > price).
    compareAtPrice: z.preprocess(
      (v) => (v === '' || v == null ? undefined : v),
      z.coerce.number().min(0, 'No puede ser negativo').optional(),
    ),
    stock: z.coerce.number().int('Debe ser entero').min(0, 'Mínimo 0').max(99_999),
    status: z.enum(['draft', 'published']),
    description: z.string().trim().min(10, 'Describe el producto (mínimo 10 caracteres)').max(2000),
    specs: z.array(specRowSchema).max(20, 'Máximo 20 especificaciones'),
  })
  .refine(
    (data) => {
      const keys = data.specs.map((s) => s.key.toLowerCase())
      return keys.length === new Set(keys).size
    },
    { message: 'Hay especificaciones duplicadas', path: ['specs'] },
  )
  .refine(
    (data) => data.compareAtPrice === undefined || (data.compareAtPrice as number) > data.price,
    {
      message: 'El precio de comparación debe ser mayor al precio actual',
      path: ['compareAtPrice'],
    },
  )

export type ProductFormInput = z.infer<typeof productFormSchema>

export const offerFormSchema = z
  .object({
    product: z.string().min(1, 'Selecciona un producto'),
    discountPercent: z.coerce.number().int().min(1, 'Mínimo 1%').max(90, 'Máximo 90%'),
    startsAt: z.string().min(1, 'Fecha de inicio requerida'),
    endsAt: z.string().min(1, 'Fecha de fin requerida'),
  })
  .refine((data) => new Date(data.endsAt).getTime() > new Date(data.startsAt).getTime(), {
    message: 'La fecha de fin debe ser posterior al inicio',
    path: ['endsAt'],
  })

export type OfferFormInput = z.infer<typeof offerFormSchema>
