import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { FieldError, Input, Label } from '@/components/ui/field'
import { registerSchema, type RegisterInput } from '@/lib/validations/auth'
import { register as registerAccount } from '@/features/auth/api'
import { AuthCard } from './auth-card'

export function RegisterPage() {
  const [serverError, setServerError] = useState('')
  const [needsConfirmation, setNeedsConfirmation] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  })

  async function onSubmit(values: RegisterInput) {
    setServerError('')
    try {
      const result = await registerAccount(values.fullName, values.email, values.password)
      if (result.needsEmailConfirmation) {
        setNeedsConfirmation(true)
        toast.info('Te enviamos un correo para confirmar tu cuenta.')
      } else {
        toast.success('¡Cuenta creada! Ya puedes usar la tienda.')
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'No se pudo crear la cuenta.')
    }
  }

  return (
    <AuthCard
      title="Crea tu cuenta"
      subtitle="Guarda tu carrito, haz pedidos y consulta tu historial."
      footer={
        <>
          ¿Ya tienes cuenta? <Link to="/login" className="font-medium text-brand-700 underline">Inicia sesión</Link>
        </>
      }
    >
      {needsConfirmation ? (
        <div className="space-y-4" role="status">
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Cuenta creada. Revisa tu correo (<strong>bandeja de entrada y spam</strong>) y confirma tu dirección para
            iniciar sesión.
          </p>
          <Link to="/login" className="inline-flex items-center text-sm font-medium text-brand-700 underline">
            Volver a iniciar sesión
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div>
            <Label htmlFor="reg-name">Nombre completo</Label>
            <Input id="reg-name" autoComplete="name" placeholder="Ana López" {...register('fullName')} />
            <FieldError message={errors.fullName?.message} />
          </div>
          <div>
            <Label htmlFor="reg-email">Correo electrónico</Label>
            <Input id="reg-email" type="email" autoComplete="email" placeholder="tucorreo@ejemplo.com" {...register('email')} />
            <FieldError message={errors.email?.message} />
          </div>
          <div>
            <Label htmlFor="reg-password">Contraseña</Label>
            <Input id="reg-password" type="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres, con número" {...register('password')} />
            <FieldError message={errors.password?.message} />
          </div>
          <div>
            <Label htmlFor="reg-password2">Confirma tu contraseña</Label>
            <Input id="reg-password2" type="password" autoComplete="new-password" placeholder="••••••••" {...register('confirmPassword')} />
            <FieldError message={errors.confirmPassword?.message} />
          </div>

          {serverError && (
            <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{serverError}</p>
          )}

          <p className="text-xs text-slate-400">
            Al registrarte aceptas las{' '}
            <Link to="/politicas/privacidad" className="underline">políticas de privacidad</Link> de esta demo.
          </p>

          <Button type="submit" className="w-full" loading={isSubmitting}>
            <UserPlus className="h-4 w-4" aria-hidden /> Crear cuenta
          </Button>
        </form>
      )}
    </AuthCard>
  )
}
