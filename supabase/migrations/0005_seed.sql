-- ─────────────────────────────────────────────────────────────────────────────
-- InnovVentas · 0005 · DATOS DE DEMOSTRACIÓN (claramente identificados)
--
-- ⚠️  Los productos son DEMO para validar la app; no representan inventario real
--     y sus imágenes son placeholders públicos (placehold.co).
--     Marca y modelos son ficticios (TechNova, Zenix, Auroro, Hyperline).
--     Puedes eliminarlos con:
--       delete from public.products where brand in ('TechNova','Zenix','Auroro','Hyperline')
--       delete from public.categories where slug in (...); -- ver docs/01
-- Idempotente: se puede ejecutar varias veces.
-- ─────────────────────────────────────────────────────────────────────────────

-- ══════════════════════════════ CATEGORÍAS ═══════════════════════════════════════════════════
insert into public.categories (slug, name, description, icon, is_active)
values
  ('laptops',        'Laptops',        'Computadoras portátiles para trabajo, estudio y gaming', 'Laptop',     true),
  ('monitores',      'Monitores',      'Pantallas 4K, ultrawide y de alta frecuencia',           'Monitor',    true),
  ('teclados',       'Teclados',       'Mecánicos, compactos y de oficina',                      'Keyboard',   true),
  ('mouse',          'Mouse',          'Sensores de precisión y ergonomía',                      'Mouse',      true),
  ('audifonos',      'Audífonos',      'TWS, over-ear, deportivos y gamer',                      'Headphones', true),
  ('impresoras',     'Impresoras',     'Tinta, láser y multifuncionales para oficina',           'Printer',    true),
  ('almacenamiento', 'Almacenamiento', 'SSD NVMe, portátiles y tarjetas de memoria',             'HardDrive',  true),
  ('accesorios',     'Accesorios',     'Docks, cámaras y demás periféricos',                     'Cable',      true)
on conflict (slug) do nothing;

