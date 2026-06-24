# Strideo Roadmap

## Status Source Of Truth

`PRD.md` remains the source of product intent. This roadmap is the source of
phase definitions and recommended sequencing. The `/protected/progress`
dashboard, backed by `lib/progress/data-access.ts`, is the living day-to-day
status surface for what is complete, active, queued, or watchlisted.

When the roadmap and progress dashboard differ, update them in the same
planning slice rather than creating a parallel status document. Historical
audit docs in `docs/` are evidence snapshots, not the living status source.

The core product loop remains:

Race context -> prediction/value analysis -> Opportunity ->
recommendation/wager construction -> tracking -> outcome/performance feedback
-> model improvement.

## Phase 0 - Planning And Foundation

Status: complete

- Read and adopt `/PRD.md` as product source of truth.
- Generate `AGENTS.md`, architecture, roadmap, architecture review, and Codex
  operating prompt docs.
- Scaffold authenticated Next.js app.
- Connect Supabase Auth.
- Configure project-scoped Supabase MCP access.
- Verify local app loads Supabase env.

Exit criteria:

- Docs reflect Opportunity-centered product architecture.
- `npm run lint` and `npm run build` pass for existing app code.
- Supabase MCP server `supabase_strideo` is available for development work.

## Phase 1 - Data Model Design

Status: complete

Goal: define the durable data foundation before building product screens.

- Design reference tables: tracks, horses, jockeys, trainers, surfaces.
- Design transaction tables: races, race_entries, odds_snapshots, results.
- Design Opportunity tables: opportunities, opportunity_scores, opportunity_explanations, strategy_matches.
- Design wager tables: wager_templates, wager_recommendations, daily_bet_sheets, daily_bet_sheet_entries.
- Design performance tables: strategy_performance, opportunity_performance, recommendation_results, model_performance.
- Design user tables: profiles, subscriptions, preferences, watchlists, alert preferences.
- Design assistant, learning, and audit tables.
- Define RLS policies and exposed API grants.
- Define partition strategy for odds snapshots, event log, and high-volume history.

Exit criteria:

- Schema plan documented.
- Initial migration created.
- RLS enabled where required.
- Supabase advisors reviewed.

## Phase 2 - Race Data Ingestion

Status: partial

Goal: make Strideo aware of real race cards and results.

- Integrate The Racing API in a server-side ingestion path.
- Normalize tracks, races, entries, horses, jockeys, trainers, odds, and results.
- Store odds snapshots append-only.
- Add job_runs and agent_logs entries for ingestion jobs.
- Create admin/dev inspection views for imported race cards.

Exit criteria:

- Today's races can be imported.
- Race entries and odds snapshots are queryable.
- Import jobs are auditable and idempotent.

## Phase 3 - Opportunity Engine MVP

Status: active

Goal: generate first measurable Opportunities.

- Implement baseline prediction outputs: probability, ranking, confidence score.
- Implement value outputs: edge score, value score, Opportunity score.
- Implement MVP strategies:
  - Surface Switch
  - Value Overlay
  - Price
  - Exacta Value
  - Trifecta Structure
  - Favorite Fade
  - Chaos Race
- Persist strategy matches and Opportunities.
- Persist explanations and model/version metadata.

Exit criteria:

- Opportunities are created from real races.
- Every Opportunity links to race, strategy, score, explanation, and recommendation context.
- Historical generated values are retained.

## Phase 4 - Wager Construction And Bet Sheet

Status: queued

Goal: turn Opportunities into usable betting cards.

- Create wager templates and recommendation structures.
- Support MVP wager types: win, place, show, exacta, trifecta.
- Build daily bet sheet workflow:
  - Draft
  - Planned
  - Placed
  - Settled
- Track whether a user marks wagers as placed.
- Link bet sheet entries to Opportunities and recommendations.

Exit criteria:

- Users can add Opportunities to a daily bet sheet.
- Bet sheet statuses are persisted.
- Recommendations remain auditable after results arrive.

## Phase 5 - Product UI MVP

Status: partial

Goal: replace the placeholder protected route with the real app.

- Add mobile-first bottom navigation:
  - Opportunities
  - Races
  - Bet Sheet
  - Alerts
  - Assistant
