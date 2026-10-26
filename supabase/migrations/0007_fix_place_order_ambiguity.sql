-- Corrección: en place_order las columnas de retorno (id, order_number) están en
-- scope dentro de PL/pgSQL, y dos consultas usaban `where id = ...` sin calificar.
-- Postgres resuelve el nombre en conflicto con la columna de salida →
-- 'column reference "id" is ambiguous' (42702) al ejecutar la RPC vía create-order.
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

  select email into v_email from public.profiles where public.profiles.id = v_user;
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
     where public.products.id = (v_item->>'product_id')::uuid
       and stock >= ((v_item->>'quantity')::int);
  end loop;

  return query select v_order_id, v_onum::text;
end;
$$;

-- Permisos (reafirmar tras create or replace)
revoke all on function public.place_order(jsonb, jsonb, text) from public, anon;
grant execute on function public.place_order(jsonb, jsonb, text) to authenticated;
