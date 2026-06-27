-- Dev-only feature snapshot materialization access.
-- Scope: service_role only. No anon or authenticated grants are changed.
-- RLS remains enabled; no browser-facing policies are added.

begin;

grant select, insert on table public.feature_snapshots to service_role;

commit;
