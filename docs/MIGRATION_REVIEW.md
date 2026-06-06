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

## Design Summary

The migration design follows `PHASE1_SCHEMA_PLAN_V2.md` and
`PHASE1_SCHEMA_APPROVAL.md`.

Counts:

- Application tables: 54
- Default partition tables: 8
- RLS policies: 42
- Indexes: 75

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
- System-owned tables remain deny-by-default for browser roles.
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
- Agent/job audit timelines.

JSONB GIN indexes are intentionally deferred until query patterns are proven.

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
