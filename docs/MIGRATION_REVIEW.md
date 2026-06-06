# Phase 1A Migration Review

## Status

Migration design is ready for review.

These files are design-only. They have not been applied to Supabase and do not
create live database objects.

## Migration Files

- `supabase/migrations/0002_extensions_and_types.sql`
- `supabase/migrations/0003_reference_tables.sql`
- `supabase/migrations/0004_transaction_tables.sql`
- `supabase/migrations/0005_opportunity_tables.sql`
- `supabase/migrations/0006_wager_tables.sql`
- `supabase/migrations/0007_user_and_entitlement_tables.sql`
- `supabase/migrations/0008_learning_and_performance_tables.sql`
- `supabase/migrations/0009_audit_tables.sql`
- `supabase/migrations/0010_rls_policies.sql`
- `supabase/migrations/0011_indexes_and_partitions.sql`
- `supabase/migrations/0012_data_architecture_and_training_tables.sql`

## Design Summary

The migration design follows `PHASE1_SCHEMA_PLAN_V2.md` and
`PHASE1_SCHEMA_APPROVAL.md`.

Counts:

- Application tables: 67
- Default partition tables: 9
- RLS policies: 35
- Indexes: 94

## Requirement Coverage

Append-only design:

- Odds snapshots, entry events, result versions, strategy matches, Opportunity
  events, Opportunity scores, Opportunity explanations, wager recommendations,
  recommendation results, recommendation result events, job logs, and system
  event logs are append-only facts.
- Mutable columns are limited to read-model pointers, user workflow state, and
  operational timestamps.

Opportunity history:

- Global lifecycle state lives on `opportunities`.
- Lifecycle transitions are preserved in `opportunity_events`.
- User-specific workflow state lives separately in `watchlist_items`,
  `daily_bet_sheets`, `daily_bet_sheet_entries`, and `user_recorded_wagers`.

Multi-horse Opportunities:

- `opportunity_subjects` normalizes entry subjects and supports roles such as
  `primary`, `include`, `exclude`, `key`, `contender`, and `fade`.

Recommendation version history:

- `wager_recommendations` is partitioned by `race_date`.
- Recommendation replacements are preserved through
  `supersedes_wager_recommendation_id`.
- Recommendation status and replacement events are preserved in
  `wager_recommendation_events`.

Result correction history:

- `result_versions` preserves unofficial, official, corrected, and voided
  result versions.
- `recommendation_results` links verification to the exact result version used.

Wager normalization:

- System recommendations use `wager_recommendations`,
  `wager_recommendation_legs`, and `wager_recommendation_leg_entries`.
- User-recorded wagers use `user_recorded_wagers` and remain distinct from
  system-generated recommendations.

Strategy Marketplace foundations:

- `strategies` includes ownership, visibility, publication status, license
  type, parent strategy, validation status, and current version pointers.
- `strategy_versions` preserves immutable strategy configuration history.
- Full marketplace commerce tables remain intentionally deferred.

Learning engine lineage:

- `model_versions`, `feature_snapshots`, and `prediction_outputs` preserve
  model, input, and output lineage.
- Strategy matches and Opportunity scores link back to prediction lineage.
- `prediction_runs`, `prediction_results`, `model_training_datasets`, and
  `model_evaluation_metrics` support monthly retraining, permanent prediction
  history, and a 5-year rolling training window.

Historical data architecture:

- `raw_archive_objects`, `data_ingestion_batches`, and `source_data_files`
  preserve cold archive metadata and source-file lineage for 10 years of U.S.
  thoroughbred history.
- `horse_features`, `trainer_features`, `jockey_features`, `track_features`,
  and `odds_features` provide the warm feature-store layer.
- `live_prediction_cache` provides the 30-day serving layer while
  `prediction_results` remains permanent append-only prediction history.

Mobile/offline readiness:

- User workflow tables include `user_id`, `updated_at`, and
  `client_mutation_id` where mobile idempotency is needed.
- `user_devices` provides a foundation for future sync cursors and device
  registration.

Analytics warehouse compatibility:

- Fact tables are append-only and include timestamps, source job references, and
  partition keys.
