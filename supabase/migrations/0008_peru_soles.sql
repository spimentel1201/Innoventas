-- ─────────────────────────────────────────────────────────────────────────────
-- InnovVentas · 0008 · Adaptación a Perú (soles)
-- 1. shipping_cost(): S/ 15 fijo, gratis desde S/ 1,500 (coincide con src/lib/config.ts).
-- 2. Reseed de precios demo a escala peruana (los anteriores eran escala MXN ×10).
-- 3. Recalcula los pedidos de demostración (INV-…-DEMO…) con los precios nuevos y
--    actualiza sus ciudades a Perú.
-- ─────────────────────────────────────────────────────────────────────────────

-- ════════════════ 1. Envío en soles ════════════════
create or replace function public.shipping_cost(p_subtotal numeric)
returns numeric
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select case when p_subtotal >= 1500 then 0 else 15 end;
$$;

grant execute on function public.shipping_cost(numeric) to anon, authenticated, service_role;

-- ════════════════ 2. Precios demo a escala Perú ════════════════
-- Laptops (escala aprobada: Air ≈ 1,799 · Pro 14 ≈ 2,499 · Studio 16 ≈ 3,599 · X15 ≈ 4,299)
update public.products set price = 1799 where slug = 'novabook-air-13';
update public.products set price = 2499, compare_at_price = 2699 where slug = 'novabook-pro-14';
update public.products set price = 4299, compare_at_price = 4699 where slug = 'zenix-zero-x15-gaming';
update public.products set price = 3599 where slug = 'auroro-studio-16';

-- Monitores
update public.products set price = 649 where slug = 'hyperline-ultraview-27-4k';
update public.products set price = 749, compare_at_price = 849 where slug = 'hyperline-promotion-27-qhd-165hz';
update public.products set price = 949 where slug = 'technova-curveflex-34-ultrawide';
update public.products set price = 289 where slug = 'hyperline-officeview-24';

-- Teclados
update public.products set price = 219 where slug = 'zenix-k75-pro-mecanico';
update public.products set price = 135 where slug = 'zenix-k60-tkl';
update public.products set price = 55 where slug = 'zenix-k30-oficina';

-- Mouse
update public.products set price = 99, compare_at_price = 119 where slug = 'zenix-m85r-inalambrico-gaming';
update public.products set price = 35 where slug = 'zenix-m20-oficina-silencioso';
update public.products set price = 79 where slug = 'hyperline-vpanel-ergonomico';

-- Audífonos
update public.products set price = 229, compare_at_price = 279 where slug = 'auroro-air-x3-tws-anc';
update public.products set price = 399 where slug = 'auroro-studio-over-ear-anc';
update public.products set price = 99 where slug = 'auroro-fit-sport-ipx7';
update public.products set price = 159 where slug = 'auroro-gamer-hs7-7-1';

-- Impresoras
update public.products set price = 329 where slug = 'technova-inkjet-imprimeplus-4-en-1';
update public.products set price = 449 where slug = 'technova-laser-mono-l215';

-- Almacenamiento
update public.products set price = 189, compare_at_price = 219 where slug = 'hyperline-ssd-nvme-1tb-gen4';
update public.products set price = 329 where slug = 'hyperline-ssd-nvme-2tb-gen4';
update public.products set price = 219 where slug = 'hyperline-ssd-portatil-1tb-usb-c';
update public.products set price = 109 where slug = 'hyperline-microsd-512-gb';

-- Accesorios
update public.products set price = 279 where slug = 'technova-dockhub-11-en-1-usb-c';
update public.products set price = 129 where slug = 'technova-webcam-pro-2k';
update public.products set price = 49 where slug = 'zenix-grafics-xl-gaming-mousepad';

-- ════════════════ 3. Recalcula pedidos demo con los precios nuevos ════════════════
-- Los line items demo apuntan a productos vivos: reproyecta precio, oferta vigente,
-- unit_price_final y line_total, y luego reaggregate encabezados. Ciudades a Perú.
update public.order_items oi set
  unit_price = p.price,
  discount_percent = coalesce(off.discount_percent, 0),
  unit_price_final = round(p.price * (100 - coalesce(off.discount_percent, 0)) / 100.0, 2),
  line_total = round(p.price * (100 - coalesce(off.discount_percent, 0)) / 100.0, 2) * oi.quantity
from public.products p
left join lateral (
  select o2.discount_percent from public.offers o2
  where o2.product_id = p.id and o2.ends_at > now()
  order by o2.discount_percent desc limit 1
) off on true
where oi.slug = p.slug
  and oi.order_id in (
    select id from public.orders where shipping->>'demo' = 'true'
  );

update public.orders o set
  subtotal = agg.sub,
  discount_total = agg.disc,
  shipping_total = case when agg.sub >= 1500 then 0 else 15 end,
  total = agg.sub - agg.disc + case when agg.sub >= 1500 then 0 else 15 end,
  item_count = agg.items
from (
  select
    order_id,
    sum(line_total) as sub,
    coalesce(sum((unit_price - unit_price_final) * quantity), 0) as disc,
    sum(quantity) as items
  from public.order_items
  group by order_id
) agg
where o.id = agg.order_id and o.shipping->>'demo' = 'true';

-- ════════════════ 4. seed_demo_sales regenerada con Perú ════════════════
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
      '{"full_name": "Pedido de demostración", "city": "Lima", "country": "Perú", "demo": "true"}'::jsonb
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
      '{"full_name": "Pedido de demostración", "city": "Arequipa", "country": "Perú", "demo": "true"}'::jsonb
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
