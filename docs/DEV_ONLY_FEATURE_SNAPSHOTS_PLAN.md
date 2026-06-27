# Dev-Only Feature Snapshots Plan

Date: 2026-06-24

## Goal

Plan the next Opportunity-readiness slice after PR #87: Dev-only persisted
`feature_snapshots` for audited pre-race inputs. This is design only. It does
not create migrations, touch Supabase, add write paths, or introduce prediction,
score, wager, Bet Sheet, provider-ingestion, or production behavior.

## Layer Classification

Primary: Layer 1 - Product Differentiator.

Persisted pre-race feature snapshots improve Strideo's ability to identify,
explain, validate, and later improve wagering Opportunities because they make
the exact pre-race inputs reproducible before scoring or value calculation.

Secondary: Layer 2 - Production Readiness for RLS, grants, migration safety,
and leakage/readiness controls.

## Existing Schema

`public.feature_snapshots` already exists and must be reused rather than
duplicated. It was created in
`supabase/migrations/20260607143740_0008_learning_and_performance_tables.sql`
with:

- `id uuid primary key`
- `race_id uuid not null`
- `race_date date not null`
- `race_entry_id uuid`
- `provider text`
- `feature_set_key text not null`
- `feature_set_version text not null`
- `features jsonb not null`
- `captured_at timestamptz not null default now()`
- `source_job_run_id uuid`
- `created_at timestamptz not null default now()`
- composite foreign keys to `races (id, race_date)` and
  `race_entries (id, race_date)`

Later migrations added `source_job_run_id` lineage to `job_runs` and indexes for:

- `(race_id, race_date, race_entry_id, captured_at desc)`
- `(feature_set_key, feature_set_version, captured_at desc)`
- `(source_job_run_id)`
- `(race_entry_id, race_date)`

RLS is enabled on `feature_snapshots`. The initial RLS migration intentionally
added no grants. No migration currently exposes `feature_snapshots` to
authenticated or anon browser access.

## Reuse As-Is

The existing table is enough for the first Dev-only persistence design if the
future implementation stores the full PR #87 output in `features` and keeps the
write path service-side only.

Recommended mapping:

- `race_id`: `snapshot.race.raceId`
- `race_date`: `snapshot.race.raceDate`
- `race_entry_id`: `snapshot.entry.raceEntryId`
- `provider`: `snapshot.race.provider`
- `feature_set_key`: `opportunity_pre_race`
- `feature_set_version`: combine or record the PR #87
  `featureContractVersion` and `snapshotSchemaVersion`
- `features`: JSON envelope containing the PR #87 `snapshot`, audit metadata,
  readiness status, missing-feature reasons, leakage exclusions, market source,
  cutoff details, source lineage ids, and no-write flags
- `captured_at`: `snapshot.lineage.capturedAt`
- `source_job_run_id`: nullable until a Dev job wrapper owns materialization
- `created_at`: database insert timestamp

This approach keeps the PR #87 builder pure and in-memory. The persistence layer
would consume the builder result and write exactly one append-only feature
snapshot fact for Dev review.

## Gaps

The existing schema can store the data, but some fields would be JSON-only:

- readiness status and readiness reasons
- leakage checks and excluded inputs
- trusted pre-race cutoff or `as_of_time`
- snapshot type
- source lineage ids
- horse id
- Opportunity id/race date, when a candidate Opportunity identity is available
- odds snapshot id used for market probability
- idempotency key or source hash for repeatable Dev runs

JSON-only storage is acceptable for the first Dev-only planning slice, but it is
weaker for queryability, policy review, and uniqueness checks.

## Proposed Future Adaptation

If the implementation needs first-class query and validation support, use a
future append-only migration against the existing table. Do not create a second
`feature_snapshots` table.

Potential future columns:

- `snapshot_type text`
- `as_of_time timestamptz`
- `readiness_status text`
- `readiness_reasons jsonb not null default '[]'::jsonb`
- `leakage_checks jsonb not null default '{}'::jsonb`
- `source_lineage jsonb not null default '[]'::jsonb`
- `horse_id uuid references public.horses (id)`
- `opportunity_id uuid`
- `opportunity_race_date date`
- `odds_snapshot_id uuid`
- `source_hash text`

Potential future indexes:

- `(snapshot_type, feature_set_key, feature_set_version, captured_at desc)`
- `(race_id, race_date, snapshot_type, as_of_time desc)`
- `(race_entry_id, race_date, snapshot_type, as_of_time desc)`
- `(horse_id, race_date, snapshot_type)`
- `(readiness_status, captured_at desc)`
- unique or partial unique idempotency index on `source_hash`, if a stable hash
  can be defined without hiding important lineage differences

