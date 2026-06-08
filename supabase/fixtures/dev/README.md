# Dev Demo Race Fixtures

This directory contains Dev-only fixture data for Strideo race-card UI work.

## Fixtures

- `demo_race_card.sql`
- `demo_import_status.sql`

The fixtures are deterministic and reviewable. The race-card fixture uses
`provider = 'demo'` and fixture-specific provider IDs so it can be re-run
against Dev without creating duplicate reference, race, entry, or result
records. The import-status fixture uses deterministic `batch_key` values so it
can be re-run against Dev without creating duplicate import-status rows.

## What `demo_race_card.sql` Adds

- 1 demo track: Strideo Park
- 2 demo surfaces: Demo Dirt and Demo Turf
- 2 races on `2026-06-08`
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

## Apply In Dev Only

Do not run this fixture against production.

After review and explicit authorization, apply manually to Dev with a database
URL for the Dev project:

```bash
psql "$STRIDEO_DEV_SUPABASE_DB_URL" -v ON_ERROR_STOP=1 \
  -f supabase/fixtures/dev/demo_race_card.sql
```

Apply the import-status fixture only after migration `0019` has been applied
and verified in Dev:

```bash
psql "$STRIDEO_DEV_SUPABASE_DB_URL" -v ON_ERROR_STOP=1 \
  -f supabase/fixtures/dev/demo_import_status.sql
```

The fixtures do not run automatically.

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
