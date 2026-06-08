# STRIDEO

## Product Requirements Document (PRD)

Version: 1.0

Tagline:

**Find the Edge. Improve Every Race.**

---

# Overview

Strideo is an AI-powered wagering intelligence platform built for horseplayers.

The platform helps users:

* Discover betting opportunities
* Identify value
* Execute betting strategies
* Construct wagers
* Build daily betting cards
* Track performance
* Improve over time

Unlike traditional racing platforms that focus on picks, figures, or reports, Strideo focuses on:

* Opportunity discovery
* Wager construction
* Strategy evaluation
* Verified performance
* Continuous learning

---

# Mission

Become the intelligence layer that powers smarter wagering decisions.

---

# Core Philosophy

Every race creates data.

Every strategy creates data.

Every recommendation creates data.

Every wager creates data.

Every outcome creates data.

Nothing is overwritten.

Everything is measured.

The platform continuously improves.

---

# Core Concept

## Opportunity

The Opportunity is the primary object within Strideo.

An Opportunity contains:

* Race
* Strategy
* Recommended Wager
* Expected ROI
* Confidence Score
* Outcome

Every recommendation, alert, wager, and performance metric is linked to an Opportunity.

---

# Platform Architecture

* Web First
* Mobile First
* Responsive
* PWA Ready
* Future Native Mobile App
* Shared Backend
* No Backend Rewrite Required

---

# User Types

## Free

Access:

* Today's races
* Limited analysis
* Limited opportunities

## Pro

Subscription

$19/month

Access:

* Full opportunity engine
* Full strategy engine
* Wager construction
* Daily bet sheets
* Alerts
* Performance center
* Strideo Assistant

## Elite (Future)

Access:

* AI Betting Coach
* Strategy Marketplace
* Replay Intelligence
* Syndicates
* Community Intelligence

---

# MVP Modules

## Opportunity Dashboard

Displays:

* Today's races
* Top opportunities
* Top strategies
* Active alerts

Primary view:

Opportunity Feed

---

## Race Intelligence

Displays:

* Entries
* Odds
* Rankings
* AI analysis
* Strategy matches
* Wager recommendations

---

## Horse Intelligence

Displays:

* Historical performance
* Surface profile
* Distance profile
* Ratings

Future:

* Replay intelligence
* Trip notes

---

## Prediction Engine

Purpose:

Generate win probabilities.

Outputs:

* Probability
* Ranking
* Confidence Score

---

## Value Engine

Purpose:

Identify overlays.

Outputs:

* Edge Score
* Value Score
* Opportunity Score

---

## Strategy Engine

Purpose:

Identify betting opportunities.

Outputs:

* Strategy Matches
* Opportunities
* Alerts

---

## Wager Construction Engine

Purpose:

Convert opportunities into wagers.

MVP:

* Win
* Place
* Show
* Exacta
* Trifecta

Future:

* Superfecta
* Daily Double
* Pick 3
* Pick 4
* Pick 5
* Pick 6

Outputs:

* Recommended Wager
* Expected ROI
* Confidence Score

---

## Daily Bet Sheet

Purpose:

Build a daily betting card.

Workflow:

Research

→ Add Opportunity

→ Add To Bet Sheet

→ Review Card

→ Mark As Placed

→ Track Results

Statuses:

* Draft
* Planned
* Placed
* Settled

---

## Strideo Assistant

Natural language interface.

Examples:

"Show me all Saratoga races today"

"Show opportunities with ROI greater than 15%"

"Which strategies are performing best?"

"Open Race 7"

Capabilities:

* Search
* Analysis
* Navigation
* Recommendations

---

## Alerts Center

Displays:

* Active alerts
* Opportunity alerts
* Strategy alerts
* Alert history

Future:

* Push
* SMS

---

## Performance Center

Displays:

* ROI
* Win Rate
* Sample Size
* Confidence Score
* Historical Trends

---

# MVP Strategies

### Surface Switch Strategy

* Turf to Dirt
* Dirt to Turf

### Value Overlay Strategy

* Model Probability > Market Probability

### Price Strategy

* Odds Threshold

### Exacta Value Strategy

