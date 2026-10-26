-- ─────────────────────────────────────────────────────────────────────────────
-- InnovVentas · 0003 · Vistas + funciones RPC de negocio
-- Toda la lógica de dinero/stock vive AQUÍ (server-side). El cliente jamás
-- envía precios ni totales finales.
-- ─────────────────────────────────────────────────────────────────────────────

-- ════════════════════ Vista pública: productos publicados ═══════════════════
-- security_invoker: se respeta RLS de products (RLS de 0002).
create view public.published_products
with (security_invoker = true)
as
select
  p.id,
  p.category_id,
  c.slug   as category_slug,
  c.name   as category_name,
  p.name,
  p.slug,
  p.description,
  p.brand,
  p.price,
  p.compare_at_price,
  p.stock,
  p.specifications,
  p.status,
  p.created_at,
  p.updated_at,
  (select pi.url from public.product_images pi
    where pi.product_id = p.id
    order by pi.is_primary desc, pi.position asc, pi.created_at asc
    limit 1) as image_url,
  off.discount_percent as offer_discount_percent,
  case
    when off.discount_percent is not null
    then round(p.price * (100.0 - off.discount_percent) / 100.0, 2)
  end as offer_price,
  off.ends_at as offer_ends_at
from public.products p
join public.categories c on c.id = p.category_id
left join lateral (
  select o.discount_percent, o.ends_at
  from public.offers o
  where o.product_id = p.id
    and o.is_active
    and o.starts_at <= now()
    and o.ends_at > now()
  order by o.discount_percent desc
  limit 1
) off on true
where p.status = 'published';

grant select on public.published_products to anon, authenticated;

-- ════════════════════ Vista pública: conteo por categoría ═══════════════════
create view public.category_counts
with (security_invoker = true)
as
select c.id, count(p.id) as product_count
from public.categories c
left join public.products p on p.category_id = c.id and p.status = 'published'
where c.is_active
group by c.id;

grant select on public.category_counts to anon, authenticated;

-- ════════════════════ Reglas de envío (coinciden con el frontend) ═══════════════════
create or replace function public.shipping_cost(p_subtotal numeric)
returns numeric
language sql
immutable
as $$
  select case when p_subtotal >= 1499 then 0 else 149 end
$$;

