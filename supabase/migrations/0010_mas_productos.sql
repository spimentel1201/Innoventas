-- ─────────────────────────────────────────────────────────────────────────────
-- InnovVentas · 0010 · Ampliación de catálogo (+11 productos)
--
-- Amplía el catálogo con más audífonos y productos de otras categorías
-- (monitores, teclados, mouse, impresoras, almacenamiento y accesorios).
-- · Additivo e idempotente: se puede ejecutar varias veces (on conflict do nothing).
-- · Precios referenciales del mercado peruano, en la misma línea que 0009.
-- · Marcas/modelos reales; imágenes demostrativas de placehold.co.
-- · Total del catálogo tras esta migración: 38 productos.
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.products (category_id, name, slug, description, brand, price, compare_at_price, stock, specifications, status)
select c.id, v.name, v.slug, v.description, v.brand, v.price, v.compare_at_price, v.stock, v.specifications, v.status
from (values
  -- ── Audífonos (5 nuevos: 2 con ANC, 2 TWS económicos, 1 gamer) ──
  ('audifonos', 'Sony WH-CH720N ANC', 'sony-wh-ch720n',
   'Over-ear con cancelación activa, Bluetooth multipunto y app con ecualizador. 35 horas de batería con ANC encendido.',
   'SONY', 349.00, 449.00, 14,
   '{"Formato": "Over-ear", "Cancelación activa": "Sí, 20 niveles", "Batería": "35 h (con ANC)", "Conectividad": "Bluetooth 5.2 multipunto", "Extras": "App Sony Headphones Connect, llamadas con IA"}'::jsonb,
   'published'),
  ('audifonos', 'JBL Tune 770NC ANC', 'jbl-tune-770nc',
   'Over-ear con cancelación adaptativa JBL Pure ANC, 70 horas de reproducción y carga rápida: 5 minutos dan 3 horas.',
   'JBL', 329.00, 399.00, 16,
   '{"Formato": "Over-ear", "Cancelación activa": "Adaptativa JBL Pure ANC", "Batería": "70 h (35 h con ANC)", "Conectividad": "Bluetooth 5.3 multipunto", "Extras": "JBL Pure Bass, carga rápida"}'::jsonb,
   'published'),
  ('audifonos', 'QCY T13 Pro TWS', 'qcy-t13-pro',
   'TWS económicos con Bluetooth 5.3, 40 horas totales con estuche y modo de baja latencia para juegos.',
   'QCY', 79.90, 119.00, 40,
   '{"Formato": "TWS in-ear", "Batería": "10 h + 30 h estuche", "Conectividad": "Bluetooth 5.3", "Resistencia": "IPX5", "Extras": "App QCY, modo baja latencia"}'::jsonb,
   'published'),
  ('audifonos', 'Edifier X2 TWS', 'edifier-x2-tws',
   'TWS con sonido Edifier, resistencia IP55 y modo juego con latencia baja. Ideal para el día a día y el gimnasio.',
   'EDIFIER', 99.00, 149.00, 30,
   '{"Formato": "TWS in-ear", "Batería": "7 h + 21 h estuche", "Códec": "SBC", "Resistencia": "IP55", "Extras": "Edifier Connect, game mode 60 ms"}'::jsonb,
   'published'),
  ('audifonos', 'HyperX Cloud III (3.5 mm)', 'hyperx-cloud-iii',
   'Gamer over-ear con drivers de 53 mm, micrófono desmontable con cancelación de ruido y memoria de espuma.',
   'HYPERX', 349.00, 399.00, 12,
   '{"Formato": "Over-ear gaming", "Audio": "Drivers 53 mm", "Micrófono": "Desmontable con NR", "Conectividad": "Jack 3.5 mm + adaptador USB incluido", "Peso": "320 g"}'::jsonb,
   'published'),

  -- ── Monitores ──
  ('monitores', 'AOC 24G2SPE 24 165 Hz', 'aoc-24g2spe-165hz',
   'Monitor gaming IPS de 24 pulgadas a 165 Hz con 1 ms MPRT: competitivo fluido a precio de entrada.',
   'AOC', 579.00, 649.00, 12,
   '{"Tamaño": "24 pulgadas", "Resolución": "1920 x 1080 (FHD)", "Panel": "IPS", "Frecuencia": "165 Hz", "Conectividad": "2x HDMI, DisplayPort", "Extras": "1 ms MPRT, AMD FreeSync Premium"}'::jsonb,
   'published'),

  -- ── Teclados ──
  ('teclados', 'Logitech G413 SE mecánico', 'logitech-g413-se',
   'Mecánico full size con switches Romer-G táctiles, carcasa de acero y retroiluminación LED blanca.',
   'LOGITECH', 269.00, 319.00, 18,
   '{"Formato": "Completo (104 teclas)", "Switches": "Romer-G Táctil (mecánico)", "Retroiluminación": "LED blanco", "Conectividad": "USB-A", "Extras": "Carcasa de acero"}'::jsonb,
   'published'),

  -- ── Mouse ──
  ('mouse', 'Logitech G305 Lightspeed', 'logitech-g305-lightspeed',
   'Mouse gamer inalámbrico con sensor HERO de 12,000 DPI, 250 horas de batería y solo 99 g de peso.',
   'LOGITECH', 179.00, 229.00, 24,
   '{"Sensor": "HERO 12,000 DPI", "Peso": "99 g (con batería AA)", "Conectividad": "2.4 GHz Lightspeed", "Batería": "250 h", "Extras": "6 botones, memoria de juegos"}'::jsonb,
   'published'),

  -- ── Impresoras ──
  ('impresoras', 'Canon PIXMA G3110 tanque', 'canon-g3110-tanque',
   'Multifunción de tinta continua con Wi-Fi: hasta 6,000 páginas en negro y 7,700 a color con las botellas incluidas.',
   'CANON', 629.00, 729.00, 9,
   '{"Funciones": "Impresión, copia, escaneo", "Tinta": "Sistema de tanque (3 colores + negro)", "Rendimiento": "6,000 pg b/n · 7,700 pg color", "Conectividad": "Wi-Fi, USB", "Resolución": "4800 x 1200 dpi"}'::jsonb,
   'published'),

  -- ── Almacenamiento ──
  ('almacenamiento', 'WD Blue SN580 1 TB NVMe', 'wd-blue-sn580-1tb',
   'SSD NVMe PCIe 4.0 de 1 TB hasta 4,150 MB/s: acelera arranques y juegos sin gastar de más.',
   'WESTERN DIGITAL', 289.00, 349.00, 26,
   '{"Capacidad": "1 TB", "Interfaz": "PCIe 4.0 x4 NVMe", "Velocidad lectura": "Hasta 4,150 MB/s", "Formato": "M.2 2280", "Extras": "Compatible con PCs y PS5"}'::jsonb,
   'published'),

  -- ── Accesorios ──
  ('accesorios', 'Mochila para laptop 15.6 pulgadas', 'mochila-laptop-156',
   'Mochila impermeable con compartimento acolchado para laptop, entrada USB para power bank y espalda ventilada.',
   'GENÉRICO', 79.90, 119.00, 35,
   '{"Capacidad": "22 L", "Compatibilidad": "Laptops de hasta 15.6 pulgadas", "Material": "Poliéster resistente a salpicaduras", "Extras": "USB passthrough, espalda ventilada"}'::jsonb,
   'published')
) as v(category_slug, name, slug, description, brand, price, compare_at_price, stock, specifications, status)
join public.categories c on c.slug = v.category_slug
on conflict (slug) do nothing;