- Build Opportunity Dashboard and Opportunity Feed.
- Build Race Intelligence detail views.
- Build Horse Intelligence basics.
- Build Alerts Center.
- Build Performance Center skeleton.
- Add responsive/PWA-ready layout.

Exit criteria:

- A Pro-style user can move from today's races to Opportunities to bet sheet.
- Primary mobile flows are usable on iPhone-sized screens.
- Signed-out and unauthorized access remains blocked.

## Phase 6 - Performance Verification

Status: queued

Goal: close the measurement loop.

- Import results.
- Settle recommendations and bet sheet entries.
- Compute ROI, win rate, sample size, confidence, and historical trends.
- Persist strategy performance and model performance.
- Build Performance Center views.

Exit criteria:

- Every settled Opportunity can be evaluated.
- Strategy performance can be compared over time.
- Verified ROI history is queryable.

## Phase 7 - Strideo Assistant

Status: queued

Goal: add natural-language access to Strideo intelligence.

- Build assistant sessions and messages.
- Add structured tools for search, navigation, Opportunity filtering, and strategy performance lookup.
- Log assistant actions and navigation events.
- Support prompts from the PRD:
  - "Show me all Saratoga races today"
  - "Show opportunities with ROI greater than 15%"
  - "Which strategies are performing best?"
  - "Open Race 7"

Exit criteria:

- Assistant can answer from real persisted Strideo data.
- Assistant actions are auditable.
- Assistant does not bypass authorization.

## Phase 8 - Commercial And Operational Readiness

Status: queued

Goal: prepare for Pro subscription operation.

- Add Stripe subscription flow.
- Map subscription state to entitlements.
- Add PostHog product analytics.
- Configure Vercel deployment.
- Configure Supabase auth callback URLs.
- Add OneSignal notification pipeline.
- Add security and performance review checklist to release process.

Exit criteria:

- Pro access can be enforced.
- Production deployment is repeatable.
- Alerts and analytics are operational.

## Phase 9 - Elite/Future Platform

Status: deferred

Goal: build long-term moat.

- AI Betting Coach.
- Strategy Marketplace.
- Replay Intelligence.
- Syndicates.
- Community Intelligence.
- Equibase integration.
- Advanced exotic wager construction.
- Personalized strategy profiles.

## Current Status Summary

- Complete: Phase 0 foundation and Phase 1 data model are complete enough for
  product work to continue.
- Partial: Phase 2 race data, Phase 3 Opportunity Engine, and Phase 5 Product
  UI have real foundations and visible app surfaces, but they are not MVP
  complete.
- Active: the next Opportunity quality layer is in-memory pre-race feature
  snapshot readiness with leakage checks. This is still contract/readiness work,
  not real ML, fake ML, persisted scoring, wagering, Bet Sheet, Alerts,
  Assistant, settlement, or ROI.
- Queued: Wager construction, Bet Sheet, performance verification, assistant,
  and commercial readiness remain behind the next Opportunity-centered slices.
- Blocked: no current roadmap phase is blocked by a known P0/P1 issue.
- Deferred: native mobile apps, marketplace/community systems, and broad scale
  operations remain Phase 9/future work unless explicitly requested.

## Next Recommended Sequence

1. Keep the roadmap plus `/protected/progress` aligned after each merged
   Opportunity slice.
2. Complete the in-memory pre-race feature snapshot builder and leakage checks
   so future materialization has deterministic input/readiness behavior.
3. After the in-memory builder is merged, scope persisted Dev-only
   `feature_snapshots` materialization before adding real model-backed scoring.
   Keep Bet Sheet, Alerts, Assistant, settlement, ROI, and wagering deferred
   until the scoring lineage is cleaner.

## Risk And Drift Watchlist

- Do not let mobile/PWA work become a native app or generic mobile roadmap.
- Do not duplicate PR #82 mobile shell work or PR #83 race-entry card work.
- Keep provider ingestion queued behind the next validated Opportunity path
  unless explicitly requested.
- Keep source-fact, glossary, model, prediction, value, and operational tables
  server-only until a reviewed product surface needs access.
- Keep future ML, wagering, alerts, assistant, and performance work linked back
  to Opportunity lineage wherever the PRD expects it.
- Do not present contract-only value-scoring shapes as real predictions or
  wagering guidance.
