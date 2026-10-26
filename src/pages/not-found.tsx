import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** Página 404 dentro del AppLayout. */
export function NotFoundPage() {
  return (
    <div className="container flex max-w-xl flex-col items-center pb-20 pt-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <Compass className="h-8 w-8" aria-hidden />
      </div>
      <p className="mt-6 font-display text-6xl font-bold tracking-tight text-slate-900">404</p>
      <h1 className="mt-2 font-display text-xl font-semibold text-slate-900">Esta página no existe</h1>
      <p className="mt-2 text-sm text-slate-500">
        La dirección que intentaste abrir no se encontró. Quizá el producto cambió de URL o el enlace es antiguo.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link to="/">
          <Button>Ir al inicio</Button>
        </Link>
        <Link to="/catalogo">
          <Button variant="outline">Ver catálogo</Button>
        </Link>
      </div>
    </div>
  )
}
