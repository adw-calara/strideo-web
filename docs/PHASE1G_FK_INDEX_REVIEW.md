# Phase 1G FK Index Review

Status: PLANNING ONLY - NO DATABASE CHANGES MADE

Date: June 7, 2026

## Purpose

This review prepares Phase 1G database hardening for Supabase Dev after Phase 1F applied migrations `0001` through `0012`.

It reviews advisor findings already documented in the repo and local migration definitions to identify likely unindexed foreign key candidates. It does not create or apply a migration.

Production remains untouched.

## Sources Reviewed

- `docs/PHASE1F_DEV_MIGRATION_EXECUTION_REPORT.md`
- `docs/PHASE1G_DEV_DB_HARDENING_PLAN.md`
- `supabase/migrations/20260607143356_0004_transaction_tables.sql`
- `supabase/migrations/20260607143452_0005_opportunity_tables.sql`
- `supabase/migrations/20260607143531_0006_wager_tables.sql`
- `supabase/migrations/20260607143625_0007_user_and_entitlement_tables.sql`
- `supabase/migrations/20260607143740_0008_learning_and_performance_tables.sql`
- `supabase/migrations/20260607143820_0009_audit_tables.sql`
- `supabase/migrations/20260607144006_0011_indexes_and_partitions.sql`
- `supabase/migrations/20260607144134_0012_data_architecture_and_training_tables.sql`

The repo currently documents Supabase performance advisor output at a summary level:

- `INFO` findings for unindexed foreign keys.
- `INFO` findings for unused indexes.

The repo does not yet contain a complete exported advisor item list. Because of that, this review should be treated as a proposed plan, not as authorization to write or apply index SQL.

## Recommendation

Do not create the Phase 1G FK index migration yet.

First re-run or export the Supabase performance advisor details for Dev, then map each concrete advisor item against the candidates below and existing indexes. Add indexes only where the FK columns are not already covered by a useful left-prefix index or by a deliberate query-path index.

## Proposed Future Migration

Append-only migration filename:

```text
supabase/migrations/20260607162142_0013_fk_index_hardening.sql
```

The future migration should contain only additive `create index` statements. Existing migrations must not be edited, reordered, squashed, or rewritten.

## High Priority Candidates

These candidates are most likely to matter before ingestion volume or user workflow volume begins.

### User Workflow Composite FKs

These tables are user-owned and likely to be touched by daily product flows, deletes, status updates, and result tracking. Several existing indexes lead with useful query columns, but do not fully cover the composite FK columns that preserve user ownership.

- `daily_bet_sheet_entries (daily_bet_sheet_id, user_id)`
  - Existing index: `daily_bet_sheet_entries_sheet_idx (daily_bet_sheet_id, sort_order)`
  - Reason: sheet-entry lookups are covered by `daily_bet_sheet_id`, but the composite FK includes `user_id`. If the advisor flags the composite FK, consider an exact composite index before bet-sheet volume grows.

- `daily_bet_sheet_events (daily_bet_sheet_id, user_id)`
  - Existing index: `daily_bet_sheet_events_sheet_time_idx (daily_bet_sheet_id, event_at desc)`
  - Reason: event timeline reads are covered by sheet id, but owner-scoped cascade checks may benefit from the full composite key.

- `daily_bet_sheet_events (daily_bet_sheet_entry_id, user_id, daily_bet_sheet_id)`
  - Existing index: none with this left prefix.
  - Reason: append-only entry event history should be cheap to validate and cascade when a user-owned bet-sheet entry is removed or reconciled.

- `user_recorded_wagers (daily_bet_sheet_entry_id, user_id)`
  - Existing indexes focus on `(user_id, race_date desc, status)` and recommendation lookup.
  - Reason: recorded wagers may be created from daily bet sheet entries and then verified later. The entry-to-wager FK should not require broad scans once user workflow data exists.

- `user_wager_results (user_recorded_wager_id, user_id)`
  - Existing index: `user_wager_results_user_status_idx (user_id, verification_status, updated_at desc)`
  - Reason: result verification links back to recorded wagers. An exact FK index may be needed for settlement and cascade/update checks.

### Operational Lineage Job FKs

Many append-oriented tables reference `job_runs` through `source_job_run_id`. These support ingestion, prediction, scoring, performance verification, and audit traceability.

Prioritize advisor-confirmed items on high-volume or operationally queried tables:

