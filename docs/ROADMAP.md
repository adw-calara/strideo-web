# Strideo Roadmap

## Phase 0 - Planning And Foundation

Status: in progress

- Read and adopt `/PRD.md` as product source of truth.
- Generate `AGENTS.md`, architecture, roadmap, and architecture review docs.
- Scaffold authenticated Next.js app.
- Connect Supabase Auth.
- Configure project-scoped Supabase MCP access.
- Verify local app loads Supabase env.

Exit criteria:

- Docs reflect Opportunity-centered product architecture.
- `npm run lint` and `npm run build` pass for existing app code.
- Supabase MCP server `supabase_strideo` is available for development work.

## Phase 1 - Data Model Design

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

Goal: build long-term moat.

- AI Betting Coach.
- Strategy Marketplace.
- Replay Intelligence.
- Syndicates.
- Community Intelligence.
- Equibase integration.
- Advanced exotic wager construction.
- Personalized strategy profiles.

## Current Next Decisions

- Choose the first race-data import scope and provider endpoint.
- Decide initial schema migration boundaries.
- Decide when product authorization moves from valid-session access to profiles/subscriptions.
- Define the first Opportunity scoring formula.
- Define whether initial agent jobs run as Vercel cron, Supabase Edge Functions, or manual admin actions.
