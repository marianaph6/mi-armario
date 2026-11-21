-- Esquema de Mi Armario en Supabase.
-- Pégalo completo en el SQL Editor del proyecto y ejecútalo. Se puede volver a ejecutar sin romper nada.
--
-- Cada fila pertenece a un usuario (user_id) y las reglas RLS hacen que nadie pueda leer
-- ni escribir datos de otra persona, aunque tenga la clave pública de la app.
-- `actualizado` lo pone el servidor y sirve para sincronizar: cada dispositivo pide lo que cambió desde su última vez.
-- `borrado` marca eliminaciones, para que los otros dispositivos también se enteren.

create table if not exists public.prendas (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  nombre text,
  categoria text not null,
  subtipo text,
  colores text[] not null default '{}',
  ocasiones text[] not null default '{}',
  clima text not null default 'todo',
  estado text not null default 'limpia',
  usos integer not null default 0,
  ultimo_uso timestamptz,
  creada timestamptz not null default now(),
  notas text,
  foto_path text,
  miniatura_path text,
  actualizado timestamptz not null default now(),
  borrado boolean not null default false
);

create table if not exists public.outfits (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  nombre text,
  prenda_ids uuid[] not null default '{}',
  ocasion text not null,
  favorito boolean not null default false,
  foto_look_path text,
  creado timestamptz not null default now(),
  ultimo_uso timestamptz,
  usos integer not null default 0,
  actualizado timestamptz not null default now(),
  borrado boolean not null default false
);

create table if not exists public.usos (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  fecha timestamptz not null,
  ocasion text not null,
  outfit_id uuid,
  prenda_ids uuid[] not null default '{}',
  marcadas_lavar uuid[] not null default '{}',
  actualizado timestamptz not null default now(),
  borrado boolean not null default false
);

create table if not exists public.deseos (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  descripcion text not null,
  categoria text not null,
  color text,
  foto_path text,
  nota text,
  actualizado timestamptz not null default now(),
  borrado boolean not null default false
);

-- El servidor marca la hora de cada cambio (no se confía en el reloj del teléfono).
create or replace function public.marcar_actualizado() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.actualizado := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['prendas', 'outfits', 'usos', 'deseos'] loop
    execute format('alter table public.%I enable row level security', t);
    -- Solo usuarios con sesión llegan a las tablas por la API; sin sesión (anon) no hay acceso.
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create index if not exists %I on public.%I (user_id, actualizado)', t || '_sync_idx', t);
    execute format('drop trigger if exists marcar_actualizado on public.%I', t);
    execute format('create trigger marcar_actualizado before insert or update on public.%I
                    for each row execute function public.marcar_actualizado()', t);
    execute format('drop policy if exists "solo sus datos" on public.%I', t);
    execute format('create policy "solo sus datos" on public.%I for all to authenticated
                    using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end;
$$;

-- Fotos: bucket privado. Cada usuario solo ve y escribe dentro de su carpeta <user_id>/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 2097152, array['image/jpeg', 'image/webp', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "fotos: solo su carpeta" on storage.objects;
create policy "fotos: solo su carpeta" on storage.objects for all to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Si al crear el proyecto se activó "Enable RLS on new tables automatically", Supabase crea la función
-- public.rls_auto_enable() para su disparador ensure_rls. Solo debe correr al crear tablas, no por la API.
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'rls_auto_enable') then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;
