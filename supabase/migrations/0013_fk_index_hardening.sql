-- Phase 1G migration design: foreign key index hardening.
-- Purpose: add advisor-confirmed covering indexes for high-confidence
-- foreign key paths before ingestion, user workflow, prediction, and
-- performance-verification volume begins.
-- Dependencies: 0001 through 0012 applied in order.
-- Execution note: additive only. Do not remove unused indexes in this phase.

begin;

-- User workflow and bet-sheet ownership FKs.
create index if not exists daily_bet_sheet_entries_sheet_user_fk_idx
  on public.daily_bet_sheet_entries (daily_bet_sheet_id, user_id);
create index if not exists daily_bet_sheet_entries_recommendation_fk_idx
  on public.daily_bet_sheet_entries (wager_recommendation_id, wager_recommendation_race_date);
create index if not exists daily_bet_sheet_events_sheet_user_fk_idx
  on public.daily_bet_sheet_events (daily_bet_sheet_id, user_id);
create index if not exists daily_bet_sheet_events_entry_user_sheet_fk_idx
  on public.daily_bet_sheet_events (daily_bet_sheet_entry_id, user_id, daily_bet_sheet_id);
create index if not exists user_recorded_wagers_sheet_entry_user_fk_idx
  on public.user_recorded_wagers (daily_bet_sheet_entry_id, user_id);
create index if not exists user_recorded_wagers_race_fk_idx
  on public.user_recorded_wagers (race_id, race_date);
create index if not exists user_wager_results_recorded_wager_user_fk_idx
  on public.user_wager_results (user_recorded_wager_id, user_id);
create index if not exists user_wager_results_result_version_fk_idx
  on public.user_wager_results (result_version_id);

-- Operational job lineage FKs.
create index if not exists races_source_job_run_fk_idx
  on public.races (source_job_run_id);
create index if not exists race_entries_source_job_run_fk_idx
  on public.race_entries (source_job_run_id);
create index if not exists entry_events_source_job_run_fk_idx
  on public.entry_events (source_job_run_id);
create index if not exists odds_snapshots_source_job_run_fk_idx
  on public.odds_snapshots (source_job_run_id);
create index if not exists result_versions_source_job_run_fk_idx
  on public.result_versions (source_job_run_id);
create index if not exists strategy_matches_source_job_run_fk_idx
  on public.strategy_matches (source_job_run_id);
create index if not exists opportunities_source_job_run_fk_idx
  on public.opportunities (source_job_run_id);
create index if not exists opportunity_events_source_job_run_fk_idx
  on public.opportunity_events (source_job_run_id);
create index if not exists opportunity_scores_source_job_run_fk_idx
  on public.opportunity_scores (source_job_run_id);
create index if not exists opportunity_explanations_source_job_run_fk_idx
  on public.opportunity_explanations (source_job_run_id);
create index if not exists opportunity_visibility_events_source_job_run_fk_idx
  on public.opportunity_visibility_events (source_job_run_id);
create index if not exists wager_recommendations_source_job_run_fk_idx
  on public.wager_recommendations (source_job_run_id);
create index if not exists wager_recommendation_events_source_job_run_fk_idx
  on public.wager_recommendation_events (source_job_run_id);
create index if not exists feature_snapshots_source_job_run_fk_idx
  on public.feature_snapshots (source_job_run_id);
create index if not exists prediction_outputs_source_job_run_fk_idx
  on public.prediction_outputs (source_job_run_id);
create index if not exists model_training_runs_source_job_run_fk_idx
  on public.model_training_runs (source_job_run_id);
create index if not exists model_evaluation_runs_source_job_run_fk_idx
  on public.model_evaluation_runs (source_job_run_id);
create index if not exists performance_runs_source_job_run_fk_idx
  on public.performance_runs (source_job_run_id);
create index if not exists data_ingestion_batches_source_job_run_fk_idx
  on public.data_ingestion_batches (source_job_run_id);
create index if not exists prediction_runs_source_job_run_fk_idx
  on public.prediction_runs (source_job_run_id);
create index if not exists event_log_job_run_fk_idx
  on public.event_log (job_run_id);

-- Race, Opportunity, prediction, recommendation, and result lineage FKs.
create index if not exists feature_snapshots_entry_fk_idx
  on public.feature_snapshots (race_entry_id, race_date);
create index if not exists prediction_outputs_race_fk_idx
  on public.prediction_outputs (race_id, race_date);
create index if not exists prediction_outputs_entry_fk_idx
  on public.prediction_outputs (race_entry_id, race_date);
create index if not exists opportunities_strategy_version_fk_idx
  on public.opportunities (strategy_version_id);
