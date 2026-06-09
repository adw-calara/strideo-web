# Wave 3 Race Card Runtime Verification

Date: June 9, 2026

## Scope

This report documents Dev-only runtime verification for the protected Race Card
UI using the existing authenticated read access from
`supabase/migrations/0018_authenticated_race_data_read_access.sql`.

No migration was created or applied during this verification. Production was
not touched.

## Dev Target

- Project: `strideo-dev`
- Project ref: `ntxtakbggtljjbalgris`
- Verification path: read-only Supabase Dev checks plus local protected app
  runtime verification

## Routes Tested

- `/protected/races`
- `/protected/races/[raceId]` for the completed demo race
- `/protected/races/[raceId]` for the scheduled demo race

All tested routes returned HTTP 200 with an authenticated Dev session.

## Implementation Reviewed

Protected routes:

- `app/(app)/protected/races/page.tsx`
- `app/(app)/protected/races/[raceId]/page.tsx`

Server-only data access helper:

- `lib/races/data-access.ts`

The Race Card UI uses the server-only helper and reads only approved
race-card/reference/result tables.

## Tables Read

Approved tables used by the Race Card data access layer:

- `public.surfaces`
- `public.tracks`
- `public.horses`
- `public.jockeys`
- `public.trainers`
- `public.races`
- `public.race_entries`
- `public.odds_snapshots`
- `public.result_versions`
- `public.result_entries`

`public.entry_events` is approved for the Wave 3 race-card scope, but the
current Race Card UI does not need it for the rendered list/detail flow.

No access to `public.job_runs`, `public.source_data_files`, or
`public.raw_archive_objects` was found in the Race Card implementation.

## Dev Data Availability

Read-only Dev checks confirmed the seeded demo race-card data exists:

- Surfaces: 2
- Tracks: 1
- Horses: 14
- Jockeys: 7
- Trainers: 4
- Races: 2
- Race entries: 14
- Entry events: 14
- Odds snapshots: 14
- Result versions: 1
- Result entries: 7

## Runtime Result

Authenticated Dev runtime verification confirmed:

- `/protected/races` rendered the Race Cards page.
- The list displayed 2 race cards for June 8, 2026.
- The list linked to both demo race detail pages.
- The completed demo race detail page rendered race metadata, entries,
  connections, morning line, latest odds, and official result content.
- The scheduled demo race detail page rendered race metadata, entries, and the
  pending/no-result state.
- No safe error state appeared.
- No unapproved raw/operational table names were exposed.
- No prediction, betting recommendation, wager, bankroll, ROI, Opportunity
  score, recommendation result, performance, or strategy logic was introduced.

Authentication used a temporary Dev session for the allowed workspace user.
No application data was inserted, updated, or deleted during runtime
verification.

## Safety Confirmations

- Supabase Dev only.
- Production untouched.
- No migrations created.
- No migrations applied.
- No fixtures added, modified, or applied.
- No app behavior changed.
- No RLS policies modified.
- No Supabase SQL write commands run.
- No access to `job_runs`, `source_data_files`, or `raw_archive_objects`.
- No Opportunity, prediction, betting, wager, bankroll, ROI, performance,
  recommendation, or strategy logic added.

## Validation

- `npm run lint`: passed
- `npm run build`: passed
- `git diff --check`: passed

## Result

Wave 3 Race Card UI is verified in Dev using the existing `0018`
authenticated race read access. No blocker remains for the next approved Wave 3
task.