-- ════════════════════ IMÁGENES DEMOSTRATIVAS ═════════════════════════════════
insert into public.product_images (product_id, url, alt, position, is_primary)
select
  p.id,
  'https://placehold.co/900x600/0f172a/38bdf8.png?text=' || replace(upper(p.name), ' ', '+'),
  'Imagen demostrativa de ' || p.name,
  0,
  true
from public.products p
where p.slug in (
  'sony-wh-ch720n', 'jbl-tune-770nc', 'qcy-t13-pro', 'edifier-x2-tws', 'hyperx-cloud-iii',
  'aoc-24g2spe-165hz', 'logitech-g413-se', 'logitech-g305-lightspeed', 'canon-g3110-tanque',
  'wd-blue-sn580-1tb', 'mochila-laptop-156'
)
  and not exists (select 1 from public.product_images pi where pi.product_id = p.id);

-- ════════════════════ OFERTAS (fechas relativas a now()) ═════════════════════
insert into public.offers (product_id, discount_percent, starts_at, ends_at, is_active)
select ids.id, v.discount, now() - interval '2 days', now() + v.duration, true
from (values
  ('sony-wh-ch720n', 20, interval '30 days'),
  ('jbl-tune-770nc', 15, interval '21 days'),
  ('aoc-24g2spe-165hz', 10, interval '14 days'),
  ('wd-blue-sn580-1tb', 15, interval '10 days')
) as v(slug, discount, duration)
join (select id, slug from public.products) ids on ids.slug = v.slug
where not exists (
  select 1 from public.offers o
  where o.product_id = ids.id and o.ends_at > now()
);
