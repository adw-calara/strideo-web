-- Grant the service role the minimum audit-table permissions needed by the
-- Dev-only provider ingestion audit wrapper. This migration intentionally does
-- not grant anon/authenticated access or any provider data-table access.

begin;

grant insert, update on table public.job_runs to service_role;
grant select (id) on table public.job_runs to service_role;

grant insert on table public.agent_logs to service_role;
grant select (id) on table public.agent_logs to service_role;

commit;