- `entry_events (source_job_run_id)`
- `odds_snapshots (source_job_run_id)`
- `opportunity_events (source_job_run_id)`
- `opportunity_scores (source_job_run_id)`
- `wager_recommendations (source_job_run_id)`
- `wager_recommendation_events (source_job_run_id)`
- `feature_snapshots (source_job_run_id)`
- `prediction_outputs (source_job_run_id)`
- `performance_runs (source_job_run_id)`
- `data_ingestion_batches (source_job_run_id)`
- `prediction_runs (source_job_run_id)`
- `event_log (job_run_id)`

Reason: these are append-heavy or audit-heavy paths. Indexes on job lineage support backfills, failure review, replay, and agent run debugging without scanning large fact tables.

## Medium Priority Candidates

These candidates are important, but should be confirmed against the detailed advisor output and expected ingestion design before adding every possible index.

### Archive And Ingestion Lineage

- `data_ingestion_batches (raw_archive_object_id)`
- `source_data_files (raw_archive_object_id)`
- `horse_features (source_data_file_id)`
- `horse_features (data_ingestion_batch_id)`
- `trainer_features (source_data_file_id)`
- `trainer_features (data_ingestion_batch_id)`
- `jockey_features (source_data_file_id)`
- `jockey_features (data_ingestion_batch_id)`
- `track_features (source_data_file_id)`
- `track_features (data_ingestion_batch_id)`
- `odds_features (source_data_file_id)`
- `odds_features (data_ingestion_batch_id)`

Reason: feature-store and archive lineage are central to Strideo's learning loop, but the exact access pattern may depend on the first ingestion provider and archive process. Add these once advisor items are confirmed and the ingestion review path is clear.

### Training And Evaluation Lineage

- `model_training_datasets (model_training_run_id)`
- `model_evaluation_metrics (model_evaluation_run_id)`
- `model_evaluation_metrics (dataset_id)`

Reason: these tables support monthly retraining and promotion review. They are likely to matter after initial model workflows exist, but before historical backfills create meaningful volume.

### Prediction Serving And History

- `live_prediction_cache (model_version_id)`
- `live_prediction_cache (race_entry_id, race_date)`
- `prediction_results (model_version_id)`
- `prediction_results (feature_snapshot_id)`

Reason: existing indexes cover race, entry, and run lookup paths. Add model/version and feature lineage indexes only after the advisor confirms the gap or live-serving queries require them.

## Items To Wait On

Do not remove or rewrite existing indexes because of unused-index findings during Phase 1G. The database is newly created, no ingestion workload has run, and user activity has not produced representative query statistics.

Wait for real workload or explicit query plans before acting on:

- Unused index findings.
- Low-volume registry FKs such as `model_promotions (previous_model_version_id)`.
- Admin/audit fields such as `profile_roles (created_by_user_id)`.
- Strategy metadata self-references such as `strategies (parent_strategy_id)`.
- Query-path indexes that already intentionally lead with feed, race date, status, or user columns.
- Broad feature-store indexes beyond the first provider-backed ingestion workflow.

## Future Migration Process

Before creating `0013_fk_index_hardening.sql`:

1. Re-run Supabase performance advisors against Dev.
2. Export or document the exact unindexed FK advisor items without secrets.
3. Compare each item to the existing indexes in `0011` and `0012`.
4. Prefer indexes that match both the FK and a real Strideo workflow.
5. Avoid duplicate indexes where an existing left-prefix index already supports the FK lookup.
6. Draft only additive `create index` statements.
7. Review the SQL before execution.
8. Apply to Dev only after explicit authorization.
9. Stop on first error.
10. Re-run advisors and verification after execution.

Use ordinary `create index` statements if the migration is executed through a transactional migration path. `create index concurrently` should only be used when the execution path explicitly supports non-transactional SQL.

## Staging Verification Steps After Future Migration

After a future append-only FK index migration is created and explicitly authorized for staging or Dev:

1. Confirm the target project is staging or Dev, not production.
2. Confirm the migration history includes the new append-only migration.
3. Confirm no existing migration files were modified.
4. Count public tables, RLS-enabled tables, policies, indexes, and foreign keys.
5. Re-run Supabase performance advisors.
6. Confirm unindexed FK findings are reduced or intentionally documented.
7. Re-run Supabase security advisors.
8. Confirm no broad grants to `anon` or `authenticated` were introduced.
9. Run `npm run lint` and `npm run build` if application code changed.
10. Document results in the Phase 1G execution report.

## Production Reminder

Production remains untouched.

No production migration, advisor execution, schema change, or verification should occur unless production work is explicitly authorized in the current task.
