# Phase 0 Foundation Build Plan

## Approval Status

Supabase security hardening is approved for Strideo development based on the
current project evidence:

- Automatically expose new tables is off.
- No application tables exist.
- No tables are exposed through the Data API.
- No functions are exposed through the Data API.
- `public.rls_auto_enable()` execute permissions are hardened.
- `ensure_rls` remains active and auto-enables RLS for new public tables.

No remaining Supabase security blockers exist for Phase 0 foundation work.

## Phase 0 Goal

Create the Strideo application foundation without building product features or
application data tables.

Phase 0 should establish:

- a clean Next.js App Router shell
- Supabase Auth connectivity
- protected-route architecture
- environment variable conventions
- UI system baseline
- PWA/mobile-ready structure
- agent/API architectural boundaries
- verification workflow for later Phase 1 schema work

Phase 0 must not introduce racing domain tables, Opportunity tables, wager
tables, strategy tables, or production AI-agent execution.

## Repository Structure

Target foundation structure:

```text
/
  app/
    (public)/
    (auth)/
    (app)/
    api/
    globals.css
    layout.tsx
    page.tsx
  components/
    layout/
    navigation/
    auth/
    ui/
  lib/
    env/
    supabase/
    auth/
    agents/
    api/
  docs/
  supabase/
    migrations/
  public/
    icons/
    manifest.webmanifest
  PHASE0_PLAN.md
```

Guidelines:

- Keep app routes grouped by access boundary: public, auth, and authenticated app.
- Keep reusable UI components outside route folders.
- Keep Supabase clients isolated under `lib/supabase`.
- Keep agent contracts under `lib/agents` as interfaces and types only in Phase 0.
- Keep API helpers under `lib/api`; do not add feature endpoints until later phases.

## Next.js Setup

Foundation target:

- Next.js App Router.
- TypeScript strict mode.
- Server Components by default.
- Client Components only for interactive controls.
- Route groups for public/authenticated surfaces.
- Auth-aware middleware/proxy for session refresh and protected routes.

Initial route intent:

- `/` public entry or redirect surface.
- `/auth/login`
- `/auth/sign-up`
- `/auth/forgot-password`
- `/auth/update-password`
- `/auth/confirm`
- `/protected` temporary authenticated foundation route.

Phase 0 exit criteria:

- Local app starts.
- Auth flow routes load.
- Protected route blocks signed-out users.
- Build and lint pass.

## Tailwind Setup

Foundation target:

- Tailwind configured for App Router.
- Global tokens in `app/globals.css`.
- Mobile-first responsive defaults.
- CSS variables for theme values used by shadcn/ui.
- No one-off visual system for product pages yet.

Design principles:

- Dense, work-focused product UI.
- Mobile-first layout with desktop expansion.
- Avoid decorative marketing layouts inside the app shell.
- Keep accessibility states visible.

## ShadCN Setup

Foundation target:

- shadcn/ui initialized with the project Tailwind setup.
- Core primitives available:
  - button
  - input
  - label
  - card
  - badge
  - dropdown-menu
  - checkbox
  - sheet/dialog when needed for mobile navigation

Guidelines:

- Use shadcn primitives as the base UI system.
- Keep domain-specific components separate from generic `components/ui`.
- Do not build Opportunity, race, wager, or assistant feature UI in Phase 0.

## Supabase Client Architecture

Foundation target:

```text
lib/supabase/
  client.ts   # browser client, publishable key only
  server.ts   # server client with SSR cookies
  proxy.ts    # session refresh and route protection helpers
```

Rules:

- Browser code may use only the Supabase URL and publishable key.
- Never expose `service_role` or secret keys in client bundles.
- Server client must use cookie-backed sessions through `@supabase/ssr`.
- Protected routes must validate session server-side.
- Authorization decisions must eventually move to RLS and trusted profile or
  entitlement tables, not user-editable metadata.

Supabase readiness:

- Data API automatic exposure is off.
- New table access must be granted intentionally in future migrations.
- RLS policies must be created before browser-facing role grants.

## Environment Variable Architecture

Environment classes:

- Public browser-safe variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Server-only variables:
  - provider API keys
  - OpenAI keys
  - Stripe keys
  - webhook secrets
  - Supabase service-role key, if ever needed
- Local development controls:
  - `STRIDEO_ALLOWED_EMAILS`

