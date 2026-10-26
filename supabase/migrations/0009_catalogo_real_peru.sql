-- ─────────────────────────────────────────────────────────────────────────────
-- InnovVentas · 0009 · Catálogo real Perú (SKUs + precios de mercado verificados
-- con listings de Falabella Perú en oct-2026). Update IN-PLACE de los 27
-- productos demo (mismos ids/categorías) → ofertas/pedidos siguen válidos.
-- Pedidos demo se regeneran con los nuevos SKUs al final del script.
-- ═════════════════════════════════════════════════════════════════════════════

-- 1) Demotar imágenes SVG actuales (quedan como segunda imagen de galería)
update public.product_images
set is_primary = false, position = 2
where is_primary = true;

-- 2) Pedidos demo antiguos: fuera (se vuelven a crear al final)
delete from public.orders where shipping->>'demo' = 'true';

-- 3) Catálogo real (update in-place por slug)
update public.products p set
  name = v.name, slug = v.slug, brand = v.brand, description = v.description,
  price = v.price, compare_at_price = v.compare_at_price, stock = v.stock,
  specifications = v.specifications
from (values
  -- Laptops
  ('novabook-air-13', 'HP 15-fd0239LA (Core i3, 8 GB)', 'hp-15-fd0239la', 'HP',
   'Laptop de 15.6 pulgadas FHD con procesador eficiente para clases online, Word/Excel y navegación diaria. Teclado completo, sale con Windows 11 Home.',
   1599::numeric, 1899::numeric, 12,
   '{"Procesador": "Intel Core i3-N305", "RAM": "8 GB DDR4", "Almacenamiento": "512 GB SSD", "Pantalla": "15.6 pulgadas FHD", "Gráficos": "Intel UHD", "Sistema": "Windows 11 Home", "Peso": "1.7 kg"}'::jsonb),
  ('novabook-pro-14', 'ASUS Vivobook 15 M1502NAQ (Ryzen 7, 16 GB)', 'asus-vivobook-15-m1502naq', 'ASUS',
   'Vivobook 15 con procesador Ryzen 7, 16 GB de RAM y pantalla 15.6 pulgadas: multitarea fluida para oficina, estudio avanzado y edición ligera.',
   2999::numeric, 3099::numeric, 9,
   '{"Procesador": "AMD Ryzen 7", "RAM": "16 GB", "Almacenamiento": "512 GB SSD", "Pantalla": "15.6 pulgadas FHD", "Gráficos": "Radeon integrada", "Sistema": "Windows 11 Home", "Peso": "1.8 kg"}'::jsonb),
  ('zenix-zero-x15-gaming', 'HP Victus 15-FA2013 (RTX 3050, 144 Hz)', 'hp-victus-15-fa2013la', 'HP',
   'Gaming con gráfica dedicada NVIDIA RTX 3050 de 6 GB, pantalla de 144 Hz y refrigeración activa. Ideal para juegos actuales y renderizado con GPU.',
   3249::numeric, 3999::numeric, 7,
   '{"Procesador": "Intel Core i5-13420H", "RAM": "8 GB DDR4", "Almacenamiento": "512 GB SSD", "Pantalla": "15.6 pulgadas FHD 144 Hz", "Gráficos": "NVIDIA RTX 3050 6 GB", "Sistema": "Windows 11 Home", "Peso": "2.3 kg"}'::jsonb),
  ('auroro-studio-16', 'Acer Aspire 15 (Core i9-13900H, 16 GB)', 'acer-aspire-15-i9-13900h', 'ACER',
   'Aspire 15 con Core i9 de 14 núcleos, 16 GB de RAM y pantalla FHD: multitarea extrema, desarrollo y CAD sin cuellos de botella de CPU.',
   3799::numeric, 3899::numeric, 6,
   '{"Procesador": "Intel Core i9-13900H", "RAM": "16 GB", "Almacenamiento": "512 GB SSD", "Pantalla": "15.6 pulgadas FHD", "Gráficos": "Intel Iris Xe", "Sistema": "Windows 11 Home", "Peso": "2.1 kg"}'::jsonb),

  -- Monitores
  ('hyperline-officeview-24', 'LG 24MK600M-B 23.8 FHD IPS', 'lg-24mk600m-b', 'LG',
   'Monitor IPS de 23.8 pulgadas FHD a 75 Hz con HDMI/VGA y pespona VESA: oficina y estudio cómodo todo el día.',
   599::numeric, 679::numeric, 20,
   '{"Tamaño": "23.8 pulgadas", "Resolución": "1920 x 1080 (FHD)", "Panel": "IPS", "Frecuencia": "75 Hz", "Conectividad": "HDMI, VGA", "Extras": "AMD FreeSync, VESA"}'::jsonb),
  ('hyperline-promotion-27-qhd-165hz', 'Samsung Odyssey G3 G32B 27 165 Hz', 'samsung-odyssey-g3-g32b-27', 'SAMSUNG',
   'Gaming de 27 pulgadas con panel VA FHD a 165 Hz, tiempo de respuesta de 1 ms y soporte ajustable: competitivo fluido.',
   699::numeric, 799::numeric, 6,
   '{"Tamaño": "27 pulgadas", "Resolución": "1920 x 1080 (FHD)", "Panel": "VA", "Frecuencia": "165 Hz", "Conectividad": "2x HDMI, DisplayPort", "Extras": "AMD FreeSync Premium, 1 ms MPRT"}'::jsonb),
  ('hyperline-ultraview-27-4k', 'Xiaomi Monitor A27Ui 27 4K', 'xiaomi-monitor-a27ui-4k', 'XIAOMI',
   'Monitor 4K UHD de 27 pulgadas con USB-C de 65 W: detalle extremo para diseño y documentos con un solo cable.',
   899::numeric, 999::numeric, 5,
   '{"Tamaño": "27 pulgadas", "Resolución": "3840 x 2160 (4K UHD)", "Panel": "IPS", "Frecuencia": "75 Hz", "Conectividad": "HDMI, USB-C 65 W", "Extras": "Filtro de luz azul, base ergonómica"}'::jsonb),
  ('technova-curveflex-34-ultrawide', 'LG 29U531A-W Ultrawide 29 WFHD', 'lg-29u531a-w-ultrawide-29', 'LG',
   'Ultrawide 21:9 IPS de 29 pulgadas con 100 Hz y USB-C: dos ventanas de trabajo lado a lado sin saturarse.',
   939::numeric, 1250::numeric, 5,
   '{"Tamaño": "29 pulgadas", "Resolución": "2560 x 1080 (WFHD 21:9)", "Panel": "IPS", "Frecuencia": "100 Hz", "Conectividad": "2x HDMI, DisplayPort, USB-C", "Extras": "AMD FreeSync"}'::jsonb),

  -- Teclados
  ('zenix-k75-pro-mecanico', 'HyperX Alloy Origins 60 (HX Red)', 'hyperx-alloy-origins-60', 'HYPERX',
   'Mecánico 60 por ciento ultra compacto con switches HyperX Red lineales y keycaps PBT doble-shot: gaming y escritura premium.',
   299.00::numeric, 329::numeric, 14,
   '{"Formato": "60% (61 teclas)", "Switches": "HyperX Red (lineales)", "Retroiluminación": "RGB por tecla", "Conectividad": "USB-C desmontable", "Keycaps": "PBT doble-shot"}'::jsonb),
  ('zenix-k60-tkl', 'Redragon Kumara K552 Rainbow', 'redragon-kumara-k552', 'REDRAGON',
   'Mecánico TKL con switches red, retroiluminación rainbow y estructura de acero: el clásico precio/rendimiento para gaming y estudio.',
   179.00::numeric, 299::numeric, 25,
   '{"Formato": "TKL (87 teclas)", "Switches": "Red (lineales)", "Retroiluminación": "Rainbow 9 modos", "Conectividad": "USB-A cableado", "Extras": "Keycaps ABS doble inyección"}'::jsonb),
  ('zenix-k30-oficina', 'Logitech K120 USB', 'logitech-k120', 'LOGITECH',
   'Teclado de membrana silencioso y resistente a derrames: el estándar de los escritorios de oficina.',
   49.00::numeric, 69::numeric, 40,
   '{"Formato": "Completo (104 teclas)", "Switches": "Membrana silenciosa", "Retroiluminación": "No", "Cable": "USB-A 1.5 m", "Extras": "Resistente a líquidos"}'::jsonb),

  -- Mouse
  ('zenix-m85r-inalambrico-gaming', 'Logitech G203 Lightsync RGB', 'logitech-g203-lightsync', 'LOGITECH',
   'Gaming con sensor de 8,000 DPI, iluminación RGB Lightsync y reporte de 1 ms: la referencia competitiva accesible.',
   87.90::numeric, 119::numeric, 30,
   '{"Sensor": "8,000 DPI", "Peso": "85 g", "Conectividad": "USB-A", "Botones": "6 programables", "Extras": "RGB Lightsync, 1 ms"}'::jsonb),
  ('zenix-m20-oficina-silencioso', 'Logitech M170 Inalámbrico', 'logitech-m170', 'LOGITECH',
   'Mouse inalámbrico 2.4 GHz con receptor nano USB y hasta 12 meses de batería con una sola AA.',
   58.00::numeric, null::numeric, 50,
   '{"Sensor": "1,000 DPI", "Conectividad": "2.4 GHz receptor nano", "Batería": "12 meses (1 AA)", "Extras": "Ambidiestro, cables y carpetas"}'::jsonb),
  ('hyperline-vpanel-ergonomico', 'Logitech M330 Silent Plus', 'logitech-m330-silent-plus', 'LOGITECH',
   'Clicks hasta 90 por ciento más silenciosos, sensor de 2,000 DPI y 24 meses de batería: ideal para espacios compartidos.',
   99.00::numeric, 130::numeric, 18,
   '{"Sensor": "2,000 DPI", "Clicks": "Silenciosos (-90%)", "Conectividad": "2.4 GHz", "Batería": "24 meses (1 AA)", "Peso": "74.5 g"}'::jsonb),

  -- Audífonos
  ('auroro-air-x3-tws-anc', 'JBL Wave Buds 2 TWS', 'jbl-wave-buds-2', 'JBL',
   'TWS in-ear con JBL Deep Bass, 25 horas totales con estuche y resistencia IPX5 para el día a día.',
   189.00::numeric, 239::numeric, 22,
   '{"Formato": "TWS in-ear", "Batería": "8 h + 17 h estuche", "Carga": "USB-C con carga rápida", "Resistencia": "IPX5", "Extras": "JBL Deep Bass, llamadas VoiceAware"}'::jsonb),
  ('auroro-studio-over-ear-anc', 'Edifier W820NB Plus ANC', 'edifier-w820nb-plus-anc', 'EDIFIER',
   'Over-ear con cancelación activa de hasta -49 dB, Hi-Res Audio Wireless por LDAC y 49 horas de batería.',
   299.00::numeric, 379::numeric, 12,
   '{"Formato": "Over-ear", "Cancelación activa": "-49 dB", "Códec": "LDAC, AAC, SBC", "Batería": "49 h (34 h con ANC)", "Extras": "Hi-Res Audio Wireless, modo escucha"}'::jsonb),
  ('auroro-fit-sport-ipx7', 'JBL Tune 510BT Bluetooth', 'jbl-tune-510bt', 'JBL',
   'On-ear Bluetooth con JBL Pure Bass, 57 horas de reproducción y carga rápida: 5 minutos para 2 horas extra.',
   139.00::numeric, 199::numeric, 26,
   '{"Formato": "On-ear", "Batería": "57 h", "Carga": "USB-C (5 min = 2 h)", "Conectividad": "Bluetooth 5.0 multipunto", "Extras": "JBL Pure Bass, micrófono integrado"}'::jsonb),
  ('auroro-gamer-hs7-7-1', 'HyperX Cloud Stinger 2', 'hyperx-cloud-stinger', 'HYPERX',
   'Gaming over-ear con drivers de 50 mm, micrófono swivel-away con cancelación de ruido y peso ligero de 260 g.',
   279.90::numeric, null::numeric, 15,
   '{"Formato": "Over-ear gaming", "Audio": "Drivers 50 mm", "Micrófono": "Swivel-away con NR", "Conectividad": "Jack 3.5 mm", "Peso": "260 g"}'::jsonb),

  -- Impresoras
  ('technova-inkjet-imprimeplus-4-en-1', 'Epson EcoTank L3250 Wi-Fi', 'epson-ecotank-l3250', 'EPSON',
   'Multifunción de tinta continua hasta 7,500 páginas en negro y 4,500 a color, Wi-Fi Direct y escaneo de documentos.',
   809.00::numeric, 999::numeric, 10,
   '{"Funciones": "Impresión, copia, escaneo", "Tinta": "Sistema EcoTank (botellas)", "Rendimiento": "7,500 pg b/n · 4,500 pg color", "Conectividad": "Wi-Fi Direct, USB", "Resolución": "5,760 x 1,440 dpi"}'::jsonb),
  ('technova-laser-mono-l215', 'HP LaserJet M111w (laser Wi-Fi)', 'hp-laserjet-m111w', 'HP',
   'Láser monocromática Wi-Fi compacta para oficinas y estudios con excelente rendimiento de tóner.',
   519.00::numeric, 679::numeric, 8,
   '{"Tecnología": "Láser monocromático", "Conectividad": "Wi-Fi, USB", "Impresión móvil": "HP Smart App", "Velocidad": "20 ppm"}'::jsonb),

  -- Almacenamiento
  ('hyperline-ssd-nvme-1tb-gen4', 'Kingston NV2 1 TB NVMe Gen4', 'kingston-nv2-1tb', 'KINGSTON',
   'SSD NVMe PCIe 4.0 x4 de 1 TB hasta 3,500 MB/s: revive tu laptop o consola con velocidad de la generación actual.',
   259.00::numeric, 329::numeric, 35,
   '{"Capacidad": "1 TB", "Interfaz": "PCIe 4.0 x4 NVMe", "Velocidad lectura": "Hasta 3,500 MB/s", "Formato": "M.2 2280", "Extras": "Perfil single-sided"}'::jsonb),
  ('hyperline-ssd-nvme-2tb-gen4', 'Kingston A400 240 GB SATA', 'kingston-a400-240gb', 'KINGSTON',
   'SSD 2.5 pulgadas SATA III de 240 GB: la forma más económica de revivir un equipo viejo en minutos.',
   99.00::numeric, 129::numeric, 50,
   '{"Capacidad": "240 GB", "Interfaz": "SATA III 2.5", "Velocidad lectura": "500 MB/s", "Velocidad escritura": "320 MB/s", "Extras": "Compatible con laptops y PCs"}'::jsonb),
  ('hyperline-ssd-portatil-1tb-usb-c', 'Toshiba Canvio Basics 2 TB', 'toshiba-canvio-basics-2tb', 'TOSHIBA',
   'Disco externo portátil de 2 TB con USB 3.2: respaldo y bibliotecas masivas sin fuente de alimentación.',
   489.00::numeric, 799::numeric, 15,
   '{"Capacidad": "2 TB", "Interfaz": "USB 3.2 Gen 1", "Formato": "2.5 pulgadas portátil", "Alimentación": "USB (sin fuente)", "Extras": "Compatible Win/Mac"}'::jsonb),
  ('hyperline-microsd-512-gb', 'SanDisk Ultra microSD 128 GB A1', 'sandisk-ultra-microsd-128gb', 'SANDISK',
   'MicroSDXC UHS-I A1 con 140 MB/s de lectura: para cámaras, celulares y consolas portátiles.',
   118.99::numeric, 180::numeric, 40,
   '{"Capacidad": "128 GB", "Velocidad lectura": "Hasta 140 MB/s", "Clasificación": "UHS-I A1 C10", "Incluye": "Adaptador SD"}'::jsonb),

  -- Accesorios
  ('technova-dockhub-11-en-1-usb-c', 'Hub USB-C 8 en 1 (HDMI, RJ45, PD 87 W)', 'hub-usbc-8-en-1', 'GENÉRICO',
   'Hub 8 en 1 USB-C con HDMI 4K, red RJ45, carga PD de 87 W passthrough, USB-A 3.0 y lectores SD/microSD.',
   29.90::numeric, 49::numeric, 25,
   '{"Puertos": "8 (HDMI 4K, RJ45, 2x USB-A, PD 87 W, SD, microSD, USB-C)", "Alimentación": "Passthrough 87 W", "Extras": "Plug & Play sin drivers"}'::jsonb),
  ('technova-webcam-pro-2k', 'Logitech BRIO 100 Webcam', 'logitech-brio-100-webcam', 'LOGITECH',
   'Webcam FHD 1080p con micrófono integrado con supresión de ruido: clases y reuniones claras sin complicación.',
   196.00::numeric, null::numeric, 14,
   '{"Resolución": "1080p a 30 fps", "FOV": "57 grados", "Micrófono": "Integrado con NR", "Montaje": "Clip universal + trípode", "Conectividad": "USB-A certificada"}'::jsonb),
  ('zenix-grafics-xl-gaming-mousepad', 'Mouse Pad Gamer RGB XL 80 x 30 cm', 'mousepad-rgb-xl-80x30', 'SEISA',
   'Mousepad XL con iluminación RGB de 14 modos, superficie microtexturada y base antideslizante.',
   38.90::numeric, 74::numeric, 60,
   '{"Tamaño": "800 x 300 x 4 mm", "Iluminación": "RGB 14 modos", "Superficie": "Microtexturizada", "Base": "Antideslizante de goma", "Extras": "Bordes reforzados, cable USB"}'::jsonb)
) as v(slug_viejo, name, slug, brand, description, price, compare_at_price, stock, specifications)
where p.slug = v.slug_viejo;

