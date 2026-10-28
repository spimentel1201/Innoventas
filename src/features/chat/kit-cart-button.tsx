import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useCart } from '@/features/cart/cart-context'
import { fetchProductsByIds } from '@/features/products/api'
import { formatMoney } from '@/lib/utils'
import type { KitState } from '@/types/domain'

/**
 * Botón final del constructor de kit: agrega los productos elegidos al carrito
 * y navega a `/carrito`. Los productos se re-consultan por id en el catálogo
 * vivo (no se confía en el snapshot del chat) para respetar precio/stock
 * vigentes al momento de agregar.
 */
export function KitCartButton({ kit, onDone }: { kit: KitState; onDone: () => void }) {
  const [busy, setBusy] = useState(false)
  const { addItem } = useCart()
  const navigate = useNavigate()

  const handle = async () => {
    if (busy) return
    setBusy(true)
    try {
      const products = await fetchProductsByIds(kit.selections.map((s) => s.id))
      if (products.length === 0) {
        toast.error('Los productos del kit ya no están disponibles en el catálogo.')
        return
      }
      for (const product of products) addItem(product)
      toast.success(
        `${products.length} ${products.length === 1 ? 'producto' : 'productos'} del kit en el carrito`,
      )
      onDone()
      navigate('/carrito')
    } catch {
      toast.error('No pudimos agregar el kit al carrito. Inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button
      type="button"
      className="w-full"
      loading={busy}
      onClick={() => void handle()}
      aria-label="Ir al carrito con el kit"
    >
      {!busy && <ShoppingCart className="mr-2 h-4 w-4" aria-hidden />}
      Ir al carrito · {formatMoney(kit.total)}
    </Button>
  )
}
