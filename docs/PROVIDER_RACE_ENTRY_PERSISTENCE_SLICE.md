# Provider Race-Entry Persistence Slice

Slice name: controlled provider race-entry persistence executor

Branch: `codex/provider-race-entry-persistence-slice`

## Summary

This slice adds a server-only persistence boundary for the existing The Racing
API race-entry adapter write plan. It does not expand provider ingestion. It
executes only the approved canonical race-entry source fact represented by the
adapter plan, and it requires the plan to have passed normalization before any
write attempt.

The runtime entrypoint is `lib/provider-ingestion/provider-race-entry-persistence.ts`
and imports `server-only`. The pure core is dependency-injected so tests can
exercise write decisions without connecting to Supabase.

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
  calculations, wager recommendations, model training, feature snapshots,
  strategy marketplace, bankroll, or bet sheets.

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
- No feature-snapshot writes.
- No model-training writes.
- No strategy marketplace writes.
- No bankroll writes.
- No bet sheet writes.
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

## Runtime Verification Decision

PR: `#70`

Commit verified: `d985ccad8937c503bd213d5bd953c9fc39bcf0d5`

Dev project confirmed from local Supabase link:

- project: `strideo-dev`
- ref: `ntxtakbggtljjbalgris`

Runtime writes were deferred in the original PR #70 review pass. No Dev row was
inserted, updated, deleted, or cleaned up from this PR branch at that time.

Fixture used: none.

Runtime command or script used in the original PR #70 review pass: none.

Tables touched: none.

Rows touched: none. Rows were not touched because the repo does not yet provide
a narrow Dev-only runtime command, deterministic fixture identity, readback
assertion, idempotency assertion, and cleanup path for this executor.

Readback result in the original PR #70 review pass: not performed.

Runtime idempotency result in the original PR #70 review pass: not performed.
Idempotency was covered by the injected-store tests in this PR and moved to a
separate Dev runtime verification harness.

Cleanup result in the original PR #70 review pass: not applicable because no
live rows were written.

Reason:

- The repo does not yet provide a narrow Dev-only runtime command for this
  executor.
- A safe verification would need to choose or create a controlled race fixture,
  know the exact `race_entries` row identity before execution, run readback, run
  the executor twice for idempotency, and clean up only the fixture row.
- Current migrations show `service_role` select access on `race_entries`, but no
  explicit `service_role` insert/update grant for `race_entries`. Before using
  the Supabase REST upsert store adapter against Dev, the execution path should
  confirm whether a narrow grant or alternate server-only write path is needed.
- Performing the write now would require inventing the runtime harness and
  cleanup path inside a review task, which is not the controlled verification
  boundary requested for this high-risk write executor.

Later stacked runtime verification:

- PR #71 added the Dev-only harness:
  `npm run provider-ingestion:verify:race-entry-dev`.
- PR #72 supplied exact Dev `the_racing_api` alias coverage for the harness
  fixture.
- PR #73 supplied reviewed `service_role` write access for `race_entries`.
- After those Dev dependencies were present, the PR #71 harness passed end to
  end against `strideo-dev` (`ntxtakbggtljjbalgris`).

Verified table:

- `public.race_entries` only.

Verified row identity:

- provider: `the_racing_api`
- provider entry id: `tra-runtime-verification-entry-20260608-demo-01`
- race date: `2026-06-08`

Verified result:

- first execution wrote one deterministic `race_entries` row
- second execution read back the same row id without creating a duplicate
- cleanup deleted exactly one deterministic fixture row
- final deterministic row count was `0`
- no Opportunity, prediction, value-calculation, wager, feature-snapshot,
  model-training, strategy marketplace, bankroll, bet-sheet, or user workflow
  tables were written

Follow-up required:

1. Land the dependency PRs in the reviewed order.
2. Rebase or update PR #70 after the dependency branches land.
3. Re-run the PR #71 harness from the final merge candidate before enabling any
   provider ingestion workflow.

## Safety Confirmations

- Production was not touched.
- No migrations were added or applied.
- No live Supabase writes were performed from this PR branch.
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
- Whether the `race_entries` service-role write grant remains narrow enough as
  provider ingestion expands.
- Whether the PR #71 controlled fixture should stay as a separate verification
  harness or be folded into the final executor merge path.
