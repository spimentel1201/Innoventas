import { z } from 'zod'

export const shippingSchema = z.object({
  fullName: z.string().trim().min(3, 'Escribe el nombre de quien recibe').max(80, 'Máximo 80'),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s()]{7,20}$/, 'Teléfono contacto no válido'),
  line1: z.string().trim().min(5, 'Escribe calle y número').max(120),
  line2: z.string().trim().max(120, 'Máximo 120').optional().or(z.literal('')),
  city: z.string().trim().min(2, 'Ciudad obligatoria').max(40),
  state: z.string().trim().min(2, 'Estado obligatorio').max(40),
  postalCode: z.string().trim().min(3, 'CP obligatorio').max(10),
  country: z.string().trim().min(2, 'País obligatorio').max(56),
  notes: z.string().trim().max(200, 'Máx 200 caracteres').optional().or(z.literal('')),
})

export const checkoutSchema = z.object({
  shipping: shippingSchema,
  paymentMethod: z.enum(['transfer', 'cod', 'demo_card'], {
    errorMap: () => ({ message: 'Selecciona un método de pago' }),
  }),
})

export type CheckoutInput = z.infer<typeof checkoutSchema>
export type ShippingInput = z.infer<typeof shippingSchema>
