# Phase 1G Dev Performance Advisor Export

Status: EXPORTED FOR MIGRATION PLANNING - NO MIGRATION APPLIED

Date: June 7, 2026

## Target

- Supabase project name: `strideo-dev`
- Supabase project ref: `ntxtakbggtljjbalgris`
- Environment: Dev
- Production touched: no

## Secret Handling

Local shell environment variable presence was checked without printing values.

Result:

- `STRIDEO_STAGING_SUPABASE_URL`: missing from the local shell environment
- `STRIDEO_STAGING_SUPABASE_ANON_KEY`: missing from the local shell environment
- `STRIDEO_STAGING_SUPABASE_SERVICE_ROLE_KEY`: missing from the local shell environment
- `STRIDEO_STAGING_SUPABASE_PROJECT_REF`: missing from the local shell environment
- `STRIDEO_STAGING_SUPABASE_DB_URL`: missing from the local shell environment
- `STRIDEO_STAGING_SUPABASE_DIRECT_URL`: missing from the local shell environment
- `STRIDEO_STAGING_SUPABASE_POOLER_URL`: missing from the local shell environment

The Supabase MCP connector was available and used for read-only Dev inspection. No secret values were printed or stored.

## Advisor Source

Supabase MCP `get_advisors` was run for performance advisors on Dev project `ntxtakbggtljjbalgris`.

Observed advisor categories:

- `unindexed_foreign_keys`
- `unused_index`

Unused-index findings were intentionally excluded from Phase 1G migration work because the database has no representative ingestion or user workload yet.

## Catalog Verification Source

A read-only catalog query was also run against Dev to list public foreign key constraints without a covering left-prefix index. This converted the advisor signal into explicit table and column names for migration planning.

## Unindexed FK Findings

The following table summarizes the Dev findings relevant to Phase 1G. Duplicate rows with equivalent column sets are caused by duplicate constraint names or partition/default-table reporting; the migration creates one covering index per table and FK column set.

