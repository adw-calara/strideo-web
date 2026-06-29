# Dev Demo Race Fixtures

This directory contains Dev-only fixture data for Strideo race-card UI work.

## Fixtures

- `demo_race_card.sql`
- `demo_import_status.sql`
- `starter_racing_glossary.sql`
- `race_entry_verification_aliases.sql`

The fixtures are deterministic and reviewable. The race-card fixture uses
`provider = 'demo'` and fixture-specific provider IDs so it can be re-run
against Dev without creating duplicate reference, race, entry, or result
records. The import-status fixture uses deterministic `batch_key` values so it
can be re-run against Dev without creating duplicate import-status rows. The
starter racing glossary fixture uses source-attributed code-set, canonical
value, and alias upserts so it can be re-run against Dev without creating
duplicate glossary rows. The race-entry verification alias fixture is an even
narrower provider-specific overlay for the exact The Racing API fixture
shorthand used by the controlled PR #71 runtime verification harness.

## What `demo_race_card.sql` Adds

- 1 demo track: Strideo Park
- 2 demo surfaces: Demo Dirt and Demo Turf
- 2 races on `2026-06-08`
- Minimum structured race-condition metadata on both races for the
  racing-form coverage readiness checker
- 14 total entries, 7 per race
- Linked demo horses, jockeys, and trainers
- Morning-line odds on every entry
- 2 win-pool odds snapshots per entry for the completed race
- 1 official result version with result entries for the completed race
- 1 scheduled race with no final result rows

## What `demo_import_status.sql` Adds

- 1 successful demo import batch for the Wave 3 race-card fixture
- 1 sanitized warning-state demo batch for future Data Imports UI states
- Provider/source: `demo`
- Data domain: `race_card`
- Coverage date: `2026-06-08`
- Sanitized metadata with affected track, race, entry, odds, and result counts
- Source-details-hidden markers for UI display

## What `starter_racing_glossary.sql` Adds

- Starter reviewed racing-form code sets
- Canonical values for common race types, race grades, surfaces, track
  conditions, workout shorthand, horse sex, horse color, Lasix, finish margins,
  running-line status, entry status, and result status
- Source-attributed aliases from sources already documented in
  `docs/RACING_FORM_GLOSSARY_AUDIT.md`
- No track-code aliases
- No unresolved-code rows
- No seed rows for ambiguous medication/equipment meanings

## What `race_entry_verification_aliases.sql` Adds

- Dev-only `the_racing_api` aliases for the exact PR #71 runtime verification
  fixture shorthand:
  - `race.type_code`: `MSW` -> `race_type.maiden_special_weight`
  - `race.surface_code`: `D` -> `surface.dirt`
  - `race.track_condition_code`: `FT` -> `track_condition.fast`
  - `horse.sex_code`: `g` -> `horse_sex.gelding`
  - `horse.color_code`: `B` -> `horse_color.bay`
  - `entry.medication_code`: `L` -> `medication.lasix`
  - `entry.status_code`: `RUN` -> `entry_status.entered`
  - `recent_workout.work_type_code`: `B` -> `workout_type.breezing`
- The minimum canonical code sets and values required by those aliases if the
  broader starter glossary fixture has not been applied yet
- No unresolved-code rows
- No track-code aliases
- No broad U.S. track-code seed

## What These Fixtures Do Not Add

- No production data
- No prediction scores
- No Opportunities
- No value scores or bet recommendations
- No wagers, bet sheets, bankroll, ROI, or user-owned betting data
- No provider credentials
- No raw provider payloads
- No file or storage URIs
- No `job_runs`, `source_data_files`, or `raw_archive_objects` rows
- No schema changes or migrations
- No ML feature snapshots or model-training data
- No all-track-code seed set

## Apply In Dev Only

Do not run this fixture against production.

The preferred Codex/repo path is the linked Supabase CLI wrapper. It loads the
local, gitignored `SUPABASE_DB_PASSWORD`, targets the linked Dev project, and
does not require a full database URL or `psql` on PATH.

Before any fixture apply, confirm the linked project is `strideo-dev` /
`ntxtakbggtljjbalgris`, run `npm run db:migrations:dry-run`, and obtain
explicit Dev-only authorization for the specific fixture file.

Apply the race-card fixture after review and explicit Dev-only authorization:

```bash
node scripts/supabase-cli-with-env.mjs db query --linked \
  --file supabase/fixtures/dev/demo_race_card.sql
```

If local `psql` is available and `STRIDEO_DEV_SUPABASE_DB_URL` is set to the
direct Dev database URL, the equivalent manual path is:

```bash
psql "$STRIDEO_DEV_SUPABASE_DB_URL" -v ON_ERROR_STOP=1 \
  -f supabase/fixtures/dev/demo_race_card.sql
```

Apply the import-status fixture only after migration `0019` has been applied
and verified in Dev:

```bash
node scripts/supabase-cli-with-env.mjs db query --linked \
  --file supabase/fixtures/dev/demo_import_status.sql
```

Equivalent `psql` path:

```bash
psql "$STRIDEO_DEV_SUPABASE_DB_URL" -v ON_ERROR_STOP=1 \
  -f supabase/fixtures/dev/demo_import_status.sql
```

The fixtures do not run automatically.

Apply the starter racing glossary fixture only after PR review and explicit
Dev-only authorization:

```bash
node scripts/supabase-cli-with-env.mjs db query --linked \
  --file supabase/fixtures/dev/starter_racing_glossary.sql
```

Equivalent `psql` path:

```bash
psql "$STRIDEO_DEV_SUPABASE_DB_URL" -v ON_ERROR_STOP=1 \
  -f supabase/fixtures/dev/starter_racing_glossary.sql
```

Apply the race-entry verification alias fixture only after PR review and
explicit Dev-only authorization:

```bash
node scripts/supabase-cli-with-env.mjs db query --linked \
  --file supabase/fixtures/dev/race_entry_verification_aliases.sql
```

Equivalent `psql` path:

```bash
psql "$STRIDEO_DEV_SUPABASE_DB_URL" -v ON_ERROR_STOP=1 \
  -f supabase/fixtures/dev/race_entry_verification_aliases.sql
```

## Cleanup

`demo_race_card.sql` includes a commented cleanup block at the bottom. Review
and run that block only against Dev when the demo fixture should be removed.

The cleanup block deletes only records identified by `provider = 'demo'` and
the fixture marker `wave3_demo_race_card`.

`demo_import_status.sql` also includes a commented cleanup block at the bottom.
Review and run that block only against Dev when the import-status fixture should
be removed.

The import-status cleanup block deletes only deterministic rows identified by
fixture-specific `batch_key` values, `source_system = 'demo'`, and the fixture
marker `wave3_demo_import_status`.

`starter_racing_glossary.sql` intentionally does not include a cleanup block.
Once applied, canonical glossary ids may become referenced by ingestion, feature
snapshots, value calculations, or review notes. Remove or revise seeded glossary
rows only through a reviewed forward cleanup plan.

`race_entry_verification_aliases.sql` also intentionally does not include a
cleanup block. It only upserts reviewed Dev verification aliases and canonical
values. Remove or revise seeded glossary rows only through a reviewed forward
cleanup plan.
