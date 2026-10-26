-- ─────────────────────────────────────────────────────────────────────────────
-- InnovVentas · 0004 · Buckets de Storage y políticas
-- ─────────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 3145728,
   array['image/png', 'image/jpeg', 'image/webp']),
  ('store-banners', 'store-banners', true, 5242880,
   array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('support-attachments', 'support-attachments', false, 2621440,
   array['image/png', 'image/jpeg', 'image/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ── product-images: lectura pública (imágenes del catálogo), escritura admin ──
drop policy if exists "product-images: lectura pública"         on storage.objects;
drop policy if exists "product-images: escritura admin"          on storage.objects;
drop policy if exists "product-images: eliminación admin"        on storage.objects;

create policy "product-images: lectura pública"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "product-images: escritura admin"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = 'products'
    and public.is_admin()
  );

create policy "product-images: actualización admin"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

create policy "product-images: eliminación admin"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

-- ── store-banners: lectura pública, escritura admin ──
create policy "store-banners: lectura pública"
  on storage.objects for select
  using (bucket_id = 'store-banners');

create policy "store-banners: escritura admin"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'store-banners' and public.is_admin());

create policy "store-banners: eliminación admin"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'store-banners' and public.is_admin());

-- ── support-attachments: archivos PRIVADOS (URLs firmadas); cada usuario
--    gestiona solo su carpeta; admins ven todo. Los clientes no pueden
--    listar archivos de otros.
create policy "support-attachments: escritura propia autenticada"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'support-attachments'
    and (storage.foldername(name))[1] = 'attachments'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "support-attachments: lectura propia/admin"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'support-attachments'
    and (
      (storage.foldername(name))[2] = auth.uid()::text
      or public.is_admin()
    )
  );

create policy "support-attachments: eliminación propia/admin"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'support-attachments'
    and (
      (storage.foldername(name))[2] = auth.uid()::text
      or public.is_admin()
    )
  );
