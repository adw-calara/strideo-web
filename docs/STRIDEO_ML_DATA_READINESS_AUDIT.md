# Strideo ML Data Readiness Audit

Date: 2026-06-15
Baseline: `main` at or after PR #60 merge commit `7d3b93730c188df11f3eed288a2642316b041028`

## Executive Summary

Strideo has the right product spine for the five-paper ML framework: `Opportunity` is central, race and market facts have append-oriented storage, and model/version/feature/prediction lineage tables exist. PR #60 is now merged and adds racing-form source-fact tables for owners, past performances, workouts, trainer stats, value calculations, and Opportunity score lineage.

The database is still not ready for trusted model training. PR #60 is schema foundation only. Remaining blockers include ingestion jobs, source coverage checks, data quality checks, feature snapshot materialization, final/closing odds semantics, pool/exotic payout foundations, holdout evaluation, leakage checks, and ROI attribution.

No model should create production Opportunities unless required data and lineage exist. Prediction outputs, value calculations, recommendations, and ROI attribution must link back to Opportunity.

## Current Coverage Matrix

| Category | State | Current-main evidence | Remaining blocker |
| --- | --- | --- | --- |
| tracks | ready | `tracks` has provider identity, code, name, location, timezone, metadata. | Reconciliation across providers still needed later. |
| races | partial | `races` has race identity plus PR #60 condition fields. | Ingestion coverage and structured condition quality checks. |
| race entries | partial | `race_entries` has entry identity, horse/jockey/trainer links, owner links, layoff, notes. | Ingestion coverage and owner/claim quality checks. |
| horses | partial | `horses` has provider identity, name, foaling year, sex, country. | Pedigree/stable identity remains future work. |
| jockeys | partial | `jockeys` has provider identity and name. | Jockey performance source facts or audited derived features. |
| trainers | partial | `trainers` has provider identity and name. | Trainer-stat coverage and context taxonomy. |
| owners | partial | PR #60 added `owners`. | Ingestion, dedupe, coverage, and reconciliation checks. |
| past performances | partial | PR #60 added `horse_past_performances`. | Historical coverage, source lineage, and label quality checks. |
| race conditions | partial | PR #60 added structured condition fields on `races`. | Provider normalization and completeness checks. |
| distance | ready | Race and past-performance distance fields exist. | Unit normalization checks. |
| surface | ready | `surfaces` and race/form/workout surface links exist. | Track-condition taxonomy still needs normalization. |
| post position | ready | `race_entries.post_position` exists. | Coupled-entry handling remains a data-quality concern. |
| class level | partial | `races.class_level`, `claiming_price`, and past-performance class fields exist. | Class movement normalization and coverage checks. |
| purse | ready | Race and past-performance purse fields exist. | Currency and provider completeness checks. |
| speed figures | partial | PR #60 added speed figure columns on `horse_past_performances`. | Figure source, scale, and coverage validation. |
| pace figures | partial | PR #60 added `pace_figures`. | Segment definition and provider normalization. |
| fractional times | partial | PR #60 added `fractional_times`. | Standard shape and coverage checks. |
| final times | partial | PR #60 added `final_time_seconds` for historical form. | Official current-race final time semantics still need validation. |
| beaten lengths | partial | `result_entries` and past performances can store beaten lengths. | Historical coverage and provider quality checks. |
| workouts | partial | PR #60 added `horse_workouts`. | Source coverage and recency checks. |
| scratches | ready | `entry_events` and `race_entries.status` support scratches. | Event taxonomy consistency. |
| morning line odds | ready | `race_entries.morning_line_odds` exists. | Normalized implied probability may be added later. |
| live odds snapshots | ready | `odds_snapshots` stores odds, implied probability, pool type, pool total, and snapshot time. | Ingestion density and latency checks. |
| final odds | partial | Settlement can reference `closing_odds_snapshot_id`; final selection is not formalized. | Final/closing odds semantics and market-close rule. |
| win/place/show pools | partial | `odds_snapshots.pool_type` and `pool_total` can represent WPS pools. | Pool taxonomy and completeness checks. |
| exotic pools | partial | Generic pool fields exist; wager enums cover some exotic concepts. | Explicit exotic pool, combination, takeout, and payout foundation. |
| official results | ready | `result_versions` and `result_entries` exist. | Operational correction workflow. |
| payouts | partial | WPS payouts exist on `result_entries`. | Exotic payouts missing. |
| result corrections | ready | `result_versions` supports append-only corrections. | Downstream invalidation and recomputation process. |
| feature snapshots | partial | `feature_snapshots` exists. | Pre-race materialization and leakage checks. |
| model versions | ready | `model_versions` exists. | Do not insert fake demo model versions. |
| prediction outputs | partial | `prediction_outputs` exists. | Requires real feature snapshots and model versions. |
| value scores | partial | `opportunity_scores` and PR #60 `value_calculations` exist. | Real model-backed value lineage is not populated. |
| Opportunity links | ready | Opportunities link to subjects, scores, explanations, recommendations, results, and rollups. | Keep this central for all ML work. |
| ROI/performance attribution | partial | Recommendation/user result and rollup tables exist. | Settled recommendation coverage and payout reconciliation. |

## Model Readiness

| Model component | Status | Reason |
| --- | --- | --- |
| `fundamental_win_probability_v1` | partial | Schema can store required facts, but historical coverage, pre-race feature snapshots, leakage checks, and holdout evaluation are not proven. |
| `market_implied_probability_v1` | partial | Odds snapshots exist, but final/closing odds semantics, pool taxonomy, and market quality checks are incomplete. |
| `benter_blended_probability_v1` | blocked | Requires both fundamental and market components to be at least partial from populated data, plus calibration and longshot analysis. |
| `value_overlay_v1` | blocked | Requires populated value calculations, Opportunity score linkage, model-backed probabilities, market odds, and ROI attribution. |
| `harville_finish_order_v1` | blocked | Requires calibrated win probabilities, finish-order output support, exotic pools/payouts, and historical validation. |

## Do Not Duplicate

Future work must reuse existing tables for race identity, horse identity, odds, results, feature snapshots, prediction outputs, value calculations, Opportunities, recommendations, and performance. Do not create parallel `predictions`, `race_cards`, `horse_history`, `workouts`, `value_scores`, or `opportunity_results` tables unless a future architecture review explicitly deprecates the existing path.

## Recommended Next Work

1. Build ingestion coverage checks that map real Dev data into the ML data-contract capability object.
2. Materialize pre-race `feature_snapshots` with source-file and ingestion-batch lineage.
3. Define final/closing odds semantics, WPS pool taxonomy, takeout assumptions, and exotic pool/payout foundations.
4. Add holdout, calibration, leakage, and longshot-segment evaluation gates.
5. Populate recommendation result and ROI attribution workflows before any production Opportunity claims.