- Partition boundaries are race-date aligned for racing facts and created-time
  aligned for operational logs.

## RLS And Access Review

- RLS is enabled on every application table in the public schema.
- Default partition tables also enable RLS in `0011_indexes_and_partitions.sql`.
- User-owned tables have owner-only policies using `auth.uid()`.
- User-owned child tables use owner-scoped composite foreign keys so child rows
  cannot point at another user's parent records.
- System-owned tables remain deny-by-default for browser roles.
- Profile, strategy, and strategy-version writes are server-owned for MVP; direct
  browser update policies are intentionally deferred.
- `event_log` remains server-only and has no browser select policy.
- Historical archive, feature-store, prediction, and live-serving tables are
  server-owned and have RLS enabled with no browser-facing policies.
- No broad `anon` grants are added.
- No broad `authenticated` grants are added.
- No public table access is introduced by these migrations.
- Service role access is preserved by relying on Supabase role behavior and not
  changing service-role privileges.

## Partition Review

Partitioned by `race_date`:

- `races`
- `race_entries`
- `odds_snapshots`
- `opportunities`
- `wager_recommendations`
- `recommendation_results`

Partitioned by `created_at`:

- `agent_logs`
- `event_log`

Partitioned by `prediction_date`:

- `prediction_results`

The migration creates default partitions only. Monthly partition automation must
be designed before production ingestion starts.

## Index Review

Indexes cover:

- Provider lookup and race-card ingestion.
- Race-day Opportunity feed queries.
- Race-entry and odds time-series access paths.
- Recommendation replacement/version lookup.
- Daily bet sheet and user workflow queries.
- Entitlement and role checks.
- Prediction lineage and performance verification.
- Historical archive, feature-store, prediction-run, and live-serving access
  paths.
- Agent/job audit timelines.

JSONB GIN indexes are intentionally deferred until query patterns are proven.

## Phase 1A Remediation Notes

The follow-up review in `docs/PHASE1A_MIGRATION_REVIEW.md` identified four
blocking issues. The migration design has been updated as follows:

- User-owned child rows now reference parent rows through composite foreign keys
  that include `user_id`.
- Race-date facts now preserve partition lineage through composite foreign keys
  that include `race_date`.
- Direct browser write policies for `profiles`, `strategies`, and
  `strategy_versions` were removed from the design.
- The user-facing `event_log` select policy was removed so audit data remains
  server-only.

## Phase 1A Data Strategy Notes

The approved historical data architecture and AI training strategy were added in
`0012_data_architecture_and_training_tables.sql`.

- Tier 1 cold storage is represented by archive metadata only; raw bytes stay in
  low-cost object storage.
- Tier 2 warm storage is represented by entity-level feature-store tables and
  source-file lineage.
- Tier 3 live prediction serving is represented by `live_prediction_cache` with
  a 30-day expiry check.
- Permanent prediction history is represented by partitioned
  `prediction_results`.
- Monthly retraining is represented by `model_training_runs`,
  `model_training_datasets`, `model_evaluation_runs`, and
  `model_evaluation_metrics`.

## Not Included

This phase does not:

- Apply migrations.
- Create live Supabase tables.
- Add seed data.
- Add application UI.
- Connect The Racing API.
- Connect OpenAI.
- Grant browser access to application tables.
- Create future marketplace commerce tables.
- Create assistant conversation tables.
- Store raw historical files directly in Postgres.

## Unresolved Risks

- Migration size is substantial and should be reviewed carefully before any
  apply step.
- Monthly partition automation is still required before feed ingestion.
- Entitlement-based shared read policies are intentionally deferred and must be
  tested before enabling Data API access.
- Advanced wager structures beyond win/place/show/exacta/trifecta may require
  `wager_combinations` or multi-race leg tables.
- Full mobile offline sync still needs conflict-resolution rules and sync
  checkpoints.
- Provider identity deduplication will need reconciliation workflows after the
  first racing provider is integrated.
- Archive lifecycle jobs, feature materialization jobs, and prediction-result
  partition automation still need operational implementation before production
  ingestion.
