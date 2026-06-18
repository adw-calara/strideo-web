# Strideo Codex Operating Prompt

## Purpose

Use this prompt as the operating layer for Codex work on Strideo.

The goal is to advance Strideo while preserving the PRD as the product source
of truth and Opportunity as the central object. The app should remain easy to
maintain, upgrade, deploy, and use on mobile without drifting into a generic
racing dashboard, data warehouse, or infrastructure project.

## Source Of Truth

Before material code, schema, architecture, documentation, or planning changes,
review the relevant source material:

- `PRD.md`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- `docs/ARCHITECTURE_REVIEW.md`
- current progress or audit docs, especially `docs/PROGRESS_DATABASE_AUDIT.md`
- related feature docs in `docs/`
- open PRs, recently merged PRs, current branch state, and roadmap status

If the work duplicates an existing implementation, migration, document,
architecture path, or open workstream, stop and recommend consolidation or
reuse before creating a parallel path.

## Product Alignment Test

For every material task, answer:

Does this increase Strideo's ability to identify, explain, validate, track, or
improve wagering Opportunities?

If yes, proceed within scope.

If no, explain why the work is necessary, classify it as production readiness
or scale operations, and defer it unless it blocks current product work or
reduces material operational risk.

## Layer Classification

Classify material work into one primary layer.

### Layer 1 - Product Differentiator

Work that directly improves Strideo's Opportunity loop:

- race data intelligence
- prediction outputs
- value assessment
- strategy matching
- Opportunity creation
- wager construction
- result verification
- performance measurement
- model and strategy improvement
- assistant access to Opportunity intelligence

This is the highest-priority product work.

### Layer 2 - Production Readiness

Work needed to operate, maintain, upgrade, deploy, and safely use the product:

- security and RLS hardening
- migration safety
- deployment repeatability
- runtime verification
- observability and error handling
- code organization that lowers maintenance burden
- dependency and framework upgrades
- auth, entitlements, and secret-handling safety
- mobile web usability and responsive/PWA readiness
- data quality controls
- operational tools that support ingestion, verification, or support

Prioritize Layer 2 when it blocks Layer 1, reduces material operational risk,
or is required for safe deployment.

### Layer 3 - Scale Operations

Work intended for larger future operations:

- native mobile applications
- advanced automated retraining pipelines
- enterprise observability
- multi-region infrastructure
- advanced model governance
- support operations at scale
- marketplace/community/syndicate systems

Defer Layer 3 unless explicitly requested or needed to unblock near-term
product delivery.

## Opportunity-Centered Architecture

Maintain Opportunity as the core product aggregate.

New work should reinforce this flow:

Race Data -> Prediction -> Value Assessment -> Opportunity Creation -> Wager
Construction -> Outcome Tracking -> Performance Measurement -> Model
Improvement

Recommendations, alerts, wagers, explanations, assistant actions, results, and
performance metrics should link back to an Opportunity wherever possible.

Avoid standalone picks, disconnected alerts, generic race-card features,
generic handicapping tools, or model outputs that cannot be traced to the
Opportunity loop.

## Continuous Learning Requirement

Preserve the ability to learn from historical and future racing data.

Design data, prediction, value, recommendation, and analytics paths to support:

- append-only source and generated history
- raw source preservation and normalized racing-code lineage
- feature reproducibility
- model versioning
- prediction evaluation
- odds and market context
- result and ROI attribution
- calibration and value assessment analysis
- future retraining and auditability

Do not overwrite high-value generated facts when history is needed for
reconstruction, backtesting, or performance evaluation.

## Maintainability, Upgrade, And Deployment Rules

Prefer the repo's existing patterns before introducing new ones.

Always:

- keep changes small and scoped
- extend existing systems before creating alternatives
- avoid duplicate documentation, workflows, migrations, or abstractions
- preserve backward compatibility unless explicitly approved
- keep browser code free of service-role keys and secrets
- keep Supabase Dev/Staging separate from production
- use timestamped append-only migrations only when migrations are explicitly
  requested
- verify database work with the documented migration workflow before applying
  anything
- keep deployment assumptions documented when changing runtime behavior
- choose the option with the lowest long-term maintenance burden that still
  supports the PRD

For upgrades and dependency changes:

- confirm the upgrade supports the current Next.js, React, Supabase, and
  Vercel architecture
- keep upgrade PRs separate from product feature PRs unless the feature requires
  the upgrade
- run the standard verification required by `AGENTS.md`

## Mobile And PWA Readiness

Strideo is web-first and mobile-first now. Native mobile apps are future scale
work.

Application UI work should preserve:

- responsive layouts on iPhone-sized screens, Android-sized screens, tablet,
  and desktop
- app navigation that maps toward Opportunities, Races, Bet Sheet, Alerts, and
  Assistant
- touch-friendly controls
- readable dense racing data without horizontal overflow
- installable PWA foundations where relevant
- safe authenticated routes and signed-out redirects

Avoid desktop-only layouts, hidden core actions on mobile, fixed-width tables
without mobile treatment, or workflows that require a future native rewrite.

## Task Execution Contract

Before implementation, define:

- objective
- success criteria
- scope boundaries
- explicit out-of-scope items
- layer classification
- PRD and Opportunity alignment

After implementation, confirm:

- required validation ran
- no unrelated files changed
- no duplicate implementation or documentation was introduced
- architecture remains consistent with the existing repo
- Supabase touch status is clear
- production touch status is clear
- remaining risks and follow-ups are documented

## Reporting Format

For material handoffs, PR summaries, audits, or completion reports, include:

- Goal
- Layer Classification
- PRD Alignment
- Opportunity Alignment
- Continuity Review
- Scalability or Maintainability Review
- Mobile/PWA Impact, when applicable
- Deployment Impact, when applicable
- Deferred Items
- Progress Report Updates, when applicable
- Verification
- Supabase touched or not touched
- Production touched or not touched

Small fixes can use a concise version of this format, but they should still
state what changed, what was verified, and any Supabase or production impact.
