# 01 · Configuración de Supabase

InnovVentas usa Supabase como único backend: PostgreSQL con RLS, Auth, Storage y
Edge Functions. Sigue estos pasos en orden.

## 1. Crear el proyecto

1. Entra a https://supabase.com → **New project**.
2. Elige una región cercana (p. ej. `us-central` para México), guarda la **contraseña de la BD**.
3. Espera el provisionamiento (~2 min).

## 2. Credenciales del frontend

En **Project Settings → API**:

- `Project URL` → `VITE_SUPABASE_URL`
- `anon public` key → `VITE_SUPABASE_ANON_KEY`

Escríbelas en `.env` (copia de `.env.example`). La `anon` key es pública por diseño;
la seguridad real la aplican RLS y las Edge Functions. **Nunca** la `service_role`
en el frontend.

## 3. Migraciones (esquema completo)

Desde la raíz del repo:

```bash
supabase link --project-ref <ref>
supabase migration up
```

Las migraciones (en orden) crean:

| Archivo | Contenido |
|---|---|
| `0001_schema.sql` | Tablas `profiles, categories, products, product_images, offers, cart_items, orders, order_items, chat_*`, índices, triggers, helpers `is_admin()` / `prevent_role_elevation()` y RPCs server-side |
| `0002_rls.sql` | RLS en todas las tablas (cliente solo dueño; admin solo escritura vía funciones) |
| `0003_views_rpc.sql` | Vistas `published_products`, `category_counts` (`security_invoker`) y RPC: `place_order` (Security Definer, precios/stock/folio INV-AAAAMM-#### en servidor), `admin_set_order_status` (cancelar reintegra stock), `track_order` (número + correo), `best_selling_products`, `admin_dashboard`, `shipping_cost` |
| `0004_storage.sql` | Buckets `product-images` (público) y `store-banners` (público, admin); políticas de subida solo admin |
| `0005_seed.sql` | Datos DEMO: 8 categorías, 27 productos técnicos, imágenes example.com sin URLs inventadas, 6 ofertas por fechas |
| `0006_seed_demo_sales.sql` | Función `seed_demo_sales()` para poblar ventas demo y habilitar «Más vendidos» |
| `0010_mas_productos.sql` | Ampliación de catálogo (+11 productos: 5 audífonos y 6 de otras categorías, imágenes demo y 4 ofertas) → 38 productos |

### Poblar ventas demo (opcional, recomendado para la demo)

```sql
select public.seed_demo_sales();  -- crea pedidos/usuarios demo bajo transacción
```

Se ejecuta desde **SQL Editor** en el dashboard.

## 4. Autenticación

**Authentication → URL Configuration:**

- Site URL: `http://localhost:5173` (en producción el dominio real).
- Redirect URLs (agregar):
  - `http://localhost:5173/login`
  - `http://localhost:5173/recuperar-password`
  - y su contraparte en production `https://<tu-dominio>/...`.

**Providers → Email:** activo. Para la demo desactiva “Confirm email” si quieres
entrar de inmediato (o confirma el correo desde la bandeja, se recomienda dejarlo activo).

### Promover primer administrador

1. Regístrate desde `/registro`.
2. SQL Editor:
   ```sql
   update public.profiles set role = 'admin' where id = '<uuid-del-usuario>';
   ```
3. El cliente solo *lee* el rol (`is_admin()` + RLS); nunca lo define. Los cambios
   de estado de pedidos/cruds van por RPC/Edge que revalidan `is_admin()` en servidor.

## 5. Storage

La migración 0004 ya crea buckets y políticas:

- `product-images` (público) — el panel de admin sube a `products/<id>/<uuid>.<ext>`;
  validación client/server: PNG/JPG/WebP/AVIF, ≤ 3 MB.
- `store-banners` (público) — banners de la home, solo admin.
- `support-attachments` (privado, si se consulta con `attachments` de `support_requests`).

## 6. Edge Functions

Despliega las 3 funciones y define sus secretos:

```bash
supabase functions deploy chat
supabase functions deploy create-order
supabase functions deploy admin-products

# secretos requeridos
supabase secrets set \
  AZURE_CQA_ENDPOINT="https://<resource>.azurewebsites.net" \
  AZURE_CQA_KEY="<primary key>" \
  AZURE_CQA_PROJECT="<nombre de proyecto de lenguaje>"

# opcionales (chat)
supabase secrets set \
  AZURE_CQA_LOW_CONFIDENCE_FALLBACK="..." \
  CHAT_RATE_LIMIT_MAX="8" CHAT_RATE_LIMIT_WINDOW_SECONDS="60"
```

Cada función valida: sesión (`Authorization: Bearer` del usuario) o sesión
anónima de chat (`x-innov-session`), y revalidan permisos y reglas de negocio
(los clientes nunca calculan precios ni roles).

## 7. Verificación rápida

- `curl` o navegador: home muestra productos DEMO.
- Registra una cuenta, agrega al carrito, compra (pago demo).
- Rastrea en `/seguimiento` con tu número INV-AAAAMM-#### + correo.
- Como admin: `/admin` muestra métricas y permite crear/editar productos con imagen.

## Solución de problemas

| Síntoma | Causa probable |
|---|---|
| Banner “configura Supabase” siempre | `.env` sin `VITE_SUPABASE_*` o typo |
| 403 al leer productos | Migraciones no aplicadas (faltan políticas RLS) o usuario sin sesión en secciones protegidas |
| Edge devuelve `ADMIN_ERROR` | JWT de sesión no enviado o usuario no es `admin` en `profiles` |
| Chat “no está disponible” | Secretos `AZURE_CQA_*` ausentes o proyecto/caja remota mal apuntados |
| Demasiados chats fallan | Rate limit (8 msg/60s por sesión) activo — `CHAT_RATE_LIMIT_*` |