create index if not exists opportunity_scores_model_version_fk_idx
  on public.opportunity_scores (model_version_id);
create index if not exists opportunity_scores_prediction_output_fk_idx
  on public.opportunity_scores (prediction_output_id);
create index if not exists opportunity_strategy_matches_strategy_match_fk_idx
  on public.opportunity_strategy_matches (strategy_match_id);
create index if not exists recommendation_results_result_version_fk_idx
  on public.recommendation_results (result_version_id, race_date);
create index if not exists recommendation_results_closing_odds_fk_idx
  on public.recommendation_results (closing_odds_snapshot_id, race_date);
create index if not exists result_entries_result_version_fk_idx
  on public.result_entries (result_version_id, race_date);
create index if not exists strategy_feature_snapshots_feature_fk_idx
  on public.strategy_feature_snapshots (feature_snapshot_id);
create index if not exists strategy_matches_prediction_output_fk_idx
  on public.strategy_matches (prediction_output_id);
create index if not exists strategy_matches_race_fk_idx
  on public.strategy_matches (race_id, race_date);
create index if not exists strategy_matches_strategy_version_fk_idx
  on public.strategy_matches (strategy_version_id);
create index if not exists wager_recommendation_leg_entries_leg_fk_idx
  on public.wager_recommendation_leg_entries (wager_recommendation_leg_id, race_date);
create index if not exists wager_recommendations_strategy_fk_idx
  on public.wager_recommendations (strategy_id);
create index if not exists wager_recommendations_strategy_version_fk_idx
  on public.wager_recommendations (strategy_version_id);
create index if not exists wager_recommendations_template_fk_idx
  on public.wager_recommendations (wager_template_id);

-- Archive, ingestion, feature-store, model, and live prediction lineage FKs.
create index if not exists data_ingestion_batches_raw_archive_object_fk_idx
  on public.data_ingestion_batches (raw_archive_object_id);
create index if not exists source_data_files_raw_archive_object_fk_idx
  on public.source_data_files (raw_archive_object_id);
create index if not exists horse_features_source_data_file_fk_idx
  on public.horse_features (source_data_file_id);
create index if not exists horse_features_ingestion_batch_fk_idx
  on public.horse_features (data_ingestion_batch_id);
create index if not exists trainer_features_source_data_file_fk_idx
  on public.trainer_features (source_data_file_id);
create index if not exists trainer_features_ingestion_batch_fk_idx
  on public.trainer_features (data_ingestion_batch_id);
create index if not exists jockey_features_source_data_file_fk_idx
  on public.jockey_features (source_data_file_id);
create index if not exists jockey_features_ingestion_batch_fk_idx
  on public.jockey_features (data_ingestion_batch_id);
create index if not exists track_features_source_data_file_fk_idx
  on public.track_features (source_data_file_id);
create index if not exists track_features_ingestion_batch_fk_idx
  on public.track_features (data_ingestion_batch_id);
create index if not exists odds_features_source_data_file_fk_idx
  on public.odds_features (source_data_file_id);
create index if not exists odds_features_ingestion_batch_fk_idx
  on public.odds_features (data_ingestion_batch_id);
create index if not exists odds_features_entry_fk_idx
  on public.odds_features (race_entry_id, race_date);
create index if not exists model_training_datasets_training_run_fk_idx
  on public.model_training_datasets (model_training_run_id);
create index if not exists model_training_runs_model_version_fk_idx
  on public.model_training_runs (model_version_id);
create index if not exists model_evaluation_metrics_evaluation_run_fk_idx
  on public.model_evaluation_metrics (model_evaluation_run_id);
create index if not exists model_evaluation_metrics_dataset_fk_idx
  on public.model_evaluation_metrics (dataset_id);
create index if not exists model_performance_rollups_performance_run_fk_idx
  on public.model_performance_rollups (performance_run_id);
create index if not exists opportunity_performance_rollups_performance_run_fk_idx
  on public.opportunity_performance_rollups (performance_run_id);
create index if not exists strategy_performance_rollups_performance_run_fk_idx
  on public.strategy_performance_rollups (performance_run_id);
create index if not exists strategy_performance_rollups_strategy_version_fk_idx
  on public.strategy_performance_rollups (strategy_version_id);
create index if not exists prediction_results_feature_snapshot_fk_idx
  on public.prediction_results (feature_snapshot_id);
create index if not exists prediction_results_model_version_fk_idx
  on public.prediction_results (model_version_id);
create index if not exists live_prediction_cache_model_version_fk_idx
  on public.live_prediction_cache (model_version_id);
create index if not exists live_prediction_cache_entry_fk_idx
  on public.live_prediction_cache (race_entry_id, race_date);

commit;
