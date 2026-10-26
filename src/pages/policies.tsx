import { Navigate, useParams, Link } from 'react-router-dom'
import { FileText } from 'lucide-react'
import type { ReactNode } from 'react'
import { EmptyState } from '@/components/ui/states'
import { SITE } from '@/lib/config'

/* Páginas legales estáticas (contenido editable aquí mismo).
   Valores como costo/tiempos de envío coinciden con lib/config y las migraciones. */

function H2({ children }: { children: ReactNode }) {
  return <h2 className="mt-8 font-display text-lg font-semibold text-slate-900">{children}</h2>
}

function LI({ children }: { children: ReactNode }) {
  return <li className="list-inside list-disc text-sm leading-relaxed text-slate-600">{children}</li>
}

const POLICIES: Record<
  string,
  { title: string; intro: string; updated: string; body: ReactNode }
> = {
  privacidad: {
    title: 'Aviso de privacidad',
    intro:
      'InnovVentas es una tienda de demostración. Este documento explica qué datos se piden y cómo se usan; en esta demo solo sirven para probar la funcionalidad.',
    updated: '26 de enero de 2026',
    body: (
      <>
        <H2>Datos que se recolectan</H2>
        <ul className="mt-2 space-y-1.5">
          <LI>Al registrarte: nombre completo, correo y contraseña (Supabase Auth guarda la contraseña cifrada; esta tienda nunca la ve).</LI>
          <LI>Al comprar: dirección de envío (calle, ciudad, estado, CP, país), teléfono y método de pago elegido.</LI>
          <LI>Chat de soporte: los mensajes del chat y una sesión anónima para dar continuidad a la conversación.</LI>
        </ul>
        <H2>Uso de los datos</H2>
        <ul className="mt-2 space-y-1.5">
          <LI>Procesar y registrar pedidos, calcular totales finales en el servidor y permitir el seguimiento.</LI>
          <LI>Responder solicitudes de contacto y mejorar respuestas del asistente.</LI>
        </ul>
        <H2>Qué NO ocurre en esta demo</H2>
        <ul className="mt-2 space-y-1.5">
          <LI>No hay cobros reales: el método «tarjeta demo» simula el pago y no se almacena ninguna tarjeta.</LI>
          <LI>No hay envíos reales ni marketing por correo automatizado.</LI>
          <LI>Los productos y existencias son datos de ejemplo identificados con «DEMO».</LI>
        </ul>
        <H2>Tus derechos</H2>
        <p className="mt-2 text-sm text-slate-600">
          Puedes actualizar tu perfil desde «Mi cuenta» o escribir a {SITE.email} para solicitar aclaraciones
          o eliminación de tu cuenta de demostración.
        </p>
      </>
    ),
  },
  envios: {
    title: 'Política de envíos',
    intro:
      'Tiempos y costos de envío de la demostración. El costo es calculado y guardado por el servidor en cada pedido.',
    updated: '26 de enero de 2026',
    body: (
      <>
        <H2>Cobertura y costo</H2>
        <ul className="mt-2 space-y-1.5">
          <LI>Envío a todo el Perú. Costo fijo: S/ 15.00 por pedido.</LI>
          <LI>Envío gratuito en pedidos cuyo subtotal sea de S/ 1,500.00 o más.</LI>
          <LI>El descuento por ofertas aplica antes de calcular el costo de envío.</LI>
        </ul>
        <H2>Tiempos estimados</H2>
        <ul className="mt-2 space-y-1.5">
          <LI>Preparación: 1–2 días hábiles tras confirmar el pago (en «transferencia», al marcarlo como pagado).</LI>
          <LI>Delivery demo estimado: 2–5 días hábiles según destino.</LI>
        </ul>
        <H2>Seguimiento</H2>
        <p className="mt-2 text-sm text-slate-600">
          Puedes seguir tu pedido con el número INV‑AAAAMM‑###### en la sección{' '}
          <Link to="/seguimiento" className="text-brand-700 underline">Seguimiento de pedidos</Link> o en «Mis pedidos».
        </p>
        <H2>Estado demostrativo</H2>
        <p className="mt-2 text-sm text-slate-600">
          Esta tienda no realiza envíos reales; los estados del pedido (pagado, enviado, entregado) los mueve el
          equipo demo en el panel de administración.
        </p>
      </>
    ),
  },
  cambios: {
    title: 'Cambios y devoluciones',
    intro: 'Condiciones para cambios o devoluciones en la demostración de InnovVentas.',
    updated: '26 de enero de 2026',
    body: (
      <>
        <H2>Plazo</H2>
        <ul className="mt-2 space-y-1.5">
          <LI>5 días naturales desde la entrega para solicitar un cambio o devolución.</LI>
          <LI>El producto debe estar sin uso, con empaque original y accesorios incluidos.</LI>
        </ul>
        <H2>Cómo solicitarlo</H2>
        <ul className="mt-2 space-y-1.5">
          <LI>Desde «Mis pedidos» identifica tu pedido o búscalo en Seguimiento con tu correo.</LI>
          <LI>Escríbenos por el formulario de contacto o el chat indicando número de pedido y motivo.</LI>
          <LI>El equipo demo actualizará el estado del pedido a «Cancelado», lo que también reintegra el stock al inventario.</LI>
        </ul>
        <H2>Reembolsos</H2>
        <p className="mt-2 text-sm text-slate-600">
          En la demo los pagos son simulados: ningún reembolso representa dinero real.
          La política aquí descrita refleja el flujo que implementaría una tienda real.
        </p>
      </>
    ),
  },
  garantias: {
    title: 'Política de garantías',
    intro: 'Cobertura de garantía para los productos del catálogo demo.',
    updated: '26 de enero de 2026',
    body: (
      <>
        <H2>Cobertura</H2>
        <ul className="mt-2 space-y-1.5">
          <LI>Garantía demo de 12 meses contra defectos de fabricación en todos los productos del catálogo.</LI>
          <LI>Periféricos (teclados, mouse, cables) incluyen 6 meses de garantía demo.</LI>
        </ul>
        <H2>No cubre</H2>
        <ul className="mt-2 space-y-1.5">
          <LI>Daños por mal uso, líquidos, caídas o desgaste normal.</LI>
          <LI>Productos marcados como ofertas finales salvo defecto de fábrica.</LI>
        </ul>
        <H2>Atención</H2>
        <p className="mt-2 text-sm text-slate-600">
          Levanta tu caso por el <Link to="/contacto" className="text-brand-700 underline">formulario de contacto</Link> o
          usa el chat en la esquina inferior derecha. Incluye tu número de pedido (INV‑AAAAMM‑######).
        </p>
      </>
    ),
  },
}

/** Ruta /politicas/:slug — 4 documentos legales estáticos. */
export function PolicyPage() {
  const { slug = '' } = useParams()
  const doc = POLICIES[slug]

  if (!doc) return <Navigate to="/politicas/privacidad" replace />

  return (
    <article className="container max-w-3xl pb-16">
      <header className="mb-6 flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <FileText className="h-6 w-6" aria-hidden />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">{doc.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{doc.intro}</p>
          <p className="mt-1 text-xs text-slate-400">Última actualización: {doc.updated} · Contenido legal de demostración.</p>
        </div>
      </header>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card md:p-7">{doc.body}</div>

      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Otras políticas">
        {Object.entries(POLICIES)
          .filter(([s]) => s !== slug)
          .map(([s, d]) => (
            <Link
              key={s}
              to={`/politicas/${s}`}
              className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm text-slate-600 transition-colors hover:border-brand-300 hover:text-brand-700"
            >
              {d.title}
            </Link>
          ))}
      </nav>
    </article>
  )
}

/** Fallback si alguien llega a /politicas sin slug (router lo evita; aquí por robustez). */
export function PolicyIndexRedirect() {
  return <EmptyState title="Selecciona una política" />
}
