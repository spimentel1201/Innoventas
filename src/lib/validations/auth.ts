import { z } from 'zod'

export const emailField = z
  .string()
  .trim()
  .min(1, 'El correo es obligatorio')
  .max(120, 'Máximo 120 caracteres')
  .email('Escribe un correo válido, por ejemplo nombre@dominio.com')

export const passwordField = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .max(72, 'Máximo 72 caracteres')
  .regex(/[A-Za-z]/, 'Incluye al menos una letra')
  .regex(/\d/, 'Incluye al menos un número')

export const fullNameField = z
  .string()
  .trim()
  .min(3, 'Escribe tu nombre completo')
  .max(80, 'Máximo 80 caracteres')

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'La contraseña es obligatoria'),
})

export const registerSchema = z
  .object({
    fullName: fullNameField,
    email: emailField,
    password: passwordField,
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

export const forgotPasswordSchema = z.object({ email: emailField })

export const resetPasswordSchema = z
  .object({ password: passwordField, confirmPassword: z.string().min(1, 'Confirma tu contraseña') })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

export const profileSchema = z.object({
  fullName: fullNameField,
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s()]{0,20}$/, 'Teléfono no válido (usa dígitos y +, -)')
    .optional()
    .or(z.literal('')),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type ProfileInput = z.infer<typeof profileSchema>
