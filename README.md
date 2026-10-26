# InnovVentas — Tienda ecommerce de demostración

Tienda de tecnología completa (catálogo, carrito, checkout, pedidos, seguimiento, chatbot)
con **persistencia real** en Supabase (PostgreSQL + Auth + Storage + Edge Functions) y
asistente de preguntas con **Azure Custom Question Answering**.

> ⚠️ **Proyecto de demostración**: pagos simulados (sin cobros reales) y sin envíos
> reales. Nunca presenta datos frontend "inventados": si Supabase/Azure no están
> configurados, la app muestra un aviso y estados vacíos/error.

> ℹ️ **Catálogo con datos de referencia del mercado peruano**: los 27 productos son
> SKUs reales (HP, ASUS, Acer, LG, Samsung, Xiaomi, Logitech, JBL, HyperX, Epson,
> Kingston, Toshiba, SanDisk…) con precios en S/ tomados de tiendas peruanas
> (listados de Falabella Perú, oct-2026). Son **referenciales**: el precio de una
> tienda concreta varía por oferta/region. ⚠️ **Las fotos oficiales de producto
> pertenecen a Falabella/los fabricantes** — para producción hay que reemplazarlas
> por imágenes con licencia propia.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Rutas | react-router-dom 6 (`createBrowserRouter`) |
| Formularios | react-hook-form + zod (`@hookform/resolvers`) |
| Datos/UI | TanStack Query 5, lucide-react, sonner |
| Backend BaaS | Supabase: PostgreSQL (RLS), Auth, Storage, Edge Functions (Deno) |
| Chatbot | Azure Custom Question Answering (CQA) invocada **solo desde el servidor** |
| Pruebas | Vitest + Testing Library |

Sin servidor Node/Express propio: toda la lógica sensible vive en la base de datos
(RLS/RPC) y en Edge Functions.

## Estructura

```
src/
  components/{common,ui}/     # botones, modales, estados, banners
  features/
    products/                 # catálogo, filtros, imágenes, specs, más vendidos
    cart/                     # carrito local + persistencia en BD (merge al login)
    auth/                     # sesión, perfil, guards de rutas
    orders/                   # checkout, pedidos, seguimiento, admin (estados)
    admin/                    # CRUD productos/ofertas/soporte vía Edge + RLS
    chat/                     # widget + Edge Function (Azure CQA)
  pages/                      # públicas, auth/, account/, admin/
  layouts/                    # AppLayout, AdminLayout, header, footer
  lib/                        # supabase, config, constants, validaciones, utils, edge
  types/                      # database (hand-written) + domain (DTOs)
supabase/
  migrations/*.sql            # esquema, RLS, vistas/RPC, storage, seed DEMO, ventas demo
  functions/                  # chat, create-order, admin-products (Deno + zod)
docs/                        # guías de configuración y operación
```

## Páginas

- Público: inicio, catálogo con filtros por categoría/marca/precio/stock, detalle de
  producto, ofertas, más vendidos (calculados de `order_items` reales), categorías,
  FAQ, contacto (escribe a `support_requests`), seguimiento público
  (número INV-AAAAMM-#### + correo), 4 páginas legales.
- Auth: registro (con confirmación de correo), login, recuperación de contraseña,
  cambio de contraseña con enlace de un solo uso.
- Cuenta (protegida): perfil editable (nombre, teléfono, contraseña) e historial de
  pedidos con detalle expandible.
- Admin (rol `admin`, validado en BD/RLS/RPC — el cliente solo oculta): resumen con
  métricas (`admin_dashboard()`), CRUD de productos con gestor de imágenes en Storage,
  ofertas por rango de fechas, gestión de estados de pedidos (reintegra stock al
  cancelar vía RPC), bandeja de soporte.

## Datos de demostración

La migración `0005_seed.sql` crea **8 categorías y 27 productos técnicos DEMO**
(nombres/inventarios de ejemplo), 6 ofertas con ventanas de fechas y la función
`seed_demo_sales()` para poblar ventas y habilitar "más vendidos". Todo está marcado
como demo en la UI y en la BD.

**Más vendidos**: nunca se inventan. Se calculan sobre `order_items` reales
(`best_selling_products()`); sin ventas muestra su estado vacío.

## Puesta en marcha

```bash
npm install
cp .env.example .env      # llena VITE_SUPABASE_* y VITE_EDGE_* si aplica
npm run dev               # http://localhost:5173
```

Sin `.env` la app arranca igual y muestra el banner de configuración en lugar de fingir datos.

### 1) Supabase

Sigue `docs/01-supabase-setup.md`: crea el proyecto, corre `supabase migration up`
(6 migraciones), configura Auth con URLs de redirección y crea el bucket de Storage
con sus políticas (incluidos en la migración 0004).

### 2) Azure CQA

Sigue `docs/02-azure-cqa-setup.md`: crea el recurso de Language/CQA, incluye la base
de conocimiento de ejemplo y setea las variables `AZURE_CQA_*` como secretos de la
Edge Function (nunca en el frontend).

### 3) Edge Functions

```bash
supabase functions deploy chat create-order admin-products
supabase secrets set AZURE_CQA_ENDPOINT=... AZURE_CQA_KEY=... AZURE_CQA_PROJECT=...
```

### 4) Primer administrador

El rol se valida **solo en el servidor**. Después de registrarte por la UI:

```sql
update public.profiles set role = 'admin' where id = '<uuid-del-usuario>';
```

Vuelve a iniciar sesión; verás «Panel de administración» en el menú de tu cuenta.

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run typecheck` | TypeScript sin emitir |
| `npm test` / `npm run test:watch` | Vitest (unit + RTL) |
| `npm run build` | typecheck + build de producción en `dist/` |
| `npm run preview` | Sirve `dist/` en local |

## Operación y seguridad

- Chequeo de seguridad: `docs/05-security-checklist.md`.
- Deploy (Vercel/Netlify/estático + funciones): `docs/04-deploy.md`.
- Precios de envío de referencia (Perú): **S/ 15** fijo y gratis desde S/ 1,500;
  siempre **recalculados por el servidor** en `place_order`.
- Estados del pedido: `pendiente → pagado → preparación → enviado → entregado`
  (+ `cancelado` con reintegro de inventario).
