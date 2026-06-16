-- Race-entry service-role write access.
-- Purpose: allow the server-only provider race-entry persistence executor to
-- upsert the exact canonical race_entries fields it owns, and allow the Dev
-- runtime verification harness to clean up its deterministic fixture row.
-- Scope: service_role only. No anon or authenticated grants are changed.
-- RLS remains enabled; no browser-facing write policies are added.

begin;

-- Existing service_role SELECT on race_entries is preserved. PostgREST upsert
-- requires table-level INSERT/UPDATE privileges for this endpoint; column-level
-- grants alone return "permission denied for table race_entries".
grant insert, update on table public.race_entries to service_role;

-- PR #71's Dev-only verification harness deletes exactly one deterministic
-- fixture identity after proving upsert/readback/idempotency. No user-facing
-- role receives delete access.
grant delete on table public.race_entries to service_role;

commit;
