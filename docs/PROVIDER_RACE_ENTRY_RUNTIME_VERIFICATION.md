# Provider Race-Entry Runtime Verification

## Summary

This document tracks the controlled Dev-only runtime verification harness for
PR #70, `Add controlled race-entry persistence executor`.

Branch: `codex/provider-race-entry-runtime-verification-harness`

Dependency: PR #70 branch
`codex/provider-race-entry-persistence-slice`.

## Harness

Command:

```bash
npm run provider-ingestion:verify:race-entry-dev
```

Script:

- `scripts/verify-provider-race-entry-persistence-dev.ts`

The harness refuses to run unless the Supabase URL and local linked project are
confirmed as Strideo Dev:

- project: `strideo-dev`
- ref: `ntxtakbggtljjbalgris`

The script requires server-only Supabase service-role environment variables, but
does not print their values.

## Runtime Safety Gates

Before any write, the harness verifies:

- `NODE_ENV` is not `production`.
- `NEXT_PUBLIC_SUPABASE_URL` points at `ntxtakbggtljjbalgris`.
- `SUPABASE_SERVICE_ROLE_KEY` exists.
- `supabase/.temp/linked-project.json` names `strideo-dev`
  / `ntxtakbggtljjbalgris`.
- The deterministic fixture identity is known.
- The bound Dev race row already exists.
- Normalization is performed with read-only alias lookup, so unresolved-code
  rows are not created as a side effect.
- The adapter produces a writable plan.
- The write plan target is `race_entry_source_fact`.
- The provider payload shape is `the_racing_api_race_entry_v1`.
- Forbidden Opportunity, prediction, value-calculation, wager, feature-snapshot,
  model-training, strategy-marketplace, bankroll, and bet-sheet identifiers are
  absent from the write plan, except for the explicit prohibited-side-effects
  guardrail list.
- No row already exists for the deterministic runtime-verification identity.

## Expected Runtime Scope

Fixture:

- source fixture:
  `lib/provider-ingestion/fixtures/the-racing-api-race-entry.fixture.ts`
- runtime fixture name:
  `the-racing-api-race-entry-runtime-verification`

Expected write table:

- `public.race_entries`

Expected row identity / upsert key:

- provider: `the_racing_api`
- provider entry id: `tra-runtime-verification-entry-20260608-demo-01`
- race date: `2026-06-08`
- conflict target: `provider,provider_entry_id,race_date`

Bound Dev race:

- provider: `demo`
- provider race id: `demo-race-2026-06-08-01`
- race date: `2026-06-08`

The harness does not create a race fixture. If the bound Dev race is missing, it
stops before writing.

## Result

Passed after Dev alias coverage and the reviewed service-role write grant were
applied.

Command run:

```bash
npm run provider-ingestion:verify:race-entry-dev
```

Dev project confirmed:

- project: `strideo-dev`
- ref: `ntxtakbggtljjbalgris`

Initial runtime verification did not write because read-only normalization did
not produce a writable plan. The harness stopped before persistence when Dev did
not have active aliases for the fixture shorthand:

- race type: `MSW`
- surface: `D`
- track condition: `FT`
- horse sex: `g`
- horse color: `B`
- medication: `L`
- entry status: `RUN`
- workout type: `B`

The harness intentionally uses read-only alias resolution. It did not call
`normalizeOrFlagRacingCode`, did not insert unresolved-code rows, and did not
persist a race-entry row when aliases were missing.

Follow-up alias coverage was applied from branch
`codex/dev-racing-glossary-alias-seed` using:

- `supabase/fixtures/dev/race_entry_verification_aliases.sql`

Follow-up service-role write access was applied from branch
`codex/race-entry-service-role-write-access` using:

- `supabase/migrations/20260616181520_race_entry_service_role_write_access.sql`

The latest runtime verification confirmed normalization, persistence, readback,
idempotency, and cleanup.

Readback result:

- target table: `race_entries`
- deterministic identity read back one generated row id
- status: `entered`
- medication: `lasix`
- duplicate rows after the second execution: `0`

Idempotency result:

- first execution row count: `1`
- second execution row count: `1`
- first and second execution read back the same generated row id

Cleanup result:

- deleted count: `1`
- final deterministic `race_entries` identity count: `0`

Tables read:

- `races`
- `racing_code_sets`
- `racing_code_aliases`
- `racing_code_values`
- `race_entries` for post-blocker count confirmation

Tables written:

- racing-code alias seed pass:
  - `racing_code_sets`
  - `racing_code_values`
  - `racing_code_aliases`
- PR #71 harness pass:
  - `race_entries` only, using the deterministic runtime-verification identity

Follow-up required:

1. Keep the harness PR stacked or retargeted deliberately; it currently depends
   on PR #70's executor branch.
2. After dependency branches land, re-run
   `npm run provider-ingestion:verify:race-entry-dev` from the final merge
   candidate before enabling provider ingestion workflows.

## Validation

Passed before the blocked runtime attempt:

- `git diff --check`
- focused provider-ingestion tests:
  `npx tsx --test lib/provider-ingestion/provider-race-entry-adapter-core.test.ts lib/provider-ingestion/provider-race-entry-persistence-core.test.ts`
- `npm run verify`
- `npm run db:migrations:dry-run`: `Remote database is up to date`
- `npm run racing-codes:unresolved:report`: `Total unresolved rows: 0`
- `npm run racing-codes:unresolved:report -- --json`: `totalUnresolvedRows: 0`

The blocked runtime attempts did not create unresolved-code rows. A follow-up
`npm run racing-codes:unresolved:report -- --json` still reported
`totalUnresolvedRows: 0`.

After applying Dev alias coverage and service-role write access, the harness
passed end to end. It wrote one deterministic `race_entries` row, repeated the
same upsert without creating a duplicate, read back the same row id, deleted the
deterministic fixture row, and confirmed the final row count was `0`.

## Safety Confirmations

- Production must not be touched.
- No migrations are added or applied.
- No seed data is inserted.
- No Opportunity writes are allowed.
- No prediction writes are allowed.
- No value-calculation writes are allowed.
- No wager writes are allowed.
- No feature-snapshot writes are allowed.
- No ML-training writes are allowed.
- No strategy marketplace writes are allowed.
- No bankroll writes are allowed.
- No bet sheet writes are allowed.

## Watchlist

PR #70 remains high-risk because it introduces a canonical race-entry write
executor.

This harness branch is also high-risk because it performs controlled Dev writes
to prove deterministic persistence, readback, idempotency, and cleanup.
