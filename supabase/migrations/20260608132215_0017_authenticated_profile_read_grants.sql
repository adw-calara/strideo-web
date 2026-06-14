-- Phase 2E authenticated profile read grants.
-- Purpose: allow authenticated SSR clients to read their own profile and
-- baseline role through existing owner-scoped RLS policies.
-- Browser write access is intentionally not granted here.

begin;

grant select on table public.profiles to authenticated;
grant select on table public.profile_roles to authenticated;

commit;