Rules:

- Never commit `.env.local`.
- Never prefix server secrets with `NEXT_PUBLIC_`.
- Keep `.env.example` free of real values.
- Validate required environment variables at startup through a typed env module.
- Separate browser env access from server env access.

## Agent Framework Architecture

Phase 0 should define agent boundaries without running production agents.

Conceptual agents from the PRD:

- Race Data Agent
- Horse Intelligence Agent
- Prediction Agent
- Value Agent
- Strategy Agent
- Wager Construction Agent
- Race Analyst Agent
- Alert Agent
- Bet Sheet Agent
- Performance Verification Agent
- Strideo Intelligence Agent
- Strideo Assistant Agent

Foundation target:

```text
lib/agents/
  types.ts
  contracts.ts
  README.md
```

Rules:

- Agents must use structured inputs and outputs.
- Agent outputs must be persisted in later phases.
- No hidden agent state.
- Every future agent run must be traceable through `job_runs`, `agent_logs`, or
  equivalent audit tables.
- Assistant tools must be structured, scoped, and authorization-aware.

Phase 0 may document contracts, but should not implement model calls, ingestion,
scoring, wager construction, alerts, or assistant execution.

## API Architecture

Foundation target:

- Prefer Server Components and Server Actions where appropriate.
- Use Route Handlers for webhook-style or external integration boundaries.
- Keep API modules thin and typed.
- Do not expose raw database access to browser clients beyond Supabase RLS paths.

Initial API boundaries:

- Auth callback route.
- Health/readiness route only if needed for deployment.
- No racing data, Opportunity, wager, assistant, or payment endpoints in Phase 0.

Future API rules:

- Server-only routes validate session and entitlement.
- Webhooks verify signatures.
- AI and provider calls run server-side only.
- API responses avoid leaking internal scoring/debug metadata unless explicitly
  intended for the product.

## PWA Architecture

Foundation target:

- PWA-ready file layout without committing to full offline behavior yet.
- Web manifest path reserved.
- App icons path reserved.
- Mobile viewport metadata configured.
- Service worker strategy documented before implementation.

Future PWA requirements:

- Installable app shell.
- Offline-friendly authenticated shell where feasible.
- Cache only safe static assets and non-sensitive shell data.
- Do not cache private wagering/user data unless encrypted, scoped, and reviewed.
- Push-notification compatibility for alerts after entitlement and consent flows
  exist.

## Future Mobile Compatibility Requirements

Strideo must remain web-first and mobile-first with no backend rewrite for native
mobile.

Requirements:

- Shared Supabase backend and RLS model.
- Stable API/data contracts independent of Next.js UI components.
- Mobile-safe auth flow and callback URLs.
- Touch-friendly navigation with bottom app navigation:
  - Opportunities
  - Races
  - Bet Sheet
  - Alerts
  - Assistant
- Responsive layouts tested at common iPhone and Android widths.
- Avoid browser-only assumptions in core domain logic.
- Keep future React Native/native clients able to reuse API contracts and
  Supabase Auth concepts.

## Phase 0 Work Sequence

1. Clean repository baseline.
2. Confirm docs PR and Supabase hardening PR are merged or intentionally based.
3. Verify Next.js, TypeScript, Tailwind, and shadcn configuration.
4. Establish route groups and authenticated shell boundaries.
5. Establish Supabase client modules.
6. Establish typed environment variable modules.
7. Establish placeholder agent contract documentation.
8. Establish PWA/mobile metadata placeholders.
9. Run `npm run lint`.
10. Run `npm run build`.
11. Record verification results in the handoff.

## Phase 0 Non-Goals

- No application domain tables.
- No Opportunity schema.
- No race data ingestion.
- No prediction/value/strategy implementation.
- No wager construction.
- No payment integration.
- No production assistant.
- No push notifications.
- No native mobile app.

## Exit Criteria

Phase 0 is complete when:

- App foundation runs locally.
- Supabase Auth works for the approved user path.
- Protected routes are enforced.
- Environment variables are documented and typed.
- Tailwind and shadcn are configured.
- PWA/mobile foundations are present or documented.
- Agent/API boundaries are documented.
- `npm run lint` passes.
- `npm run build` passes.
- No secrets are committed.
- No app tables are created.

## Approval Gate

Do not begin implementation until this Phase 0 plan is approved.
