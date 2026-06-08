-- Phase 2E service-role bootstrap grants.
-- Purpose: allow the server-only profile bootstrap helper to ensure the
-- authenticated current user's app profile and baseline user role.
-- Browser roles are intentionally not granted write access here.

begin;

grant select, insert, update on table public.profiles to service_role;
grant select, insert, update on table public.profile_roles to service_role;

commit;
