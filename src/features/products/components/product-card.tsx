import { Link } from 'react-router-dom'
import { ShoppingCart as CartPlus, ImageOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCart } from '@/features/cart/cart-context'
import { MAX_QTY_PER_ITEM } from '@/lib/config'
import { formatMoney, formatMoneyCompact } from '@/lib/utils'
import type { Product } from '@/types/domain'
import { PLACEHOLDER_IMAGE } from '@/lib/config'

function ImagePlaceholder({ text }: { text: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-slate-100 text-slate-400">
      <ImageOff className="h-7 w-7" aria-hidden />
      <span className="px-2 text-[10px]">{text}</span>
    </div>
  )
}

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart()
  const displayPrice = product.offerPrice ?? product.price
  const pct = product.offerDiscountPercent
  const outOfStock = product.stock <= 0
  const lowStock = !outOfStock && product.stock <= 5

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-panel">
      <Link
        to={`/producto/${product.slug}`}
        className="relative block aspect-[3/2] overflow-hidden bg-white"
        aria-label={`Ver ${product.name}`}
      >
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.imageUrl ? `Imagen de ${product.name}` : ''}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <ImagePlaceholder text={`Sin imagen demostrativa para ${product.name}`} />
        )}
        <span className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {pct != null && (
            <Badge tone="danger" className="shadow-sm">
              −{pct}%
            </Badge>
          )}
          {product.compareAtPrice != null && pct == null && (
            <Badge tone="info" className="max-w-[95%] whitespace-nowrap shadow-sm">
              Lista S/ {formatMoneyCompact(product.compareAtPrice)}
            </Badge>
          )}
        </span>
        {outOfStock && (
          <span className="absolute inset-0 flex items-center justify-center bg-slate-950/55 text-sm font-semibold text-white">
            Agotado
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-wide text-slate-500">
          <span>{product.brand}</span>
          <Link to={`/catalogo?category=${product.categorySlug}`} className="hover:text-brand-600 underline-offset-2 hover:underline">
            {product.categoryName}
          </Link>
        </div>
        <h3 className="line-clamp-2 min-h-10 font-display text-[15px] font-semibold leading-snug text-slate-900">
          <Link to={`/producto/${product.slug}`} className="hover:text-brand-700">
            {product.name}
          </Link>
        </h3>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-slate-900">{formatMoney(displayPrice)}</p>
            {product.offerPrice != null && (
              <p className="text-[11px] text-slate-400 line-through">{formatMoney(product.price)}</p>
            )}
          </div>
          <Button
            type="button"
            size="icon"
            variant="outline"
            disabled={outOfStock}
            aria-label={`Agregar ${product.name} al carrito`}
            onClick={() => addItem(product, 1)}
            className="h-9 w-9 shrink-0"
          >
            <CartPlus aria-hidden className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[11px] text-slate-500">
          {outOfStock
            ? 'Sin inventario disponible'
            : lowStock
              ? `Quedan solo ${product.stock} ${product.stock === 1 ? 'unidad' : 'unidades'}`
              : `Máximo ${Math.min(MAX_QTY_PER_ITEM, product.stock)} por pedido`}
        </p>
      </div>
    </article>
  )
}

/** Imagen de respaldo (imagen demostrativa/placeholder) usada en listas. */
export { ImagePlaceholder as ProductImagePlaceholder }
