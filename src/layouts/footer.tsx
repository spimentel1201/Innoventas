import { Link } from 'react-router-dom'
import { Mail, MapPin, Phone } from 'lucide-react'
import { SITE } from '@/lib/config'

export function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-slate-950 text-slate-300">
      <div className="container grid grid-cols-1 gap-10 py-12 md:grid-cols-4">
        <div>
          <p className="font-display text-lg font-bold text-white">
            Innov<span className="text-accent-500">Ventas</span>
          </p>
          <p className="mt-2 text-sm text-slate-400">{SITE.tagline}</p>
          <p className="mt-4 text-xs text-slate-500">
            Tienda de demostración con datos de ejemplo (Productos DEMO). No es una operación comercial real.
          </p>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-white">Tienda</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/catalogo" className="hover:text-white">Catálogo completo</Link></li>
            <li><Link to="/ofertas" className="hover:text-white">Ofertas vigentes</Link></li>
            <li><Link to="/mas-vendidos" className="hover:text-white">Más vendidos</Link></li>
            <li><Link to="/categorias" className="hover:text-white">Categorías</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-white">Ayuda</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/faq" className="hover:text-white">Preguntas frecuentes</Link></li>
            <li><Link to="/seguimiento" className="hover:text-white">Seguimiento de pedidos</Link></li>
            <li><Link to="/contacto" className="hover:text-white">Contacto</Link></li>
            <li><Link to="/cuenta/pedidos" className="hover:text-white">Mis pedidos</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-white">Legal y contacto</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/politicas/privacidad" className="hover:text-white">Privacidad</Link></li>
            <li><Link to="/politicas/envios" className="hover:text-white">Envíos</Link></li>
            <li><Link to="/politicas/cambios" className="hover:text-white">Cambios y devoluciones</Link></li>
            <li><Link to="/politicas/garantias" className="hover:text-white">Garantías</Link></li>
          </ul>
          <ul className="mt-4 space-y-1.5 text-xs text-slate-500">
            <li className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {SITE.email}</li>
            <li className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {SITE.phone}</li>
            <li className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> {SITE.address}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} {SITE.name} · Pagos SIMULADOS para demostración · Construida con React + Supabase
      </div>
    </footer>
  )
}
