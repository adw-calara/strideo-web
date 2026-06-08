# Dev Demo Race Fixtures

This directory contains Dev-only fixture data for Strideo race-card UI work.

## Fixture

- `demo_race_card.sql`

The fixture is deterministic and reviewable. It uses `provider = 'demo'` and
fixture-specific provider IDs so it can be re-run against Dev without creating
duplicate reference, race, entry, or result records.

## What It Adds

- 1 demo track: Strideo Park
- 2 demo surfaces: Demo Dirt and Demo Turf
- 2 races on `2026-06-08`
- 14 total entries, 7 per race
- Linked demo horses, jockeys, and trainers
- Morning-line odds on every entry
- 2 win-pool odds snapshots per entry for the completed race
- 1 official result version with result entries for the completed race
- 1 scheduled race with no final result rows

## What It Does Not Add

- No production data
- No prediction scores
- No Opportunities
- No value scores or bet recommendations
- No wagers, bet sheets, bankroll, ROI, or user-owned betting data
- No import metadata rows
- No schema changes or migrations

## Apply In Dev Only

Do not run this fixture against production.

After review and explicit authorization, apply manually to Dev with a database
URL for the Dev project:

```bash
psql "$STRIDEO_DEV_SUPABASE_DB_URL" -v ON_ERROR_STOP=1 \
  -f supabase/fixtures/dev/demo_race_card.sql
```

The fixture does not run automatically.

## Cleanup

`demo_race_card.sql` includes a commented cleanup block at the bottom. Review
and run that block only against Dev when the demo fixture should be removed.

The cleanup block deletes only records identified by `provider = 'demo'` and
the fixture marker `wave3_demo_race_card`.
