-- Dev-only racing-form coverage read access for model/result lineage tables.
-- Scope: service_role SELECT only. No anon or authenticated grants are changed.
-- RLS remains enabled; no browser-facing policies are added.

begin;

grant select on table
  public.model_versions,
  public.prediction_outputs,
  public.result_versions,
  public.result_entries
to service_role;

commit;
