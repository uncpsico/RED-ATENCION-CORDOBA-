-- es_admin() solo la usan las políticas RLS: se mueve a un schema que no
-- expone la API REST, para que no se pueda llamar como /rpc/es_admin.
create schema if not exists privado;
revoke all on schema privado from public;
grant usage on schema privado to anon, authenticated;

create or replace function privado.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = (select auth.uid()));
$$;
revoke execute on function privado.es_admin() from public;
grant execute on function privado.es_admin() to anon, authenticated;

alter policy "categorias: leer activas"    on public.categorias    using (estado = 'activo' or (select privado.es_admin()));
alter policy "instituciones: leer activas" on public.instituciones using (estado = 'activo' or (select privado.es_admin()));
alter policy "urgencias: leer activas"     on public.urgencias     using (estado = 'activo' or (select privado.es_admin()));
alter policy "categorias: editar admin"    on public.categorias    using ((select privado.es_admin())) with check ((select privado.es_admin()));
alter policy "instituciones: editar admin" on public.instituciones using ((select privado.es_admin())) with check ((select privado.es_admin()));
alter policy "urgencias: editar admin"     on public.urgencias     using ((select privado.es_admin())) with check ((select privado.es_admin()));

create or replace function public.baja_categoria(p_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not privado.es_admin() then
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

drop function public.es_admin();
