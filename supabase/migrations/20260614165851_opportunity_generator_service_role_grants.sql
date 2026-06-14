-- Wave 3 Opportunity generator service-role grants.
-- Purpose: allow the server-only demo Opportunity generator to read the race
-- facts it scores and write only the strategy/Opportunity records it owns.
-- Scope: service_role only. No anon or authenticated grants are changed.

begin;

-- Dry-run and write mode race/reference reads.
grant select on table
  public.races,
  public.race_entries,
  public.odds_snapshots,
  public.tracks,
  public.surfaces,
  public.horses,
  public.jockeys,
  public.trainers
to service_role;

-- Demo strategy bootstrap.
grant select, insert, update on table public.strategies to service_role;
grant select, insert on table public.strategy_versions to service_role;

-- Append-only strategy match facts. Existing matches are read for idempotency;
-- new score inputs insert new rows instead of mutating prior rows.
grant select, insert on table public.strategy_matches to service_role;

-- Opportunity aggregate read model and generated child facts.
grant select, insert, update on table public.opportunities to service_role;
grant select, insert, update on table public.opportunity_subjects to service_role;
grant select, insert, update on table public.opportunity_strategy_matches to service_role;
grant select, insert on table public.opportunity_scores to service_role;
grant select, insert on table public.opportunity_explanations to service_role;
grant select, insert on table public.opportunity_events to service_role;

commit;
