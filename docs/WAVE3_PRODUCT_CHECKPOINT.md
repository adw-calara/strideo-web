# Wave 3 Product Checkpoint

## Summary

Wave 3 now has the first protected race-card product surface on `main`.
Authenticated Strideo users can view seeded Dev race cards through the
protected app shell, using the existing canonical race/reference/result schema.

- Main checkpoint commit: `aeb18d76`
- PR merged: `#33` protected Race Card UI
- Dev project: `strideo-dev`
- Dev project ref: `ntxtakbggtljjbalgris`
- Production touched: no
- Migrations applied to production: no

This checkpoint does not change product scope. It records the current state so
the next Codex agent can continue from a stable foundation.

## Completed Capabilities

### Authenticated App Foundation

- Protected app shell is in place.
- Supabase SSR auth is wired through server cookies.
- Profile and baseline role bootstrap is supported through the server-only
  service-role helper.
- Authenticated users can load protected routes after profile/role bootstrap.

### Race Data Read Foundation

Migration `0018_authenticated_race_data_read_access.sql` grants authenticated
read-only access to approved canonical race-card/reference/result tables:

- `public.surfaces`
- `public.tracks`
- `public.horses`
- `public.jockeys`
- `public.trainers`
- `public.races`
- `public.race_entries`
- `public.entry_events`
- `public.odds_snapshots`
- `public.result_versions`
- `public.result_entries`

The migration adds authenticated `select` policies using `using (true)` because
these tables represent global, non-user-owned race-card facts.

### Dev Demo Race Fixture

Dev fixture files are present on `main`:

- `supabase/fixtures/dev/README.md`
- `supabase/fixtures/dev/demo_race_card.sql`

The fixture is deterministic, Dev-only, and does not run automatically.

### Race Data Access Layer

`lib/races/data-access.ts` provides server-side read helpers:

- `listRaceDates()`
- `listRaces()`
- `getRaceById(raceId)`
- `getRaceEntries(raceId)`
- `getLatestOddsByRaceId(raceId)`
- `getRaceResults(raceId)`
- `getRaceCard(raceId)`

These helpers read race-card data only. They do not write to Supabase and do not
introduce prediction, Opportunity, wagering, bet sheet, bankroll, ROI, or
recommendation logic.

### Protected Race Card UI

Protected race-card UI is present on `main`:

- `app/(app)/protected/races/page.tsx`
- `app/(app)/protected/races/loading.tsx`
- `app/(app)/protected/races/error.tsx`
- `app/(app)/protected/races/[raceId]/page.tsx`
- `app/(app)/protected/races/[raceId]/not-found.tsx`
- `components/races/race-display.tsx`

The race list page uses:

- `listRaceDates()`
- `listRaces()`

The race detail page uses:

- `getRaceCard()`

## Verified Dev Behavior

Dev verification has confirmed:

- Migration `0018` was applied and verified in Dev.
- Authenticated users can read the approved race/reference/result tables.
- Unauthenticated access remains blocked.
- Authenticated browser writes remain blocked for race/reference/result tables.
- Dev fixture data was applied and verified.
- Protected Race Card UI runtime verification passed against seeded Dev data.
- Temporary runtime auth users were cleaned up after verification.
- Production was not touched.

The most recent protected Race Card UI runtime verification confirmed:

- `/protected/races` returned HTTP `200`.
- Seeded demo races rendered in the protected app.
- Races were grouped by race date and track.
- Race cards showed race number, track, surface, distance, status, scheduled
  time, and entry count.
- Completed race detail returned HTTP `200`.
- Completed race detail rendered race metadata, runners, horse/jockey/trainer
  names, program numbers, post positions, morning lines, latest odds, official
  result section, and result entries.
- Scheduled race detail returned HTTP `200`.
- Scheduled race detail rendered entries and pending/no-result state.
- Unauthenticated `/protected/races` redirected to `/auth/login`.
- No console errors were observed during runtime verification.

## Current Protected Race-Card User Flow

1. User signs in to the protected app.
2. Protected layout validates the Supabase SSR session and Strideo allowlist.
3. Profile context loads or server-bootstrap ensures the profile and baseline
   `user` role.
4. User opens `/protected/races`.
5. The app loads race dates and race list groups from canonical race tables.
6. User selects a race card.
7. `/protected/races/[raceId]` loads:
   - race metadata,
   - track and surface,
   - entries/runners,
   - horse, jockey, and trainer records,
   - latest odds where available,
   - official result data where available.
8. Scheduled races show a pending/no-result state.

## Data Model Now Being Used

The current UI and data access layer use existing canonical race-card tables:

- Reference: `surfaces`, `tracks`, `horses`, `jockeys`, `trainers`
- Race card: `races`, `race_entries`, `entry_events`
- Market snapshots: `odds_snapshots`
- Results: `result_versions`, `result_entries`

The app currently treats these as race facts only. It does not yet connect
these records to the PRD's core `Opportunity` object, strategy matches, wager
recommendations, or performance outcomes.

