# Provider Race-Entry Persistence Slice

Slice name: controlled provider race-entry persistence executor

Branch: `codex/provider-race-entry-persistence-slice`

## Summary

This slice adds a server-only persistence boundary for the existing The Racing
API race-entry adapter write plan. It does not expand provider ingestion. It
executes only the approved canonical race-entry source fact represented by the
adapter plan, and it requires the plan to have passed normalization before any
write attempt.

The executor maps the adapter's logical `race_entry_source_fact` target to the
existing `race_entries` table. No migration is added because `race_entries`
already stores provider identity, canonical entry status, medication, and
metadata for provider/source lineage.

## Files Changed

- `docs/PROVIDER_ADAPTER_RACE_ENTRY_SLICE.md`
- `docs/PROVIDER_RACE_ENTRY_PERSISTENCE_SLICE.md`
- `lib/provider-ingestion/provider-race-entry-adapter-core.ts`
- `lib/provider-ingestion/provider-race-entry-adapter-core.test.ts`
- `lib/provider-ingestion/provider-race-entry-persistence-core.ts`
- `lib/provider-ingestion/provider-race-entry-persistence-core.test.ts`
- `lib/provider-ingestion/provider-race-entry-persistence.ts`
- `package.json`

## Persistence Boundary

Allowed:

- The Racing API race-entry write plan only.
- Logical target: `race_entry_source_fact`.
- Physical target: `race_entries`.
- Operation: deterministic `upsert_plan`.
- Conflict target: `provider,provider_entry_id,race_date`.
- Canonical fields: entry status and medication.
- Lineage metadata: provider payload shape, provider ids, source paths, raw
  values, canonical values, labels, normalization results, warnings, blocking
  reasons, and raw provider payload.

Required before write:

- Non-null write plan.
- `ml_feature_materialization_status: "ready"`.
- Expected provider payload shape: `the_racing_api_race_entry_v1`.
- Required source paths for race type, surface, and entry status.
- Required canonical values and normalization results for race type, surface,
  and entry status.
- Canonical `raceId` binding supplied by the caller.
- Valid race date from the binding or provider payload.

Rejected:

- Null or blocked plans.
- Unknown targets.
- Unknown operations.
- Missing lineage.
- Missing required canonical values.
- Forbidden write identifiers for Opportunities, predictions, value
  calculations, wager recommendations, model training, or feature snapshots.

## Intentionally Out Of Scope

- No new provider payload shapes.
- No full ingestion framework.
- No scheduled imports.
- No migrations.
- No seed data.
- No Production access.
- No live Dev database writes in this PR.
- No Opportunity generation.
- No prediction output creation.
- No value-calculation writes.
- No wager recommendation writes.
- No model-training writes.
- No UI changes.

## Validation Results

Passed:

- `npm run verify`
- `npm run test`
- `npm run db:migrations:check`
- `npm run db:migrations:dry-run`: `Remote database is up to date`
- `git diff --check`
- `npm run racing-codes:unresolved:report`: `Total unresolved rows: 0`
- `npm run racing-codes:unresolved:report -- --json`: valid JSON with
  `totalUnresolvedRows: 0`

## Safety Confirmations

- Production was not touched.
- No migrations were added or applied.
- No live Supabase writes were performed.
- No Opportunity, prediction, wager, value-calculation, feature-snapshot, or
  model-training writes were introduced.
- The executor uses dependency injection in tests, so persistence behavior is
  verified without touching a live database.
- The unrelated local `outputs/` directory was left untracked and excluded.

## Watchlist

This PR belongs on the review watchlist because:

- It introduces a write executor.
- Persistence behavior touches canonical race data.
- Idempotency is non-trivial and depends on provider, provider entry id, and
  race date.

Reviewers should focus on:

- Whether the `race_entries` mapping is narrow enough for this first slice.
- Whether metadata lineage is sufficient for audit and reprocessing.
- Whether blocked and malformed plans fail closed.
- Whether live Dev verification needs a narrow service-role grant or alternate
  server-only execution path before the Supabase store adapter can write.
- Whether future live Dev verification should first use a controlled fixture
  before any provider job depends on this executor.
