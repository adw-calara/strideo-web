# Data Architecture And AI Training

## Purpose

Strideo needs 10 years of U.S. thoroughbred historical data for backtesting,
feature engineering, and model training, while keeping Supabase focused on
metadata, lineage, warm features, predictions, and serving records.

Raw historical files should not live in Postgres. They should live in low-cost
object storage, with Supabase storing discoverability, checksums, coverage
windows, lineage, and operational state.

## Three-Tier Data Architecture

### Tier 1: Raw Historical Archive

Purpose:

- Preserve 10 years of U.S. thoroughbred source files.
- Keep raw bytes in low-cost object storage.
- Track source, checksum, size, schema fingerprint, coverage dates, and archive
  status in Supabase.

Tables:

- `raw_archive_objects`
- `data_ingestion_batches`
- `source_data_files`

Storage strategy:

- Object storage is the system of record for raw files.
- Supabase is the metadata and lineage index.
- Raw archive objects should use permanent retention unless a provider contract
  requires deletion.

### Tier 2: Feature Store

Purpose:

- Store warm, queryable model features for a 5-year rolling training window.
- Preserve feature-set versions and source-file lineage.
- Support feature rebuilds without losing historical provenance.

Tables:

- `horse_features`
- `trainer_features`
- `jockey_features`
- `track_features`
- `odds_features`
- `feature_snapshots`

Design:

- Entity feature rows are versioned by entity, `feature_date`, and
  `feature_set_version`.
- Feature rows link back to source files and ingestion batches.
- `feature_snapshots` preserves exact model input snapshots used by prediction
  outputs and Opportunity scoring.

### Tier 3: Live Prediction Layer

Purpose:

- Serve current prediction output efficiently.
- Keep live-serving data small and bounded to 30 days.
- Preserve permanent prediction history separately.

Tables:

- `prediction_runs`
- `prediction_results`
- `live_prediction_cache`

Design:

- `prediction_results` is append-only and permanent.
- `live_prediction_cache` stores the 30-day serving view with an `expires_at`
  check.
- Live cache records reference permanent prediction results.

## Training Strategy

Training cadence:

- Monthly retraining.
- Backfills and replay runs supported through `prediction_runs.scope`.

Training window:

- Default training lookback is 5 years.
- Training datasets store `training_window_start_date`,
  `training_window_end_date`, and `lookback_years`.

Tables:

- `model_versions`
- `model_training_runs`
- `model_training_datasets`
- `model_evaluation_runs`
- `model_evaluation_metrics`
- `model_promotions`

Promotion:

- New models are appended to `model_versions`.
- Evaluation metrics are append-only.
- Promotions are event records in `model_promotions`.

## Lineage

Archive-to-feature-store lineage:

- `raw_archive_objects` identifies cold source objects.
- `source_data_files` tracks source files and schema fingerprints.
- Feature tables link to `source_data_files` and `data_ingestion_batches`.

Feature snapshot lineage:

- `feature_snapshots` records exact feature payloads used by models.
- `prediction_results` can reference `feature_snapshot_id`.
- `opportunity_scores` and strategy matches preserve prediction lineage through
  existing model and prediction references.

Prediction lineage:

- `prediction_runs` records batch/run metadata.
- `prediction_results` records permanent model outputs.
- `live_prediction_cache` references permanent prediction results.

## Retention

- Raw archive: permanent low-cost object storage metadata in Supabase.
- Feature store: warm 5-year rolling training window, with older features
  rebuildable from archive.
- Live predictions: 30-day serving cache.
- Prediction history: permanent append-only `prediction_results`.
- Model versions and evaluation metrics: permanent append-only history.

## Deferred Work

- Archive lifecycle workers.
- Feature materialization workers.
- Monthly retraining orchestration.
- Prediction-result monthly partition automation.
- Local/shadow migration execution testing.
- Warehouse export jobs.
- Data quality dashboards for source files, features, and predictions.
