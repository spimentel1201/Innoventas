-- ─────────────────────────────────────────────────────────────────────────────
-- InnovVentas · 0001 · Esquema base
-- Ejecutar en el editor SQL de Supabase, en orden: 0001 → 0002 → 0003 → 0004 → 0005
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

-- ═══════════════════════════════ PERFIL ═══════════════════════════════
-- El rol NUNCA se define desde el cliente; se promueve por SQL con permisos de
-- administrador de la BD y se valida en servidor (RLS + Edge Functions).
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text not null,
  full_name    text not null default '',
  phone        text,
  role         text not null default 'customer' check (role in ('customer', 'admin')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ═══════════════════════════ CATEGORÍAS ═════════════════════════════════
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text not null default '',
  icon        text not null default 'Package',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ══════════════════════════════ PRODUCTOS ═══════════════════════════════
create table public.products (
  id                uuid primary key default gen_random_uuid(),
  category_id       uuid not null references public.categories (id) on delete restrict,
  name              text not null,
  slug              text not null unique,
  description       text not null default '',
  brand             text not null,
  price             numeric(10, 2) not null check (price >= 0),
  compare_at_price  numeric(10, 2) check (compare_at_price is null or compare_at_price >= 0),
  stock             integer not null default 0 check (stock >= 0),
  specifications    jsonb not null default '{}'::jsonb,
  status            text not null default 'draft' check (status in ('draft', 'published')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index products_category_idx   on public.products (category_id);
create index products_status_idx     on public.products (status);
create index products_brand_idx      on public.products (brand);
create index products_price_idx      on public.products (price);
create index products_created_idx    on public.products (created_at desc);

create table public.product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  url         text not null,
  alt         text not null default '',
  position    integer not null default 0,
  is_primary  boolean not null default false,
  created_at  timestamptz not null default now()
);

create index product_images_product_idx on public.product_images (product_id);

-- ═════════════════════════════════ OFERTAS ═════════════════════════════════════
-- Vigencia explícita por fechas; el precio efectivo se calcula en servidor.
create table public.offers (
  id                uuid primary key default gen_random_uuid(),
  product_id        uuid not null references public.products (id) on delete cascade,
  discount_percent  integer not null check (discount_percent between 1 and 90),
  starts_at         timestamptz not null,
  ends_at           timestamptz not null,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now()
);

create index offers_product_idx on public.offers (product_id);
create index offers_window_idx  on public.offers (starts_at, ends_at);

-- ═══════════════════════ CARITO PERSISTENTE ══════════════════════════
create table public.cart_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  product_id  uuid not null references public.products (id) on delete cascade,
  quantity    integer not null check (quantity between 1 and 99),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, product_id)
);

create index cart_items_user_idx on public.cart_items (user_id);

-- ═════════════════════════════════ PEDIDOS ═════════════════════════════════════
-- Se crean EXCLUSIVAMENTE vía Edge Function create-order + RPC place_order.
-- El total, descuentos y stock se recalculan SIEMPRE en el servidor.
create sequence public.order_number_seq start 1;

create table public.orders (
  id              uuid primary key default gen_random_uuid(),
  order_number    text not null unique,
  user_id         uuid not null references auth.users (id) on delete cascade,
  email           text not null,
  status          text not null default 'pending'
                    check (status in ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled')),
  payment_method  text not null check (payment_method in ('transfer', 'cod', 'demo_card')),
  subtotal        numeric(12, 2) not null check (subtotal >= 0),
  discount_total  numeric(12, 2) not null default 0 check (discount_total >= 0),
  shipping_total  numeric(12, 2) not null default 0 check (shipping_total >= 0),
  total           numeric(12, 2) not null check (total >= 0),
  item_count      integer not null default 0 check (item_count > 0),
  shipping        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index orders_user_idx     on public.orders (user_id);
create index orders_status_idx   on public.orders (status);
create index orders_created_idx  on public.orders (created_at desc);

-- Copia inmutable de cada producto al momento de la compra (detalle histórico).
create table public.order_items (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references public.orders (id) on delete cascade,
  product_id        uuid references public.products (id) on delete set null,
  product_name      text not null,
  brand             text not null,
  slug              text not null,
  image_url         text,
  unit_price        numeric(10, 2) not null,
  discount_percent  numeric(5, 2) not null default 0,
  unit_price_final  numeric(10, 2) not null,
  quantity          integer not null check (quantity > 0),
  line_total        numeric(12, 2) not null,
  created_at        timestamptz not null default now()
);

create index order_items_order_idx on public.order_items (order_id);

-- ═══════════════════════════════ CHATBOT ═══════════════════════════════
create table public.chat_conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete set null,
  session_id  text not null,
  status      text not null default 'open' check (status in ('open', 'resolved', 'handoff')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index chat_conversations_session_idx on public.chat_conversations (session_id);

create table public.chat_messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.chat_conversations (id) on delete cascade,
  role             text not null check (role in ('user', 'assistant', 'system')),
  content          text not null,
  confidence       numeric(4, 3) check (confidence is null or (confidence between 0 and 1)),
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);

create index chat_messages_conversation_idx on public.chat_messages (conversation_id, created_at);

create table public.chat_events (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid references public.chat_conversations (id) on delete set null,
  user_id          uuid references auth.users (id) on delete set null,
  session_id       text,
  event_type       text not null check (event_type in ('message_sent', 'answer_shown', 'fallback', 'handoff_requested', 'feedback')),
  payload          jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);

create index chat_events_type_idx on public.chat_events (event_type, created_at desc);

-- ═══════════════════════ SISTEMA DE SOPORTE ═════════════════════════
create table public.support_requests (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text not null,
  subject      text not null,
  message      text not null,
  attachments  jsonb not null default '[]'::jsonb,
  status       text not null default 'open' check (status in ('open', 'answered', 'closed')),
  admin_notes  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index support_requests_status_idx on public.support_requests (status, created_at desc);

-- ════════════════════════ TRIGGERS + HELPERS ═════════════════════════════
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at    before update on public.profiles        for each row execute function public.set_updated_at();
create trigger trg_categories_updated_at  before update on public.categories      for each row execute function public.set_updated_at();
create trigger trg_products_updated_at    before update on public.products        for each row execute function public.set_updated_at();
create trigger trg_cart_items_updated_at  before update on public.cart_items      for each row execute function public.set_updated_at();
create trigger trg_orders_updated_at      before update on public.orders          for each row execute function public.set_updated_at();
create trigger trg_support_updated_at     before update on public.support_requests for each row execute function public.set_updated_at();
create trigger trg_chat_conversations_updated_at before update on public.chat_conversations for each row execute function public.set_updated_at();

-- Perfil automático al registrarse
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1)),
    'customer'
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Guarda: un cliente no puede auto-elevarse a admin. Solo service role (SDK admin)
-- u otro admin pueden modificar el rol.
create or replace function public.prevent_role_elevation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if auth.uid() is null then
      -- service_role / admin de la base: permitido
      return new;
    end if;
    if not public.is_admin() then
      raise exception 'ROLE_CHANGE_NOT_ALLOWED: el rol no puede modificarse desde el cliente';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_profiles_role_guard
  before update of role on public.profiles
  for each row execute function public.prevent_role_elevation();

-- Consulta de "soy admin" usable por políticas y triggers
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
$$;

-- ═══════════════════════════════ GRANTS ═══════════════════════════════
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to anon;
grant all on all tables in schema public to service_role;
grant usage on sequence public.order_number_seq to service_role;
