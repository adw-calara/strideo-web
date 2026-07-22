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

Current implementation note: the app has protected Opportunity feed/detail,
tracked Opportunities, scoring contracts, pre-race feature snapshot contracts,
Dev-only persisted feature snapshot materialization, and Dev-only racing-form
readiness through trainer stats. Insert-only service-role grants for Dev
`model_versions` and `prediction_outputs` are merged and applied. The next
narrow lineage slice is materialization of one explicitly non-trained Dev model
identity and seven market-derived prediction lineage fixtures only. Real
model-backed value, scoring runtime, wagering, and production rollout remain
separate work.

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

## Near-Term Delivery Plan

The phase roadmap above remains the product map. The following delivery slices
are the required near-term execution order. Each slice should remain a focused
PR unless its acceptance criteria prove that it must be split further.

1. **Reliability and CI PR**
   - Repair the `brace-expansion` and `js-yaml` findings without broad
     dependency upgrades.
   - Update Next.js within the supported current major and re-run the audit.
     Treat the production-path `sharp` advisory as a release blocker until a
     supported Next.js/Sharp combination is available and verified. Do not use
     `npm audit fix --force` when it proposes a Next.js major downgrade.
   - Pin the Node runtime and the Supabase CLI used by local and CI workflows.
   - Make test discovery automatic so new test files cannot be silently omitted.
   - Add GitHub Actions for migration checks, lint, tests, build, and dependency
     audit, plus Dependabot configuration and least-privilege/pinned actions.
   - Correct the stale `0-foundation` health label.
   - Give the verification job a stable documented check name for branch
     protection.
2. **GitHub settings after CI is green**
   - Enable vulnerability alerts and Dependabot security updates.
   - Protect `main`, require pull requests, require the exact verification
     check, and prevent direct and force pushes.
   - Apply these settings only after the workflow exists and passes on `main`.
3. **Codex and status consolidation**
   - Keep `AGENTS.md`, `docs/CODEX_OPERATING_PROMPT.md`, this roadmap, and
     `/protected/progress` aligned.
   - Prefer repository-relative Codex instructions and reusable Strideo skills;
     do not commit secrets or machine-specific credentials.
4. **Dev model/prediction materialization only**
   - Reuse the merged insert-only grants and the existing dry-run planner.
   - Against the currently verified empty target set, the first apply inserts
     one Dev model-version identity and seven prediction-output identities.
   - Read back the inserted model and all seven predictions before replay.
   - Replay must report one existing model identity and seven existing
     prediction identities with no duplicate writes.
   - Do not update the seven existing `value_calculations`; do not create scores,
     Opportunities, wagers, or production behavior.
5. **Typed boundary and preview verification**
   - Generate Supabase database types for raw database access boundaries while
     retaining intentional domain, projection, and UI types.
   - Make type drift checks regenerate to a temporary location and compare
     without rewriting tracked files. Prefer a migration-built local Supabase
     schema in CI over shared Dev credentials when practical.
   - Add Vercel preview deployment and Playwright smoke coverage for signed-out,
     authentication, protected-route, and core responsive surfaces.
   - Split database typing from deployment/browser work if the slice becomes
     materially cross-cutting.
6. **First real provider import**
   - Import one provider-backed race card into Dev through the existing
     normalization, persistence, idempotency, and job-audit paths.
7. **First real Opportunity vertical slice**
   - Produce a genuinely independent prediction baseline and compare it with a
     market probability captured at the documented decision cutoff.
   - Insert new append-only value-calculation and Opportunity lineage. Never
     retrofit the seven existing market-lineage fixtures.
   - A morning-line-versus-later-odds comparison is valid only when both inputs
     were available by the decision cutoff; otherwise use an explainable
     form-based baseline and record missing evidence rather than synthetic data.
8. **Bet Sheet workflow**
   - Connect a real Opportunity and recommendation to the user-owned daily card.
9. **Settlement and performance loop**
   - Import outcomes, settle recommendations, and attribute ROI and model or
     strategy performance back to Opportunity.

Repository visibility is a decision gate, not a code task. The GitHub repository
is currently public. The owner must explicitly choose to keep it public or make
it private before provider credentials, proprietary scoring logic, or sensitive
deployment configuration are introduced. `"private": true` in `package.json`
only prevents npm publication; it does not make the GitHub repository private.

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
- Complete: Dev-only persisted `feature_snapshots` materialization has merged.
  Strideo Dev has the initial 7 audited pre-race snapshots, readback verified,
  and replay safety verified with deterministic IDs plus skip-existing behavior.
  This remains Dev-only contract/readiness work, not production rollout, real
  ML, fake ML, persisted scoring, wagering, Bet Sheet, Alerts, Assistant,
  settlement, or ROI.
