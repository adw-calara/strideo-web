# Phase 1A Data Strategy Impact Review

## Status

The original 54-table migration design did not fully support the approved
historical data architecture and AI training strategy.

PR #5 has been updated in design only with
`0012_data_architecture_and_training_tables.sql`.

## Fit Review

| Requirement | Original Support | Remediation |
| --- | --- | --- |
| Raw historical archive metadata | Missing | Added `raw_archive_objects`. |
| Historical source file tracking | Missing | Added `source_data_files`. |
| Ingestion batch lineage | Partial through `job_runs` | Added `data_ingestion_batches`. |
| Feature store tables | Partial through `feature_snapshots` only | Added horse, trainer, jockey, track, and odds feature tables. |
| Model training windows | Partial through `model_training_runs.training_window` | Added `model_training_datasets` with explicit 5-year lookback fields. |
| Prediction runs | Missing | Added `prediction_runs`. |
| Prediction results | Partial through `prediction_outputs` | Added permanent partitioned `prediction_results`. |
| 30-day live serving layer | Missing | Added `live_prediction_cache`. |
| Permanent prediction storage | Partial | Added append-only `prediction_results`. |
| Archive-to-feature-store lineage | Missing | Added source-file and ingestion-batch FKs on feature tables. |
| Feature snapshot lineage | Present | Preserved and connected to prediction results. |
| Monthly retraining metrics | Partial | Added `model_evaluation_metrics`. |

## Migration Placement Decision

The additions belong in a new migration:

- `supabase/migrations/0012_data_architecture_and_training_tables.sql`

Reason:

- `0004_transaction_tables.sql` should remain focused on racing transaction
  facts.
- `0008_learning_and_performance_tables.sql` already defines the core model,
  snapshot, and performance tables approved in Phase 1.
- `0009_audit_tables.sql` should remain focused on agent/job/audit metadata.
- `0012` cleanly layers the approved historical data architecture on top of the
  core schema without disturbing previously reviewed migration ordering.

## Impact

Tables added:

- `raw_archive_objects`
- `data_ingestion_batches`
- `source_data_files`
- `horse_features`
- `trainer_features`
- `jockey_features`
- `track_features`
- `odds_features`
- `model_training_datasets`
- `model_evaluation_metrics`
- `prediction_runs`
- `prediction_results`
- `prediction_results_default`
- `live_prediction_cache`

New types added:

- `archive_object_status`
- `feature_store_status`
- `prediction_run_scope`
- `prediction_result_status`

Security impact:

- RLS is enabled on all new tables.
- No browser-facing policies are added.
- No grants are added.
- No `SECURITY DEFINER` functions are added.

Storage impact:

- Raw files remain in low-cost object storage.
- Supabase stores metadata and lineage.
- Permanent prediction history is partitioned by `prediction_date`.
- Live serving cache is bounded to 30 days.

## Remaining Risks

- Local/shadow migration execution is still required before live application.
- Monthly partition automation is required for `prediction_results`.
- Feature materialization jobs are not implemented in this PR.
- Archive lifecycle policies are not implemented in this PR.
- Warehouse export jobs are not implemented in this PR.

## Approval Readiness

After data-strategy remediation, PR #5 is ready for final approval review.

It is not an instruction to apply migrations. The next review should verify
SQL execution in a local/shadow database and operational migration planning.
