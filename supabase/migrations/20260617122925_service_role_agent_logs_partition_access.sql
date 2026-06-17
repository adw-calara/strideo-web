-- Grant the service role the minimum permissions needed to insert audit logs
-- into the current default partition used by public.agent_logs. This keeps the
-- scope to the audit log partition only and does not grant anon/authenticated
-- access or provider data-table access.

begin;

grant insert on table public.agent_logs_default to service_role;
grant select (id) on table public.agent_logs_default to service_role;

commit;
