# Strideo Architecture

## Architecture Goals

Strideo must support a web-first, mobile-first wagering intelligence platform with a shared backend and no future backend rewrite for mobile.

The architecture must prioritize:

- Opportunity-centered product flows.
- Append-only/event-sourced history.
- Measurable recommendations, wagers, and outcomes.
- Analytics-ready data.
- Agent-generated intelligence with human-readable explanations.
- PWA-ready responsive UX.
- Secure authenticated access through Supabase.

## System Overview

```mermaid
flowchart LR
  "Race Data Providers" --> "Ingestion Jobs"
  "Ingestion Jobs" --> "Supabase PostgreSQL"
  "Supabase PostgreSQL" --> "Prediction Engine"
  "Prediction Engine" --> "Value Engine"
  "Value Engine" --> "Strategy Engine"
  "Strategy Engine" --> "Opportunity Store"
  "Opportunity Store" --> "Wager Construction Engine"
  "Opportunity Store" --> "Alerts Center"
  "Opportunity Store" --> "Performance Center"
  "Opportunity Store" --> "Strideo Assistant"
  "Next.js App" --> "Supabase Auth"
  "Next.js App" --> "Supabase PostgreSQL"
  "Next.js App" --> "Strideo Assistant"
```

## Application Stack

- Frontend: Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui-style components.
- Backend: Supabase PostgreSQL, Supabase Auth, Supabase Edge Functions where server-side API work is needed.
- Hosting: Vercel target.
- AI: OpenAI GPT for narrative, assistant, and reasoning tasks.
- Payments: Stripe target for Pro subscription.
- Analytics: PostHog target.
- Notifications: OneSignal target.
- Race data: The Racing API first, Equibase future.
- Development: Codex with Supabase MCP.

## Current Auth Architecture

Current implementation:

- Supabase Auth provides identity.
- `@supabase/ssr` handles cookie-backed sessions.
- `proxy.ts` delegates to `lib/supabase/proxy.ts`.
- `/protected` requires a Supabase session.

Target evolution:

- Add durable profiles, subscriptions, and role/plan entitlements when product authorization needs them.
- Keep authorization server-enforced through RLS and server-side checks.
- Store role/plan data in trusted tables or Supabase app metadata, not user-editable metadata.

## Primary Domain Model

### Opportunity

Opportunity is the central aggregate and should connect:

- Race
- Race entries
- Strategy match
- Recommended wager
- Expected ROI
- Confidence score
- Explanation
- Alert events
- Bet sheet entries
- Wager placement status
- Result and verified performance

### Race

Race is a transaction object with entries, odds snapshots, results, and derived intelligence.

### Strategy

Strategies are configurable evaluators that create strategy matches and candidate Opportunities. MVP strategies include:

- Surface Switch Strategy
- Value Overlay Strategy
- Price Strategy
- Exacta Value Strategy
- Trifecta Structure Strategy
- Favorite Fade Strategy
- Chaos Race Strategy

### Wager Recommendation

Wager recommendations convert Opportunities into executable structures:

- MVP: win, place, show, exacta, trifecta.
- Future: superfecta, daily double, Pick 3, Pick 4, Pick 5, Pick 6.

### Daily Bet Sheet

Daily bet sheets organize selected Opportunities through:

- Draft
- Planned
- Placed
- Settled

## Database Architecture

The PRD requires support for millions of races, odds updates, Opportunities, recommendations, wagers, and multi-year history.

Database principles:

- Append-only history for key generated and observed facts.
- Event log for agent/job/system actions.
- Partition large time-series tables by race date or captured timestamp.
- Analytics-friendly denormalized snapshots where useful.
- Strong relational integrity for core reference/transaction data.
- RLS for user-owned or subscription-gated data.

## Database Layers

### Reference

- tracks
- horses
- jockeys
- trainers
- surfaces

### Transaction

- races
- race_entries
- odds_snapshots
- results

### Opportunity

- opportunities
- opportunity_scores
- opportunity_explanations
- strategy_matches

### Wager

- wager_templates
- wager_recommendations
- daily_bet_sheets
- daily_bet_sheet_entries

### Performance

- strategy_performance
- opportunity_performance
- recommendation_results
- model_performance

### User

- profiles
- subscriptions
- user_strategy_preferences
- watchlists
- alert_preferences

### Assistant

- conversation_sessions
- conversation_messages
- assistant_actions
- assistant_navigation_events

### Learning

- model_versions
- model_weights
- feature_performance
- prediction_accuracy

### Audit

- agent_logs
- job_runs
- event_log

## Agent Architecture

For MVP, agents can be implemented as jobs, Edge Functions, server actions, or service modules. They should share persisted inputs/outputs rather than passing hidden state.

Recommended pipeline:

1. Race Data Agent imports race cards, entries, odds, and results.
2. Horse Intelligence Agent derives horse-level features.
3. Prediction Agent generates probabilities and rankings.
4. Value Agent calculates market edge and value scores.
5. Strategy Agent creates strategy matches and Opportunities.
6. Wager Construction Agent creates recommended wager structures.
7. Race Analyst Agent writes explanations.
8. Alert Agent publishes Opportunity/strategy alerts.
9. Bet Sheet Agent manages user-selected Opportunities.
10. Performance Verification Agent settles recommendations and computes ROI.
11. Strideo Intelligence Agent updates model/strategy performance history.

## Assistant Architecture

The Strideo Assistant should use structured tools over the database rather than free-form database access.

Initial assistant capabilities:

- Search races.
- Search Opportunities.
- Filter by ROI, confidence, strategy, track, and race.
- Navigate to race and Opportunity detail pages.
- Summarize best current strategies.
- Explain why an Opportunity exists.

Every assistant action should be logged to assistant tables and linked to user/session context.

## Mobile And PWA Architecture

The UI should be designed mobile-first with bottom navigation:

- Opportunities
- Races
- Bet Sheet
- Alerts
- Assistant

PWA readiness should include:

- Manifest.
- Service worker.
- Install-to-home-screen behavior.
- Push-notification compatibility.
- Offline-ready shell for selected views.

## Route Architecture

Current routes:

- `/` public entry.
- `/auth/*` auth flows.
- `/protected` authenticated placeholder shell.

Target MVP routes:

- `/opportunities`
- `/opportunities/[id]`
- `/races`
- `/races/[id]`
- `/horses/[id]`
- `/bet-sheet`
- `/alerts`
- `/performance`
- `/assistant`
- `/settings`

## Integration Boundaries

- Race Data Provider: ingestion should normalize provider payloads before writing core tables.
- OpenAI: model outputs should be persisted with model/version metadata.
- Stripe: subscriptions should write durable entitlement state.
- PostHog: analytics should avoid leaking sensitive wager details unless intentionally configured.
- OneSignal: notification preferences should respect user alert settings.

## Verification

Application checks:

```bash
npm run lint
npm run build
```

Supabase checks:

- Run SQL in a development/project-scoped context first.
- Run advisors when available.
- Confirm RLS on exposed tables.
- Confirm indexes for high-volume query paths.
- Confirm append-only tables are not accidentally updated by application flows.