-- ════════════════════════════════ PRODUCTOS ═══════════════════════════════════════════════════
insert into public.products (category_id, name, slug, description, brand, price, compare_at_price, stock, specifications, status)
select c.id, v.name, v.slug, v.description, v.brand, v.price, v.compare_at_price, v.stock, v.specifications, v.status
from (values
  -- ── Laptops ──
  ('laptops', 'NovaBook Pro 14', 'novabook-pro-14',
   'Laptop ligera con pantalla 2.8K OLED de 90 Hz, procesador de última generación y disco NVMe de 1 TB.',
   'TechNova', 27499, 29999, 12,
   '{"Procesador": "Intel Core i7-13620H", "RAM": "16 GB DDR5", "Almacenamiento": "1 TB NVMe", "Pantalla": "14 pulgadas 2.8K OLED 90 Hz", "Gráficos": "Intel Iris Xe", "Sistema": "Windows 11 Pro", "Peso": "1.35 kg"}'::jsonb,
   'published'),
  ('laptops', 'NovaBook Air 13', 'novabook-air-13',
   'Ultraligera de 13 pulgadas con procesador eficiente y batería para todo el día. Ideal para estudios y oficina.',
   'TechNova', 19999, null::numeric, 8,
   '{"Procesador": "AMD Ryzen 5 7530U", "RAM": "16 GB LPDDR4x", "Almacenamiento": "512 GB NVMe", "Pantalla": "13.3 pulgadas FHD IPS", "Sistema": "Windows 11 Home", "Peso": "1.09 kg"}'::jsonb,
   'published'),
  ('laptops', 'Zenix Zero X15 Gaming', 'zenix-zero-x15-gaming',
   'Gaming con RTX 4060, pantalla de 165 Hz y refrigeración de doble ventilador. Lista para juegos exigentes.',
   'Zenix', 32999, 35999, 5,
   '{"Procesador": "Intel Core i7-13700H", "RAM": "16 GB DDR5", "Almacenamiento": "512 GB NVMe Gen4", "Pantalla": "15.6 pulgadas FHD 165 Hz", "Gráficos": "NVIDIA RTX 4060 8 GB", "Sistema": "Windows 11 Home", "Peso": "2.1 kg"}'::jsonb,
   'published'),
  ('laptops', 'Auroro Studio 16', 'auroro-studio-16',
   'Workstation portátil para creativos: pantalla calibrada 100% sRGB y 2 TB de almacenamiento.',
   'Auroro', 24999, null::numeric, 0,
   '{"Procesador": "AMD Ryzen 7 7840HS", "RAM": "32 GB DDR5", "Almacenamiento": "2 TB NVMe", "Pantalla": "16 pulgadas 3.2K 120 Hz", "Gráficos": "NVIDIA RTX 4050 6 GB", "Sistema": "Windows 11 Pro", "Peso": "1.9 kg"}'::jsonb,
   'published'),

  -- ── Monitores ──
  ('monitores', 'Hyperline UltraView 27 4K', 'hyperline-ultraview-27-4k',
   'Monitor 4K IPS con 99% sRGB y base ergonómica. Perfecto para diseño, oficina y contenido general.',
   'Hyperline', 6499, null::numeric, 15,
   '{"Tamaño": "27 pulgadas", "Resolución": "3840 x 2160 (4K UHD)", "Panel": "IPS", "Frecuencia": "60 Hz", "Conectividad": "2x HDMI 2.0, DisplayPort 1.4", "Ajustes": "Altura, inclinación y giro"}'::jsonb,
   'published'),
  ('monitores', 'Hyperline ProMotion 27 QHD', 'hyperline-promotion-27-qhd-165hz',
   'QHD de 165 Hz con 1 ms MPRT para gaming competitivo. Incluye brazo ajustable.',
   'Hyperline', 7299, 8499, 9,
   '{"Tamaño": "27 pulgadas", "Resolución": "2560 x 1440 (QHD)", "Panel": "IPS Fast", "Frecuencia": "165 Hz", "Tiempo de respuesta": "1 ms MPRT", "Frecuencia variable": "AdaptiveSync"}'::jsonb,
   'published'),
  ('monitores', 'TechNova CurveFlex 34 Ultrawide', 'technova-curveflex-34-ultrawide',
   'Ultrawide curvo 21:9 para multitarea extrema con USB-C de 90 W.',
   'TechNova', 9499, null::numeric, 4,
   '{"Tamaño": "34 pulgadas", "Resolución": "3440 x 1440", "Formato": "21:9 curvo 1500R", "Panel": "VA", "Frecuencia": "100 Hz", "USB-C": "Datos + 90 W PD"}'::jsonb,
   'published'),
  ('monitores', 'Hyperline OfficeView 24', 'hyperline-officeview-24',
   'Monitor de 24 pulgadas FHD con filtro de luz azul certificado.',
   'Hyperline', 2899, null::numeric, 21,
   '{"Tamaño": "24 pulgadas", "Resolución": "1920 x 1080", "Panel": "IPS", "Frecuencia": "75 Hz", "VESA": "100x100 mm"}'::jsonb,
   'published'),

  -- ── Teclados ──
  ('teclados', 'Zenix K75 Pro Mecánico', 'zenix-k75-pro-mecanico',
   'Mecánico 75% con hot-swap, RGB por tecla y conectividad triple.',
   'Zenix', 2199, null::numeric, 18,
   '{"Formato": "75% (82 teclas)", "Switches": "Lineales Silent (hot-swap)", "Retroiluminación": "RGB por tecla", "Conectividad": "USB-C, 2.4 GHz, Bluetooth", "Batería": "4,000 mAh", "Keycaps": "PBT doble-shot"}'::jsonb,
   'published'),
  ('teclados', 'Zenix K60 TKL', 'zenix-k60-tkl',
   'Tenkeyless compacto con switches táctiles y reposamuñecas integrado.',
   'Zenix', 1349, null::numeric, 25,
   '{"Formato": "TKL (87 teclas)", "Switches": "Táctiles Brown", "Retroiluminación": "RGB de onda", "Incluye": "Reposamuñecas magnético"}'::jsonb,
   'published'),
  ('teclados', 'Zenix K30 Oficina', 'zenix-k30-oficina',
   'Teclado de membrana silencioso con atajos multimedia y patas ajustables.',
   'Zenix', 549, null::numeric, 40,
   '{"Formato": "Completo (104 teclas)", "Switches": "Membrana silenciosa", "Retroiluminación": "No", "Cable": "USB-A 1.8 m"}'::jsonb,
   'published'),

  -- ── Mouse ──
  ('mouse', 'Zenix M85R Inalámbrico Gaming', 'zenix-m85r-inalambrico-gaming',
   'Sensor de 26,000 DPI con peso ultra bajo (<70 g) y batería de 80 horas de uso.',
   'Zenix', 999, 1199, 22,
   '{"Sensor": "26,000 DPI", "Peso": "68 g", "Conectividad": "2.4 GHz, Bluetooth, USB-C", "Batería": "80 h", "Botones": "6 programables"}'::jsonb,
   'published'),
  ('mouse', 'Zenix M20 Oficina Silencioso', 'zenix-m20-oficina-silencioso',
   'Clicks silenciosos certificados (<25 dB) ideal para espacios compartidos.',
   'Zenix', 349, null::numeric, 50,
   '{"Sensor": "4,000 DPI", "Clicks": "Silenciosos certificados", "Conectividad": "USB receptor 2.4 GHz", "Batería": "1 AAA incluida"}'::jsonb,
   'published'),
  ('mouse', 'Hyperline VPanel Ergonómico', 'hyperline-vpanel-ergonomico',
   'Diseño vertical para reducir el estrés del túnel carpiano en jornadas largas.',
   'Hyperline', 799, null::numeric, 10,
   '{"Formato": "Vertical", "Inclinación": "57 grados", "DPI": "800–4000", "Conectividad": "USB-C con cable retráctil"}'::jsonb,
   'published'),

  -- ── Audífonos ──
  ('audifonos', 'Auroro Air X3 TWS ANC', 'auroro-air-x3-tws-anc',
   'TWS con cancelación activa adaptativa de 42 dB y 32 horas con estuche.',
   'Auroro', 2299, 2799, 30,
   '{"Formato": "TWS", "Cancelación activa": "Hasta 42 dB adaptativa", "Batería": "8 h + 24 h estuche", "Bluetooth": "5.3 multipunto", "Resistencia": "IPX5"}'::jsonb,
   'published'),
  ('audifonos', 'Auroro Studio Over-Ear ANC', 'auroro-studio-over-ear-anc',
   'Over-ear con drivers de 40 mm, certificado Hi-Res Audio y 60 horas con ANC activo.',
   'Auroro', 3999, null::numeric, 12,
   '{"Formato": "Over-ear cerrado", "Cancelación activa": "Adaptativa", "Batería": "60 h (con ANC)", "Códec": "LDAC, AAC, SBC", "Extras": "Funda rígida incluida"}'::jsonb,
   'published'),
  ('audifonos', 'Auroro Fit Sport IPX7', 'auroro-fit-sport-ipx7',
   'In-ear IPX7 con gancho deportivo y soporte para lecturas de ritmo cardíaco.',
   'Auroro', 999, null::numeric, 35,
   '{"Formato": "In-ear con gancho", "Resistencia": "IPX7", "Batería": "10 h + 20 h estuche", "Extras": "Sensor de ritmo cardíaco"}'::jsonb,
   'published'),
  ('audifonos', 'Auroro Gamer HS7 7.1', 'auroro-gamer-hs7-7-1',
   'Gamer con micrófono desmontable, audio 7.1 virtual y control en línea.',
   'Auroro', 1599, null::numeric, 16,
   '{"Formato": "Over-ear gamer", "Audio": "7.1 virtual", "Micrófono": "Desmontable con LED", "Conectividad": "USB-A", "Extras": "Control de volumen en línea"}'::jsonb,
   'published'),

  -- ── Impresoras ──
  ('impresoras', 'TechNova InkJet ImprimePlus 4-en-1', 'technova-inkjet-imprimeplus-4-en-1',
   'Impresora 4-en-1 con dúplex automático, ADF de 35 hojas y red dual-band.',
   'TechNova', 3299, null::numeric, 14,
   '{"Funciones": "Impresión, copia, escaneo, fax", "Velocidad": "22 ipm", "Dúplex": "Automático", "Conectividad": "WiFi, Ethernet, USB", "ADF": "35 hojas"}'::jsonb,
   'published'),
  ('impresoras', 'TechNova Laser Mono L215', 'technova-laser-mono-l215',
   'Láser monocromático de hasta 5,000 páginas por tóner para oficinas de alto volumen.',
   'TechNova', 4499, null::numeric, 7,
   '{"Tecnología": "Láser monocromático", "Velocidad": "34 ppm", "Rendimiento tóner": "5,000 páginas", "Dúplex": "Manual"}'::jsonb,
   'published'),

  -- ── Almacenamiento ──
  ('almacenamiento', 'Hyperline SSD NVMe 1 TB Gen4', 'hyperline-ssd-nvme-1tb-gen4',
   'SSD NVMe PCIe Gen4 con velocidades de 5,000 MB/s y disipador incluido.',
   'Hyperline', 1899, 2199, 45,
   '{"Capacidad": "1 TB", "Interfaz": "PCIe Gen4 x4 NVMe", "Velocidad lectura": "5,000 MB/s", "Velocidad escritura": "4,200 MB/s", "Endurance": "600 TBW"}'::jsonb,
   'published'),
  ('almacenamiento', 'Hyperline SSD NVMe 2 TB Gen4', 'hyperline-ssd-nvme-2tb-gen4',
   '2 TB PCIe Gen4 para bibliotecas de juegos AAA y renderizado.',
   'Hyperline', 3299, null::numeric, 28,
   '{"Capacidad": "2 TB", "Interfaz": "PCIe Gen4 x4 NVMe", "Velocidad lectura": "7,000 MB/s", "Velocidad escritura": "5,800 MB/s", "Endurance": "1,400 TBW"}'::jsonb,
   'published'),
  ('almacenamiento', 'Hyperline SSD Portátil 1 TB USB-C', 'hyperline-ssd-portatil-1tb-usb-c',
   'SSD de 1 TB con carcasa de aluminio, certificación IP55 y cifrado AES-256 por hardware.',
   'Hyperline', 2199, null::numeric, 33,
   '{"Capacidad": "1 TB", "Interfaz": "USB 10 Gbps Type-C", "Resistencia": "Carcasa IP55", "Cifrado": "AES-256 hardware", "Peso": "88 g"}'::jsonb,
   'published'),
  ('almacenamiento', 'Hyperline MicroSD 512 GB', 'hyperline-microsd-512-gb',
   'MicroSDXC UHS-I V30 con adaptador, ideal para cámaras y consolas.',
   'Hyperline', 1099, null::numeric, 60,
   '{"Capacidad": "512 GB", "Velocidad lectura": "100 MB/s", "Clase": "UHS-I V30 A2", "Incluye": "Adaptador SD"}'::jsonb,
   'published'),

  -- ── Accesorios ──
  ('accesorios', 'TechNova DockHub 11-en-1 USB-C', 'technova-dockhub-11-en-1-usb-c',
   'Hub de 11 puertos con doble HDMI 4K, red de 1 Gbps y carga de 100 W passthrough.',
   'TechNova', 2799, null::numeric, 11,
   '{"Puertos": "11 (2x HDMI, 3x USB-A, 1x USB-C, Ethernet, SD, microSD, Audio, DP)", "Carga": "100 W passthrough", "Red": "1 Gbps", "Compatibilidad": "Thunderbolt 4 y USB4"}'::jsonb,
   'published'),
  ('accesorios', 'TechNova Webcam Pro 2K', 'technova-webcam-pro-2k',
   'Webcam QHD de 60 fps con autofoco rápido, obturador físico y doble micrófono con supresión de ruido.',
   'TechNova', 1299, null::numeric, 19,
   '{"Resolución": "2560 x 1440 a 60 fps", "Enfoque": "Autofoco rápido", "Obturador": "Físico", "Micrófonos": "Dobles con NR", "Montaje": "Clip + rosca de trípode"}'::jsonb,
   'published'),
  ('accesorios', 'Zenix Grafics XL Gaming Mousepad', 'zenix-grafics-xl-gaming-mousepad',
   'Mousepad XL de 900 x 400 mm con superficie de microfibra y base antideslizante.',
   'Zenix', 499, null::numeric, 65,
   '{"Tamaño": "900 x 400 x 4 mm", "Superficie": "Microtexturizada", "Base": "Gel antideslizante", "Bordes": "Cosecidos reforzados"}'::jsonb,
   'published')
) as v(category_slug, name, slug, description, brand, price, compare_at_price, stock, specifications, status)
join public.categories c on c.slug = v.category_slug
on conflict (slug) do nothing;

