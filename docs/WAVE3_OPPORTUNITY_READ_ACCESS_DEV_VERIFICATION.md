# Wave 3 Opportunity Read Access Dev Verification

## Purpose

Document the Dev-only application and verification of
`0020_opportunity_read_access`.

This report records that the migration was applied to Supabase Dev and that the
resulting authenticated Opportunity read access remained limited to the approved
global Opportunity tables, approved columns, and read-only RLS policies.

## Dev Project/Ref Confirmed

- Project: `strideo-dev`
- Ref: `ntxtakbggtljjbalgris`
- Environment: Supabase Dev only

Production was not listed or touched.

## Migration Applied

- Migration file: `supabase/migrations/0020_opportunity_read_access.sql`
- Migration name: `0020_opportunity_read_access`
- Application scope: Supabase Dev only

No app code, fixtures, or local migration files were changed as part of the Dev
application step.

## Dev Migration History Confirmation

Supabase Dev migration history includes:

- `20260610161128 / 0020_opportunity_read_access`

## Approved Tables Verified

The following approved global Opportunity tables were verified:

- `public.opportunities`
- `public.opportunity_subjects`
- `public.opportunity_scores`
- `public.opportunity_explanations`

## Column-Level Grant Verification

Authenticated column-level `SELECT` grants exactly matched the approved columns
from `0020_opportunity_read_access.sql`.

Verified result:

- Approved column sets exact: `true`
- Non-SELECT authenticated grants on approved tables: `0`

## RLS Policy Verification

The expected `0020` authenticated read-only RLS policies were found:

- `opportunities_select_published`
- `opportunity_subjects_select_published_opportunity`
- `opportunity_scores_select_published_opportunity`
- `opportunity_explanations_select_published_opportunity`

Verified result:

- Expected `0020` RLS policies found: `4`
- All expected `0020` policies are `SELECT` policies for `authenticated`
- Unexpected authenticated policies on the approved Opportunity tables: `0`

## Excluded Table Verification

The excluded tables were checked for authenticated column-level `SELECT` grants
from the `0020` access scope.

Excluded tables:

- `public.opportunity_events`
- `public.opportunity_visibility_events`
- `public.opportunity_strategy_matches`
- `public.watchlist_items`
- `public.daily_bet_sheets`
- `public.daily_bet_sheet_entries`
- `public.daily_bet_sheet_events`
- `public.user_recorded_wagers`
- `public.user_wager_results`
- `public.alert_preferences`
- `public.job_runs`
- `public.raw_archive_objects`
- `public.source_data_files`
- `public.agent_logs`
- `public.event_log`

Verified result:

- Authenticated `SELECT` grants on excluded tables: `0`

## Pre-Existing Workflow RLS Policies

Supabase Dev already has pre-existing user-owned RLS policies on some excluded
workflow tables from earlier migrations.

`0020_opportunity_read_access` did not add to those workflow tables, and the
excluded-table authenticated column `SELECT` grant check returned `0`.

## Validation Results

- `npm run lint`: passed
- `npm run build`: passed
- `git diff --check`: passed

## Safety Confirmations

- Documentation-only report.
- No app code changed.
- No fixtures changed.
- No local migrations created or modified.
- No additional Supabase write commands were run while preparing this report.
- No service role grants were added by `0020`.
- No write grants were added by `0020`.
- No user workflow policies were added by `0020`.
- No access was added by `0020` to excluded tables.
- No Opportunity UI was added.
- No prediction generation logic was added.
- No betting, wager, bankroll, ROI, performance, bet sheet, recommendation
  execution, or strategy logic was added.
- Production was untouched.
