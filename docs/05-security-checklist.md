# 05 · Checklist de seguridad

Rigo diario para mantener la tienda demo segura. Marca cada ítem antes de exponer
la app a terceros.

## Modelo de confianza

- **Roles**: nunca definidos por el cliente. El rol vive en `profiles.role` y toda
  autoridad real se revalida en el servidor (RLS, `is_admin()`, RPCs y Edge Functions).
- **Precios/stock**: nunca confían en el frontend. `place_order` (Security Definer)
  recalcula con las reglas vigentes y bloquea stock con `FOR UPDATE`.
- **Secretos**: `service_role` y `AZURE_CQA_*` solo como secretos de Supabase.
  El frontend se limita a la `anon` key + URL.

## Base de datos

- [ ] RLS **enabled** en las 11 tablas (migración 0002). Verificar con:
      `select relname, relrowsecurity from pg_class where relname = 'orders';`
- [ ] Los clientes solo leen sus `orders`/`cart_items` por `auth.uid()`;
      la tabla `orders` rechaza INSERT directos (política absent).
- [ ] `prevent_role_elevation` bloquea el robo de rol (un usuario no puede
      ascenderse a `admin` con `from('profiles').update`).
- [ ] Cambio de estados de pedidos solo por `admin_set_order_status` (valida admin
      en servidor; cancelar reintegra inventario de forma atómica).
- [ ] Vista `published_products` con `security_invoker` solo expone lo publicado;
      las páginas públicas usan esta vista y no la tabla cruda.
- [ ] `track_order` exige número + correo (no filtra id de pedidos de terceros).
- [ ] Contraseñas solo gestionadas por Supabase Auth (nada de hashes propios).

## Storage

- [ ] Buckets de imagen públicos (`product-images`, `store-banners`) con política de
      **escritura admin-only** y max 3 MB / tipos permitidos.
- [ ] `support-attachments` privado (solo admin lo lee, si se consulta).
- [ ] El cliente sube por cola con MIME/size validados, y el servidor revalida.

## Edge Functions

- [ ] `create-order` reautentica sesión y **recalcula todo** (subtotales, descuento
      por oferta vigente, shipping — nunca confía en totales del cliente).
- [ ] `admin-products` valida admin por token (service-role en servidor) y no expone
      la `service_role` al cliente.
- [ ] `chat` invoca Azure CQA solo en el servidor; rate limit por sesión; registra
      eventos de auditoría en `chat_events`.
- [ ] Zod en cada payload (exit temprano si el input no cumple).

## Frontend

- [ ] Formularios limitados por zod (checkout, registro, contacto, admin).
- [ ] `sanitizeSearchQuery` antes de filtros `ilike` (sin `%()*)*` etc.).
- [ ] Estados vacíos honestos: no se muestran datos “fingidos” si el backend está caído.
- [ ] No se renderiza nunca HTML crudo de la BD (React escapa por defecto; evitar `dangerouslySetInnerHTML`).

## Enlaces/contenido

- [ ] Todas las URLs de navegación existen en el router (`/politicas/:slug`,
      `/producto/:slug`, `/catalogo?...`); sin links inventados hacia recursos exteriores.
- [ ] Aviso visible de **DEMO** (footer, chat, confirmación con pago simulado).

## Operación

- [ ] Audit log manual: los eventos de chat/pedidos guardan timestamps y emails mínimos.
- [ ] Backup programado de Supabase activado (Settings → Database).
- [ ] Rate limit de chat ajustable con secrets (`CHAT_RATE_LIMIT_*`).
- [ ] Revisión trimestral de políticas RLS tras cambios de esquema.
