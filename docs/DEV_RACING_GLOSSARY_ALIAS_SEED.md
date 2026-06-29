# Dev Racing Glossary Alias Seed

## Summary

This task adds a narrow Dev-only alias fixture for the exact The Racing API
race-entry shorthand needed by PR #71's runtime verification harness.

Branch: `codex/dev-racing-glossary-alias-seed`

Dependencies:

- PR #70: `Add controlled race-entry persistence executor`
- PR #71: `Add Dev race-entry persistence verification harness`

## Fixture

File:

- `supabase/fixtures/dev/race_entry_verification_aliases.sql`

Apply in Dev only:

```bash
node scripts/supabase-cli-with-env.mjs db query --linked \
  --file supabase/fixtures/dev/race_entry_verification_aliases.sql
```

If local `psql` is available and `STRIDEO_DEV_SUPABASE_DB_URL` is set to the
direct Dev database URL, the equivalent manual path can also be used.

The fixture is idempotent. It upserts the minimum code sets, canonical values,
and aliases needed by the verification payload. It does not create schema,
migrations, unresolved-code rows, track-code aliases, Opportunities,
predictions, value calculations, wagers, feature snapshots, ML-training rows,
strategy marketplace rows, bankroll rows, bet-sheet rows, user workflow rows,
or race-entry rows.

## Alias Coverage

All aliases are scoped to `source_system = 'the_racing_api'`.

| Source path | Source code | Code set | Canonical code | Canonical label |
| --- | --- | --- | --- | --- |
| `race.type_code` | `MSW` | `race_type` | `maiden_special_weight` | Maiden Special Weight |
| `race.surface_code` | `D` | `surface` | `dirt` | Dirt |
| `race.track_condition_code` | `FT` | `track_condition` | `fast` | Fast |
| `horse.sex_code` | `g` | `horse_sex` | `gelding` | Gelding |
| `horse.color_code` | `B` | `horse_color` | `bay` | Bay |
| `entry.medication_code` | `L` | `medication` | `lasix` | Lasix |
| `entry.status_code` | `RUN` | `entry_status` | `entered` | Entered |
| `recent_workout.work_type_code` | `B` | `workout_type` | `breezing` | Breezing |

Ambiguous shorthand is resolved only by code-set/source-path context. `B` is not
seeded as Bute or blinkers. First-time Lasix remains deferred.

## Dev Safety

Expected Dev target:

- project: `strideo-dev`
- ref: `ntxtakbggtljjbalgris`

Expected write tables for alias seeding:

- `public.racing_code_sets`
- `public.racing_code_values`
- `public.racing_code_aliases`

Expected write table for the later PR #71 harness rerun:

- `public.race_entries` only, using the harness deterministic fixture identity

## Runtime Result

Dev alias fixture applied successfully.

Command used:

```bash
node scripts/supabase-cli-with-env.mjs db query --linked \
  --file supabase/fixtures/dev/race_entry_verification_aliases.sql
```

Dev project confirmed:

- project: `strideo-dev`
- ref: `ntxtakbggtljjbalgris`

Alias verification query returned all eight expected `the_racing_api` mappings:

- `entry_status` / `RUN` -> `entered`
- `horse_color` / `B` -> `bay`
- `horse_sex` / `g` -> `gelding`
- `medication` / `L` -> `lasix`
- `race_type` / `MSW` -> `maiden_special_weight`
- `surface` / `D` -> `dirt`
- `track_condition` / `FT` -> `fast`
- `workout_type` / `B` -> `breezing`

Unresolved-code reports remained clean:

- `npm run racing-codes:unresolved:report`: `Total unresolved rows: 0`
- `npm run racing-codes:unresolved:report -- --json`: `totalUnresolvedRows: 0`

PR #71 harness rerun before PR #73:

```bash
npm run provider-ingestion:verify:race-entry-dev
```

Result:

- Alias normalization progressed past the previous missing-alias blocker.
- The harness failed closed at the canonical race-entry write path with:
  `race_entries upsert failed: permission denied for table race_entries`.
- Deterministic `race_entries` fixture identity count after the failed run:
  `0`.
- Idempotency was not runtime-confirmed because the first write did not persist.
- Cleanup was not needed because no `race_entries` fixture row was written.

PR #71 was updated separately at commit
`e1c0aab8b924e7af084f8c681bea300029a0db85` to document this blocker and to
fix the harness readback expectation for `RUN` from `started` to `entered`,
matching existing adapter/parser tests and this alias seed.

Follow-up after PR #73:

- PR #73 added reviewed `service_role` write access for `public.race_entries`
  and has been merged into `main`.
- PR #71's Dev harness later passed end to end with this alias coverage and the
  PR #73 permission boundary in place.
- The harness wrote only `race_entries`, proved idempotent upsert/readback,
  deleted exactly one deterministic fixture row, and confirmed the final row
  count was `0`.

## Safety Confirmations

- Production must not be touched.
- No migrations are added or applied.
- No unresolved-code rows are inserted.
- No seed data outside the exact alias coverage above is added.
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

This alias seed task is high-risk only when applying the Dev data fixture.
