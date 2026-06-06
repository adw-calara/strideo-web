-- Phase 1A migration design: partition defaults and access-path indexes.
-- Purpose: make race-date partition parents ingest-safe and add indexes for
-- feed ingestion, Opportunity feeds, user workflow, performance, and audit.
-- Dependencies: all prior Phase 1A table migrations.
-- Future considerations: replace default-only partitioning with scheduled
-- monthly partition creation before production ingestion volume begins.

begin;

create table public.races_default
  partition of public.races default;
comment on table public.races_default is
  'Default partition safety net. Create monthly races partitions before production ingestion.';
alter table public.races_default enable row level security;

create table public.race_entries_default
  partition of public.race_entries default;
comment on table public.race_entries_default is
  'Default partition safety net. Create monthly race_entries partitions before production ingestion.';
alter table public.race_entries_default enable row level security;

create table public.odds_snapshots_default
  partition of public.odds_snapshots default;
comment on table public.odds_snapshots_default is
  'Default partition safety net. Odds snapshots must move to monthly race_date partitions before live feed volume.';
alter table public.odds_snapshots_default enable row level security;

create table public.opportunities_default
  partition of public.opportunities default;
comment on table public.opportunities_default is
  'Default partition safety net. Opportunities should use the same race_date partition windows as races.';
alter table public.opportunities_default enable row level security;

create table public.wager_recommendations_default
  partition of public.wager_recommendations default;
comment on table public.wager_recommendations_default is
  'Default partition safety net for system recommendations. Monthly race_date partitions preserve historical recommendation queries.';
alter table public.wager_recommendations_default enable row level security;

create table public.recommendation_results_default
  partition of public.recommendation_results default;
comment on table public.recommendation_results_default is
  'Default partition safety net for recommendation performance results.';
alter table public.recommendation_results_default enable row level security;

create table public.agent_logs_default
  partition of public.agent_logs default;
comment on table public.agent_logs_default is
  'Default log partition. Operational log retention should archive or drop old monthly partitions.';
alter table public.agent_logs_default enable row level security;

create table public.event_log_default
  partition of public.event_log default;
comment on table public.event_log_default is
  'Default event partition. Warehouse extraction should operate on created_at partition windows.';
alter table public.event_log_default enable row level security;

create index tracks_code_idx on public.tracks (code);
create index tracks_name_idx on public.tracks (name);
create index horses_name_idx on public.horses (name);
create index jockeys_name_idx on public.jockeys (name);
create index trainers_name_idx on public.trainers (name);

create index races_race_date_track_idx on public.races (race_date, track_id, race_number);
create index races_status_scheduled_idx on public.races (status, scheduled_at);
create index races_provider_lookup_idx on public.races (provider, provider_race_id, race_date);

create index race_entries_race_idx on public.race_entries (race_id, race_date);
create index race_entries_horse_idx on public.race_entries (horse_id, race_date);
create index race_entries_status_idx on public.race_entries (status, race_date);
create index entry_events_entry_idx on public.entry_events (race_entry_id, race_date, event_at desc);

create index odds_snapshots_race_pool_time_idx on public.odds_snapshots (race_id, race_date, pool_type, snapshot_at desc);
create index odds_snapshots_entry_time_idx on public.odds_snapshots (race_entry_id, race_date, snapshot_at desc);
create index odds_snapshots_provider_sequence_idx on public.odds_snapshots (provider, race_date, sequence_number);

create index result_versions_race_status_idx on public.result_versions (race_id, race_date, status, result_version desc);
create index result_entries_version_finish_idx on public.result_entries (result_version_id, finish_position);
create index result_entries_entry_idx on public.result_entries (race_entry_id, race_date);

create index strategies_owner_status_idx on public.strategies (owner_user_id, status, visibility);
create index strategies_publication_idx on public.strategies (publication_status, visibility);
create index strategy_versions_strategy_version_idx on public.strategy_versions (strategy_id, version_number desc);
create index strategy_matches_strategy_race_idx on public.strategy_matches (strategy_id, strategy_version_id, race_date);
create index strategy_matches_race_entry_idx on public.strategy_matches (race_entry_id, race_date);

create index opportunities_feed_idx on public.opportunities (race_date, state, current_score desc);
create index opportunities_race_state_idx on public.opportunities (race_id, race_date, state);
create index opportunities_strategy_idx on public.opportunities (strategy_id, strategy_version_id, race_date);
create index opportunity_subjects_entry_idx on public.opportunity_subjects (race_entry_id, race_date);
create index opportunity_events_timeline_idx on public.opportunity_events (opportunity_id, race_date, event_at desc);
create index opportunity_scores_latest_idx on public.opportunity_scores (opportunity_id, race_date, scored_at desc);
create index opportunity_explanations_latest_idx on public.opportunity_explanations (opportunity_id, race_date, generated_at desc);
create index opportunity_visibility_lookup_idx on public.opportunity_visibility_events (opportunity_id, race_date, visibility_key, starts_at, ends_at);