| Table | FK columns | Phase 1G action |
| --- | --- | --- |
| `daily_bet_sheet_entries` | `(daily_bet_sheet_id, user_id)` | Add index |
| `daily_bet_sheet_entries` | `(wager_recommendation_id, wager_recommendation_race_date)` | Add index |
| `daily_bet_sheet_events` | `(daily_bet_sheet_entry_id, user_id, daily_bet_sheet_id)` | Add index |
| `daily_bet_sheet_events` | `(daily_bet_sheet_id, user_id)` | Add index |
| `data_ingestion_batches` | `(raw_archive_object_id)` | Add index |
| `data_ingestion_batches` | `(source_job_run_id)` | Add index |
| `entry_events` | `(source_job_run_id)` | Add index |
| `event_log` | `(job_run_id)` | Add index on partitioned parent |
| `event_log_default` | `(job_run_id)` | Covered by parent index after migration |
| `feature_snapshots` | `(race_entry_id, race_date)` | Add index |
| `feature_snapshots` | `(source_job_run_id)` | Add index |
| `horse_features` | `(data_ingestion_batch_id)` | Add index |
| `horse_features` | `(source_data_file_id)` | Add index |
| `jockey_features` | `(data_ingestion_batch_id)` | Add index |
| `jockey_features` | `(source_data_file_id)` | Add index |
| `live_prediction_cache` | `(model_version_id)` | Add index |
| `live_prediction_cache` | `(race_entry_id, race_date)` | Add index |
| `model_evaluation_metrics` | `(dataset_id)` | Add index |
| `model_evaluation_metrics` | `(model_evaluation_run_id)` | Add index |
| `model_evaluation_runs` | `(source_job_run_id)` | Add index |
| `model_performance_rollups` | `(performance_run_id)` | Add index |
| `model_promotions` | `(previous_model_version_id)` | Defer |
| `model_training_datasets` | `(model_training_run_id)` | Add index |
| `model_training_runs` | `(model_version_id)` | Add index |
| `model_training_runs` | `(source_job_run_id)` | Add index |
| `odds_features` | `(data_ingestion_batch_id)` | Add index |
| `odds_features` | `(race_entry_id, race_date)` | Add index |
| `odds_features` | `(source_data_file_id)` | Add index |
| `odds_snapshots` | `(source_job_run_id)` | Add index on partitioned parent |
| `odds_snapshots_default` | `(source_job_run_id)` | Covered by parent index after migration |
| `opportunities` | `(source_job_run_id)` | Add index on partitioned parent |
| `opportunities` | `(strategy_version_id)` | Add index |
| `opportunities_default` | `(source_job_run_id)` | Covered by parent index after migration |
| `opportunities_default` | `(strategy_version_id)` | Covered by parent index after migration |
| `opportunity_events` | `(source_job_run_id)` | Add index |
| `opportunity_explanations` | `(source_job_run_id)` | Add index |
| `opportunity_performance_rollups` | `(performance_run_id)` | Add index |
| `opportunity_scores` | `(model_version_id)` | Add index |
| `opportunity_scores` | `(prediction_output_id)` | Add index |
| `opportunity_scores` | `(source_job_run_id)` | Add index |
| `opportunity_strategy_matches` | `(strategy_match_id)` | Add index |
| `opportunity_visibility_events` | `(source_job_run_id)` | Add index |
| `performance_runs` | `(source_job_run_id)` | Add index |
| `prediction_outputs` | `(race_entry_id, race_date)` | Add index |
| `prediction_outputs` | `(race_id, race_date)` | Add index |
| `prediction_outputs` | `(source_job_run_id)` | Add index |
| `prediction_results` | `(feature_snapshot_id)` | Add index on partitioned parent |
| `prediction_results` | `(model_version_id)` | Add index on partitioned parent |
| `prediction_results_default` | `(feature_snapshot_id)` | Covered by parent index after migration |
| `prediction_results_default` | `(model_version_id)` | Covered by parent index after migration |
| `prediction_runs` | `(source_job_run_id)` | Add index |
| `profile_roles` | `(created_by_user_id)` | Defer |
| `race_entries` | `(jockey_id)` | Defer |
| `race_entries` | `(source_job_run_id)` | Add index on partitioned parent |
| `race_entries` | `(trainer_id)` | Defer |
| `race_entries_default` | `(jockey_id)` | Defer |
| `race_entries_default` | `(source_job_run_id)` | Covered by parent index after migration |
| `race_entries_default` | `(trainer_id)` | Defer |
| `races` | `(source_job_run_id)` | Add index on partitioned parent |
| `races` | `(surface_id)` | Defer |
| `races_default` | `(source_job_run_id)` | Covered by parent index after migration |
| `races_default` | `(surface_id)` | Defer |
| `recommendation_results` | `(closing_odds_snapshot_id, race_date)` | Add index on partitioned parent |
| `recommendation_results` | `(result_version_id, race_date)` | Add index on partitioned parent |
| `recommendation_results_default` | `(closing_odds_snapshot_id, race_date)` | Covered by parent index after migration |
| `recommendation_results_default` | `(result_version_id, race_date)` | Covered by parent index after migration |
| `result_entries` | `(result_version_id, race_date)` | Add index |
| `result_versions` | `(correction_of_result_version_id)` | Defer |
| `result_versions` | `(source_job_run_id)` | Add index |
| `source_data_files` | `(raw_archive_object_id)` | Add index |
| `strategies` | `(current_version_id)` | Defer |
| `strategies` | `(parent_strategy_id)` | Defer |
| `strategy_feature_snapshots` | `(feature_snapshot_id)` | Add index |
| `strategy_matches` | `(prediction_output_id)` | Add index |
| `strategy_matches` | `(race_id, race_date)` | Add index |
| `strategy_matches` | `(source_job_run_id)` | Add index |
| `strategy_matches` | `(strategy_version_id)` | Add index |
| `strategy_performance_rollups` | `(performance_run_id)` | Add index |
| `strategy_performance_rollups` | `(strategy_version_id)` | Add index |
| `track_features` | `(data_ingestion_batch_id)` | Add index |
| `track_features` | `(source_data_file_id)` | Add index |
| `trainer_features` | `(data_ingestion_batch_id)` | Add index |
| `trainer_features` | `(source_data_file_id)` | Add index |
| `user_recorded_wagers` | `(daily_bet_sheet_entry_id, user_id)` | Add index |
| `user_recorded_wagers` | `(race_id, race_date)` | Add index |
| `user_wager_results` | `(result_version_id)` | Add index |
| `user_wager_results` | `(user_recorded_wager_id, user_id)` | Add index |
| `wager_recommendation_events` | `(source_job_run_id)` | Add index |
| `wager_recommendation_leg_entries` | `(wager_recommendation_leg_id, race_date)` | Add index |
| `wager_recommendations` | `(source_job_run_id)` | Add index on partitioned parent |
| `wager_recommendations` | `(strategy_id)` | Add index |
| `wager_recommendations` | `(strategy_version_id)` | Add index |
| `wager_recommendations` | `(wager_template_id)` | Add index |
| `wager_recommendations_default` | `(source_job_run_id)` | Covered by parent index after migration |
| `wager_recommendations_default` | `(strategy_id)` | Covered by parent index after migration |
| `wager_recommendations_default` | `(strategy_version_id)` | Covered by parent index after migration |
| `wager_recommendations_default` | `(wager_template_id)` | Covered by parent index after migration |

## Why The Added Indexes Are High Confidence

The indexes selected for `0013_fk_index_hardening.sql` meet all of these conditions:

- The FK was reported by Supabase Dev performance advisors or confirmed by the matching catalog query.
- The table is part of a Strideo high-volume or operational path: race ingestion, append-only event history, Opportunity scoring, recommendation generation, bet-sheet workflow, prediction serving, model lineage, or performance verification.
- Existing indexes do not provide the same FK-column left prefix.
- The index is additive and does not remove, rewrite, or depend on unused-index cleanup.

## Deferred Findings

These findings should wait until real workload or a more specific query path exists:

- Low-volume admin/registry FKs such as `profile_roles (created_by_user_id)`, `model_promotions (previous_model_version_id)`, and strategy self/version pointers.
- Reference lookup FKs such as `races (surface_id)`, `race_entries (jockey_id)`, and `race_entries (trainer_id)` until provider ingestion and search workload clarifies whether these should be single-column or composite access-path indexes.
- Unused-index findings. These are expected before ingestion and user traffic.

## Migration Status

- Migration created locally: yes, `supabase/migrations/20260607162142_0013_fk_index_hardening.sql`
- Migration applied to Dev: no
- Production touched: no
