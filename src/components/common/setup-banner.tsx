import { AlertTriangle, Wrench } from 'lucide-react'

/** Aviso visible cuando el proyecto aún no conecta variables de entorno de Supabase.
 *  Sin esto, la app mostraría estados vacíos "falsos"; preferimos anunciar
 *  la falta de configuración de forma honesta. */
export function SetupBanner() {
  return (
    <div className="mb-8 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 md:px-6" role="alert">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
        <div className="text-sm text-amber-900">
          <p className="font-semibold">Modo configuración</p>
          <p className="mt-0.5">
            Falta conectar Supabase. Crea <code className="rounded bg-amber-100 px-1">.env</code> a partir de{' '}
            <code className="rounded bg-amber-100 px-1">.env.example</code>, ejecuta las migraciones en el editor SQL
            de tu proyecto y recarga. Documentación: <code className="rounded bg-amber-100 px-1">docs/01-supabase-setup.md</code>.
          </p>
        </div>
        <Wrench className="mt-0.5 hidden h-5 w-5 shrink-0 text-amber-500 sm:block" aria-hidden />
      </div>
    </div>
  )
}