* Multi-Horse

### Trifecta Structure Strategy

* Multi-Horse

### Favorite Fade Strategy

* Alternative Structures

### Chaos Race Strategy

* Wide Exotic Structures

---

# Agent Architecture

## Race Data Agent

Imports:

* Tracks
* Races
* Entries
* Odds
* Results

---

## Horse Intelligence Agent

Creates:

* Horse Profiles
* Statistics

---

## Prediction Agent

Creates:

* Rankings
* Probabilities

---

## Value Agent

Creates:

* Edge Scores
* Opportunity Scores

---

## Strategy Agent

Evaluates:

* Single-Horse Strategies
* Multi-Horse Strategies

Creates:

* Opportunities

---

## Wager Construction Agent

Creates:

* Win Bets
* Exacta Structures
* Trifecta Structures

---

## Race Analyst Agent

Creates:

* Race Narratives
* Opportunity Explanations

---

## Alert Agent

Creates:

* Alerts

---

## Bet Sheet Agent

Manages:

* Daily Bet Sheets

---

## Strideo Assistant Agent

Handles:

* Search
* Navigation
* Analysis
* Recommendations

---

## Performance Verification Agent

Measures:

* ROI
* Win Rate
* Strategy Performance
* Opportunity Performance

---

## Strideo Intelligence Agent

Improves:

* Prediction Models
* Strategy Models
* Scoring Weights

---

# Database Requirements

Must support:

* Millions of races
* Millions of odds updates
* Millions of opportunities
* Millions of recommendations
* Millions of wagers
* Multi-year history

Principles:

* Event Sourced
* Append Only
* Partitioned
* Analytics Ready

---

# Database Layers

## Reference

tracks

horses

jockeys

trainers

surfaces

---

## Transaction

races

race_entries

odds_snapshots

results

---

## Opportunity

opportunities

opportunity_scores

opportunity_explanations

strategy_matches

---

## Wager

wager_templates

wager_recommendations

daily_bet_sheets

daily_bet_sheet_entries

---

## Performance

strategy_performance

opportunity_performance

recommendation_results

model_performance

---

## User

profiles

subscriptions

user_strategy_preferences

watchlists

alert_preferences

---

## Assistant

conversation_sessions

conversation_messages

assistant_actions

assistant_navigation_events

---

## Learning

model_versions

model_weights

feature_performance

prediction_accuracy

---

## Audit

agent_logs

job_runs

event_log

---

# Mobile Requirements

Must work flawlessly on:

* iPhone
* Android
* Tablet
* Desktop

Bottom Navigation:

* Opportunities
* Races
* Bet Sheet
* Alerts
* Assistant

PWA Ready:

* Install To Home Screen
* Service Worker
* Push Ready
* Offline Ready

---

# Technology Stack

Frontend

* Next.js
* TypeScript
* Tailwind
* ShadCN

Backend

* Supabase PostgreSQL
* Supabase Edge Functions

AI

* OpenAI GPT

Hosting

* Vercel

Payments

* Stripe

Analytics

* PostHog

Notifications

* OneSignal

Race Data

* The Racing API

Future:

* Equibase

Development

* Codex

---

# Codex Multi-Agent Build Workflow

Strideo may be built through a coordinated Codex multi-agent workflow.

This workflow is an execution model for software delivery. It does not change
the product concept, MVP modules, data model priorities, or long-term product
vision.

The build workflow should preserve the core Strideo principles:

* Opportunity remains the central object
* Important records are append-only
* Performance is measured
* Product scope is delivered in small, reviewable phases
* Supabase Dev is validated before any production authorization

---

## Build Plan

Codex agents should work in small, phase-based branches.

Each phase should produce one of:

* Product or architecture plan
* Migration preparation
* Dev execution report
* Application feature implementation
* Runtime verification report
* Follow-up hardening plan

Planning work should happen before database, RLS, or production-impacting
changes.

Implementation work should use the existing PRD, architecture, roadmap, and
architecture review as source material.

---

## Agent Workstreams

### Product Planning Agent

Owns:

* PRD interpretation
* Product scope boundaries
* MVP sequencing
* User workflow clarity

