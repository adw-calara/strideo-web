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
