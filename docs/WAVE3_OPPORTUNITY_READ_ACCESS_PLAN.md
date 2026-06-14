# Wave 3 Opportunity Read Access Plan

Date: June 9, 2026

## Purpose

This plan defines the future read-only Opportunity feed scope before any
migration or UI work begins.

The goal is to separate global Opportunity display data from user-specific
workflow state and betting execution. Authenticated users should eventually be
able to read approved, published Opportunity feed records tied to visible race
data, while private user workflow, wager execution, raw import lineage, and
internal model/generation details remain hidden.

This is planning only. No migration is created or applied in this task.

## Current Foundation

The current repo foundation is:

- Race/reference read access is already handled by
  `supabase/migrations/20260608135732_0018_authenticated_race_data_read_access.sql`.
- Race Card UI is complete and merged.
- Race Card runtime verification is complete and documented in
  `docs/WAVE3_RACE_CARD_RUNTIME_VERIFICATION.md`.
- Data Imports UI is complete and Dev-verified.
- Opportunity read access is the next product layer, but it is not yet
  implemented.

The existing Phase 1 schema already includes Opportunity-centered tables.
Future work should use those tables rather than inventing replacement table
names.

## Existing Opportunity Schema

The actual Opportunity-related tables in local migrations are:

- `public.opportunities`
- `public.opportunity_subjects`
- `public.opportunity_strategy_matches`
- `public.opportunity_events`
- `public.opportunity_scores`
- `public.opportunity_explanations`
- `public.opportunity_visibility_events`

Adjacent strategy tables:

- `public.strategies`
- `public.strategy_versions`
- `public.strategy_feature_snapshots`
- `public.strategy_matches`

Adjacent user workflow tables:

- `public.watchlist_items`
- `public.daily_bet_sheets`
- `public.daily_bet_sheet_entries`
- `public.daily_bet_sheet_events`
- `public.user_recorded_wagers`
- `public.alert_preferences`
- `public.user_wager_results`

Adjacent wager/recommendation tables:

- `public.wager_templates`
- `public.wager_recommendations`
- `public.wager_recommendation_events`
- `public.wager_recommendation_legs`
- `public.wager_recommendation_leg_entries`
- `public.recommendation_results`
- `public.recommendation_result_events`

Adjacent model, prediction, and performance tables:

- `public.model_versions`
- `public.feature_snapshots`
- `public.prediction_outputs`
- `public.model_training_runs`
- `public.model_evaluation_runs`
- `public.model_promotions`
- `public.performance_runs`
- `public.opportunity_performance_rollups`
- `public.strategy_performance_rollups`
- `public.model_performance_rollups`
- `public.model_training_datasets`
- `public.model_evaluation_metrics`
- `public.prediction_runs`
- `public.prediction_results`
- `public.live_prediction_cache`

Adjacent import/operations tables:

- `public.data_ingestion_batches`
- `public.job_runs`
- `public.raw_archive_objects`
- `public.source_data_files`
- `public.agent_logs`
- `public.event_log`

## Proposed Table Categories

### A. Candidate Global Read Tables

These tables may be safe for a future authenticated read-only Opportunity feed,
but only after a migration defines approved fields, visibility conditions, and
runtime verification.

- `public.opportunities`
  - Candidate primary feed table.
  - Read should be limited to globally visible records, likely by state,
    publication timestamp, visibility window, and visible race linkage.
  - Future feed should avoid exposing internal `metadata` unless specific keys
    are whitelisted.

- `public.opportunity_subjects`
  - Candidate feed support table for linking Opportunities to race entries.
  - Should be readable only for Opportunities that are themselves visible.
  - Supports rendering subject roles such as key/include/exclude without
    exposing user workflow state.

- `public.opportunity_scores`
  - Candidate display table for score, confidence, edge, and fair value.
  - Should be readable only for visible Opportunities.
  - `payload`, `model_version_id`, `prediction_output_id`, and
    `source_job_run_id` should remain hidden from browser UI unless separately
    reviewed and whitelisted.

- `public.opportunity_explanations`
  - Candidate display table for headline, summary, and safe explanation
    factors.
  - Should be readable only for visible Opportunities.
  - `factors` may need a sanitized display contract before browser exposure.
  - `source_job_run_id` should stay hidden.

- `public.opportunity_strategy_matches`
  - Candidate support table only if the feed needs to show which approved
    strategy match contributed to an Opportunity.
  - Should not expose strategy internals, payloads, or private strategy data.
  - May be deferred until strategy display scope is reviewed.

- `public.opportunity_visibility_events`
  - Candidate internal gating table, not necessarily a browser display table.
  - It can help determine whether an Opportunity is currently visible, but
    browser-facing access may not be needed if visibility is represented through
    `opportunities.state` and `opportunities.published_at`.

- `public.opportunity_events`
  - Candidate lifecycle history table, but likely deferred for the first feed.
  - It may contain `actor_user_id`, `source_job_run_id`, `reason`, and `payload`.
  - If used later, read access should expose only safe lifecycle labels for
    visible Opportunities.

### B. User-Specific Workflow Tables

These tables should not receive broad global read access. They are
user-specific and should remain owner-scoped through `auth.uid()` policies.

- `public.watchlist_items`
  - User-specific Opportunity workflow state.
  - Existing comments explicitly state this table does not mutate global
    Opportunity lifecycle.

- `public.daily_bet_sheets`
  - User-owned daily planning container.
  - Includes bankroll and planning notes, so it must remain private.

- `public.daily_bet_sheet_entries`
  - User-owned planned items that may reference Opportunities or wager
    recommendations.
  - Should remain owner-scoped.

