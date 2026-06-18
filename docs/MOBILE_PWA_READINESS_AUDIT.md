# Mobile/PWA Readiness Audit

Audit date: 2026-06-17

## Goal

Audit the current Strideo protected app experience for mobile web and PWA
readiness without building new product features.

This audit identifies the minimum changes needed to make the existing web app
safer and more usable for mobile-first production usage while preserving the
PRD as the center of gravity.

## Layer Classification

Layer 2 - Production Readiness.

Mobile web and PWA readiness supports safe production usage, but it should not
displace Layer 1 PRD-critical work such as Opportunity generation, prediction
models, value assessment, wager construction, outcome tracking, or continuous
model improvement.

Native iOS and Android applications remain Layer 3 - Scale Operations and are
out of scope.

## Reviewed Scope

Reviewed:

- `docs/CODEX_OPERATING_PROMPT.md`
- `AGENTS.md`
- `PRD.md`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- `docs/PROGRESS_DATABASE_AUDIT.md`
- `app/layout.tsx`
- `public/manifest.webmanifest`
- `public/sw.js`
- `components/layout/app-shell.tsx`
- `components/navigation/app-section-nav.tsx`
- protected dashboard, race, Opportunity, Data Imports, Progress, auth, loading,
  empty, and error states

Current open PR review:

- PR #82, `Add Layer 2 mobile shell navigation pass`, is an active mobile shell
  implementation slice. Do not duplicate its navigation or touch-target work in
  planning/status PRs.
- PR #83, `Add mobile race entry cards`, is an active race-detail readability
  implementation slice. Do not duplicate its race-entry card work in
  planning/status PRs.
- PR #61, `Add ML data readiness audit`, remains an unrelated draft. This
  mobile/PWA audit does not duplicate it.

## Current Readiness Status

Status: partially ready.

The app has a solid responsive foundation: server-protected routes, reusable
cards, responsive grids, route-level loading/error states, PWA metadata, a
manifest, and a service worker file. The protected app is not yet production
ready as a mobile-first PWA because primary navigation is still top horizontal
scroll, touch targets are often 32-36px, the race-entry table relies on
horizontal scrolling, and the service worker is not registered or useful for
offline fallback.

The current state is acceptable for Dev/internal use. Before broader mobile
usage, Strideo should complete a small Layer 2 mobile shell pass and a minimal
PWA runtime pass.

## Key Findings

| Severity | Area | Finding | Recommended fix |
| --- | --- | --- | --- |
| P1 | Mobile navigation | `AppSectionNav` is a top horizontal scroller and does not match the PRD target bottom navigation of Opportunities, Races, Bet Sheet, Alerts, and Assistant. It also gives primary space to Predictions, Strategies, Settings, and internal Data Imports. | Adapt the existing navigation into a mobile bottom primary nav for user-facing tabs, keeping admin/internal and secondary routes available from the header or settings. Do not create a duplicate competing nav system. |
| P1 | Touch targets | Core buttons and nav items use `h-8` or `h-9`, below the common 44px mobile target. Examples include small buttons, logout/theme controls, and nav items. | Raise mobile interactive target height to at least 44px while preserving compact desktop density through responsive variants. |
| P1 | Race entry readability | `RaceEntriesTable` uses `min-w-[880px]` with horizontal scrolling. This prevents comfortable one-handed inspection of runners, odds, and result status on phones. | Add a mobile entry-card layout below the existing table breakpoint, or split table columns into priority groups for mobile. Keep the desktop table for larger screens. |
| P1 | PWA runtime | `manifest.webmanifest`, metadata, and `public/sw.js` exist, but no service worker registration was found. The service worker also lacks a fetch handler and offline fallback. | Add a minimal client registration path and a conservative offline shell/fallback strategy for static app chrome and signed-out/auth boundary pages. Do not cache private Supabase data. |
| P2 | PWA installability | Manifest uses only an SVG icon with `sizes: "any"` and start URL `/`. Some install surfaces expect PNG sizes, and installing to `/` opens the public page rather than the protected workspace. | Add generated PNG icons such as 192x192 and 512x512, keep the SVG, and decide whether `start_url` should remain `/` or move to `/protected` with auth redirect behavior documented. |
| P2 | Safe-area layout | The shell does not account for mobile safe-area insets. A future bottom nav could collide with iOS home indicator unless padding is added. | Add safe-area-aware padding when introducing bottom navigation and keep content from sitting under fixed mobile controls. |
| P2 | Dense operational text | Data Imports and Progress cards can display long table lists, batch keys, and status text. Some values use plain inline text or `code` without visible wrapping rules. | Add `min-w-0`, `break-words`, and compact mobile value treatments for operational metrics. Keep internal-only surfaces secondary to product tabs. |
| P2 | Opportunity actions | Opportunity detail actions can stack awkwardly because tracking controls and linked-race buttons sit in a mixed flex area. | Make primary Opportunity actions full-width on mobile, with secondary links below. This preserves Opportunity-centered workflows. |
| P2 | Accessibility basics | Icons are mostly `aria-hidden`, labels are present, and focus styles exist through shadcn-style primitives. Gaps remain: no skip link, smaller touch targets, and horizontal-scroll tables need better mobile alternatives. | Add a skip link, improve mobile target sizing, and ensure table/card alternatives expose the same content semantically. |
| P3 | Offline feature scope | Offline-ready shell is architecturally desired, but the app depends on authenticated Supabase reads for protected data. | Keep first offline scope minimal: app shell, manifest assets, public/auth boundary, and a clear offline message. Defer offline protected data caching. |

