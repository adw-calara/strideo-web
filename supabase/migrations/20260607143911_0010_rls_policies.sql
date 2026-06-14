-- Phase 1A migration design: RLS posture and initial owner policies.
-- Purpose: enable row-level security before any browser-facing grants and
-- define user-owned access boundaries for Phase 1 tables.
-- Dependencies: all prior Phase 1A table migrations.
-- Future considerations: shared Opportunity, recommendation, and marketplace
-- read policies should be opened only after entitlement tests and explicit
-- grants are reviewed in a separate PR.

begin;

alter table public.surfaces enable row level security;
alter table public.tracks enable row level security;
alter table public.horses enable row level security;
alter table public.jockeys enable row level security;
alter table public.trainers enable row level security;
alter table public.races enable row level security;
alter table public.race_entries enable row level security;
alter table public.entry_events enable row level security;
alter table public.odds_snapshots enable row level security;
alter table public.result_versions enable row level security;
alter table public.result_entries enable row level security;
alter table public.strategies enable row level security;
alter table public.strategy_versions enable row level security;
alter table public.strategy_feature_snapshots enable row level security;
alter table public.strategy_matches enable row level security;
alter table public.opportunities enable row level security;
alter table public.opportunity_subjects enable row level security;
alter table public.opportunity_strategy_matches enable row level security;
alter table public.opportunity_events enable row level security;
alter table public.opportunity_scores enable row level security;
alter table public.opportunity_explanations enable row level security;
alter table public.opportunity_visibility_events enable row level security;
alter table public.wager_templates enable row level security;
alter table public.wager_recommendations enable row level security;
alter table public.wager_recommendation_events enable row level security;
alter table public.wager_recommendation_legs enable row level security;
alter table public.wager_recommendation_leg_entries enable row level security;
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.entitlements enable row level security;
alter table public.profile_roles enable row level security;
alter table public.user_devices enable row level security;
alter table public.watchlist_items enable row level security;
alter table public.daily_bet_sheets enable row level security;
alter table public.daily_bet_sheet_entries enable row level security;
alter table public.daily_bet_sheet_events enable row level security;
alter table public.user_recorded_wagers enable row level security;
alter table public.alert_preferences enable row level security;
alter table public.model_versions enable row level security;
alter table public.feature_snapshots enable row level security;
alter table public.prediction_outputs enable row level security;
alter table public.model_training_runs enable row level security;
alter table public.model_evaluation_runs enable row level security;
alter table public.model_promotions enable row level security;
alter table public.performance_runs enable row level security;
alter table public.recommendation_results enable row level security;
alter table public.recommendation_result_events enable row level security;
alter table public.user_wager_results enable row level security;
alter table public.opportunity_performance_rollups enable row level security;
alter table public.strategy_performance_rollups enable row level security;
alter table public.model_performance_rollups enable row level security;
alter table public.job_runs enable row level security;
alter table public.agent_logs enable row level security;
alter table public.event_log enable row level security;

comment on table public.opportunities is
  'Global Opportunity aggregate. RLS is enabled, but shared browser read policies and grants are intentionally deferred.';
comment on table public.wager_recommendations is
  'System recommendation facts. RLS is enabled, but browser access is deferred until entitlement policy tests exist.';

create policy profiles_select_own
  on public.profiles for select
  to authenticated
  using (user_id = auth.uid());

create policy subscriptions_select_own
  on public.subscriptions for select
  to authenticated
  using (user_id = auth.uid());

create policy entitlements_select_own
  on public.entitlements for select
  to authenticated
  using (user_id = auth.uid());

create policy profile_roles_select_own
  on public.profile_roles for select
  to authenticated
  using (user_id = auth.uid());

create policy user_devices_select_own
  on public.user_devices for select
  to authenticated
  using (user_id = auth.uid());

create policy user_devices_insert_own
  on public.user_devices for insert
  to authenticated
  with check (user_id = auth.uid());

create policy user_devices_update_own
  on public.user_devices for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy user_devices_delete_own
  on public.user_devices for delete
  to authenticated
  using (user_id = auth.uid());

create policy watchlist_items_select_own
  on public.watchlist_items for select
  to authenticated
  using (user_id = auth.uid());

create policy watchlist_items_insert_own
  on public.watchlist_items for insert
  to authenticated
  with check (user_id = auth.uid());

create policy watchlist_items_update_own
  on public.watchlist_items for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy watchlist_items_delete_own
  on public.watchlist_items for delete
  to authenticated
  using (user_id = auth.uid());

create policy daily_bet_sheets_select_own
  on public.daily_bet_sheets for select
  to authenticated
  using (user_id = auth.uid());

create policy daily_bet_sheets_insert_own
  on public.daily_bet_sheets for insert
  to authenticated
  with check (user_id = auth.uid());

create policy daily_bet_sheets_update_own
  on public.daily_bet_sheets for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy daily_bet_sheets_delete_own
  on public.daily_bet_sheets for delete
  to authenticated
  using (user_id = auth.uid());

create policy daily_bet_sheet_entries_select_own
  on public.daily_bet_sheet_entries for select
  to authenticated
  using (user_id = auth.uid());

create policy daily_bet_sheet_entries_insert_own
  on public.daily_bet_sheet_entries for insert
  to authenticated
  with check (user_id = auth.uid());

create policy daily_bet_sheet_entries_update_own
  on public.daily_bet_sheet_entries for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy daily_bet_sheet_entries_delete_own
  on public.daily_bet_sheet_entries for delete
  to authenticated
  using (user_id = auth.uid());

create policy daily_bet_sheet_events_select_own
  on public.daily_bet_sheet_events for select
  to authenticated
  using (user_id = auth.uid());

create policy daily_bet_sheet_events_insert_own
  on public.daily_bet_sheet_events for insert
  to authenticated
  with check (user_id = auth.uid());

create policy user_recorded_wagers_select_own
  on public.user_recorded_wagers for select
  to authenticated
  using (user_id = auth.uid());

create policy user_recorded_wagers_insert_own
  on public.user_recorded_wagers for insert
  to authenticated
  with check (user_id = auth.uid());

create policy user_recorded_wagers_update_own
  on public.user_recorded_wagers for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy user_recorded_wagers_delete_own
  on public.user_recorded_wagers for delete
  to authenticated
  using (user_id = auth.uid());

create policy alert_preferences_select_own
  on public.alert_preferences for select
  to authenticated
  using (user_id = auth.uid());

create policy alert_preferences_insert_own
  on public.alert_preferences for insert
  to authenticated
  with check (user_id = auth.uid());

create policy alert_preferences_update_own
  on public.alert_preferences for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy alert_preferences_delete_own
  on public.alert_preferences for delete
  to authenticated
  using (user_id = auth.uid());

create policy user_wager_results_select_own
  on public.user_wager_results for select
  to authenticated
  using (user_id = auth.uid());

create policy user_wager_results_insert_own
  on public.user_wager_results for insert
  to authenticated
  with check (user_id = auth.uid());

create policy user_wager_results_update_own
  on public.user_wager_results for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy strategies_select_owner
  on public.strategies for select
  to authenticated
  using (owner_user_id = auth.uid());

create policy strategy_versions_select_owner
  on public.strategy_versions for select
  to authenticated
  using (
    exists (
      select 1
      from public.strategies s
      where s.id = strategy_versions.strategy_id
        and s.owner_user_id = auth.uid()
    )
  );

-- Intentionally no GRANT statements here.
-- Supabase Data API access must be granted table-by-table only after RLS policy
-- tests are written and reviewed.

commit;