-- 4) seed_demo_sales regenerada con SKUs reales
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

  -- Pedido demo 1: monitor Odyssey G3 + mouse gamer
  with o as (
    insert into public.orders (order_number, user_id, email, status, payment_method,
      subtotal, discount_total, shipping_total, total, item_count, shipping)
    values (
      'INV-202603-DEMO1', p_user_id, v_email, 'delivered', 'demo_card',
      0, 0, 0, 0, 2,
      '{"full_name": "Pedido de demostración", "city": "Lima", "country": "Perú", "demo": "true"}'::jsonb
    )
    returning id
  ), i1 as (
    insert into public.order_items (order_id, product_id, product_name, brand, slug, image_url,
      unit_price, discount_percent, unit_price_final, quantity, line_total)
    select o.id, p.id, p.name, p.brand, p.slug,
      (select pi.url from public.product_images pi where pi.product_id = p.id order by pi.position limit 1),
      p.price, off.discount_percent, round(p.price * (100 - coalesce(off.discount_percent, 0)) / 100.0, 2),
      1, round(p.price * (100 - coalesce(off.discount_percent, 0)) / 100.0, 2)
    from o
    join public.products p on p.slug in ('samsung-odyssey-g3-g32b-27', 'logitech-g203-lightsync')
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
    shipping_total = 15,
    total = (select sum(line_total) from public.order_items where order_id = (select id from o)) + 15,
    item_count = (select sum(quantity) from public.order_items where order_id = (select id from o))
  where id = (select id from o);

  -- Pedido demo 2: SSD + TWS + mousepads
  with o2 as (
    insert into public.orders (order_number, user_id, email, status, payment_method,
      subtotal, discount_total, shipping_total, total, item_count, shipping)
    values (
      'INV-202604-DEMO2', p_user_id, v_email, 'shipped', 'transfer',
      0, 0, 0, 0, 6,
      '{"full_name": "Pedido de demostración", "city": "Arequipa", "country": "Perú", "demo": "true"}'::jsonb
    )
    returning id
  )
  insert into public.order_items (order_id, product_id, product_name, brand, slug, image_url,
    unit_price, discount_percent, unit_price_final, quantity, line_total)
  select o2.id, p.id, p.name, p.brand, p.slug,
    (select pi.url from public.product_images pi where pi.product_id = p.id order by pi.position limit 1),
    p.price, coalesce(off.discount_percent, 0), round(p.price * (100 - coalesce(off.discount_percent, 0)) / 100.0, 2),
    v.qty, round(p.price * (100 - coalesce(off.discount_percent, 0)) / 100.0, 2) * v.qty
  from (values ('kingston-nv2-1tb', 1), ('jbl-wave-buds-2', 1), ('mousepad-rgb-xl-80x30', 4)) as v(slug, qty)
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
  where orders.order_number in ('INV-202603-DEMO1', 'INV-202604-DEMO2');

  return 'Pedidos demostración creados (INV-202603-DEMO1, INV-202604-DEMO2).';
end;
$$;

revoke all on function public.seed_demo_sales(uuid) from public, anon;
grant execute on function public.seed_demo_sales(uuid) to authenticated, service_role;

-- 5) Re-crear los pedidos demo con el admin
do $$
declare
  v_uid uuid := (select id from public.profiles where email = 'admin@innovventas.demo');
begin
  if v_uid is not null then
    perform public.seed_demo_sales(v_uid);
  end if;
end $$;
