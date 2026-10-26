import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, MailCheck, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { FieldError, Input, Label } from '@/components/ui/field'
import { PageSpinner } from '@/components/ui/spinner'
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from '@/lib/validations/auth'
import { sendPasswordReset, updatePassword } from '@/features/auth/api'
import { useAuth } from '@/features/auth/auth-context'
import { AuthCard } from './auth-card'

/* Ruta /recuperar-password sirve para dos estados:
   1) visitante sin sesión: pedir el enlace por correo.
   2) al abrir el enlace del correo: Supabase intercambia el código y crea
      una sesión de recuperación (detectSessionInUrl) → mostramos el nuevo password. */

function ResetPasswordForm() {
  const [serverError, setServerError] = useState('')
  const [done, setDone] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  async function onSubmit(values: ResetPasswordInput) {
    setServerError('')
    try {
      await updatePassword(values.password)
      setDone(true)
      toast.success('Contraseña actualizada. Ya puedes iniciar sesión con la nueva.')
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'No se pudo actualizar la contraseña.')
    }
  }

  if (done) {
    return (
      <div className="space-y-3" role="status">
        <p className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> Contraseña actualizada correctamente.
        </p>
        <Link to="/login" className="inline-flex h-10 items-center rounded-lg bg-brand-600 px-5 text-sm font-medium text-white hover:bg-brand-700">
          Ir a iniciar sesión
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div>
        <Label htmlFor="new-password">Nueva contraseña</Label>
        <Input id="new-password" type="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres, con número" {...register('password')} />
        <FieldError message={errors.password?.message} />
      </div>
      <div>
        <Label htmlFor="new-password2">Confirma la nueva contraseña</Label>
        <Input id="new-password2" type="password" autoComplete="new-password" placeholder="••••••••" {...register('confirmPassword')} />
        <FieldError message={errors.confirmPassword?.message} />
      </div>
      {serverError && (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{serverError}</p>
      )}
      <Button type="submit" className="w-full" loading={isSubmitting}>
        Guardar contraseña
      </Button>
    </form>
  )
}

export function ForgotPasswordPage() {
  const { user, isProfileLoading } = useAuth()
  const [serverError, setServerError] = useState('')
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: '' } })

  async function onSubmit(values: ForgotPasswordInput) {
    setServerError('')
    try {
      await sendPasswordReset(values.email)
      setSent(true)
      toast.info('Si el correo existe, te enviamos un enlace para cambiar la contraseña.')
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'No se pudo enviar el correo.')
    }
  }

  if (isProfileLoading) return <PageSpinner label="Verificando enlace…" />

  // Estado 2: el enlace de recuperación abrió la página (ya hay sesión de usuario).
  if (user) {
    return (
      <AuthCard
        title="Elige tu nueva contraseña"
        subtitle="El enlace de recuperación ya activó tu sesión temporal."
      >
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Este enlace es de un solo uso. Al guardar, la sesión de recuperación se cierra y deberás iniciar sesión de nuevo.
        </div>
        <ResetPasswordForm />
      </AuthCard>
    )
  }

  // Estado 1: pedir enlace.
  return (
    <AuthCard
      title="Restablecer contraseña"
      subtitle="Enviamos un enlace temporal a tu correo para elegir una contraseña nueva."
      footer={<Link to="/login" className="font-medium text-brand-700 underline">Volver a iniciar sesión</Link>}
    >
      {sent ? (
        <div className="space-y-3" role="status">
          <p className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <MailCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> Revisa tu bandeja de entrada (y spam).
            El enlace expira en pocos minutos y solo funciona una vez.
          </p>
          <Button variant="outline" className="w-full" onClick={() => setSent(false)} type="button">
            Usar otro correo
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div>
            <Label htmlFor="forgot-email">Correo de tu cuenta</Label>
            <Input id="forgot-email" type="email" autoComplete="email" placeholder="tucorreo@ejemplo.com" {...register('email')} />
            <FieldError message={errors.email?.message} />
          </div>
          {serverError && (
            <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{serverError}</p>
          )}
          <Button type="submit" className="w-full" loading={isSubmitting}>
            Enviar enlace
          </Button>
        </form>
      )}
    </AuthCard>
  )
}