-- ════════════════════ RPC: crear pedido (Edge Function create-order) ═══════════════════
-- Recalcula precios con ofertas vigentes, valida stock con bloqueo de filas
-- (FOR UPDATE), inserta pedido + ítems con copia histórica y decrementa stock.
create or replace function public.place_order(
  p_items jsonb,
  p_shipping jsonb,
  p_payment_method text
)
returns table (id uuid, order_number text)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_user     uuid := auth.uid();
  v_email    text;
  v_item     jsonb;
  v_pid      uuid;
  v_qty      integer;
  v_prod     record;
  v_img      text;
  v_discount numeric := 0;
  v_final    numeric;
  v_sub      numeric := 0;
  v_disc     numeric := 0;
  v_count    integer := 0;
  v_ship     numeric;
  v_order_id uuid;
  v_onum     text;
  v_lines    jsonb := '[]'::jsonb;
  v_status   text;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select email into v_email from public.profiles where id = v_user;
  if v_email is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART';
  end if;
  if jsonb_array_length(p_items) > 30 then
    raise exception 'TOO_MANY_ITEMS';
  end if;
  if p_payment_method not in ('transfer', 'cod', 'demo_card') then
    raise exception 'INVALID_PAYMENT';
  end if;
  if coalesce(p_shipping->>'full_name', '') = '' or coalesce(p_shipping->>'line1', '') = ''
     or coalesce(p_shipping->>'city', '') = '' or coalesce(p_shipping->>'postal_code', '') = '' then
    raise exception 'INVALID_SHIPPING';
  end if;

  -- ── Pase 1: validar y consolidar líneas (bloqueo de stock) ────────────────
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_pid  := (v_item->>'product_id')::uuid;
    v_qty  := (v_item->>'quantity')::int;

    if v_pid is null or v_qty is null or v_qty < 1 or v_qty > 10 then
      raise exception 'INVALID_ITEM';
    end if;

    select p.id, p.name, p.brand, p.slug, p.price, p.stock, p.status
      into v_prod
      from public.products p
     where p.id = v_pid
     for update;

    if v_prod.id is null or v_prod.status <> 'published' then
      raise exception 'PRODUCT_UNAVAILABLE: %', coalesce(v_prod.slug, v_pid::text);
    end if;
    if v_prod.stock < v_qty then
      raise exception 'INSUFFICIENT_STOCK: %', v_prod.slug;
    end if;

    select o.discount_percent into v_discount
      from public.offers o
     where o.product_id = v_prod.id
       and o.is_active
       and o.starts_at <= now()
       and o.ends_at > now()
     order by o.discount_percent desc
     limit 1;
    v_discount := coalesce(v_discount, 0);

    v_final := round(v_prod.price * (100.0 - v_discount) / 100.0, 2);

    select pi.url into v_img
      from public.product_images pi
     where pi.product_id = v_prod.id
     order by pi.is_primary desc, pi.position asc, pi.created_at asc
     limit 1;

    v_sub   := v_sub + v_final * v_qty;
    v_disc  := v_disc + (v_prod.price - v_final) * v_qty;
    v_count := v_count + v_qty;

    v_lines := v_lines || jsonb_build_object(
      'product_id', v_prod.id,
      'product_name', v_prod.name,
      'brand', v_prod.brand,
      'slug', v_prod.slug,
      'image_url', v_img,
      'unit_price', v_prod.price,
      'discount_percent', v_discount,
      'unit_price_final', v_final,
      'quantity', v_qty,
      'line_total', v_final * v_qty
    );
  end loop;

  v_ship := public.shipping_cost(v_sub);
  v_status := case when p_payment_method = 'demo_card' then 'paid' else 'pending' end;

  -- ── Insertar pedido + copia histórica de ítems + decrementar stock ────────
  v_onum := 'INV-' || to_char(now(), 'YYYYMM') || '-' || lpad(nextval('public.order_number_seq')::text, 6, '0');

  insert into public.orders (
    order_number, user_id, email, status, payment_method,
    subtotal, discount_total, shipping_total, total, item_count, shipping
  ) values (
    v_onum, v_user, v_email, v_status, p_payment_method,
    v_sub, v_disc, v_ship, v_sub + v_ship, v_count, p_shipping
  )
  returning public.orders.id into v_order_id;

  for v_item in select * from jsonb_array_elements(v_lines)
  loop
    insert into public.order_items (
      order_id, product_id, product_name, brand, slug, image_url,
      unit_price, discount_percent, unit_price_final, quantity, line_total
    ) values (
      v_order_id,
      (v_item->>'product_id')::uuid,
      v_item->>'product_name',
      v_item->>'brand',
      v_item->>'slug',
      v_item->>'image_url',
      (v_item->>'unit_price')::numeric,
      (v_item->>'discount_percent')::numeric,
      (v_item->>'unit_price_final')::numeric,
      (v_item->>'quantity')::int,
      (v_item->>'line_total')::numeric
    );

    update public.products
       set stock = stock - ((v_item->>'quantity')::int)
     where id = (v_item->>'product_id')::uuid
       and stock >= ((v_item->>'quantity')::int);
  end loop;

  return query select v_order_id, v_onum::text;
end;
$$;

