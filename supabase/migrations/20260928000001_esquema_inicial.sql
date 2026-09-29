-- =====================================================================
-- Red de Atención Córdoba — esquema inicial
-- Cualquiera puede ver y agregar. Solo quienes están en `admins`
-- pueden editar o dar de baja (baja lógica: estado = 'baja').
-- =====================================================================

-- ---------- admins ----------
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = (select auth.uid()));
$$;

-- ---------- categorías ----------
create table public.categorias (
  id          text primary key check (id ~ '^[a-z0-9]{1,40}$'),
  nombre      text not null check (char_length(nombre) between 1 and 40),
  emoji       text not null default '📍' check (char_length(emoji) between 1 and 16),
  color       text not null default '#9e9791' check (color ~* '^#[0-9a-f]{6}$'),
  orden       int  not null default 100,
  estado      text not null default 'activo' check (estado in ('activo', 'baja')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- instituciones ----------
create table public.instituciones (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null check (char_length(nombre) between 1 and 120),
  categoria_id  text not null default 'otro' references public.categorias (id),
  direccion     text not null check (char_length(direccion) between 1 and 200),
  telefono      text not null default '' check (char_length(telefono) <= 80),
  horario       text not null default '' check (char_length(horario) <= 100),
  contacto      text not null default '' check (char_length(contacto) <= 120),
  servicios     text not null default '' check (char_length(servicios) <= 1000),
  -- caja de la provincia de Córdoba
  lat           double precision not null check (lat between -35.1 and -29.4),
  lng           double precision not null check (lng between -65.9 and -61.7),
  estado        text not null default 'activo' check (estado in ('activo', 'baja')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index instituciones_categoria_idx on public.instituciones (categoria_id);

-- ---------- urgencias ----------
create table public.urgencias (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null check (char_length(nombre) between 1 and 60),
  numero        text not null check (char_length(numero) <= 30
                                     and char_length(regexp_replace(numero, '\D', '', 'g')) between 3 and 15),
  descripcion   text not null default '' check (char_length(descripcion) <= 80),
  categoria_id  text not null default 'otro' references public.categorias (id),
  -- líneas oficiales que se muestran arriba (911, 144, …)
  es_fija       boolean not null default false,
  estilo        text check (estilo in ('principal', 'tarjeta', 'mini')),
  color         text check (color ~* '^#[0-9a-f]{6}$'),
  orden         int not null default 100,
  estado        text not null default 'activo' check (estado in ('activo', 'baja')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index urgencias_categoria_idx on public.urgencias (categoria_id);

-- ---------- updated_at ----------
create or replace function public.tocar_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger categorias_updated_at    before update on public.categorias    for each row execute function public.tocar_updated_at();
create trigger instituciones_updated_at before update on public.instituciones for each row execute function public.tocar_updated_at();
create trigger urgencias_updated_at     before update on public.urgencias     for each row execute function public.tocar_updated_at();

-- ---------- señal de cambios para Realtime ----------
-- Realtime respeta RLS: cuando una fila pasa a 'baja' deja de ser visible
-- y ese evento no les llegaría a los visitantes. Por eso cada cambio
-- incrementa este contador público y los clientes recargan los datos.
create table public.sync_version (
  id          int primary key default 1 check (id = 1),
  version     bigint not null default 0,
  updated_at  timestamptz not null default now()
);
insert into public.sync_version (id, version) values (1, 0);

create or replace function public.incrementar_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.sync_version set version = version + 1, updated_at = now() where id = 1;
  return null;
end;
$$;

create trigger categorias_version    after insert or update on public.categorias    for each statement execute function public.incrementar_version();
create trigger instituciones_version after insert or update on public.instituciones for each statement execute function public.incrementar_version();
create trigger urgencias_version     after insert or update on public.urgencias     for each statement execute function public.incrementar_version();

-- ---------- baja de categoría (atómica, solo admin) ----------
-- Sus lugares y números pasan a "Otro".
create or replace function public.baja_categoria(p_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede eliminar categorías' using errcode = '42501';
  end if;
  if p_id = 'otro' then
    raise exception 'La categoría "Otro" no se puede eliminar' using errcode = '22023';
  end if;
  update public.instituciones set categoria_id = 'otro' where categoria_id = p_id;
  update public.urgencias     set categoria_id = 'otro' where categoria_id = p_id;
  update public.categorias    set estado = 'baja'       where id = p_id;
end;
$$;

-- ---------- permisos y RLS ----------
alter table public.admins        enable row level security;
alter table public.categorias    enable row level security;
alter table public.instituciones enable row level security;
alter table public.urgencias     enable row level security;
alter table public.sync_version  enable row level security;

revoke all on public.admins, public.categorias, public.instituciones, public.urgencias, public.sync_version from anon, authenticated;
grant select, insert on public.categorias, public.instituciones, public.urgencias to anon;
grant select, insert, update on public.categorias, public.instituciones, public.urgencias to authenticated;
grant select on public.sync_version to anon, authenticated;
grant select on public.admins to authenticated;

revoke execute on function public.baja_categoria(text) from public, anon;
grant execute on function public.baja_categoria(text) to authenticated;
revoke execute on function public.incrementar_version() from public, anon, authenticated;
revoke execute on function public.tocar_updated_at() from public, anon, authenticated;

-- admins: cada usuario puede ver solo si él mismo es admin
create policy "admins: ver la propia fila" on public.admins
  for select to authenticated using (user_id = (select auth.uid()));

-- lectura pública de lo activo; los admins ven todo
create policy "categorias: leer activas"    on public.categorias    for select to anon, authenticated using (estado = 'activo' or (select public.es_admin()));
create policy "instituciones: leer activas" on public.instituciones for select to anon, authenticated using (estado = 'activo' or (select public.es_admin()));
create policy "urgencias: leer activas"     on public.urgencias     for select to anon, authenticated using (estado = 'activo' or (select public.es_admin()));
create policy "sync_version: leer"          on public.sync_version  for select to anon, authenticated using (true);

-- alta pública: siempre activa; nadie crea líneas "oficiales" desde la web
create policy "categorias: alta pública"    on public.categorias    for insert to anon, authenticated with check (estado = 'activo');
create policy "instituciones: alta pública" on public.instituciones for insert to anon, authenticated with check (estado = 'activo');
create policy "urgencias: alta pública"     on public.urgencias     for insert to anon, authenticated
  with check (estado = 'activo' and es_fija = false and estilo is null and color is null);

-- edición y baja: solo admins
create policy "categorias: editar admin"    on public.categorias    for update to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));
create policy "instituciones: editar admin" on public.instituciones for update to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));
create policy "urgencias: editar admin"     on public.urgencias     for update to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));

-- ---------- Realtime ----------
alter publication supabase_realtime add table public.sync_version;
