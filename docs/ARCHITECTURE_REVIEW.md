# Architecture Review Report

Historical note: this report is an evidence snapshot from the early foundation
phase. It is not the living readiness or progress source. For current status,
use `docs/ROADMAP.md`, `/protected/progress` backed by
`lib/progress/data-access.ts`, current migrations, current tests, and current
implementation docs. In particular, stale statements below about being ready
only for initial database design have been superseded by later merged work.

## Review Scope

This report reviews `/PRD.md` and the current Strideo repository state before additional application code is written.

Reviewed artifacts:

- `/PRD.md`
- `/AGENTS.md`
- `/docs/ARCHITECTURE.md`
- `/docs/ROADMAP.md`
- Current Next.js/Supabase Auth foundation

## Executive Summary

The PRD defines a strong product thesis: Strideo is not a picks site, but an Opportunity-centered wagering intelligence platform that measures recommendations, wagers, strategies, and outcomes over time.

The current app foundation is appropriate for starting the product:

- Next.js App Router supports web-first and mobile-first delivery.
- Supabase Auth and PostgreSQL fit the MVP backend needs.
- Supabase MCP gives Codex direct project-scoped development access.
- The existing protected shell is sufficient as a starting point.

The most important architectural risk is data design. Strideo's moat depends on append-only Opportunity, wager, strategy, odds, and performance history. Application UI should not advance far until the database model and RLS model are deliberately designed.

## Alignment With PRD

### Strong Alignment

- Web-first/mobile-first stack is aligned with Next.js and responsive UI.
- Shared backend/no rewrite goal is aligned with Supabase.
- Authenticated Pro-style private surface is already started.
- Codex/Supabase MCP development workflow is in place.

### Needs More Definition

- Exact schema for Opportunity lifecycle.
- Versioning model for predictions, strategies, and scoring weights.
- Race data ingestion frequency and provider endpoint coverage.
- How odds snapshots are partitioned and queried.
- How user subscriptions map to feature entitlements.
- What assistant tools are allowed in MVP.

## Key Architecture Decisions

### 1. Opportunity As Central Aggregate

Decision: All recommendation, wager, alert, and performance records should link to an Opportunity.

Reason:

- The PRD's moat is Opportunity history and measured outcomes.
- Opportunity becomes the durable unit of learning.

Implication:

- Avoid building standalone picks, alerts, or wager rows that cannot be traced back to strategy/model inputs.

### 2. Append-Only History For Generated Intelligence

Decision: Odds snapshots, scores, recommendations, explanations, model outputs, and results should retain history rather than overwrite prior values.

Reason:

- The PRD says nothing is overwritten and everything is measured.
- Historical context is required to evaluate model drift and strategy performance.

Implication:

- Use immutable records for high-value generated facts.
- Use current-state views/materialized views for fast UI access where needed.

### 3. Postgres First, Jobs/Agents Second

Decision: Persist agent inputs/outputs in database tables before building complex autonomous agent services.

Reason:

- Agents need durable, auditable shared state.
- MVP can implement agents as jobs/modules/functions rather than distributed services.

Implication:

- Design tables and job logs first.
- Keep agent execution replaceable.

### 4. RLS And Entitlements Need Early Design

Decision: Profiles, subscriptions, preferences, watchlists, bet sheets, alerts, and assistant sessions should have explicit user ownership and RLS.

Reason:

- Supabase exposes data through APIs.
- Pro/Elite access will depend on entitlement enforcement.

Implication:

- Do not rely on client-side checks for subscription or private user data.

## Recommended Initial Database Shape

The first migration should be small enough to verify but broad enough to support the Opportunity lifecycle.

Recommended first slice:

- `profiles`
- `tracks`
- `horses`
- `races`
- `race_entries`
- `odds_snapshots`
- `strategies`
- `strategy_matches`
- `opportunities`
- `opportunity_scores`
- `opportunity_explanations`
- `wager_recommendations`
- `daily_bet_sheets`
- `daily_bet_sheet_entries`
- `event_log`
- `job_runs`
- `agent_logs`

Defer until needed:

- Full learning tables.
- Marketplace tables.
- Replay intelligence.
- Syndicates/community.
- Advanced exotic pools.

## Security Review

Current state:

- Supabase Auth is connected.
- Protected routes redirect signed-out users.
- Protected routes require a valid Supabase session.
- Local env uses a publishable key.

Risks:

- Durable profile, subscription, and entitlement checks are still needed for
  product-level authorization.
- Future tables must not be exposed without RLS.
- Service-role keys must not enter client-side env or app bundles.
- Assistant tools could become a data-exfiltration path if not scoped.

Recommendations:

- Add `profiles` and role/plan fields early.
- Keep assistant access behind structured server-side tools.
- Enable RLS for all exposed public-schema tables.
- Use app metadata or database tables for roles, not user-editable metadata.

## Scalability Review

Expected scale:

- Millions of races.
- Millions of odds updates.
- Millions of Opportunities.
- Millions of recommendations and wagers.
- Multi-year history.

Primary scaling concerns:

- `odds_snapshots` volume.
- Opportunity feed filtering by track/date/strategy/score.
- Performance aggregation across long history.
- Assistant searches over large datasets.

Recommendations:

- Partition `odds_snapshots` by captured date or race date.
- Index Opportunities by race date, track, strategy, score, confidence, and status.
- Store model/version ids with generated outputs.
- Use rollup tables for strategy and Opportunity performance.
- Consider materialized views for dashboard feeds after raw schema is stable.

## Product UX Review

The PRD's primary mobile navigation is clear:

- Opportunities
- Races
- Bet Sheet
- Alerts
- Assistant

Recommendations:

- Build mobile-first first, not desktop-first.
- Make Opportunity Feed the primary signed-in landing page.
- Keep bet-sheet workflow visible from every Opportunity.
- Explanations should be concise and tied to strategy/model evidence.
- Performance feedback should be visible enough to reinforce learning.

## Implementation Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Building UI before schema clarity | High | Design first migration and data contracts before feature screens |
| Treating agents as black boxes | High | Persist every agent input/output with model and job metadata |
| Overwriting odds or score history | High | Use append-only tables and current-state views |
| Weak RLS/authorization | High | Add RLS policies with first user-owned tables |
| Assistant overreach | Medium | Restrict assistant to structured tools and logged actions |
| Premature complex ML | Medium | Start with simple deterministic baselines and version outputs |
| Poor mobile ergonomics | Medium | Build bottom-nav mobile shell early |

## Recommended Next Steps Before Application Code

1. Approve or revise this architecture direction.
2. Draft the initial Supabase schema migration.
3. Define Opportunity lifecycle states and required fields.
4. Define the first scoring formula for Opportunity Score.
5. Define RLS policy rules for profiles, bet sheets, alerts, and assistant data.
6. Decide the first race data import endpoint and ingestion cadence.

## Readiness Assessment

The project is ready for database design work.

The project is not yet ready for broad application feature implementation because the Opportunity schema, strategy output contracts, and RLS model should be defined first.

Recommended next build action:

Create and review the initial Supabase schema plan and migration for the Opportunity-centered MVP data model.
