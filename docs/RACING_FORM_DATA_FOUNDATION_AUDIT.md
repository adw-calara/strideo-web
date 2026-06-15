# Racing Form Data Foundation Audit

## Purpose

Strideo should remain PRD-centered and Opportunity-centered while ingesting full racing-form data for model training, value calculation, and post-race improvement. The existing schema already protects the core Opportunity workflow; this audit identifies the smallest additive database slice needed to preserve richer racing-form facts without turning the app into a generic racing-form viewer.

## Current Schema Support

- Opportunity-centered architecture is established through `opportunities`, `opportunity_subjects`, `opportunity_scores`, `opportunity_explanations`, `opportunity_events`, wager recommendation tables, and recommendation/performance result tables.
- Race-card facts are supported by `tracks`, `surfaces`, `horses`, `jockeys`, `trainers`, `races`, `race_entries`, `entry_events`, `odds_snapshots`, `result_versions`, and `result_entries`.
- ML lineage is partially established through `model_versions`, `feature_snapshots`, `prediction_outputs`, `prediction_runs`, `prediction_results`, `live_prediction_cache`, `model_training_runs`, `model_evaluation_runs`, `model_training_datasets`, and `model_evaluation_metrics`.
- Warm feature-store facts exist for horses, trainers, jockeys, tracks, and odds through `horse_features`, `trainer_features`, `jockey_features`, `track_features`, and `odds_features`.
- Raw/source lineage exists through `raw_archive_objects`, `data_ingestion_batches`, `source_data_files`, `job_runs`, `agent_logs`, and `event_log`.
- Current app read paths use the established race card and Opportunity tables. No current UI route requires direct access to deeper racing-form source facts.

## Partially Supported

- Race conditions are stored mostly as `races.conditions`, `races.class_rating`, `races.distance_*`, `races.race_type`, and `races.purse`; structured fields for claiming price, class level, restrictions, field size, weather, track condition, and available wager types are missing.
- Race-entry form facts store horse, jockey, trainer, program number, post, morning-line odds, weight, medication, and equipment; owner, claim movement, layoff, physical notes, comments, and trip notes are missing.
- Horse and trainer model inputs can be stored as JSON feature facts, but the normalized source facts behind those features are not yet preserved.
- Value and edge can appear in `opportunity_scores`, but there is no append-only `value_calculations` fact tying model probability, market odds, feature snapshot, odds snapshot, prediction output, Opportunity, and result lineage together.

## Missing

- Durable normalized horse past-performance lines with prior race context, running positions, figures, odds, notes, and next-out indicators.
- Durable normalized horse workout/training rows with timing, ranking, work style, spacing, layoff sequence, and explainable inferred signal payloads.
- Durable trainer performance statistics by context: track, surface, distance, class, race type, layoff state, claim state, medication/equipment change, jockey/trainer combo, owner/trainer combo, recent form, earnings, and ROI.
- Owner reference records and owner links from race entries.
- Structured race-condition columns needed for value features and filtering.
- A first-class value-calculation lineage table.

## Required Now

This PR should add only the foundation needed for complete racing-form ingestion and ML value lineage:

- `owners`
- structured race-condition columns on `races`
- owner/claim/layoff/comment columns on `race_entries`
- `horse_past_performances`
- `horse_workouts`
- `trainer_performance_stats`
- `value_calculations`
- optional `opportunity_scores.value_calculation_id`

These additions preserve existing read behavior because they are additive, server-owned, and not granted to `anon` or `authenticated`.

## Can Safely Wait

- Canonical provider reconciliation across multiple racing feeds.
- Full owner/stable history tables beyond the current entry-level owner links.
- Dedicated pedigree entity tables for sire, dam, dam sire, breeder, and family lines.
- Monthly partitions for high-volume past-performance and workout facts.
- Browser-facing policies and grants for new racing-form source tables.
- UI routes for horse, trainer, owner, or racing-form detail pages.
- Automated feature extraction pipelines and model retraining jobs.
- Production migration application.

## Opportunity Continuity

The proposed schema keeps `Opportunity` as the product center:

- Race entries remain the link between horse-level source facts and Opportunity subjects.
- `value_calculations` can point to `opportunity_id` when a value calculation creates or supports an Opportunity.
- `opportunity_scores.value_calculation_id` lets Opportunity scoring reference the exact value fact used without replacing existing score history.
- Results and performance still roll up through existing recommendation and Opportunity performance tables.

## Duplicate-Avoidance Notes

- Do not create duplicate `races`, `race_entries`, `horses`, `trainers`, `jockeys`, `odds_snapshots`, `feature_snapshots`, `prediction_outputs`, or `prediction_results` tables.
- Use `horse_past_performances` and `horse_workouts` for normalized source facts, then derive `horse_features` and `feature_snapshots` from them.
- Use `trainer_performance_stats` for published/provider trainer-stat facts, then derive `trainer_features` from them.
- Use `value_calculations` for append-only fair-value/edge facts; keep `opportunity_scores` as the Opportunity read model and score history.

## RLS Model

- Enable RLS on every new public table.
- Add no `anon` grants.
- Add no broad `authenticated` grants.
- Keep new tables server-owned until specific UI/API access patterns and policy tests exist.
- Grant only narrow `service_role` access needed for server-side ingestion and value-calculation writes: `owners` can be selected, inserted, and updated; append-oriented form/value fact tables can be selected and inserted.
- Existing authenticated read behavior for race cards and Opportunities should be unchanged.

## Intended Indexes

- Horse history lookup: `(horse_id, prior_race_date desc)` and observed-entry lookup on `horse_past_performances`.
- Workout lookup: `(horse_id, workout_date desc)` and trainer/date lookup on `horse_workouts`.
- Trainer stats lookup: `(trainer_id, stat_date desc, stat_context)` plus track, jockey, and owner dimension indexes.
- Value lineage lookup: `feature_snapshot_id`, `odds_snapshot_id`, `prediction_output_id`, `(opportunity_id, race_date)`, `(race_entry_id, race_date)`, and model/date indexes.
- Race/entry enrichment lookup: race condition and owner/layoff indexes.

## Migration Order

1. Add owner reference records.
2. Add structured columns to `races` and `race_entries`.
3. Add past-performance, workout, trainer-stat, and value-calculation facts.
4. Enable RLS on new tables.
5. Add comments, constraints, and indexes.
6. Add no browser-facing grants.

## High-Risk Watchlist

- Any PR that writes Opportunities without linking back to race entries and value lineage.
- Any PR that overwrites odds, prediction, score, result, past-performance, workout, or trainer-stat facts instead of appending/versioning.
- Any PR that exposes new source-fact tables to `anon` or `authenticated` without explicit policy tests.
- Any PR that derives features without recording source file, ingestion batch, feature snapshot, model version, odds snapshot, and prediction lineage.
- Any PR that treats provider identity fields as canonical across feeds without reconciliation rules.
- Any PR that applies production migrations before Dev drift checks and dry-run verification pass.
