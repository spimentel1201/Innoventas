-- ─────────────────────────────────────────────────────────────────────────────
-- InnovVentas · 0006 · (OPCIONAL) Ventas de demostración
-- La página "Más vendidos" calcula SIEMPRE desde ventas reales (order_items).
-- Si tu tienda es nueva, no hay ventas: la página muestra un estado vacío honesto.
-- Para probar la agregación, esta función OPCIONAL inserta pedidos demo
-- asignados a tu cuenta de administrador.
--
-- USO (editor SQL de Supabase):
--   1. Crea tu cuenta de admin (ver docs/01) y copia su UUID de profiles.
--   2. Ejecuta:  select public.seed_demo_sales('UUID-DE-TU-PERFIL');
--   3. Verifica:  select * from public.orders where shipping->>'demo' = 'true';
--
-- Los pedidos quedan marcados con shipping = {"demo": "true"} y email label
-- +demo para identificarlos claramente como datos de demostración.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.seed_demo_sales(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_email text;
begin
  select email into v_email from public.profiles where id = p_user_id;
  if v_email is null then
    raise exception 'PROFILE_NOT_FOUND: ejecuta primero con un uuid de profiles válido';
  end if;

  -- Pedido demo 1: monitor QHD + mouse gamer
  with o as (
    insert into public.orders (order_number, user_id, email, status, payment_method,
      subtotal, discount_total, shipping_total, total, item_count, shipping)
    values (
      'INV-202601-DEMO1', p_user_id, v_email, 'delivered', 'demo_card',
      0, 0, 0, 0, 2,
      '{"full_name": "Pedido de demostración", "city": "Ciudad de México", "country": "México", "demo": "true"}'::jsonb
    )
    returning id
  ), i1 as (
    insert into public.order_items (order_id, product_id, product_name, brand, slug, image_url,
      unit_price, discount_percent, unit_price_final, quantity, line_total)
    select o.id, p.id, p.name, p.brand, p.slug,
      (select pi.url from public.product_images pi where pi.product_id = p.id limit 1),
      p.price, off.discount_percent, round(p.price * (100 - coalesce(off.discount_percent, 0)) / 100.0, 2),
      2, round(p.price * (100 - coalesce(off.discount_percent, 0)) / 100.0, 2) * 2
    from o
    join public.products p on p.slug = 'hyperline-promotion-27-qhd-165hz'
    left join lateral (
      select o2.discount_percent from public.offers o2
      where o2.product_id = p.id and o2.ends_at > now()
      order by o2.discount_percent desc limit 1
    ) off on true
    on conflict do nothing
    returning order_id
  )
  update public.orders set
    subtotal = (select sum(line_total) from public.order_items where order_id = (select id from o)),
    discount_total = (
      select sum((unit_price - unit_price_final) * quantity)
      from public.order_items where order_id = (select id from o)
    ),
    shipping_total = 0,
    total = (select sum(line_total) from public.order_items where order_id = (select id from o)),
    item_count = (select sum(quantity) from public.order_items where order_id = (select id from o))
  where id = (select id from o);

  -- Pedido demo 2: SSD + audífonos TWS + mousepads
  with o2 as (
    insert into public.orders (order_number, user_id, email, status, payment_method,
      subtotal, discount_total, shipping_total, total, item_count, shipping)
    values (
      'INV-202602-DEMO2', p_user_id, v_email, 'shipped', 'transfer',
      0, 0, 0, 0, 6,
      '{"full_name": "Pedido de demostración", "city": "Guadalajara", "country": "México", "demo": "true"}'::jsonb
    )
    returning id
  )
  insert into public.order_items (order_id, product_id, product_name, brand, slug, image_url,
    unit_price, discount_percent, unit_price_final, quantity, line_total)
  select o2.id, p.id, p.name, p.brand, p.slug,
    (select pi.url from public.product_images pi where pi.product_id = p.id limit 1),
    p.price, coalesce(off.discount_percent, 0), round(p.price * (100 - coalesce(off.discount_percent, 0)) / 100.0, 2),
    v.qty, round(p.price * (100 - coalesce(off.discount_percent, 0)) / 100.0, 2) * v.qty
  from (values ('hyperline-ssd-nvme-1tb-gen4', 1), ('auroro-air-x3-tws-anc', 1), ('zenix-grafics-xl-gaming-mousepad', 4)) as v(slug, qty)
  join public.products p on p.slug = v.slug
  cross join o2
  left join lateral (
    select o3.discount_percent from public.offers o3
    where o3.product_id = p.id and o3.ends_at > now()
    order by o3.discount_percent desc limit 1
  ) off on true;

  update public.orders set
    subtotal = (select sum(line_total) from public.order_items where order_id = orders.id),
    discount_total = (select coalesce(sum((unit_price - unit_price_final) * quantity), 0) from public.order_items where order_id = orders.id),
    total = (select sum(line_total) from public.order_items where order_id = orders.id) + shipping_total,
    item_count = (select sum(quantity) from public.order_items where order_id = orders.id)
  where orders.order_number in ('INV-202601-DEMO1', 'INV-202602-DEMO2');

  return 'Pedidos demostración creados (INV-202601-DEMO1, INV-202602-DEMO2). Elimínalos cuando termines las pruebas.';
end;
$$;

revoke all on function public.seed_demo_sales(uuid) from public, anon;
grant execute on function public.seed_demo_sales(uuid) to authenticated, service_role;
