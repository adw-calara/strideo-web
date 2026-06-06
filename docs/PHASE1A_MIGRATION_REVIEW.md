# Phase 1A Migration Review

## Approval Status

Remediated and ready for final approval review.

The original review found blocking issues that prevented PR #5 from being
approved for migration application planning. The migration design has now been
updated to address those blockers and to integrate the approved historical data
architecture and AI training strategy. No migrations were applied as part of
this review or remediation.

## Review Scope

Reviewed:

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
- `docs/MIGRATION_REVIEW.md`
- `docs/DATA_ARCHITECTURE_AND_AI_TRAINING.md`
- `docs/PHASE1A_DATA_STRATEGY_IMPACT_REVIEW.md`
- `docs/PHASE1A_DATA_STRATEGY_REMEDIATION.md`

## Verification Summary

- Migration order is mostly valid.
- Referenced tables exist before use.
- Partitioned table primary keys and unique constraints include partition keys
  where required.
- No broad grants were added in Phase 1A files.
- No `SECURITY DEFINER` functions were added.
- System recommendations and user-recorded wagers are separated.
- Wager recommendations are normalized into recommendations, legs, and leg
  entries.
- Result correction history is represented through `result_versions`.
- Mobile idempotency fields are included on the primary user workflow tables.
- Strategy Marketplace foundations are present at the ownership/versioning
  level.
- Append-only facts are compatible with future analytics warehouse export.
- Historical archive metadata, source-file tracking, feature-store tables,
  prediction runs/results, permanent prediction history, and the 30-day serving
  layer are now represented in `0012_data_architecture_and_training_tables.sql`.

## Blocking Issues

Status: resolved in the migration design.

### 1. User-Owned Child Rows Can Reference Another User's Parent Rows

Several user-owned child tables use `user_id = auth.uid()` in RLS, but their
foreign keys do not require the referenced parent row to belong to the same
user.

Affected relationships:

- `daily_bet_sheet_entries.daily_bet_sheet_id`
- `daily_bet_sheet_events.daily_bet_sheet_id`
- `daily_bet_sheet_events.daily_bet_sheet_entry_id`
- `user_recorded_wagers.daily_bet_sheet_entry_id`
- `user_wager_results.user_recorded_wager_id`

Risk:

An authenticated user with future table grants could insert a row with their own
`user_id` while pointing to another user's parent UUID if that UUID is known or
leaked. RLS would permit the child row because it only checks the child
`user_id`.

Resolution:

- Added `(id, user_id)` uniqueness to `daily_bet_sheets`,
  `daily_bet_sheet_entries`, and `user_recorded_wagers`.
- Replaced vulnerable single-column parent references with composite
  owner-scoped foreign keys:
  `daily_bet_sheet_entries(daily_bet_sheet_id, user_id)`,
  `daily_bet_sheet_events(daily_bet_sheet_id, user_id)`,
  `daily_bet_sheet_events(daily_bet_sheet_entry_id, user_id, daily_bet_sheet_id)`,
  `user_recorded_wagers(daily_bet_sheet_entry_id, user_id)`, and
  `user_wager_results(user_recorded_wager_id, user_id)`.
- Kept owner-based RLS checks on user workflow tables.

### 2. Partition-Key Integrity Is Missing On Several Cross-Table Facts

Some tables carry `race_date` but do not bind every referenced row to the same
`race_date`.

Affected relationships:

- `wager_recommendation_leg_entries.wager_recommendation_leg_id` references
  `wager_recommendation_legs(id)` only.
- `result_entries.result_version_id` references `result_versions(id)` only.
- `recommendation_results.result_version_id` references `result_versions(id)`
  only.
- `recommendation_results.closing_odds_snapshot_id` is intentionally
  unconstrained.

Risk:

Rows can connect facts from different race dates or races, weakening partition
pruning assumptions and allowing invalid analytics joins.

Resolution:

- Added `(id, race_date)` uniqueness to `wager_recommendation_legs` and
  `result_versions`.
- Replaced `wager_recommendation_leg_entries.wager_recommendation_leg_id` with
  a composite `(wager_recommendation_leg_id, race_date)` FK.
- Replaced result references in `result_entries` and `recommendation_results`
  with composite `(result_version_id, race_date)` FKs.
- Added `(closing_odds_snapshot_id, race_date)` FK from
  `recommendation_results` to `odds_snapshots`.

### 3. Profile And Strategy Update Policies Are Too Broad For Future Grants

The current owner policies allow authenticated users to update all columns on
their own `profiles`, `strategies`, and `strategy_versions` rows if table-level
update grants are later added.

Risk:

User-editable writes could modify sensitive or server-controlled fields such as
`profiles.status`, `profiles.default_plan`, strategy publication fields, license
fields, or validation fields.

Resolution:

- Removed direct authenticated insert/update policies for `profiles`.
- Removed direct authenticated insert/update policies for `strategies`.
- Removed direct authenticated insert/update policies for `strategy_versions`.
- Kept owner select policies so future browser reads can be planned separately
  from server-owned mutation paths.

### 4. Event Log User Policy Could Expose Sensitive Audit Payloads Later

`event_log_select_own_user_events` permits users to select event rows where
`event_log.user_id = auth.uid()` once grants exist.

Risk:

Audit payloads can contain operational context, agent outputs, provider payloads,
or debugging details that should not be browser-readable even when related to a
user.

Resolution:

- Removed `event_log_select_own_user_events`.
- `event_log` remains RLS-enabled with no browser-facing policy.
- Administrative and agent access is preserved through server-side/service-role
  paths, not browser grants.

## Resolution Section

| Blocker | Addressed By | Result |
| --- | --- | --- |
| Cross-user parent/child relationships | Composite `(id, user_id)` uniqueness and owner-scoped FKs | Child rows cannot reference another user's parent row. |
| Race-date lineage gaps | Composite `(id, race_date)` uniqueness and race-date FKs | Facts preserve partition and race snapshot integrity. |
| Over-broad profile/strategy writes | Removed direct insert/update policies for sensitive tables | Future browser access can be granted with least privilege. |
| Audit visibility | Removed direct `event_log` select policy | Audit payloads remain server-only. |
| Historical data and AI training gaps | Added `0012_data_architecture_and_training_tables.sql` | Cold archive metadata, warm feature store, permanent prediction history, 30-day serving cache, and monthly training manifests are represented. |

## Non-Blocking Risks

- `job_runs` is created in `0009`, after many tables already include
  `source_job_run_id`. The late-bound FKs are valid, but a failure in `0009`
  would leave earlier migrations without operational lineage constraints.
- Default partitions are useful as a safety net, but monthly partition
  automation is still required before ingestion volume.
- `prediction_results` also needs monthly partition automation before backfills
  or live prediction volume.
- Nullable `client_mutation_id` unique constraints allow multiple nulls, which
  is acceptable, but API code must require a non-null value for offline writes.
- `strategy_feature_snapshots.feature_snapshot_id` is nullable while also part
  of a uniqueness constraint; duplicate null bridge rows are possible.
- JSONB GIN indexes are intentionally deferred, which is fine for MVP but should
  be revisited once feature and payload query patterns are known.
- `service_role` access remains intact because the migrations do not alter
  service-role privileges.
- Archive lifecycle, feature materialization, and monthly retraining
  orchestration remain operational work outside this PR.

## Required Fixes

Before migration application planning:

1. Re-run static SQL review after remediation.
2. Perform a Supabase dry-run or local shadow-database migration test before any
   live apply step.
3. Keep browser grants deferred until RLS policy tests exist.
4. Update migration application planning with partition automation.

## Recommended Changes

- Move `job_runs` earlier, or split audit foundation from high-volume audit logs,
  so `source_job_run_id` can be constrained at initial table creation.
- Add `force row level security` to application tables before any non-service
  database roles write directly.
- Add comments marking server-owned columns on user-facing tables.
- Add a future `sync_checkpoints` table before shipping true offline mobile
  synchronization.
- Add a future provider reconciliation plan for tracks, horses, jockeys, and
  trainers before integrating a second racing provider.
- Consider adding `wager_combinations` before supporting superfecta or multi-race
  wagers.

## Requirement Checklist

| Requirement | Status | Notes |
| --- | --- | --- |
| Migration order is valid | Mostly pass | Late-bound audit FKs are valid but could be cleaner. |
| Table dependencies resolve | Pass | Tables referenced by FKs exist before use. |
| FKs reference existing tables | Pass | Composite owner and race-date FKs were added where required. |
| Partitioned tables are valid | Pass | Parent PKs/uniques include partition keys and child FKs preserve race dates. |
| RLS policies are safe | Pass | Browser mutation policies were narrowed and audit select was removed. |
| No broad grants exist | Pass | No new grants in Phase 1A files. |
| No `SECURITY DEFINER` functions exist | Pass | None found. |
| User-owned tables include `user_id` | Pass | Required user workflow tables include `user_id`. |
| Opportunity history is append-only | Pass | Events, scores, explanations, and visibility events preserve history. |
| Recommendations and user wagers are separated | Pass | System and user wager tables are distinct. |
| Wager legs and entries are normalized | Pass | Leg/date composite integrity was added. |
| Recommendation versioning is preserved | Pass | Supersession and recommendation events preserve history. |
| Result correction history is preserved | Pass | Composite result/date integrity was added. |
| Mobile idempotency fields exist | Pass | Primary user workflow tables include `client_mutation_id`. |
| Marketplace foundations exist | Pass | Ownership, versioning, visibility, publication, license, and validation are present. |
| Indexes support expected patterns | Pass | Race-day, feed, workflow, lineage, and audit indexes are covered. |
| Supabase Data API settings are safe | Pass | No grants and no public access are added. |
| Warehouse export compatibility | Pass | Append-only facts, partition keys, timestamps, and job lineage are present. |
| Raw archive metadata | Pass | `raw_archive_objects`, `data_ingestion_batches`, and `source_data_files` were added. |
| Feature store tables | Pass | Horse, trainer, jockey, track, and odds features were added. |
| Prediction runs/results | Pass | `prediction_runs`, permanent `prediction_results`, and `live_prediction_cache` were added. |
| 30-day live prediction retention | Pass | `live_prediction_cache.expires_at` is bounded to 30 days from generation. |
| 5-year rolling training window | Pass | `model_training_datasets.lookback_years` defaults to 5 and stores explicit window dates. |

## Final Decision

PR #5 remediation addresses the blocking design findings from the first review
and incorporates the approved historical data architecture and AI training
strategy.

Recommended next step: perform final approval review, then a separate
apply-readiness review focused on SQL execution in a local/shadow database,
Supabase Advisor checks, partition automation, and forward-only migration
operations planning.