-- ════════════════════ IMÁGENES DEMOSTRATIVAS (placeholders reales) ═══════════════════
-- URLs reales del servicio placehold.co, identificadas como demostrativas en docs/.
insert into public.product_images (product_id, url, alt, position, is_primary)
select
  p.id,
  'https://placehold.co/900x600/0f172a/38bdf8.png?text=' || replace(upper(p.name), ' ', '+'),
  'Imagen demostrativa de ' || p.name,
  0,
  true
from public.products p
where not exists (select 1 from public.product_images pi where pi.product_id = p.id);

-- ═══════════════════════════════════ OFERTAS ═══════════════════════════════════════════════
-- Fechas relativas a la ejecución (now()) para mantener vigencia en demostración.
insert into public.offers (product_id, discount_percent, starts_at, ends_at, is_active)
select ids.id, v.discount, now() - interval '2 days', now() + v.duration, true
from (values
  ('novabook-pro-14', 12, interval '30 days'),
  ('hyperline-promotion-27-qhd-165hz', 15, interval '10 days'),
  ('hyperline-ssd-nvme-1tb-gen4', 25, interval '21 days'),
  ('auroro-air-x3-tws-anc', 12, interval '30 days'),
  ('zenix-m85r-inalambrico-gaming', 10, interval '14 days'),
  ('technova-webcam-pro-2k', 18, interval '7 days')
) as v(slug, discount, duration)
join (select id, slug from public.products) ids on ids.slug = v.slug
where not exists (
  select 1 from public.offers o
  where o.product_id = ids.id and o.ends_at > now()
);
