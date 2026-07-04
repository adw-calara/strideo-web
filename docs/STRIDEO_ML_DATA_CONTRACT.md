# Strideo ML Data Contract

Date: 2026-06-15
Baseline: `main` at or after PR #60 merge commit `7d3b93730c188df11f3eed288a2642316b041028`

## Purpose

This document defines the Strideo ML data contract for model-readiness checks. It is a contract for data and lineage, not trained ML. It does not authorize model training, production scoring, or production Opportunity creation.

The product rule remains unchanged: `Opportunity` is the center of gravity. Prediction outputs, value calculations, recommendations, results, ROI attribution, and explanations must link back to an Opportunity wherever possible. Prediction is not the product; a model-versioned, data-backed, market-aware Opportunity is the product.

## Current Schema Baseline

PR #60 is merged. It adds schema foundation for:

- `owners`
- structured racing-form fields on `races`
- owner, claim, layoff, and notes fields on `race_entries`
- `horse_past_performances`
- `horse_workouts`
- `trainer_performance_stats`
- `value_calculations`
- `opportunity_scores.value_calculation_id`

These are source-fact and lineage paths only. They do not prove ingestion coverage, feature quality, model calibration, leakage safety, market-close semantics, or ROI performance.

## Current-Main Schema Status

| Area | Status | Contract interpretation |
| --- | --- | --- |
| owners | partial | Schema exists; ingestion, dedupe, reconciliation, and coverage checks are still needed. |
| horse past performances | partial | Schema exists for historical form, figures, fractions, times, and source lineage; coverage is not proven. |
| horse workouts | partial | Schema exists for workout timing, rank, type, and source lineage; coverage is not proven. |
| trainer performance stats | partial | Schema exists; source quality, context taxonomy, and coverage are not proven. |
| value calculations | partial | Append-only lineage table exists; 7 Dev-only market-input lineage rows are populated for the initial Dev feature snapshots, and a dry-run-only model/prediction lineage planner can propose the next row shapes. Production, materialized model-backed, materialized prediction-backed, and score-linked value lineage are not validated. |
| Opportunity score lineage | partial | `opportunity_scores.value_calculation_id` exists; generator wiring and real value evidence are not complete. |
| model versions | ready | Structural registry exists; no fake model rows should be inserted for demo scoring. |
| feature snapshots | partial | Storage exists; Dev-only pre-race materialization is merged and replay-verified for the first 7 Dev rows; production coverage, broader leakage validation, and model linkage are still required. |
| prediction outputs | partial | Storage exists; the Dev dry-run planner can propose market-derived baseline row shapes from existing feature snapshots, but no rows are written and no trained/calibrated ML output is claimed. |
| odds snapshots | partial | Live odds storage exists; final/closing odds semantics and pool taxonomy are incomplete. |
| result versions | ready | Append-only result versions exist. |
| result entries | partial | Entry-level result and WPS payout storage exists; exotic payouts are incomplete. |
| recommendation results | partial | Settlement storage exists; populated ROI attribution is not proven. |
| user wager results | partial | User-owned wager result storage exists; not required for first system model readiness. |
| performance rollups | partial | Rollup tables exist; require settled recommendation/result data. |

## Readiness States

- `ready`: all required-now, training, and production contract fields are present for the model component.
- `partial`: required-now fields are present, but training or production requirements are missing or partial.
- `blocked`: a required-now field is missing, a dependency is below partial, or required Opportunity linkage is not satisfied.

## Field Groups

- `required_now`: minimum data and lineage needed to run a deterministic non-production check without pretending it is trained ML.
- `required_before_training`: required before model training, holdout evaluation, or calibration can be trusted.
- `required_before_production`: required before model output can create production Opportunities, recommendations, or user-facing wagering guidance.
- `optional_enhancement`: useful later, but not a blocker for the first safe model contract.

## Model Components

### `fundamental_win_probability_v1`

Purpose: estimate entrant win probability from pre-race racing-form fundamentals before market blending.

Required now:

- race identity
- race entries
- horse identity
- jockey identity
- trainer identity
- scratches
- feature snapshots
- model versions
- prediction outputs

Required before training:

- race conditions
- horse historical form
- owner identity
- jockey performance
- trainer performance
- workouts
- speed features
- pace features
- fractional times
- final times
- beaten lengths
- class movement
- distance fit
- surface fit
- track fit
- official results
- source lineage
- ingestion coverage
- pre-race feature snapshots

Required before production:

- holdout evaluation
- calibration evidence
- leakage checks proving feature snapshots were captured before race outcomes

Current status: `partial` once the required-now schema paths are populated, but not trainable until historical coverage and pre-race feature lineage are proven.

