import { z } from 'zod'
import { emailField } from './auth'

export const contactSchema = z.object({
  name: z.string().trim().min(3, 'Escribe tu nombre').max(80, 'Máximo 80'),
  email: emailField,
  subject: z.string().trim().min(5, 'Describe el tema (mínimo 5 caracteres)').max(80, 'Máximo 80'),
  message: z
    .string()
    .trim()
    .min(20, 'Cuéntanos más (mínimo 20 caracteres)')
    .max(600, 'Máximo 600 caracteres'),
})

export type ContactInput = z.infer<typeof contactSchema>
