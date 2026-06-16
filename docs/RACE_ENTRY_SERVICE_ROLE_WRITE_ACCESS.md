# Race Entry Service-Role Write Access

## Summary

This task adds the minimum reviewed database permission boundary needed for the
controlled provider race-entry persistence executor from PR #70 to upsert
canonical `race_entries` facts through the server-only Supabase service-role
client.

Branch: `codex/race-entry-service-role-write-access`

Dependencies:

- PR #70: `Add controlled race-entry persistence executor`
- PR #71: `Add Dev race-entry persistence verification harness`
- PR #72: `Add Dev racing-code aliases for race-entry verification`

## Evidence

PR #71's harness progressed past alias normalization after PR #72's Dev alias
coverage, then failed at the write path with:

```text
race_entries upsert failed: permission denied for table race_entries
```

Dev permission inspection showed:

- `service_role` `SELECT` on `public.race_entries`: true
- `service_role` `INSERT` on `public.race_entries`: false
- `service_role` `UPDATE` on `public.race_entries`: false
- `service_role` `DELETE` on `public.race_entries`: false
- `authenticated` `INSERT` on `public.race_entries`: false
- `anon` `INSERT` on `public.race_entries`: false
- RLS enabled on `public.race_entries`
- no service-role RLS policy was present
- only the existing authenticated select policy was present

This indicates a table/column grant boundary, not a missing alias, migration
drift, sequence permission, or browser-role RLS issue.

## Migration

Migration:

- `supabase/migrations/20260616181520_race_entry_service_role_write_access.sql`

Grants changed:

- `service_role` table-level `INSERT` on `public.race_entries`
- `service_role` table-level `UPDATE` on `public.race_entries`
- `service_role` table-level `DELETE` on `public.race_entries`

The delete grant exists only because PR #71's Dev harness performs deterministic
fixture cleanup after proving write/readback/idempotency. No `anon` or
`authenticated` write grants are added.

Column-level `INSERT`/`UPDATE` was tested first, but the Supabase REST upsert
path still returned `permission denied for table race_entries`. The final
boundary therefore uses table-level `INSERT`/`UPDATE` for `service_role` on this
single table only.

Policies changed:

- none

RLS posture:

- RLS remains enabled.
- No browser-facing write policy is added.
- Authenticated race-entry access remains read-only.

## Dev Verification

Dev project confirmed:

- project: `strideo-dev`
- ref: `ntxtakbggtljjbalgris`

Migration dry-run showed exactly one pending migration:

- `20260616181520_race_entry_service_role_write_access.sql`

The migration was applied to Dev with:

```bash
node scripts/supabase-cli-with-env.mjs db push --linked --yes
```

The first migration draft used column-level `INSERT`/`UPDATE`, but PR #71's
Supabase REST upsert path still failed with `permission denied for table
race_entries`. The migration was updated to table-level `INSERT`/`UPDATE` on
`public.race_entries` for `service_role` only, and Dev was reconciled with:

```bash
node scripts/supabase-cli-with-env.mjs db query --linked \
  "grant insert, update on table public.race_entries to service_role;"
```

Post-application privilege check:

- `service_role` `INSERT` on `public.race_entries`: true
- `service_role` `UPDATE` on `public.race_entries`: true
- `service_role` `DELETE` on `public.race_entries`: true
- `authenticated` `INSERT` on `public.race_entries`: false
- `anon` `INSERT` on `public.race_entries`: false

Migration dry-run after application:

- `Remote database is up to date`

PR #71 harness rerun:

```bash
npm run provider-ingestion:verify:race-entry-dev
```

Result:

- status: `passed`
- target: `strideo-dev` / `ntxtakbggtljjbalgris`
- fixture: `the-racing-api-race-entry-runtime-verification`
- target table: `race_entries`
- deterministic identity:
  - provider: `the_racing_api`
  - provider entry id: `tra-runtime-verification-entry-20260608-demo-01`
  - race date: `2026-06-08`
- first execution: persisted one `race_entries` row
- second execution: persisted against the same row id
- idempotency: passed
- readback:
  - status: `entered`
  - medication: `lasix`
- cleanup: passed, deleted one deterministic fixture row
- row count after cleanup: `0`
- forbidden table-family writes: none reported by the harness

Tables touched by the harness:

- `race_entries`

Harness writes:

- `race_entries` upsert: 2 attempts against the same deterministic identity
- `race_entries` delete: 1 deterministic cleanup row

## Safety Confirmations

- Production must not be touched.
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

PR #71 remains high-risk because it verifies controlled Dev writes.

PR #72 remains relevant because alias coverage is required for normalization.

This permission task is high-risk because it changes service-role write access
to canonical race data.
