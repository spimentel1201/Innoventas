import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

/** Contenido estático de preguntas frecuentes de la tienda (documental). */
const FAQS: Array<{ q: string; a: ReactNode }> = [
  {
    q: '¿Cómo creo una cuenta?',
    a: 'Haz clic en "Crear cuenta" en la esquina superior derecha. Necesitas un correo válido y una contraseña de al menos 8 caracteres con una letra y un número. Si la confirmación de correo está habilitada recibiras un enlace para activarla.',
  },
  {
    q: '¿Cuánto cuesta el envío?',
    a: (
      <>
        El envío estándar cuesta <strong>S/ 15.00</strong> y es <strong>gratis en compras mayores a S/ 1,500.00</strong>.
        El total exacto lo recalcula nuestro servidor al procesar cada pedido.
      </>
    ),
  },
  {
    q: '¿Cuánto tarda en llegar mi pedido?',
    a: 'Entre 1 y 3 días hábiles en Lima Metropolitana y de 3 a 7 días a provincias. Recibirás el estatus exacto en la página de seguimiento.',
  },
  {
    q: '¿Cómo rastreo un pedido?',
    a: 'Entra a "Seguimiento" en el menú. Si iniciaste sesión, verás tus pedidos automáticamente. También puedes buscarlo con el número de pedido (INV-…) y el correo usado en la compra, sin iniciar sesión.',
  },
  {
    q: '¿Qué métodos de pago aceptan?',
    a: (
      <>
        En esta demostración se simulan tres métodos: <strong>transferencia bancaria (Yape, Plin o transferencia interbancaria)</strong>,{' '}
        <strong>contra entrega</strong> y tarjeta demo. <em>No se procesan pagos reales y nunca se almacenan datos de tarjetas.</em>
      </>
    ),
  },
  {
    q: '¿Puedo cambiar o cancelar mi pedido?',
    a: 'Sí, mientras esté en estado "Pendiente de pago" o "Pagado". Escribe desde la página de contacto con tu número de pedido; un administrador ajusta el estado desde el panel.',
  },
  {
    q: '¿Quién maneja mis datos personales?',
    a: 'Usamos Supabase con seguridad a nivel de fila (RLS) para que solo tú puedas ver tu perfil, tus pedidos y tu carrito. Consulta la política de privacidad para más detalle.',
  },
  {
    q: '¿El asistente del chat es un humano?',
    a: 'Responde un chatbot basado en Azure Language Custom Question Answering. Si no tiene una respuesta con confianza suficiente, te ofrece escalar el caso a nuestro equipo humano por la página de contacto.',
  },
  {
    q: '¿Los precios incluyen IGV?',
    a: 'Todos los precios del catálogo (incluidos los de oferta) se muestran en soles (S/) e incluyen impuestos aplicables. La facturación se envía al confirmar el pedido.',
  },
  {
    q: '¿Este sitio es una tienda real?',
    a: (
      <>
        Es un <strong>proyecto de demostración</strong>: productos, marcas, imágenes e inventario son probados y creados
        con una semilla SQL claramente identificada. Nunca presentamos datos estáticos como si fueran reales.
      </>
    ),
  },
]

export function FaqPage() {
  return (
    <div className="container max-w-3xl pb-16">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
          Preguntas frecuentes
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Las respuestas de esta página alimentan también a nuestro asistente de chat (base de conocimiento de Azure).
          Si tu duda no está aquí, escríbenos por contacto.
        </p>
      </header>
      <div className="space-y-3">
        {FAQS.map((item, i) => (
          <details
            key={i}
            className="group rounded-2xl border border-slate-200 bg-white shadow-card [&[open]]:border-brand-300"
          >
            <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-medium text-slate-900 marker:content-none">
              <span className="text-sm md:text-base">{item.q}</span>
              <span className="text-brand-600 transition-transform group-open:rotate-45" aria-hidden>+</span>
            </summary>
            <div className="px-5 pb-4 text-sm leading-relaxed text-slate-600">{item.a}</div>
          </details>
        ))}
      </div>
      <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-card">
        <p className="text-sm text-slate-600">¿Necesitas ayuda de una persona real?</p>
        <Link
          to="/contacto"
          className="mt-2 inline-flex h-10 items-center rounded-lg bg-brand-600 px-5 text-sm font-medium text-white hover:bg-brand-700"
        >
          Contactar al equipo
        </Link>
      </div>
    </div>
  )
}
