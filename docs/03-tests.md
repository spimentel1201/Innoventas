# 03 · Pruebas y verificación local

## Comandos

```bash
npm run typecheck   # tsc --noEmit estricto
npm test            # vitest run (jsdom)
npm run test:watch  # modo watch
npm run build       # typecheck + vite build
```

## Cobertura actual (por archivo)

| Archivo | Qué cubre |
|---|---|
| `src/test/setup.ts` | jest-dom + localStorage limpio + polyfill `scrollTo` (jsdom) |
| `src/lib/utils.test.ts` | formato de dinero (soles S/), slug, clamp, iniciales, sanitización de búsqueda, etiquetas de confianza |
| `src/lib/validations/validations.test.ts` | checkout (envío/método de pago), auth (login/registro/perfil/teléfono), producto (spec duplicadas, compareAtPrice>price, slug), ofertas (fin>inicio, rango 1–90%) |
| `src/features/cart/cart-context.test.tsx` | carrito local sin sesión: agregar/hidratar, stock tope, actualizaciones, remove, clear (mock de `cart-api`) |
| `src/features/products/components/product-card.test.tsx` | tarjeta: precios, badge de oferta, agotado, stock bajo, placeholder, botón agregar |
| `src/features/chat/chat-widget.test.tsx` | widget: abrir panel, sugerencias, envío con respuesta simulada de Edge, retry ordenado sin leave de mensajes fraudulentos |

## Convenciones

- Los tests de datos nunca tocan red real: se mockean `supabase` y `invokeEdgeFunction`.
- Se prefiere consultar “agregar etc.” por roles/texto visible (Testing Library).
- Vitest globale: `vitest` y `globals: true` en `vite.config.ts` → para tsc el
  setup importa `beforeEach` de `vitest` explícitamente.

## Verificación visual sin backend

`npm run dev` sin `.env`:

- banner “Configura Supabase” visible en las páginas,
- estados vacíos o errores honestos (nada de loading infinito),
- chatWidget contiene sugerencias aunque Azure no está conectado (con mensajes
  de fallback demos).

## Checklist manual recomendado antes de entregar

- [ ] Registro + confirmación de correo + login.
- [ ] Promoción de admin desde SQL y entrada a `/admin`.
- [ ] Crear producto nuevo con imagen subida → visible en catálogo con oferta.
- [ ] Crear oferta agendada con ventana válida → precio con −% en home/catalogo.
- [ ] Compra E2E: carrito → checkout → `pedido-confirmado/INV-...`.
- [ ] Rastrear pedido con número + correo sin iniciar sesión.
- [ ] Cambiar el estado del pedido desde admin → el timeline cambia y la desactivación de pago refleja la lista correcta.
