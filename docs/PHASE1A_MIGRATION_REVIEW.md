# Phase 1A Migration Review

## Approval Status

Not approved for migration application planning yet.

PR #5 is strong as a migration-design draft, but it has several blocking issues
that should be fixed before planning an apply step. No migrations were applied
as part of this review.

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
- `docs/MIGRATION_REVIEW.md`

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

## Blocking Issues

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

Required fix:

- Add composite uniqueness on parent tables, such as `(id, user_id)`.
- Replace single-column parent FKs with composite FKs that include `user_id`.
- Keep RLS `with check (user_id = auth.uid())`, and add parent ownership checks
  where composite FKs are not practical.

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

Required fix:

- Add composite uniqueness where needed, for example
  `wager_recommendation_legs(id, race_date)` and
  `result_versions(id, race_date)`.
- Use composite FKs such as
  `(wager_recommendation_leg_id, race_date)`,
  `(result_version_id, race_date)`, and
  `(closing_odds_snapshot_id, race_date)`.

### 3. Profile And Strategy Update Policies Are Too Broad For Future Grants

The current owner policies allow authenticated users to update all columns on
their own `profiles`, `strategies`, and `strategy_versions` rows if table-level
update grants are later added.

Risk:

User-editable writes could modify sensitive or server-controlled fields such as
`profiles.status`, `profiles.default_plan`, strategy publication fields, license
fields, or validation fields.

Required fix:

- Either remove direct browser update policies for server-owned fields and route
  writes through server-side APIs, or pair future grants with explicit
  column-level privileges.
- Split user-editable profile fields from entitlement/status fields if column
  grants become awkward.
- Keep Marketplace publication, license, validation, and status transitions
  server-owned.

### 4. Event Log User Policy Could Expose Sensitive Audit Payloads Later

`event_log_select_own_user_events` permits users to select event rows where
`event_log.user_id = auth.uid()` once grants exist.

Risk:

Audit payloads can contain operational context, agent outputs, provider payloads,
or debugging details that should not be browser-readable even when related to a
user.

Required fix:

- Remove this policy for MVP, or replace it with a sanitized user-facing
  notification/activity table.
- Keep `event_log` server-only unless payload shape is explicitly constrained.

## Non-Blocking Risks

- `job_runs` is created in `0009`, after many tables already include
  `source_job_run_id`. The late-bound FKs are valid, but a failure in `0009`
  would leave earlier migrations without operational lineage constraints.
- Default partitions are useful as a safety net, but monthly partition
  automation is still required before ingestion volume.
- Nullable `client_mutation_id` unique constraints allow multiple nulls, which
  is acceptable, but API code must require a non-null value for offline writes.
- `strategy_feature_snapshots.feature_snapshot_id` is nullable while also part
  of a uniqueness constraint; duplicate null bridge rows are possible.
- JSONB GIN indexes are intentionally deferred, which is fine for MVP but should
  be revisited once feature and payload query patterns are known.
- `service_role` access remains intact because the migrations do not alter
  service-role privileges.

## Required Fixes

Before migration application planning:

1. Add user-scoped composite FKs for user-owned child tables.
2. Add partition-key composite FKs for wager legs, result entries,
   recommendation results, and closing odds snapshots.
3. Restrict profile and strategy write surfaces before any browser grants are
   planned.
4. Remove or defer the direct `event_log` user select policy.
5. Update `docs/MIGRATION_REVIEW.md` counts and risk notes after schema fixes.

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
| FKs reference existing tables | Pass | Some FKs need stronger composite keys. |
| Partitioned tables are valid | Mostly pass | Parent PKs/uniques include partition keys; add more composite child FKs. |
| RLS policies are safe | Blocked | Owner checks are too narrow for child-parent ownership and too broad for updates. |
| No broad grants exist | Pass | No new grants in Phase 1A files. |
| No `SECURITY DEFINER` functions exist | Pass | None found. |
| User-owned tables include `user_id` | Pass | Required user workflow tables include `user_id`. |
| Opportunity history is append-only | Pass | Events, scores, explanations, and visibility events preserve history. |
| Recommendations and user wagers are separated | Pass | System and user wager tables are distinct. |
| Wager legs and entries are normalized | Mostly pass | Normalize exists; add leg/date composite integrity. |
| Recommendation versioning is preserved | Pass | Supersession and recommendation events preserve history. |
| Result correction history is preserved | Mostly pass | Versioning exists; add composite result/date integrity. |
| Mobile idempotency fields exist | Pass | Primary user workflow tables include `client_mutation_id`. |
| Marketplace foundations exist | Pass | Ownership, versioning, visibility, publication, license, and validation are present. |
| Indexes support expected patterns | Pass | Race-day, feed, workflow, lineage, and audit indexes are covered. |
| Supabase Data API settings are safe | Pass | No grants and no public access are added. |
| Warehouse export compatibility | Pass | Append-only facts, partition keys, timestamps, and job lineage are present. |

## Final Decision

PR #5 is not approved for migration application planning yet.

After the required fixes are made and reviewed, it should be eligible for a
second review focused on apply readiness, Supabase Advisor checks, and migration
rollback/forward-only operations planning.
