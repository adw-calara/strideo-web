-- Opportunity tracking workflow grants.
-- Purpose: allow authenticated users to save visible Opportunities into their
-- own watchlist_items rows through existing owner-scoped RLS policies.
-- This migration does not add anon access, service_role access, or grants on
-- wager, bankroll, prediction, provider-ingestion, strategy, or ops tables.

begin;

grant select (
  id,
  opportunity_id,
  opportunity_race_date,
  workflow_state,
  deleted_at,
  created_at,
  updated_at
) on table public.watchlist_items to authenticated;

grant insert (
  user_id,
  opportunity_id,
  opportunity_race_date,
  workflow_state,
  client_mutation_id
) on table public.watchlist_items to authenticated;

grant update (
  workflow_state,
  deleted_at,
  updated_at,
  client_mutation_id
) on table public.watchlist_items to authenticated;

commit;
