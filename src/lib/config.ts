/** Configuración visible de la tienda. Los valores de envío DEBEN coincidir
 *  con la función SQL `shipping_cost()` de las migraciones. */
export const LOCALE = 'es-PE'
export const CURRENCY = 'PEN' // soles peruanos

export const SITE = {
  name: 'InnovVentas',
  tagline: 'Tecnología que impulsa tu día',
  email: 'hola@innovventas.demo',
  phone: '+51 1 0000 0000 (demo)',
  address: 'Av. Innovación 123, Miraflores, Lima (demo)',
  hours: 'Lun a Vie 9:00–18:00 · Sáb 9:00–14:00',
} as const

export const FREE_SHIPPING_THRESHOLD = 1500 // PEN
export const SHIPPING_COST = 15 // PEN
export const LOW_STOCK_THRESHOLD = 5
export const MAX_QTY_PER_ITEM = 10
export const MAX_QTY_TOTAL_CART = 50

export const CART_STORAGE_KEY = 'innovventas.cart.v1'
export const CHAT_SESSION_KEY = 'innovventas.chat.session.v1'
export const PLACEHOLDER_IMAGE = (text: string) =>
  `https://placehold.co/900x600/0f172a/38bdf8.png?text=${encodeURIComponent(text)}`
