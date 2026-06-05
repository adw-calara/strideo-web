# AGENTS.md

## Purpose

This file guides Codex and human collaborators working on Strideo. Read `/PRD.md` before planning or writing application code. The PRD is the product source of truth.

## Product Direction

Strideo is an AI-powered wagering intelligence platform for horseplayers.

Primary product concept:

- `Opportunity` is the core object.
- Every recommendation, alert, wager, result, and performance metric links back to an Opportunity.
- Nothing important is overwritten.
- Race, strategy, recommendation, wager, and outcome data should be measured and retained.

Tagline:

> Find the Edge. Improve Every Race.

## Current Repository Context

- Framework: Next.js App Router
- Language: TypeScript
- Styling: Tailwind CSS and shadcn/ui-style components
- Backend: Supabase PostgreSQL
- Auth: Supabase Auth with SSR cookies
- Supabase project name: `strideo-dev`
- Supabase project ref: `ntxtakbggtljjbalgris`
- Supabase MCP server: `supabase_strideo`
- Local app URL: `http://localhost:3000`
- Initial allowed user: `adw@calara.ai`

## Operating Rules

- Do not write application code until PRD, architecture, roadmap, and architecture review are in place for the requested scope.
- Prefer small, product-aligned changes over broad rewrites.
- Keep Opportunity, append-only history, and measurable outcomes at the center of data model decisions.
- Avoid hard-coding racing assumptions that should live in strategy/model configuration.
- Do not commit `.env.local`, service-role keys, API secrets, or private credentials.
- Never expose Supabase service-role or secret keys in browser code or `NEXT_PUBLIC_*` env vars.
- Use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for Supabase browser/SSR clients.
- Use Supabase MCP for project inspection, SQL iteration, advisors, and schema review when available.
- Before making database changes, document the intended tables, RLS model, indexes, and migration order.
- Enable RLS on any table exposed through Supabase APIs.
- Do not use user-editable metadata for authorization decisions.

## Agent Responsibilities From PRD

These product agents are conceptual system components. They do not all need to be independent services in the MVP.

### Race Data Agent

Imports tracks, races, entries, odds, and results from racing data providers.

### Horse Intelligence Agent

Builds horse profiles, surface/distance statistics, and historical performance features.

### Prediction Agent

Generates rankings, win probabilities, and confidence scores.

### Value Agent

Compares model probability to market probability and creates edge/value/opportunity scores.

### Strategy Agent

Evaluates single-horse and multi-horse strategies and creates strategy matches and Opportunities.

### Wager Construction Agent

Converts Opportunities into recommended wagers, starting with win/place/show, exacta, and trifecta structures.

### Race Analyst Agent

Creates race narratives and Opportunity explanations.

### Alert Agent

Creates Opportunity and strategy alerts and maintains alert history.

### Bet Sheet Agent

Manages daily bet sheets, entries, statuses, and result tracking.

### Strideo Assistant Agent

Handles search, navigation, analysis, and recommendations through natural language.

### Performance Verification Agent

Measures ROI, win rate, sample size, strategy performance, Opportunity performance, and model performance.

### Strideo Intelligence Agent

Improves prediction models, strategy models, scoring weights, and learning loops over time.

## MVP Build Priorities

1. Authenticated product shell.
2. Reference and transaction racing data schema.
3. Opportunity data model and scoring history.
4. Strategy matching and wager recommendation persistence.
5. Daily bet sheet workflow.
6. Performance verification loop.
7. Assistant search/navigation over real Strideo data.

## Required Verification

Run before handoff when application code changes:

```bash
npm run lint
npm run build
```

For Supabase/database changes:

- Inspect generated SQL before execution.
- Confirm RLS policies match expected user access.
- Run Supabase advisors when available.
- Document any tables, policies, triggers, functions, or seed data changed.

## Important Files

- `/PRD.md` - product requirements and product source of truth.
- `/AGENTS.md` - agent operating instructions.
- `/docs/ARCHITECTURE.md` - target technical architecture.
- `/docs/ROADMAP.md` - phased product and engineering roadmap.
- `/docs/ARCHITECTURE_REVIEW.md` - architecture review before app-code implementation.
- `/lib/auth-policy.ts` - current email allowlist policy.
- `/lib/supabase/server.ts` - server Supabase client.
- `/lib/supabase/client.ts` - browser Supabase client.
- `/lib/supabase/proxy.ts` - session refresh and route protection.
- `/proxy.ts` - Next proxy entry point.

## Handoff Format

When finishing work, summarize:

- What changed.
- What PRD requirement it supports.
- What was verified.
- Any Supabase/database changes made.
- Any remaining architecture or product decisions.