- `public.daily_bet_sheet_events`
  - User-owned workflow event history.
  - Should remain owner-scoped.

- `public.user_recorded_wagers`
  - User-entered wager records and outcomes.
  - Should remain owner-scoped and out of Opportunity feed read access.

- `public.user_wager_results`
  - User-owned wager result verification.
  - Should remain owner-scoped.

- `public.alert_preferences`
  - User-owned alert preference state.
  - Should remain owner-scoped.

### C. Explicitly Excluded Tables

The following tables should not be included in the first Opportunity read
access migration.

Wager/recommendation execution:

- `public.wager_templates`
- `public.wager_recommendations`
- `public.wager_recommendation_events`
- `public.wager_recommendation_legs`
- `public.wager_recommendation_leg_entries`
- `public.recommendation_results`
- `public.recommendation_result_events`

Prediction/model/generation internals:

- `public.model_versions`
- `public.feature_snapshots`
- `public.prediction_outputs`
- `public.model_training_runs`
- `public.model_evaluation_runs`
- `public.model_promotions`
- `public.model_training_datasets`
- `public.model_evaluation_metrics`
- `public.prediction_runs`
- `public.prediction_results`
- `public.live_prediction_cache`

Performance tracking and ROI:

- `public.performance_runs`
- `public.opportunity_performance_rollups`
- `public.strategy_performance_rollups`
- `public.model_performance_rollups`

Strategy ownership/marketplace scope:

- `public.strategies`
- `public.strategy_versions`
- `public.strategy_feature_snapshots`
- `public.strategy_matches`

Import and operations internals:

- `public.job_runs`
- `public.raw_archive_objects`
- `public.source_data_files`
- `public.agent_logs`
- `public.event_log`

Already scoped import status:

- `public.data_ingestion_batches`
  - Already handled separately for sanitized Data Imports UI.
  - Not part of Opportunity feed read access.

## Visibility Model

Future Opportunity feed visibility should follow these rules:

- Global Opportunity records may be readable only when approved/published and
  tied to race data already visible through `0018`.
- Candidate feed records should be filtered to published or otherwise approved
  states. Candidate/draft/internal generation states should remain hidden until
  explicitly reviewed.
- User-specific workflow state must be visible only to the owning user.
- Internal generation metadata should stay hidden unless specific fields are
  whitelisted for display.
- Raw import and job/source lineage tables must stay hidden.
- Browser users should not receive direct access to model artifacts,
  prediction payloads, source job runs, raw archive objects, or source files.
- The feed should display empty state safely if no published Opportunity data
  exists.

## Future Migration Sequence

Recommended migration sequence:

1. Create a planning/review PR for the exact first Opportunity feed field
   contract.
2. Create an append-only migration for read-only authenticated access to
   approved global Opportunity feed tables only.
3. Grant `SELECT` only to `authenticated`.
4. Add read-only RLS policies only.
5. Use policies that require the Opportunity to be globally visible, published,
   and tied to visible race data.
6. Avoid service-role grants in the read-access migration.
7. Avoid `INSERT`, `UPDATE`, and `DELETE` grants.
8. Add user-scoped workflow policies separately for owner-only tables, if a
   future user workflow task requires them.
9. Keep wager, bankroll, bet sheet, ROI, performance, recommendation execution,
   prediction generation, and strategy marketplace logic separate.

The first migration should likely focus on:

- `public.opportunities`
- `public.opportunity_subjects`
- `public.opportunity_scores`, with sensitive lineage fields hidden
- `public.opportunity_explanations`, with a sanitized factor display contract

Tables such as `public.opportunity_events`,
`public.opportunity_strategy_matches`, and
`public.opportunity_visibility_events` should be reviewed carefully before
browser exposure and may be deferred.

## Runtime Verification Plan

Future Opportunity feed runtime verification should include:

- Confirm target is Supabase Dev only: `strideo-dev / ntxtakbggtljjbalgris`.
- Confirm production is untouched.
- Confirm migration history shows the planned Opportunity read migration
  applied in Dev before runtime testing.
- Use an authenticated Dev session.
- Confirm the Opportunity feed reads only approved Opportunity tables.
- Confirm the feed does not read or expose `job_runs`, `source_data_files`, or
  `raw_archive_objects`.
- Confirm no raw internal generation payloads, model artifacts, source job
  identifiers, or import lineage details are displayed.
- Confirm no wager, bankroll, betting execution, bet sheet, ROI, performance,
  recommendation execution, or strategy marketplace behavior is present.
- Confirm no user can read another user's private workflow state.
- Confirm empty state renders safely if no published Opportunity data exists.
- Confirm safe error state does not leak backend details.

## Safety Checklist

Future implementation must confirm:

- [ ] Production is untouched.
- [ ] No write access is added.
- [ ] No service-role grants are added.
- [ ] No `anon` grants are added.
- [ ] No `job_runs` access is added.
- [ ] No `source_data_files` access is added.
- [ ] No `raw_archive_objects` access is added.
- [ ] No betting, wager, bankroll, ROI, performance, or bet sheet logic is
      added.
- [ ] No prediction generation logic is added.
- [ ] No recommendation execution logic is added.
- [ ] No strategy marketplace or private strategy logic is added.
- [ ] Race read access already handled by `0018` is not modified.
- [ ] User workflow state remains owner-scoped.
- [ ] Internal metadata and payload fields are hidden unless explicitly
      whitelisted.
- [ ] Runtime verification confirms authenticated reads and private workflow
      isolation.

## Result

Wave 3 Opportunity Read Access should begin with a narrow, read-only global
Opportunity feed plan and migration. User workflow, wager execution, prediction
generation, recommendation execution, performance/ROI, and raw operations data
remain intentionally separate.
