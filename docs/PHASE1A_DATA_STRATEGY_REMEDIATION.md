# Phase 1A Data Strategy Remediation

## Status

Data strategy remediation is complete in PR #5 design files.

No migrations were applied, no live Supabase tables were created, and no
application code was written.

## What Changed

- Added a new design migration:
  `supabase/migrations/20260607144134_0012_data_architecture_and_training_tables.sql`.
- Added documentation for the three-tier data architecture and AI training
  strategy.
- Updated review and remediation docs with new counts, lineage coverage, and
  remaining risks.

## Tables Added

Archive and ingestion:

- `raw_archive_objects`
- `data_ingestion_batches`
- `source_data_files`

Feature store:

- `horse_features`
- `trainer_features`
- `jockey_features`
- `track_features`
- `odds_features`

Training and evaluation:

- `model_training_datasets`
- `model_evaluation_metrics`

Prediction:

- `prediction_runs`
- `prediction_results`
- `prediction_results_default`
- `live_prediction_cache`

## Fields Added

The new tables add support for:

- Storage provider, bucket, object key, object URI, checksum, size, and archive
  coverage windows.
- Source-file schema fingerprints and ingestion batch metadata.
- Entity feature dates, feature-set versions, training window dates, feature
  payloads, and source-file lineage.
- Training dataset windows, 5-year lookback, feature-set manifests, source-file
  manifests, and storage checksums.
- Prediction run scope, model version, parameters, and run windows.
- Permanent prediction result history with model, race, entry, and feature
  snapshot lineage.
- 30-day live serving expiration through `live_prediction_cache.expires_at`.

## What Remains Deferred

- Live migration application.
- Local/shadow database execution proof.
- Raw file storage provisioning.
- Archive lifecycle jobs.
- Feature materialization jobs.
- Monthly retraining orchestration.
- Prediction partition automation.
- Warehouse exports.
- Browser grants and browser-facing policies.

## Final Approval Review Readiness

PR #5 is ready for final approval review after this data strategy remediation.

The final review should remain design-only unless explicitly approved for a
separate migration application planning phase.