-- ════════════════════ RPC: cambio de estado de pedido (admin) ═══════════════════
-- Verifica el rol EN SERVIDOR; cancela pedidos devolviendo el inventario.
create or replace function public.admin_set_order_status(p_order uuid, p_status text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_prev text;
begin
  if not public.is_admin() then
    raise exception 'PERMISSION_DENIED';
  end if;
  if p_status not in ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled') then
    raise exception 'INVALID_STATUS';
  end if;

  select status into v_prev from public.orders where id = p_order;
  if v_prev is null then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  update public.orders set status = p_status where id = p_order;

  if p_status = 'cancelled' and v_prev <> 'cancelled' then
    update public.products pr
       set stock = pr.stock + oi.quantity
      from public.order_items oi
     where oi.product_id = pr.id
       and oi.order_id = p_order;
  end if;

  return true;
end;
$$;

-- ════════════════════ RPC: seguimiento público con dato demostrativo ═══════════════════
-- Requiere número de pedido + email registrado en el pedido (dato mínimo
-- verificable). Nunca expone información completa a terceros no autorizados.
create or replace function public.track_order(p_order_number text, p_email text)
returns jsonb
language sql
security definer
set search_path = public, pg_catalog
as $$
  select jsonb_build_object(
    'order_number', o.order_number,
    'status', o.status,
    'created_at', o.created_at,
    'updated_at', o.updated_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'product_name', oi.product_name,
        'brand', oi.brand,
        'slug', oi.slug,
        'image_url', oi.image_url,
        'unit_price_final', oi.unit_price_final,
        'quantity', oi.quantity,
        'line_total', oi.line_total
      ) order by oi.created_at)
      from public.order_items oi
      where oi.order_id = o.id
    ), '[]'::jsonb),
    'totals', jsonb_build_object(
      'subtotal', o.subtotal,
      'discount_total', o.discount_total,
      'shipping_total', o.shipping_total,
      'total', o.total
    ),
    'shipping', jsonb_build_object(
      'city', o.shipping->>'city',
      'country', o.shipping->>'country'
    )
  )
  from public.orders o
  where o.order_number = btrim(p_order_number)
    and lower(o.email) = lower(btrim(p_email))
  limit 1
$$;

-- ════════════════════ RPC: más vendidos (calculado de ventas reales) ═══════════════════
create or replace function public.best_selling_products(p_limit integer default 8)
returns jsonb
language sql
security definer
set search_path = public, pg_catalog
as $$
  select coalesce(jsonb_agg(t), '[]'::jsonb)
  from (
    select
      r.product_id as id,
      p.name,
      p.slug,
      p.brand,
      p.price,
      (select pi.url from public.product_images pi
        where pi.product_id = p.id
        order by pi.is_primary desc, pi.position asc
        limit 1) as image_url,
      off.discount_percent as offer_discount_percent,
      case when off.discount_percent is not null
        then round(p.price * (100.0 - off.discount_percent) / 100.0, 2) end as offer_price,
      r.units
    from (
      select oi.product_id, sum(oi.quantity) as units
      from public.order_items oi
      join public.orders o on o.id = oi.order_id and o.status <> 'cancelled'
      where oi.product_id is not null
      group by oi.product_id
      order by 2 desc
      limit greatest(p_limit, 1)
    ) r
    join public.products p on p.id = r.product_id and p.status = 'published'
    left join lateral (
      select o2.discount_percent
      from public.offers o2
      where o2.product_id = p.id
        and o2.is_active
        and o2.starts_at <= now()
        and o2.ends_at > now()
      order by o2.discount_percent desc
      limit 1
    ) off on true
  ) t
$$;

-- ════════════════════ RPC: KPIs del panel admin ═══════════════════════════════
create or replace function public.admin_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'PERMISSION_DENIED';
  end if;

  select jsonb_build_object(
    'products_published', (select count(*) from public.products where status = 'published'),
    'products_draft', (select count(*) from public.products where status = 'draft'),
    'low_stock', (select count(*) from public.products where status = 'published' and stock <= 5),
    'orders_total', (select count(*) from public.orders),
    'orders_pending', (select count(*) from public.orders where status in ('pending', 'paid', 'processing')),
    'revenue_30d', coalesce((
      select sum(total) from public.orders
      where status <> 'cancelled' and created_at > now() - interval '30 days'
    ), 0),
    'open_support', (select count(*) from public.support_requests where status = 'open')
  )
  into v_result;

  return v_result;
end;
$$;

-- ════════════════════ Grants de funciones ═══════════════════════════════════════════════════
revoke all on function public.place_order(jsonb, jsonb, text) from public, anon;
grant  execute on function public.place_order(jsonb, jsonb, text) to authenticated;

revoke all on function public.admin_set_order_status(uuid, text) from public, anon;
grant  execute on function public.admin_set_order_status(uuid, text) to authenticated;

revoke all on function public.admin_dashboard() from public, anon;
grant  execute on function public.admin_dashboard() to authenticated;

grant execute on function public.track_order(text, text) to anon, authenticated;
grant execute on function public.best_selling_products(integer) to anon, authenticated;
grant execute on function public.shipping_cost(numeric) to anon, authenticated;
