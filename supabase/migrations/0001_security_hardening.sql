begin;

-- Remove broad automatic grants on future public objects. Application migrations
-- must grant anon/authenticated access intentionally after RLS and policies exist.
alter default privileges for role postgres in schema public
  revoke all on tables from anon;
alter default privileges for role postgres in schema public
  revoke all on tables from authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon;
alter default privileges for role postgres in schema public
  revoke all on sequences from authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon;
alter default privileges for role postgres in schema public
  revoke execute on functions from authenticated;

do $$
begin
  if pg_has_role(current_user, 'supabase_admin', 'usage') then
    alter default privileges for role supabase_admin in schema public
      revoke all on tables from anon;
    alter default privileges for role supabase_admin in schema public
      revoke all on tables from authenticated;
    alter default privileges for role supabase_admin in schema public
      revoke all on sequences from anon;
    alter default privileges for role supabase_admin in schema public
      revoke all on sequences from authenticated;
    alter default privileges for role supabase_admin in schema public
      revoke execute on functions from anon;
    alter default privileges for role supabase_admin in schema public
      revoke execute on functions from authenticated;
  else
    raise notice 'Skipping supabase_admin default privileges: % is not a member of supabase_admin', current_user;
  end if;
end;
$$;

-- public.rls_auto_enable() is a privileged SECURITY DEFINER helper for the
-- ensure_rls event trigger. It should not be callable through Data API RPC.
revoke execute on function public.rls_auto_enable() from public;
revoke execute on function public.rls_auto_enable() from anon;
revoke execute on function public.rls_auto_enable() from authenticated;
grant execute on function public.rls_auto_enable() to postgres;
grant execute on function public.rls_auto_enable() to service_role;

commit;
