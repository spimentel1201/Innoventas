import { useState, type FormEvent } from 'react'
import { MessageSquareText, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FieldError, Input, Label, Textarea } from '@/components/ui/field'
import { contactSchema, type ContactInput } from '@/lib/validations/contact'
import { SITE } from '@/lib/config'
import { supabase } from '@/lib/supabase'

export function ContactPage() {
  const [values, setValues] = useState<ContactInput>({ name: '', email: '', subject: '', message: '' })
  const [errors, setErrors] = useState<Partial<Record<keyof ContactInput, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<{ reference: string } | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const validateField = (field: keyof ContactInput, value: string) => {
    const result = contactSchema.shape[field].safeParse(value)
    setErrors((prev) => ({ ...prev, [field]: result.success ? undefined : result.error.issues[0]?.message }))
    return result.success
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setServerError(null)
    const parsed = contactSchema.safeParse(values)
    if (!parsed.success) {
      const next: typeof errors = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof ContactInput
        next[key] = issue.message
      }
      setErrors(next)
      return
    }
    setSubmitting(true)
    try {
      // El envío persiste en Supabase (RLS: insert público, lectura solo admins)
      const { error: dbError } = await supabase.from('support_requests').insert({
        name: parsed.data.name,
        email: parsed.data.email,
        subject: parsed.data.subject,
        message: parsed.data.message,
      })
      if (dbError) throw new Error(dbError.message)
      setDone({ reference: parsed.data.email })
      setValues({ name: '', email: '', subject: '', message: '' })
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'No se pudo enviar tu mensaje.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container grid gap-10 pb-16 lg:grid-cols-[1fr_360px]">
      <div>
        <header className="mb-8">
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Contacto</h1>
          <p className="mt-2 max-w-lg text-sm text-slate-500">
            ¿Dudas sobre un pedido, una garantía o una cotización corporativa? Escríbenos y respondemos
            en horario laboral. Tu mensaje queda registrado en la base de datos de soporte.
          </p>
        </header>

        {done ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center" role="status">
            <MessageSquareText className="mx-auto mb-2 h-8 w-8 text-emerald-600" aria-hidden />
            <p className="font-display text-lg font-semibold text-emerald-900">¡Mensaje enviado!</p>
            <p className="mt-1 text-sm text-emerald-700">
              Se registró con el correo {done.reference}. El equipo de soporte te responderá al mismo correo.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => setDone(null)} type="button">
              Enviar otro mensaje
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="c-name">Nombre</Label>
                <Input
                  id="c-name"
                  value={values.name}
                  onBlur={(e) => validateField('name', e.target.value)}
                  onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
                  aria-invalid={Boolean(errors.name)}
                />
                <FieldError message={errors.name} />
              </div>
              <div>
                <Label htmlFor="c-email">Correo</Label>
                <Input
                  id="c-email"
                  type="email"
                  value={values.email}
                  onBlur={(e) => validateField('email', e.target.value)}
                  onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
                  aria-invalid={Boolean(errors.email)}
                />
                <FieldError message={errors.email} />
              </div>
            </div>
            <div className="mt-4">
              <Label htmlFor="c-subject">Asunto</Label>
              <Input
                id="c-subject"
                value={values.subject}
                onBlur={(e) => validateField('subject', e.target.value)}
                onChange={(e) => setValues((v) => ({ ...v, subject: e.target.value }))}
                aria-invalid={Boolean(errors.subject)}
              />
              <FieldError message={errors.subject} />
            </div>
            <div className="mt-4">
              <Label htmlFor="c-message">Mensaje</Label>
              <Textarea
                id="c-message"
                rows={5}
                value={values.message}
                onBlur={(e) => validateField('message', e.target.value)}
                onChange={(e) => setValues((v) => ({ ...v, message: e.target.value }))}
                aria-invalid={Boolean(errors.message)}
                placeholder="Describe tu situación, incluye tu número de pedido si aplica (INV-…)"
              />
              <FieldError message={errors.message} />
            </div>
            {serverError && <p className="mt-3 text-sm text-rose-600" role="alert">{serverError}</p>}
            <div className="mt-5 flex items-center justify-between gap-4">
              <p className="text-xs text-slate-400">Al enviar aceptas nuestro aviso de privacidad (demo).</p>
              <Button type="submit" loading={submitting}>
                <Send className="h-4 w-4" /> Enviar mensaje
              </Button>
            </div>
          </form>
        )}
      </div>

      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold text-slate-900">Datos del sitio (demo)</h2>
        <ul className="mt-3 space-y-3 text-sm text-slate-600">
          <li><strong>Correo:</strong> {SITE.email}</li>
          <li><strong>Teléfono:</strong> {SITE.phone}</li>
          <li><strong>Dirección:</strong> {SITE.address}</li>
          <li><strong>Horario:</strong> {SITE.hours}</li>
        </ul>
        <p className="mt-4 text-xs text-slate-400">
          La información de contacto es ficticia; en producción conectaría con tu propio equipo.
        </p>
      </aside>
    </div>
  )
}
