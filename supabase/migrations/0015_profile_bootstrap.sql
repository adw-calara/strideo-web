-- Phase 2C migration design: profile and baseline role bootstrap.
-- Purpose: create a trusted app profile and baseline user role whenever a
-- Supabase Auth user is created, without granting browser clients role writes.
-- Dependencies: 0002 extensions/types, 0007 profile tables, 0010/0014 RLS.
-- Execution note: trigger/function only plus idempotent backfill. Do not add
-- browser insert/update policies or broaden RLS in this phase.

begin;

-- Keep bootstrap logic in the private schema so it is not exposed as a public
-- Data API RPC surface. The trigger uses a SECURITY DEFINER function because
-- public.profiles and public.profile_roles do not have browser insert policies.
create or replace function private.bootstrap_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  bootstrap_display_name text;
begin
  -- Auth metadata is optional display data only. Never use it for
  -- authorization or role assignment.
  bootstrap_display_name := nullif(
    btrim(
      coalesce(
        new.raw_user_meta_data ->> 'full_name',
        new.raw_user_meta_data ->> 'name',
        ''
      )
    ),
    ''
  );

  insert into public.profiles (user_id, email, display_name)
  values (new.id, new.email, bootstrap_display_name)
  on conflict (user_id) do nothing;

  -- Assign only the baseline user role. Operator/admin roles remain a
  -- separate server-owned process and must never be inferred from metadata.
  insert into public.profile_roles (user_id, role)
  values (new.id, 'user'::public.profile_role)
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

comment on function private.bootstrap_new_user_profile() is
  'Creates a baseline Strideo profile and user role for new auth users. Does not assign operator/admin roles.';

revoke execute on function private.bootstrap_new_user_profile() from public;
revoke execute on function private.bootstrap_new_user_profile() from anon;
revoke execute on function private.bootstrap_new_user_profile() from authenticated;

drop trigger if exists on_auth_user_created_bootstrap_profile on auth.users;

create trigger on_auth_user_created_bootstrap_profile
  after insert on auth.users
  for each row execute function private.bootstrap_new_user_profile();

comment on trigger on_auth_user_created_bootstrap_profile on auth.users is
  'Bootstraps public.profiles and baseline public.profile_roles rows for new Strideo auth users.';

-- Backfill existing auth users once, idempotently. This brings already-created
-- Dev users onto the same baseline as future signups while preserving any
-- existing profiles or roles.
insert into public.profiles (user_id, email, display_name)
select
  users.id,
  users.email,
  nullif(
    btrim(
      coalesce(
        users.raw_user_meta_data ->> 'full_name',
        users.raw_user_meta_data ->> 'name',
        ''
      )
    ),
    ''
  )
from auth.users
on conflict (user_id) do nothing;

insert into public.profile_roles (user_id, role)
select users.id, 'user'::public.profile_role
from auth.users
on conflict (user_id, role) do nothing;

commit;
