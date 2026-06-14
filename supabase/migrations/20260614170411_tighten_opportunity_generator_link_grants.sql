-- Wave 3 Opportunity generator grant tightening.
-- Purpose: remove service_role update grants that are no longer needed after
-- replacing Opportunity child-link upserts with lookup-then-insert writes.
-- Scope: service_role only. No anon or authenticated grants are changed.

begin;

revoke update on table public.opportunity_subjects from service_role;
revoke update on table public.opportunity_strategy_matches from service_role;

commit;