### Architecture Agent

Owns:

* Technical architecture alignment
* Module boundaries
* App routing and runtime patterns
* Backend service boundaries

### Supabase Schema Agent

Owns:

* Schema plans
* Migration files
* RLS posture
* Grants
* Advisor review

### Supabase Execution Agent

Owns:

* Dev-only migration execution
* Migration history checks
* SQL verification
* Execution reports

### Auth And Security Agent

Owns:

* Supabase Auth flow
* Server-only service-role handling
* Profile and role bootstrap
* Email allowlist
* Secret-handling review

### App Shell Agent

Owns:

* Next.js app foundation
* Protected routes
* Dashboard shell
* Navigation
* Loading, error, and empty states

### Product Feature Agent

Owns:

* Opportunity dashboard features
* Race intelligence views
* Strategy workflows
* Bet sheet workflows
* Performance views

### AI Assistant Agent

Owns:

* Strideo Assistant behavior
* Prompt and tool boundaries
* Assistant search/navigation
* Explanation quality

### Verification Agent

Owns:

* Local checks
* Dev runtime verification
* RLS and grant verification
* Test-user cleanup
* Handoff reports

### Release Coordination Agent

Owns:

* PR readiness
* Branch hygiene
* Merge sequencing
* Follow-up backlog

---

## Agent Contracts

Every Codex agent must follow the same contract.

Inputs:

* PRD
* AGENTS.md
* Architecture docs
* Roadmap docs
* Prior phase reports
* Current branch state

Outputs:

* Focused code, documentation, or migration changes
* Verification commands and results
* Clear statement of Supabase touch status
* Clear statement of production touch status
* Remaining risks and follow-ups

Rules:

* Do not expand product scope without documenting the reason
* Do not rewrite existing migrations
* Do not apply migrations without explicit authorization
* Do not touch production without explicit authorization
* Do not commit secrets
* Do not expose service-role keys to browser code
* Do not use user-editable metadata for authorization
* Stop on first migration or production-target ambiguity

Handoff:

* State what changed
* State what was verified
* State what was not verified
* State whether Supabase Dev was touched
* State whether production was touched
* State the recommended next step

---

## Build Waves

### Wave 0: Operating Layer

Purpose:

* Establish repo instructions
* Establish environment naming
* Establish branch and PR rules
* Confirm secret-handling rules

### Wave 1: Schema Foundation

Purpose:

* Design schema
* Prepare append-only migrations
* Review RLS and grant posture
* Execute migrations in Supabase Dev only after authorization

### Wave 2: Authenticated App Foundation

Purpose:

* Build protected app shell
* Connect Supabase SSR auth
* Load profile and role context
* Verify server-only bootstrap behavior

### Wave 3: Opportunity Core

Purpose:

* Build Opportunity data surfaces
* Connect race, strategy, recommendation, wager, and outcome records
* Preserve append-only history

### Wave 4: Bet Sheet And Performance

Purpose:

* Build daily bet sheet workflow
* Track placed wagers and results
* Measure ROI, win rate, sample size, and strategy performance

### Wave 5: Assistant And Intelligence

Purpose:

* Add Strideo Assistant search and navigation
* Add race and opportunity explanations
* Add learning loop and model improvement workflows

### Wave 6: Hardening And Launch Readiness

Purpose:

* Verify RLS, grants, advisors, runtime flows, and cleanup paths
* Review production rollout plans
* Prepare deployment and monitoring

---

## Agent-Specific Acceptance Criteria

### Product Planning Agent

Acceptance criteria:

* Scope aligns with PRD
* Opportunity remains central
* New assumptions are documented
* Conflicts are recorded in PRD Reconciliation Notes

### Architecture Agent

Acceptance criteria:

* Implementation matches existing architecture docs
* No broad rewrites are introduced
* Service boundaries are explicit
* Future work is sequenced

### Supabase Schema Agent

Acceptance criteria:

* Migration is append-only
* Existing migration history is not rewritten
* RLS is enabled where required
* Grants are narrow and documented
* No production execution occurs

### Supabase Execution Agent

Acceptance criteria:

