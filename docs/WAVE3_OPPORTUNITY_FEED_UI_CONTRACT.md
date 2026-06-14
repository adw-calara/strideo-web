# Wave 3 Opportunity Feed UI Contract

## Purpose

This contract prepares the future protected Opportunity Feed UI before any UI or
data-access implementation begins.

The future feed must use only the read-only, column-level authenticated access
granted by `supabase/migrations/20260610161128_0020_opportunity_read_access.sql`. It must keep
global Opportunity display data separate from user workflow state, wager
execution, raw import lineage, model internals, and performance claims.

This is a planning document only. It does not implement UI, data access, schema
changes, fixtures, or Supabase operations.

## Route Proposal

Recommended protected route:

- `/protected/opportunities`

The route should live inside the existing authenticated app surface and should
remain unavailable to signed-out users through the existing protected route
guardrails.

## Approved Data Sources

The future UI may read only the globally readable Opportunity tables approved by
`0020_opportunity_read_access`:

- `public.opportunities`
- `public.opportunity_subjects`
- `public.opportunity_scores`
- `public.opportunity_explanations`

No other Opportunity, wager, workflow, prediction, import, agent, event, or
performance table is part of the first feed contract.

## Approved Column Contract

The following columns are extracted directly from
`0020_opportunity_read_access.sql`. Future UI and data-access code must request
only these columns.

### `public.opportunities`

- `id`
- `race_date`
- `race_id`
- `opportunity_type`
- `state`
- `current_score`
- `current_confidence`
- `current_edge`
- `first_detected_at`
- `published_at`
- `closed_at`
- `resulted_at`
- `verified_at`
- `created_at`
- `updated_at`

### `public.opportunity_subjects`

- `id`
- `opportunity_id`
- `race_date`
- `race_entry_id`
- `subject_role`
- `ordinal`
- `weight`
- `created_at`

### `public.opportunity_scores`

- `id`
- `opportunity_id`
- `race_date`
- `score`
- `confidence`
- `edge`
- `fair_value`
- `scoring_version`
- `scored_at`
- `created_at`

### `public.opportunity_explanations`

- `id`
- `opportunity_id`
- `race_date`
- `explanation_version`
- `headline`
- `summary`
- `generated_at`
- `created_at`

## Explicitly Hidden Data

The future UI must not request, expose, derive, or imply access to:

- Internal metadata.
- Raw payloads.
- Source job run IDs.
- Model or prediction lineage.
- Private strategy IDs.
- Wager recommendation pointers.
- Explanation factors if those factors remain ungranted.
- Event logs.
- Visibility events.
- Raw import, source, or archive data.

The browser-facing feed should present only approved display fields. It should
not infer hidden lineage by joining to internal tables or by exposing missing
child records as implementation details.

## Excluded Tables

The future UI must not query these tables:

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

Supabase Dev verification for `0020_opportunity_read_access` confirmed
authenticated `SELECT` grants on these excluded tables were `0`. Dev already had
some pre-existing user-owned RLS policies on excluded workflow tables from
earlier migrations, but `0020` did not add to those tables.

## Feed Behavior

The future Opportunity Feed should support these states:

- Loading state while the server prepares approved feed data.
- Empty state when no published Opportunities are visible to the authenticated
  user.
- Populated feed state when published Opportunities are available through the
  approved tables and columns.
- Safe error state that does not reveal internal table names, SQL details,
  policy details, source job IDs, or raw payload details.
- No-op state for unavailable child score or explanation rows, using neutral
  copy such as unavailable score or unavailable explanation rather than showing
  hidden internals.
- Optional hidden-internals notice when helpful, framed as limited preview data
  rather than a database or policy explanation.

## Display Rules

The future UI must:

- Show only published or otherwise visible Opportunity records allowed by the
  `0020` RLS policies.
- Treat the allowed Opportunity states as `published`, `closed`, `resulted`, and
  `verified`, with `published_at` present and not in the future.
- Show race or subject context only through approved fields and already approved
  race-card access paths.
- Show scores only through approved `opportunity_scores` columns and approved
  current score fields on `opportunities`.
- Show explanations only through approved summary/display fields:
  `explanation_version`, `headline`, `summary`, `generated_at`, and
  `created_at`.
- Clearly label the page as an informational Opportunity feed, not betting
  advice.
- Avoid language that tells a user to place, size, execute, or record a wager.

The future UI must not show:

- Wager instructions.
- Bet sizing.
- ROI claims.
- Performance claims.
- Recommendation execution language.
- Private strategy labels or identifiers.
- Hidden model, prediction, payload, source, event, or job lineage.

## Future Data-Access Implementation Guidance

Future implementation should follow these guardrails:

- Prefer a server-only helper inside the protected app surface.
- Request only the approved columns listed in this contract.
- Do not use wildcard `select('*')`.
- Do not write to any Opportunity or workflow table.
- Do not call RPC functions for the first feed.
- Do not use Storage.
- Do not query excluded tables.
- Do not use service role keys in browser code.
- Sanitize nullable fields before rendering.
- Treat missing child `opportunity_scores` or `opportunity_explanations` rows as
  normal no-op display cases.
- Keep joins narrow and explicit. If a nested select is used, it must include
  only approved child table columns.
- Keep filtering aligned with the `0020` visibility model instead of duplicating
  broader internal lifecycle logic in the browser.

## Runtime Verification Plan For Future UI PR

A future UI PR should verify:

- An authenticated Supabase Dev session can load `/protected/opportunities`.
- The route returns HTTP 200 for an authorized user.
- The empty state works when no published Opportunities are visible.
- The populated state works when approved Dev fixture or Dev data exists.
- No unapproved columns are requested or surfaced.
- No excluded tables are queried.
- No writes, RPC calls, Storage calls, or service role access are introduced.
- Safe error and missing-child states do not reveal internal schema or lineage.
- No prediction, betting, wager, bankroll, ROI, performance, bet sheet,
  recommendation execution, or strategy logic is added.
- Production remains untouched.

## Safety Checklist For Future UI Work

Future implementation work must pass this checklist before review:

- [ ] Uses protected route `/protected/opportunities` or documents an approved
      alternative.
- [ ] Reads only `public.opportunities`, `public.opportunity_subjects`,
      `public.opportunity_scores`, and `public.opportunity_explanations`.
- [ ] Requests only the approved columns listed in this contract.
- [ ] Does not use wildcard `select('*')`.
- [ ] Does not query excluded tables.
- [ ] Does not add write access, mutations, RPC calls, Storage calls, or service
      role usage.
- [ ] Does not expose internal metadata, raw payloads, source job run IDs,
      model/prediction lineage, private strategy IDs, wager recommendation
      pointers, event logs, visibility events, or raw import/source/archive
      data.
- [ ] Handles loading, empty, populated, safe error, and missing-child states.
- [ ] Labels the feed as informational and avoids betting advice language.
- [ ] Does not add Opportunity generation, prediction, betting, wager, bankroll,
      ROI, performance, bet sheet, recommendation execution, or strategy logic.
- [ ] Leaves migrations and fixtures unchanged unless a separate task explicitly
      authorizes them.
- [ ] Keeps production untouched.