create index wager_templates_strategy_idx on public.wager_templates (strategy_id, wager_type, status);
create index wager_recommendations_opportunity_version_idx on public.wager_recommendations (opportunity_id, race_date, version_number desc);
create index wager_recommendations_race_status_idx on public.wager_recommendations (race_id, race_date, status, generated_at desc);
create index wager_recommendations_supersedes_idx on public.wager_recommendations (supersedes_wager_recommendation_id, race_date);
create index wager_recommendation_events_recommendation_idx on public.wager_recommendation_events (wager_recommendation_id, race_date, event_at desc);
create index wager_recommendation_legs_recommendation_idx on public.wager_recommendation_legs (wager_recommendation_id, race_date, leg_number);
create index wager_recommendation_leg_entries_entry_idx on public.wager_recommendation_leg_entries (race_entry_id, race_date);

create index profiles_user_idx on public.profiles (user_id);
create index subscriptions_user_status_idx on public.subscriptions (user_id, status, current_period_end);
create index entitlements_user_key_idx on public.entitlements (user_id, entitlement_key, status, starts_at, ends_at);
create index profile_roles_user_role_idx on public.profile_roles (user_id, role);
create index user_devices_user_seen_idx on public.user_devices (user_id, last_seen_at desc);
create index watchlist_items_user_state_idx on public.watchlist_items (user_id, workflow_state, updated_at desc);
create index watchlist_items_opportunity_idx on public.watchlist_items (opportunity_id, opportunity_race_date);
create index daily_bet_sheets_user_date_idx on public.daily_bet_sheets (user_id, sheet_date desc);
create index daily_bet_sheet_entries_sheet_idx on public.daily_bet_sheet_entries (daily_bet_sheet_id, sort_order);
create index daily_bet_sheet_entries_opportunity_idx on public.daily_bet_sheet_entries (opportunity_id, opportunity_race_date);
create index daily_bet_sheet_events_sheet_time_idx on public.daily_bet_sheet_events (daily_bet_sheet_id, event_at desc);
create index user_recorded_wagers_user_race_idx on public.user_recorded_wagers (user_id, race_date desc, status);
create index user_recorded_wagers_recommendation_idx on public.user_recorded_wagers (wager_recommendation_id, wager_recommendation_race_date);
create index alert_preferences_user_channel_idx on public.alert_preferences (user_id, channel, enabled);

create index model_versions_key_status_idx on public.model_versions (model_key, status, created_at desc);
create index feature_snapshots_race_entry_idx on public.feature_snapshots (race_id, race_date, race_entry_id, captured_at desc);
create index feature_snapshots_feature_set_idx on public.feature_snapshots (feature_set_key, feature_set_version, captured_at desc);
create index prediction_outputs_model_race_idx on public.prediction_outputs (model_version_id, race_date, prediction_type);
create index prediction_outputs_feature_idx on public.prediction_outputs (feature_snapshot_id, prediction_type);
create index model_training_runs_model_status_idx on public.model_training_runs (model_key, status, created_at desc);
create index model_evaluation_runs_model_status_idx on public.model_evaluation_runs (model_version_id, status, created_at desc);
create index model_promotions_model_idx on public.model_promotions (model_version_id, promoted_at desc);

create index performance_runs_window_idx on public.performance_runs (evaluation_start_date, evaluation_end_date, status);
create index recommendation_results_recommendation_idx on public.recommendation_results (wager_recommendation_id, race_date, verification_status);
create index recommendation_results_opportunity_idx on public.recommendation_results (opportunity_id, race_date, verification_status);
create index recommendation_results_performance_run_idx on public.recommendation_results (performance_run_id, race_date);
create index recommendation_result_events_result_idx on public.recommendation_result_events (recommendation_result_id, race_date, event_at desc);
create index user_wager_results_user_status_idx on public.user_wager_results (user_id, verification_status, updated_at desc);
create index opportunity_performance_rollups_opportunity_idx on public.opportunity_performance_rollups (opportunity_id, race_date, computed_at desc);
create index strategy_performance_rollups_strategy_idx on public.strategy_performance_rollups (strategy_id, strategy_version_id, computed_at desc);
create index model_performance_rollups_model_idx on public.model_performance_rollups (model_version_id, computed_at desc);

create index job_runs_status_created_idx on public.job_runs (status, created_at desc);
create index job_runs_agent_created_idx on public.job_runs (agent_key, created_at desc);
create index agent_logs_job_created_idx on public.agent_logs (job_run_id, created_at desc);
create index agent_logs_agent_level_idx on public.agent_logs (agent_key, level, created_at desc);
create index event_log_aggregate_idx on public.event_log (aggregate_type, aggregate_id, created_at desc);
create index event_log_user_created_idx on public.event_log (user_id, created_at desc);

commit;