## Demo Fixture Status

The Dev fixture includes:

- Provider: `demo`
- 1 demo track: Strideo Park
- 2 demo surfaces: Demo Dirt and Demo Turf
- 2 demo races on `2026-06-08`
- 14 entries total, 7 per race
- Linked demo horses, jockeys, and trainers
- Morning-line odds on every entry
- 2 win-pool odds snapshots per entry for the completed race
- 1 official result version with result entries
- 1 scheduled race with no final result rows

The fixture intentionally excludes:

- production data,
- prediction scores,
- Opportunities,
- value scores,
- bet recommendations,
- wagers,
- bet sheets,
- bankroll, ROI, or performance data,
- import metadata rows.

## Security, RLS, And Grant Posture

Current security posture from repo files and prior Dev verification:

- Production remains untouched.
- Public tables have RLS enabled.
- Profile bootstrap writes are server-only.
- `service_role` has narrow bootstrap grants on `profiles` and
  `profile_roles` from migration `0016`.
- `authenticated` has read-only profile grants from migration `0017`, guarded
  by owner-scoped RLS policies.
- `authenticated` has read-only race-card grants from migration `0018`, guarded
  by global read policies on canonical race/reference/result facts.
- No `anon` race-card grants were added.
- No `public` race-card grants were added.
- No authenticated race-card `insert`, `update`, or `delete` grants were added.
- Browser role-write policies remain blocked.

## Intentionally Excluded

The current Wave 3 foundation intentionally excludes:

- prediction modeling,
- model rankings or probabilities,
- value betting,
- Opportunity scoring,
- Opportunity recommendations,
- wagers,
- bet sheets,
- bankroll tracking,
- ROI/performance tracking,
- live provider ingestion,
- import-admin workflows,
- production execution.

These exclusions preserve the PRD sequence: race-card facts first, then
Opportunity-centered intelligence and measurable wagering workflows.

## Recommended Next 3 Build Tasks

1. Protected Race UI Polish And Navigation Integration

   Connect the Race Card UI more cleanly into the protected dashboard shell and
   improve scanability for the current race-list/detail workflow. Keep this
   display-only and avoid prediction, Opportunity, or betting logic.

2. Race Data Import Planning

   Plan the first provider/import workflow for getting real race-card data into
   the existing canonical schema. This should define provider boundaries,
   import metadata, idempotency, validation, and Dev-only execution rules before
   any ingestion code is written.

3. Opportunity Core Planning

   Define the first Opportunity-facing product surface that links race facts to
   strategy/value analysis without yet creating betting recommendations or
   wager workflows. This should produce a scoped schema/app plan before
   implementation.

## Recommended Immediate Next Agent

Recommended next agent: **Wave 3 Race UI Polish And Navigation Agent**.

Reason:

- Race facts are readable and visible in the protected app.
- The user-facing surface is now concrete enough to polish.
- This keeps momentum in the app without prematurely entering prediction,
  Opportunity scoring, or betting logic.
- It should not require Supabase changes if kept to layout/navigation polish.

Alternative if product direction prefers backend-first work: **Wave 3 Race Data
Import Planning Agent**.

## Acceptance Criteria For The Next Task

For the recommended Race UI polish/navigation task:

- `/protected/races` remains protected and read-only.
- `/protected/races/[raceId]` remains protected and read-only.
- Race navigation from the protected dashboard is clear.
- Race list scanability improves without adding decorative marketing layout.
- Race detail remains focused on facts: race metadata, entries, odds, and
  results.
- Empty, loading, error, and not-found states remain present.
- No Supabase migrations are created.
- No Supabase fixtures are applied.
- No Supabase writes are added.
- No prediction, Opportunity, wager, bet sheet, bankroll, ROI, performance, or
  recommendation logic is introduced.
- `npm run lint` passes.
- `npm run build` passes.

## Recommended Next Agent Prompt

```text
Agent:
Wave 3 Race UI Polish And Navigation Agent

Goal:
Improve the protected Race Card UI navigation and scanability now that the
race-list and race-detail pages are working on main.

Scope:
- Use the existing protected app shell.
- Use the existing race data access layer.
- Keep the work display-only and read-only.
- Improve navigation from the protected dashboard to /protected/races.
- Improve race list/detail scanability if needed.
- Preserve empty, loading, error, and not-found states.

Rules:
- Do not touch Supabase.
- Do not apply migrations.
- Do not apply fixtures.
- Do not modify migrations or fixtures.
- Do not use production credentials.
- Do not add predictions.
- Do not add Opportunities.
- Do not add wagers.
- Do not add bet sheets.
- Do not add bankroll, ROI, performance, or recommendation logic.

Verification:
- npm run lint
- npm run build
- git diff --check

Output:
- Branch name
- Files changed
- UI behavior changed
- Verification results
- Whether safe to open a PR
```

## Implementation Continuation

Implementation can continue. The recommended path is app polish/navigation
first, then provider/import planning, then Opportunity Core planning.