### `market_implied_probability_v1`

Purpose: convert morning line, live odds, and pool signals into auditable market-implied probabilities.

Required now:

- race identity
- race entries
- horse identity
- morning line odds
- live odds snapshots
- feature snapshots
- model versions
- prediction outputs

Required before training:

- win/place/show pools
- source lineage
- ingestion coverage

Required before production:

- final or closing odds semantics
- pool taxonomy
- takeout assumptions
- holdout evaluation

Current status: `partial`; odds snapshots exist, but final/closing odds semantics are not production-ready.

### `benter_blended_probability_v1`

Purpose: blend fundamental probabilities with public market probabilities under a calibrated Benter-style framework.

Required now:

- `fundamental_win_probability_v1` must be at least `partial`
- `market_implied_probability_v1` must be at least `partial`
- calibrated win probabilities
- model versions
- feature snapshots
- prediction outputs

Required before training:

- pre-race feature snapshots
- source lineage
- live odds snapshots
- official results

Required before production:

- final or closing odds semantics
- win/place/show pool completeness
- holdout evaluation
- longshot segment analysis

Current status: `blocked` until fundamental and market components can each prove at least partial readiness from populated data.

### `value_overlay_v1`

Purpose: convert model probabilities and market probabilities into value scores that support Opportunity scoring.

Required now:

- race identity
- race entries
- horse identity
- feature snapshots
- model versions
- prediction outputs
- calibrated win probabilities
- live odds snapshots
- value calculations
- Opportunity score linkage
- Opportunity attribution

Required before training:

- pre-race feature snapshots
- source lineage
- official results
- payouts

Required before production:

- final or closing odds semantics
- recommendation results
- ROI/performance attribution
- holdout evaluation

Current status: `blocked` until value calculations and Opportunity score linkage are populated with real model-backed lineage. Demo scoring does not satisfy this contract.

### `harville_finish_order_v1`

Purpose: estimate finish-order probabilities for exotic wagers from calibrated entrant win probabilities.

Required now:

- race identity
- race entries
- horse identity
- scratches
- feature snapshots
- model versions
- prediction outputs
- calibrated win probabilities
- finish-order probability support
- Opportunity attribution

Required before training:

- official results
- result corrections
- payouts
- source lineage

Required before production:

- exotic pools
- exotic payouts
- recommendation results
- ROI/performance attribution
- holdout evaluation

Current status: `blocked` until calibrated win probabilities, finish-order output support, and exotic pool/payout semantics are available.

## Leakage Rules

Feature snapshots must be pre-race. Any feature snapshot used for a prediction or value calculation must be captured before the outcome facts it is trying to predict. Result rows, payouts, result corrections, next-out indicators, ROI rollups, and user wager outcomes cannot leak into pre-race prediction features.

The checker is intentionally schema-aware but not database-live. It evaluates a typed capability object so future agents can wire in real coverage checks without changing the contract.

## Duplicate-Avoidance Rules

Future work must reuse:

- `races`, `race_entries`, `horses`, `jockeys`, `trainers`, `owners`
- `horse_past_performances`, `horse_workouts`, `trainer_performance_stats`
- `odds_snapshots`, `result_versions`, `result_entries`
- `feature_snapshots`, `model_versions`, `prediction_outputs`
- `value_calculations`, `opportunities`, `opportunity_scores`
- `wager_recommendations`, `recommendation_results`, `user_wager_results`, performance rollups

Do not create duplicate race, horse, odds, prediction, value, or Opportunity tables for the same lifecycle.

## Typed Checker

The TypeScript contract lives under `lib/ml/data-contract/`.

It returns:

- model key
- readiness status
- required fields present
- required fields missing
- partial fields
- blocking reasons
- duplicate-risk warnings
- recommended next data work
- whether Opportunity linkage is satisfied

The core checker does not query Supabase. It accepts a typed capability input
and the Dev-only racing-form coverage report maps aggregate Supabase Dev counts
into that input without provider ingestion, writes, training, scoring, or
production access.

The Opportunity-facing feature snapshot and value-scoring result contract lives
separately under `lib/opportunities/scoring/contracts.ts` and is documented in
`docs/OPPORTUNITY_SCORING_CONTRACT.md`. That contract prepares the shape future
real scorers should use, but it is not a trained model, fake scoring path,
wagering recommendation, or production scoring runtime.

## Recommended Next Prompt

Run and review the Dev-only model/prediction lineage dry-run report, then decide
whether a separate Dev-only materialization slice should be authorized. Any
materialization must stay non-production, avoid fake ML and fake scoring, and
defer wager recommendations and production Opportunities.
