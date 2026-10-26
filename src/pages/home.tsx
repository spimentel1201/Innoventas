import { Link } from 'react-router-dom'
import { ArrowRight, BadgeCheck, Headset, ShieldCheck, Truck } from 'lucide-react'
import { SectionHeader } from '@/components/common/section-header'
import { CategoryIcon } from '@/components/common/category-icon'
import { EmptyState } from '@/components/ui/states'
import { ProductGrid } from '@/features/products/components/product-grid'
import { useBestSellers, useCategories, useNewestProducts, useOfferProducts } from '@/features/products/hooks'
import type { BestSeller, Product } from '@/types/domain'

function bestSellerAsProduct(b: BestSeller): Product {
  return {
    id: b.id,
    name: b.name,
    slug: b.slug,
    description: '',
    brand: b.brand,
    price: b.price,
    compareAtPrice: null,
    stock: 99,
    specifications: {},
    status: 'published' as const,
    createdAt: '',
    categorySlug: '',
    categoryName: '',
    imageUrl: b.imageUrl,
    offerDiscountPercent: b.offerDiscountPercent,
    offerPrice: b.offerPrice,
    offerEndsAt: null,
  }
}

/** Fotos recortadas clásicas (PNG con fondo transparente, generadas con rembg). */
const HERO_CUTOUTS = [
  // laptop principal grande a la derecha
  { src: '/hero/victus.png', cls: 'right-0 top-[14%] w-[54%] z-10 -rotate-6' },
  // segunda laptop abajo-izquierda, se traslapan
  { src: '/hero/vivobook.png', cls: 'left-[2%] bottom-[4%] w-[44%] z-20 rotate-3' },
  // monitor arriba-izquierda asomando
  { src: '/hero/odyssey.png', cls: 'left-[6%] top-[6%] w-[32%] z-30 rotate-2 opacity-95' },
  // audífonos arriba-derecha
  { src: '/hero/edifier.png', cls: 'right-[4%] top-0 w-[22%] z-30 rotate-12' },
  // mouse abajo al centro para cerrar el racimo
  { src: '/hero/g203.png', cls: 'left-[40%] bottom-[2%] w-[18%] z-20 rotate-[8deg]' },
] as const

function HeroCollage() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] select-none lg:block">
      {HERO_CUTOUTS.map(({ src, cls }) => (
        <img
          key={src}
          src={src}
          alt=""
          loading="lazy"
          className={`absolute h-auto rounded-lg object-contain drop-shadow-panel ${cls}`}
        />
      ))}
    </div>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-950 via-brand-800 to-brand-600 px-6 py-14 text-white md:px-12 md:py-20">
      <div className="relative z-10 max-w-2xl">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium">
          <Truck className="h-3.5 w-3.5" /> Envío gratis desde S/ 1,500
        </p>
        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight md:text-5xl">
          Tecnología que impulsa <span className="text-accent-400">tu día</span>
        </h1>
        <p className="mt-4 max-w-lg text-base text-brand-100 md:text-lg">
          Laptops, monitores, audio y almacenamiento con envíos rápidos, garantías claras y asistente
          inteligente 24/7. Catálogo de demostración con seguimiento en tiempo real a nuestra base de datos.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            to="/catalogo"
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 font-semibold text-brand-800 shadow-panel transition hover:bg-brand-50"
          >
            Explorar catálogo <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            to="/ofertas"
            className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/40 px-6 font-semibold text-white transition hover:bg-white/10"
          >
            Ver ofertas
          </Link>
        </div>
        <ul className="mt-8 flex flex-wrap gap-x-7 gap-y-2 text-sm text-brand-100">
          <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> 30 días de cambios</li>
          <li className="flex items-center gap-2"><BadgeCheck className="h-4 w-4" /> Pagos verificados en servidor</li>
          <li className="flex items-center gap-2"><Headset className="h-4 w-4" /> Soporte por chat</li>
        </ul>
      </div>
      <HeroCollage />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent-500/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 right-40 h-72 w-72 rounded-full bg-white/10 blur-3xl"
      />
    </section>
  )
}

function CategoriesStrip() {
  const { data, isLoading } = useCategories()
  if (isLoading) return null
  if (!data || data.length === 0) {
    return (
      <section className="py-10">
        <SectionHeader title="Categorías" subtitle="Se mostrarán cuando conectes tu base de datos de Supabase" />
        <EmptyState
          title="Aún no hay categorías"
          description="Ejecuta la semilla de demostración para poblar el catálogo con datos de prueba."
        />
      </section>
    )
  }
  return (
    <section className="py-10">
      <SectionHeader
        title="Explora por categoría"
        subtitle="Encuentra rápido el equipo que buscas"
        action={<Link to="/categorias" className="text-sm font-medium text-brand-700 hover:underline">Todas</Link>}
      />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {data.slice(0, 8).map((c) => (
          <Link
            key={c.id}
            to={`/catalogo?category=${c.slug}`}
            className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-panel"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition group-hover:bg-brand-100">
              <CategoryIcon name={c.icon} />
            </span>
            <span>
              <span className="block text-sm font-semibold text-slate-900">{c.name}</span>
              <span className="block text-xs text-slate-500">{c.productCount} productos</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

function OffersSection() {
  const { data, isLoading, refetch } = useOfferProducts(8)
  return (
    <section className="py-10">
      <SectionHeader
        title="Ofertas vigentes"
        subtitle="Descuentos con hora de cierre; precios recalculados en servidor"
        action={<Link to="/ofertas" className="text-sm font-medium text-brand-700 hover:underline">Ver todas</Link>}
      />
      <ProductGrid
        products={data ?? []}
        isLoading={isLoading}
        error={undefined}
        onRetry={() => void refetch()}
        emptyTitle="No hay ofertas activas"
        emptyDescription="Publica una oferta desde el panel de administración: estas tarjetas se alimentan de la tabla de ofertas con vigencia real."
      />
    </section>
  )
}

function BestSellersSection() {
  const { data, isLoading, refetch } = useBestSellers(8)
  if (isLoading) return null
  return (
    <section className="py-10">
      <SectionHeader
        title="Los más vendidos"
        subtitle="Calculado con las ventas reales registradas en order_items"
        action={<Link to="/mas-vendidos" className="text-sm font-medium text-brand-700 hover:underline">Ver ranking</Link>}
      />
      {data && data.length > 0 ? (
        <ProductGrid products={data.map(bestSellerAsProduct)} />
      ) : (
        <EmptyState
          title="Aún no hay ventas registradas"
          description="Cuando los clientes compren, este ranking se construirá automáticamente a partir de los pedidos pagados."
        />
      )}
    </section>
  )
}

function NewestSection() {
  const { data, isLoading } = useNewestProducts(8)
  return (
    <section className="py-10">
      <SectionHeader title="Novedades" subtitle="Lo último agregado al catálogo" />
      <ProductGrid products={data ?? []} isLoading={isLoading} />
    </section>
  )
}

export function HomePage() {
  return (
    <div className="container pb-16">
      <Hero />
      <CategoriesStrip />
      <BestSellersSection />
      <OffersSection />
      <NewestSection />
    </div>
  )
}
