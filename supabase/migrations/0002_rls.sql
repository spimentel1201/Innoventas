-- ─────────────────────────────────────────────────────────────────────────────
-- InnovVentas · 0002 · Seguridad a nivel de fila (RLS)
-- Regla de oro: el cliente solo ve/modifica SU información; los visitantes solo
-- ven lo publicado; solo admins gestionan el catálogo.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.profiles            enable row level security;
alter table public.categories          enable row level security;
alter table public.products            enable row level security;
alter table public.product_images      enable row level security;
alter table public.offers              enable row level security;
alter table public.cart_items          enable row level security;
alter table public.orders              enable row level security;
alter table public.order_items         enable row level security;
alter table public.chat_conversations  enable row level security;
alter table public.chat_messages       enable row level security;
alter table public.chat_events         enable row level security;
alter table public.support_requests    enable row level security;

-- ═══════════════════════════════ profiles ═══════════════════════════════
create policy "profiles: leer propio"          on public.profiles    for select using (id = auth.uid() or public.is_admin());
create policy "profiles: actualizar propio"    on public.profiles    for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- ═══════════════════════════════ categorías ═══════════════════════════════════════════════
create policy "categorías: lectura pública de activas" on public.categories for select
  using (is_active or public.is_admin());
create policy "categorías: escritura admin" on public.categories for all
  using (public.is_admin()) with check (public.is_admin());

-- ══════════════════════════════════ productos ═══════════════════════════════════════════
create policy "productos: lectura de publicados"  on public.products  for select
  using (status = 'published' or public.is_admin());
create policy "productos: escritura admin"        on public.products  for all
  using (public.is_admin()) with check (public.is_admin());

-- ═══════════════════════════════ product_images ═══════════════════════════════
create policy "imágenes: lectura asociada a publicados" on public.product_images for select
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id and (p.status = 'published' or public.is_admin())
    )
  );
create policy "imágenes: escritura admin" on public.product_images for all
  using (public.is_admin()) with check (public.is_admin());

-- ═══════════════════════════════════ ofertas ═════════════════════════════════════════════════
-- El público solo ve ofertas vigentes de productos publicados (no descuentos futuros).
create policy "ofertas: lectura de vigentes" on public.offers for select
  using (
    is_active and starts_at <= now() and ends_at > now()
    and exists (
      select 1 from public.products p
      where p.id = product_id and p.status = 'published'
    )
    or public.is_admin()
  );
create policy "ofertas: escritura admin" on public.offers for all
  using (public.is_admin()) with check (public.is_admin());

-- ══════════════════════════════════ cart_items ═════════════════════════════════════════════════
create policy "carrito: CRUD propio" on public.cart_items for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ════════════════════════════════════ pedidos ══════════════════════════════════════════════════
-- Lectura solo del dueño (o admin). Sin políticas de INSERT por cliente:
-- los pedidos nacen vía RPC place_order (security definer en 0003).
create policy "pedidos: lectura propia/admin" on public.orders for select
  using (user_id = auth.uid() or public.is_admin());
create policy "pedidos: modificación admin"   on public.orders for update
  using (public.is_admin()) with check (public.is_admin());

create policy "detalle pedidos: lectura vía pedido" on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())
    )
  );

-- ════════════════════════════════════ CHAT ═════════════════════
-- Escrituras y lectura de invitados: solo vía Edge Function (service role).
-- El usuario autenticado puede leer su conversación.
create policy "chat conversaciones: lectura propia/admin" on public.chat_conversations for select
  using (user_id = auth.uid() or public.is_admin());

create policy "chat mensajes: lectura vía conversación" on public.chat_messages for select
  using (
    exists (
      select 1 from public.chat_conversations c
      where c.id = conversation_id and (c.user_id = auth.uid() or public.is_admin())
    )
  );

create policy "chat eventos: lectura propia/admin" on public.chat_events for select
  using (user_id = auth.uid() or public.is_admin());

-- ═══════════════════════════════════ SOPORTE ═══════════════════════════════════════════════
-- Cualquier visitante puede solicitar ayuda; la lectura es exclusiva de admins.
create policy "soporte: envío público" on public.support_requests for insert
  to anon, authenticated
  with check (char_length(subject) between 3 and 120 and char_length(message) between 20 and 2000);
create policy "soporte: lectura admin" on public.support_requests for select
  using (public.is_admin());
create policy "soporte: actualización admin" on public.support_requests for update
  using (public.is_admin()) with check (public.is_admin());