## Surface Notes

### Protected App Shell

Strengths:

- Server-side auth gate redirects signed-out users to `/auth/login`.
- Profile context is loaded server-side before the shell renders.
- Header and nav are responsive enough for Dev use.

Gaps:

- Current navigation is not the PRD's mobile bottom nav.
- Header actions remain small for touch.
- No safe-area strategy exists for future fixed mobile navigation.

### Race Screens

Strengths:

- Race list cards collapse cleanly on mobile.
- Race detail metadata uses responsive grids.
- Empty, loading, and error states exist.

Gaps:

- Entries are table-first with horizontal scroll.
- The table is appropriate for desktop comparison, but not for quick phone
  inspection at the track or on a betting screen.

### Opportunity Screens

Strengths:

- Opportunity remains central and visibly linked to race context.
- Feed/detail cards use responsive grids.
- Tracking language avoids implying a wager was placed.

Gaps:

- Primary mobile workflow should make Opportunity actions more thumb-friendly.
- Future mobile nav should put Opportunities first.

### Data Imports And Progress

Strengths:

- Internal Data Imports access is gated by role.
- Operational surfaces use cards and grids rather than raw tables.
- Progress dashboard is readable enough on mobile for Dev inspection.

Gaps:

- These are not primary mobile user surfaces and should stay secondary.
- Long internal values can wrap poorly without explicit word-breaking.

### Auth And Protected Route Flow

Strengths:

- Auth pages are narrow, centered, and mobile-compatible.
- Redirect flow keeps protected routes behind Supabase SSR auth.

Gaps:

- Installed PWA start behavior is not documented.
- Offline/auth failure behavior is not yet designed beyond normal route errors.

### PWA Files

Strengths:

- `app/layout.tsx` declares manifest metadata, Apple web app metadata, viewport,
  and theme color.
- `public/manifest.webmanifest` exists.
- `public/icons/strideo.svg` exists.
- `public/sw.js` exists.

Gaps:

- No service worker registration was found.
- `public/sw.js` only handles install and activate events.
- No offline fallback exists.
- Icon set is too minimal for production installability testing.

## Explicit Out Of Scope

This audit does not authorize:

- native mobile app scaffolding
- Capacitor, React Native, or Expo
- push notifications
- new product features
- database schema changes
- Supabase migrations
- production changes
- ML/model logic
- a wholesale shell rewrite
- duplicate navigation systems
- private protected-data offline caching

## Suggested Implementation Sequence

1. Complete or reconcile PR #82 for the mobile shell pass: adapt the existing
   nav into a mobile bottom primary nav for Opportunities and Races now, with
   Bet Sheet, Alerts, and Assistant slots added when those routes exist. Keep
   secondary/internal routes accessible but visually subordinate.
2. Complete or reconcile the PR #82 touch-target work: raise mobile
   button/nav/icon controls to 44px minimum and add safe-area padding for fixed
   mobile controls.
3. Complete or reconcile PR #83 for the race detail mobile pass: add entry cards
   for phone view while preserving the desktop comparison table.
4. Opportunity action pass: make primary Opportunity actions full-width and
   easy to reach on mobile.
5. PWA installability pass: add PNG icon sizes, document `start_url`, register
   the service worker, and add a minimal offline fallback.
6. Operational surface polish: add wrapping/min-width safeguards for Data
   Imports and Progress values.
7. Browser verification pass: run the protected shell at iPhone, Android,
   tablet, and desktop widths with test auth/session state available.

## Risks If Deferred

- Mobile users can reach protected routes, but the app will feel like a
  desktop dashboard compressed into a phone.
- Race-entry comparison will remain awkward on phones, weakening the Race
  Intelligence to Opportunity workflow.
- Installed PWA behavior may appear available in metadata but fail practical
  install/offline expectations.
- Small touch targets can create avoidable friction in high-frequency racing
  workflows.
- Operational/admin routes may continue competing with user-facing product
  tabs in the mobile shell.

## Priority Guardrails

- Native mobile remains Layer 3 and should stay deferred.
- Layer 1 Opportunity work remains the higher product priority unless mobile
  readiness blocks safe usage or review.
- Mobile fixes should reinforce the Opportunity loop and not create generic
  racing-dashboard surfaces.
- The first implementation PR should be a narrow Layer 2 shell/navigation and
  touch-target pass, not a product feature expansion.

## Validation

Runtime browser verification was not performed in this audit because protected
routes require authenticated session state and this task was documentation-only.
Code-level review covered the protected shell, route components, responsive
classes, metadata, manifest, and service worker files.

Required local validation for this audit:

- `npm run lint`
- `git diff --check`

## Supabase And Production Impact

- Supabase touched: no.
- Migrations created: no.
- Migrations applied: no.
- Production touched: no.