- Complete: The read-only `value_calculation_inputs` semantic audit reconciled
  the earlier `0/7` report as zero value-calculation rows over seven Dev
  feature snapshots, not seven pre-existing implemented signals. The canonical
  signal model is now implemented as read-only readiness observability in
  `docs/DEV_ONLY_RACING_FORM_COVERAGE_READINESS.md` and the Dev coverage
  report.
- Complete: Dev-only `value_calculations` input lineage is populated for the
  initial 7 Dev pre-race `feature_snapshots`. The rows are linked to their
  source feature snapshots and market inputs, replay as skip-existing, and keep
  `model_version_id`, `prediction_output_id`, `model_probability`,
  `opportunity_id`, and `opportunity_scores` linkage empty permanently for
  these fixtures. Later real lineage must use new append-only rows.
- Complete: Dev-only model/prediction lineage dry-run planning exists. The
  report proposes one honest non-production model-version identity and 7
  market-derived baseline prediction-output row shapes without database writes,
  migrations, trained ML claims, scoring, `value_calculations` updates, or
  `opportunity_scores` updates.
- Complete: the insert-only Dev service-role grants for `model_versions` and
  `prediction_outputs` merged in PR #109 and are present in the Dev migration
  lineage. No additional grant slice is required before materialization.
- Active: the reliability branch now pins Node 24.18.0 and the repository-local
  Supabase CLI, discovers tests automatically, adds the `verify` workflow and
  Dependabot, and corrects the health phase to `pre-release`. These changes are
  locally validated but are not merged; preview deployment and browser smoke
  coverage remain separate work.
- Verified 2026-07-22: a clean install under Node 24.18.0 passes migration-file
  checks, lint, all 123 tests across 16 automatically discovered test files,
  production build, and development/production HTTP smoke checks. The local
  Supabase CLI reports the pinned version, while linked read-only checks fail
  closed at the password guard in the credential-free worktree.
- Release readiness blocker: `npm run verify` passes migration checks, lint,
  tests, and build, then fails dependency audit. The development-tool findings
  through `brace-expansion` and `js-yaml` are resolved. The remaining two
  high-severity audit entries are the production `next -> sharp` path: Next.js
  16.2.11 still declares Sharp 0.34.5, while npm's forced fix proposes an
  unacceptable Next.js 14 downgrade. The workflow is included on the branch
  but cannot be called green or merged while that audit remains. `main` is
  unprotected, vulnerability alerts are disabled, and GitHub settings remain
  unchanged.
- Runtime verification limit: real-browser and authenticated-flow coverage was
  not executed because repository Playwright tooling is not installed. The
  missing local `agent-browser` executable is a Codex convenience gap, not a
  release requirement. Signed-out HTTP routing behaves as expected.
- Queued: Wager construction, Bet Sheet, performance verification, assistant,
  and commercial readiness remain behind the next Opportunity-centered slices.
- Blocked for release, not for local development: the reliability and browser
  verification gaps above must close before deployment or real provider/scoring
  work.
- Deferred: native mobile apps, marketplace/community systems, and broad scale
  operations remain Phase 9/future work unless explicitly requested.

## Next Recommended Sequence

1. Complete the reliability and CI PR, then keep its stable verification check
   green for every later slice.
2. Apply the GitHub protection/security settings after CI is green.
3. Resolve the currently public repository visibility before proprietary or
   credential-bearing integration work.
4. Keep this roadmap and `/protected/progress` aligned after each merged slice.
5. Materialize only the scoped Dev model/prediction fixtures using the existing
   grant and dry-run plan; verify first-run counts, direct readback of all eight
   rows, and replay counts exactly.
6. Add generated database boundary types and preview/browser verification.
7. Import one real provider-backed race card into Dev.
8. Build one end-to-end Opportunity from an independent, time-valid prediction
   baseline and new append-only value evidence.
9. Continue vertically through Bet Sheet, settlement, and performance before
   broadening into Alerts, Assistant, payments, or scale operations.

## Risk And Drift Watchlist

- Do not let mobile/PWA work become a native app or generic mobile roadmap.
- Do not duplicate PR #82 mobile shell work or PR #83 race-entry card work.
- Keep provider ingestion queued behind the next validated Opportunity path
  unless explicitly requested.
- Keep source-fact, glossary, model, prediction, value, and operational tables
  server-only until a reviewed product surface needs access.
- Treat the seven existing Dev `value_calculations` as immutable market-input
  lineage facts. Real model-backed value work inserts new rows; it does not
  backfill or update those fixtures.
- Never use the same market-derived probability as both the independent
  prediction and the market comparator for a value claim.
- Record the feature, prediction, and market timestamps plus the decision cutoff
  so later odds or outcome data cannot leak into pre-race scoring.
- Keep future ML, wagering, alerts, assistant, and performance work linked back
  to Opportunity lineage wherever the PRD expects it.
- Do not present contract-only value-scoring shapes as real predictions or
  wagering guidance.
