-- Dev-only model/prediction lineage insert grants.
-- Scope: service_role INSERT only for the next separately authorized
-- materialization prerequisite. No browser grants, RLS policies, update/delete
-- privileges, materialization scripts, scoring, or Opportunity writes.

begin;

grant insert on table public.model_versions to service_role;
grant insert on table public.prediction_outputs to service_role;

commit;
