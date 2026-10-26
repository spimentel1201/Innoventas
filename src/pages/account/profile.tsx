import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { FieldError, Input, Label } from '@/components/ui/field'
import { PageSpinner } from '@/components/ui/spinner'
import { profileSchema, type ProfileInput } from '@/lib/validations/auth'
import { updatePassword, updateProfile } from '@/features/auth/api'
import { useAuth } from '@/features/auth/auth-context'
import { formatDate } from '@/lib/utils'

export function AccountProfilePage() {
  const { user, profile, isProfileLoading, isAdmin, refreshProfile } = useAuth()

  const profileForm = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: profile?.fullName ?? '', phone: profile?.phone ?? '' },
  })

  const passwordForm = useForm({
    defaultValues: { password: '', confirmPassword: '' },
  })

  // El perfil llega de forma asíncrona: sincroniza el formulario cuando está listo.
  useEffect(() => {
    if (profile) profileForm.reset({ fullName: profile.fullName, phone: profile.phone ?? '' })
  }, [profile, profileForm])

  if (isProfileLoading || !user) return <PageSpinner label="Cargando tu perfil…" />

  async function saveProfile(values: ProfileInput) {
    if (!user) return
    try {
      await updateProfile(user.id, values)
      await refreshProfile()
      toast.success('Perfil actualizado.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar el perfil.')
    }
  }

  async function savePassword(values: { password: string; confirmPassword: string }) {
    if (values.password !== values.confirmPassword) {
      passwordForm.setError('confirmPassword', { message: 'Las contraseñas no coinciden' })
      return
    }
    if (values.password.length < 8 || !/\d/.test(values.password) || !/[A-Za-z]/.test(values.password)) {
      passwordForm.setError('password', { message: 'Mínimo 8 caracteres, con letras y números' })
      return
    }
    try {
      await updatePassword(values.password)
      toast.success('Contraseña actualizada.')
      passwordForm.reset({ password: '', confirmPassword: '' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña.')
    }
  }

  const email = profile?.email ?? user.email ?? ''

  return (
    <div className="container max-w-4xl pb-16">
      <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Mi cuenta</h1>
      <p className="mt-1 text-sm text-slate-500">Actualiza tus datos personales o tu contraseña.</p>

      <div className="mt-6 grid gap-6 md:grid-cols-[220px_1fr]">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 font-display text-sm font-bold text-brand-700">
              {(profile?.fullName ?? email).slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{profile?.fullName ?? '—'}</p>
              <p className="truncate text-xs text-slate-500">{email}</p>
            </div>
          </div>
          <dl className="mt-4 space-y-1.5 text-xs text-slate-500">
            <div className="flex justify-between"><dt>Rol</dt><dd className="font-medium text-slate-700">{isAdmin ? 'Administrador' : 'Cliente'}</dd></div>
            <div className="flex justify-between"><dt>Cuenta creada</dt><dd className="font-medium text-slate-700">{formatDate(user.created_at)}</dd></div>
          </dl>
          <nav className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-sm" aria-label="Mi cuenta">
            <Link to="/cuenta/pedidos" className="block rounded-lg px-2 py-1.5 text-slate-600 hover:bg-slate-100">Mis pedidos</Link>
            {isAdmin && <Link to="/admin" className="block rounded-lg px-2 py-1.5 text-brand-700 hover:bg-brand-50">Panel de administración</Link>}
          </nav>
        </aside>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-slate-900">
              <UserRound className="h-5 w-5 text-brand-600" aria-hidden /> Datos personales
            </h2>
            <form onSubmit={profileForm.handleSubmit(saveProfile)} noValidate className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="pf-name">Nombre completo</Label>
                  <Input id="pf-name" autoComplete="name" {...profileForm.register('fullName')} />
                  <FieldError message={profileForm.formState.errors.fullName?.message} />
                </div>
                <div>
                  <Label htmlFor="pf-phone">Teléfono (opcional)</Label>
                  <Input id="pf-phone" autoComplete="tel" placeholder="55 1234 5678" {...profileForm.register('phone')} />
                  <FieldError message={profileForm.formState.errors.phone?.message} />
                </div>
              </div>
              <div>
                <Label htmlFor="pf-email">Correo (no editable)</Label>
                <Input id="pf-email" value={email} disabled readOnly />
              </div>
              <Button type="submit" loading={profileForm.formState.isSubmitting}>Guardar cambios</Button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-slate-900">
              <KeyRound className="h-5 w-5 text-brand-600" aria-hidden /> Cambiar contraseña
            </h2>
            <form onSubmit={passwordForm.handleSubmit(savePassword)} noValidate className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="pw-new">Nueva contraseña</Label>
                  <Input id="pw-new" type="password" autoComplete="new-password" {...passwordForm.register('password')} />
                  <FieldError message={passwordForm.formState.errors.password?.message} />
                </div>
                <div>
                  <Label htmlFor="pw-confirm">Confirmar contraseña</Label>
                  <Input id="pw-confirm" type="password" autoComplete="new-password" {...passwordForm.register('confirmPassword')} />
                  <FieldError message={passwordForm.formState.errors.confirmPassword?.message} />
                </div>
              </div>
              <Button type="submit" variant="outline" loading={passwordForm.formState.isSubmitting}>
                Cambiar contraseña
              </Button>
            </form>
          </section>
        </div>
      </div>
    </div>
  )
}