Potential future constraints:

- `as_of_time <= captured_at` when both are present
- `opportunity_id` and `opportunity_race_date` must be paired when either is set
- foreign key `(opportunity_id, opportunity_race_date)` to
  `opportunities (id, race_date)` only if Opportunity identity is persisted at
  snapshot time
- foreign key `(odds_snapshot_id, race_date)` to
  `odds_snapshots (id, race_date)` only when the stored market source is an odds
  snapshot

Future migration name, if schema changes are authorized:
`add_feature_snapshot_readiness_metadata`. Create it only with
`supabase migration new add_feature_snapshot_readiness_metadata`.

## RLS And Grants

Target posture for future implementation:

- fail closed by default
- no anon access
- no authenticated insert, update, or delete
- defer authenticated read access until a reviewed product surface requires it
- keep any Dev read surface protected and operator-only
- write through a server-only executor using service-role scope after explicit
  Dev authorization and target confirmation

Future implementation should inspect actual grants before writing. If service
role lacks required table privileges through the API path, add a narrow future
migration that grants only the columns needed for `select` and `insert` on
`feature_snapshots`; do not grant prediction, score, wager, Bet Sheet,
provider-ingestion, or Opportunity write access as part of this slice.

## Leakage Protections

The future persistence executor must preserve PR #87's leakage model:

- snapshots are pre-race only
- no result, payout, settlement, recommendation result, user wager result, or
  post-race derived fields in `features`
- no post-cutoff odds
- no closing odds unless the source proves they were captured before off time
  and the payload marks them as pre-race market data
- `captured_at`, trusted cutoff, and any future `as_of_time` must be checked
  against `races.scheduled_at` or trusted off/post time
- ambiguous timing blocks readiness instead of inventing market values
- missing lineage blocks readiness or records explicit missing-feature reasons
- the stored audit envelope should retain excluded inputs without adding the
  excluded values to the feature payload

## Code Integration Plan

Keep `lib/opportunities/scoring/pre-race-snapshot.ts` pure. It should continue
to query nothing and write nothing.

Future code should add a separate server-only persistence module, likely one of:

- `lib/opportunities/scoring/pre-race-snapshot-persistence.ts`
- `lib/opportunities/features/pre-race-snapshot-persistence.ts`

The executor should:

- accept a `PreRaceFeatureSnapshotBuildResult`
- validate the audit persistence flags remain false before write
- build the `feature_snapshots` insert shape
- reject prediction, score, wager, Bet Sheet, provider-ingestion, and Opportunity
  write identifiers
- preserve source lineage and leakage audit details
- use deterministic idempotency if a `source_hash` strategy is approved
- return the inserted `feature_snapshot_id` for later readiness inspection only

Do not link the executor to real model scoring in the same PR.

## Testing Plan

Future implementation tests:

- unit tests for insert-shape mapping from PR #87 snapshot result
- leakage tests that reject result, payout, settlement, post-race odds, and
  ambiguous cutoff inputs
- idempotency tests if `source_hash` is added
- tests proving no prediction, Opportunity score, wager, Bet Sheet, provider
  ingestion, or Opportunity writes are produced
- RLS/grant verification checklist for Dev
- migration filename check and dry-run in the implementation PR

Required validation for future implementation:

```bash
npm run db:migrations:check
npm run db:migrations:dry-run
npm run lint
npm run test
npm run build
npm audit --audit-level=moderate
```

Use `npm run verify` as the standard full pass, plus the database dry-run when a
future migration is created and authorized.

## Sequencing

1. Review this plan.
2. If approved, explicitly authorize a future migration-planning or
   implementation prompt.
3. In that future prompt, confirm target Supabase Dev project
   `strideo-dev` / `ntxtakbggtljjbalgris` before any linked operation.
4. Create any migration only with Supabase CLI timestamp naming.
5. Keep the implementation Dev-only and service-side.
6. Defer prediction outputs, Opportunity score writes, value calculations,
   wager/Bet Sheet work, provider ingestion, alerts, Assistant, ROI, and
   production.

## Recommended Next Prompt

Plan and, only with explicit migration authorization, implement Dev-only
persisted pre-race `feature_snapshots` using the existing table. Confirm the Dev
Supabase target before any linked validation. Keep the PR #87 builder pure,
write only `feature_snapshots`, add no prediction, score, wager, Bet Sheet,
provider-ingestion, PWA, or production changes, and run the full migration
workflow if a migration is created.
