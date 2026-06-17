-- Provide a narrow service-role RPC for appending audit agent_logs rows.
-- Purpose: avoid fragile direct PostgREST inserts into the partitioned
-- public.agent_logs table while keeping the operation audit-only.
-- Scope: service_role execute only. No anon/authenticated execute access and
-- no provider data-table grants.

begin;

create function public.append_agent_log_for_service_role(
  p_job_run_id uuid,
  p_agent_key text,
  p_level text,
  p_message text,
  p_context jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if p_level not in ('info', 'warning', 'error') then
    raise exception 'Invalid agent log level: %', p_level
      using errcode = '22023';
  end if;

  insert into public.agent_logs (
    job_run_id,
    agent_key,
    level,
    message,
    context
  )
  values (
    p_job_run_id,
    p_agent_key,
    p_level::public.log_level,
    p_message,
    coalesce(p_context, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.append_agent_log_for_service_role(uuid, text, text, text, jsonb) is
  'Service-role-only RPC for appending audit agent_logs rows through PostgreSQL partition routing. Exists because direct PostgREST inserts into the partitioned parent remained blocked even after grants.';

revoke all on function public.append_agent_log_for_service_role(uuid, text, text, text, jsonb) from public;
revoke execute on function public.append_agent_log_for_service_role(uuid, text, text, text, jsonb) from anon;
revoke execute on function public.append_agent_log_for_service_role(uuid, text, text, text, jsonb) from authenticated;
grant execute on function public.append_agent_log_for_service_role(uuid, text, text, text, jsonb) to service_role;

commit;
