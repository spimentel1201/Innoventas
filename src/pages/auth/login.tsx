import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { FieldError, Input, Label } from '@/components/ui/field'
import { loginSchema, type LoginInput } from '@/lib/validations/auth'
import { login } from '@/features/auth/api'
import { useAuth } from '@/features/auth/auth-context'
import { AuthCard } from './auth-card'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useAuth()
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })

  async function onSubmit(values: LoginInput) {
    setServerError('')
    try {
      await login(values.email, values.password)
      toast.success('Bienvenido de nuevo 👋')
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from.startsWith('/') ? from : '/cuenta', { replace: true })
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.')
    }
  }

  return (
    <AuthCard
      title="Inicia sesión"
      subtitle="Accede a tu cuenta para comprar, revisar pedidos y tu perfil."
      footer={
        <>
          ¿No tienes cuenta?{' '}
          <Link to="/registro" className="font-medium text-brand-700 underline">Regístrate gratis</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div>
          <Label htmlFor="login-email">Correo electrónico</Label>
          <Input id="login-email" type="email" autoComplete="email" placeholder="tucorreo@ejemplo.com" {...register('email')} />
          <FieldError message={errors.email?.message} />
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <Label htmlFor="login-password">Contraseña</Label>
            <Link to="/recuperar-password" className="mb-1.5 text-xs text-brand-700 underline">
              ¿La olvidaste?
            </Link>
          </div>
          <Input id="login-password" type="password" autoComplete="current-password" placeholder="••••••••" {...register('password')} />
          <FieldError message={errors.password?.message} />
        </div>

        {serverError && (
          <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{serverError}</p>
        )}

        <Button type="submit" className="w-full" loading={isSubmitting}>
          <LogIn className="h-4 w-4" aria-hidden /> Entrar
        </Button>
        {profile && (
          <p className="text-xs text-slate-400">Sesión de perfil cargada: {profile.email}</p>
        )}
      </form>
    </AuthCard>
  )
}