* Target project name and ref are confirmed
* Migration history is checked before execution
* Execution stops on first error
* Dev execution report is written
* Production remains untouched

### Auth And Security Agent

Acceptance criteria:

* Service-role key remains server-only
* Browser clients do not write trusted role data
* Profile bootstrap uses authenticated server context
* No operator or admin role is auto-assigned
* Secrets are not printed or committed

### App Shell Agent

Acceptance criteria:

* Authenticated routes are protected
* Sign in and sign out work
* Loading, empty, and error states exist
* Dashboard navigation is usable on mobile and desktop

### Product Feature Agent

Acceptance criteria:

* Feature links back to Opportunity where appropriate
* Records are not overwritten when history matters
* Empty states are clear
* Data assumptions are documented

### AI Assistant Agent

Acceptance criteria:

* Assistant behavior is grounded in Strideo data
* Navigation and search are permission-aware
* Recommendations link back to Opportunities
* No private data is exposed across users

### Verification Agent

Acceptance criteria:

* Required commands are run or blockers are documented
* Supabase Dev verification is documented
* Test users and temporary data are cleaned up when safe
* Production remains untouched unless separately authorized

### Release Coordination Agent

Acceptance criteria:

* Branch is clean before handoff
* PR title and body match the work
* Files changed are scoped
* Follow-up work is clearly named

---

## Branch And PR Naming Conventions

Branches should use the `codex/` prefix.

Preferred branch patterns:

* `codex/phase<N>-<short-scope>`
* `codex/phase<N><letter>-<short-scope>`
* `codex/<workflow>-<short-scope>`

Examples:

* `codex/phase2a-auth-dashboard`
* `codex/phase2e-service-role-bootstrap-grants`
* `codex/workspace-hygiene-cleanup`

PR titles should be short and phase-aware.

Examples:

* `Phase 2A Auth Dashboard Foundation`
* `Phase 2E Service Role Bootstrap Grants Plan`
* `Workspace Hygiene Cleanup`

PR bodies should include:

* Summary
* Files changed
* Commands run
* Supabase touched: yes/no
* Migrations created: yes/no
* Migrations applied: yes/no
* Production touched: yes/no
* Remaining follow-ups

---

## Supabase, Migration, And Production Safety Rules

Supabase Dev rules:

* Confirm project name before any Supabase operation
* Confirm project ref before any Supabase operation
* For Strideo Dev, expected ref is `ntxtakbggtljjbalgris`
* Use Dev for validation before production
* Document all Dev execution

Migration rules:

* Migration files are append-only
* Do not rewrite, reorder, squash, rename, or delete migration history
* Do not modify prior migration files
* Inspect SQL before execution
* Apply only the explicitly authorized migration
* Stop on first error
* Write an execution report after Dev application

RLS and grants rules:

* Enable RLS on exposed public tables
* Do not add browser grants as a shortcut
* Do not broaden `anon` or `authenticated` access without explicit review
* Do not add browser write access to trusted role tables
* Keep service-role usage server-only
* Keep grant changes narrow and documented

Production rules:

* Production must not be touched unless explicitly authorized in the current
  task
* Production migrations require separate approval after Dev verification
* Production data must not be used for ad hoc testing
* Test users and temporary data should be created only in Dev unless production
  testing is explicitly authorized
* Never print production secrets, database URLs, service-role keys, or private
  credentials

---

## PRD Reconciliation Notes

No product-scope conflicts were found while adding the Codex multi-agent build
workflow.

Clarification:

* The existing Agent Architecture describes Strideo product agents.
* The Codex Multi-Agent Build Workflow describes software delivery agents.
* Product agents and build agents may share similar names, but they are separate
  concepts.
* This PRD update does not change MVP feature scope, pricing, platform
  architecture, or database architecture principles.

---

# Long-Term Moat

The moat is not race data.

The moat is:

* Opportunity history
* Wager history
* Strategy performance history
* Verified ROI database
* Learning engine
* Personalized profiles
* Strategy marketplace
* Millions of measured outcomes

Every race improves the platform.

Every wager improves the platform.

Every opportunity strengthens the intelligence network.
