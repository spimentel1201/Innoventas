import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, ChevronRight, Package, Truck, Undo2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { PageSpinner } from '@/components/ui/spinner'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { ProductImages } from '@/features/products/components/product-images'
import { ProductSpecs } from '@/features/products/components/product-specs'
import { ProductGrid } from '@/features/products/components/product-grid'
import { useProductDetail, useProductImages, useRelatedProducts } from '@/features/products/hooks'
import { useCart } from '@/features/cart/cart-context'
import { FREE_SHIPPING_THRESHOLD, MAX_QTY_PER_ITEM } from '@/lib/config'
import { formatMoney, clamp } from '@/lib/utils'

export function ProductDetailPage() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const { addItem } = useCart()
  const [qty, setQty] = useState(1)

  const { data: product, isLoading, error, refetch } = useProductDetail(slug)
  const productId = product?.id
  const { data: images } = useProductImages(productId)
  const { data: related } = useRelatedProducts(productId, slug)

  if (isLoading) return <PageSpinner label="Cargando producto…" />
  if (error)
    return (
      <div className="container py-10">
        <ErrorState onRetry={() => void refetch()} />
      </div>
    )
  if (!product)
    return (
      <EmptyState
        title="Producto no encontrado"
        description="Puede haber sido retirado del catálogo o la dirección es incorrecta."
        action={
          <Link to="/catalogo" className="text-sm text-brand-700 hover:underline">
            ← Volver al catálogo
          </Link>
        }
        icon={Package}
      />
    )

  const outOfStock = product.stock <= 0
  const displayPrice = product.offerPrice ?? product.price
  const maxQty = Math.min(MAX_QTY_PER_ITEM, Math.max(product.stock, 1))

  return (
    <div className="container pb-16">
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-slate-500" aria-label="Migas de pan">
        <Link to="/" className="hover:text-brand-700">Inicio</Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <Link to="/catalogo" className="hover:text-brand-700">Catálogo</Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <Link to={`/catalogo?category=${product.categorySlug}`} className="hover:text-brand-700">
          {product.categoryName}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <span className="text-slate-900">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <ProductImages images={images ?? []} name={product.name} />

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand">{product.brand}</Badge>
            <Link to={`/catalogo?category=${product.categorySlug}`}>
              <Badge tone="neutral">{product.categoryName}</Badge>
            </Link>
            {product.offerDiscountPercent != null && (
              <Badge tone="danger">−{product.offerDiscountPercent}% oferta</Badge>
            )}
            {outOfStock ? (
              <Badge tone="danger">Agotado</Badge>
            ) : (
              product.stock <= 5 && <Badge tone="warning">Últimas {product.stock} piezas</Badge>
            )}
          </div>

          <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            {product.name}
          </h1>

          <div className="mt-4 flex items-end gap-3">
            <p className="text-3xl font-bold text-slate-900">{formatMoney(displayPrice)}</p>
            {product.offerPrice != null && (
              <p className="pb-1 text-lg text-slate-400 line-through">{formatMoney(product.price)}</p>
            )}
          </div>
          {product.offerPrice != null && (
            <p className="mt-1 text-xs text-emerald-700">
              Ahorras {formatMoney(product.price - product.offerPrice)} respecto al precio de catálogo.
            </p>
          )}
          {product.compareAtPrice != null && product.offerPrice == null && (
            <p className="mt-1 text-xs text-slate-400">
              Precio de lista: {formatMoney(product.compareAtPrice)}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <QuantityStepper
              value={qty}
              max={outOfStock ? 1 : maxQty}
              disabled={outOfStock}
              onChange={setQty}
              label={`Cantidad de ${product.name}`}
            />
            <Button
              type="button"
              size="lg"
              disabled={outOfStock}
              onClick={() => addItem(product, clamp(qty, 1, maxQty))}
            >
              Agregar al carrito
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              disabled={outOfStock}
              onClick={() => {
                addItem(product, clamp(qty, 1, maxQty))
                navigate('/checkout')
              }}
            >
              Comprar ahora
            </Button>
          </div>

          <p className="mt-2 text-xs text-slate-500">
            Stock y total verificados por el servidor al confirmar la compra.
          </p>

          <dl className="mt-8 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <dt className="flex items-center gap-1.5 font-medium text-slate-700">
                <Truck className="h-4 w-4 text-brand-600" /> Envío
              </dt>
              <dd className="mt-1 text-xs text-slate-500">
                Entrega de 1–3 días hábiles; gratis desde {formatMoney(FREE_SHIPPING_THRESHOLD)}.
              </dd>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <dt className="flex items-center gap-1.5 font-medium text-slate-700">
                <Undo2 className="h-4 w-4 text-brand-600" /> Cambios
              </dt>
              <dd className="mt-1 text-xs text-slate-500">5 días naturales para devoluciones sin uso.</dd>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <dt className="flex items-center gap-1.5 font-medium text-slate-700">
                <CheckCircle2 className="h-4 w-4 text-brand-600" /> Garantía
              </dt>
              <dd className="mt-1 text-xs text-slate-500">Cobertura según política de garantías vigente.</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-12 grid gap-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="mb-3 font-display text-lg font-semibold text-slate-900">Descripción</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{product.description}</p>
        </section>
        <ProductSpecs product={product} />
      </div>

      {related && related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 font-display text-xl font-semibold text-slate-900">
            Relacionados en {product.categoryName}
          </h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  )
}
