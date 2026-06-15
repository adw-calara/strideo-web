# Strideo ML Data Readiness Audit

Date: 2026-06-15  
Branch: `codex/ml-data-readiness-audit`  
Baseline: latest `origin/main` at audit start  
Scope: database schema, migrations, data-access modules, Opportunity lineage, and ML-readiness blockers.

## Executive Summary

Strideo already has the right product spine for the five-paper ML framework: `Opportunity` is central, recommendations and score history can link back to Opportunity records, and model/version/feature/prediction tables exist for future lineage. The current schema is strongest for race-card serving, odds snapshots, official results, Opportunity creation, and append-only performance tracking.

The current database is not yet ready for trusted model training. The primary blockers are historical racing-form depth, explicit final/closing market semantics, complete payout and pool handling for exotics, populated feature snapshots, and settled ROI attribution. The current `value_overlay_demo` generator is correctly documented as deterministic placeholder logic and must not be treated as ML evidence.

PR #60, "Add racing-form data foundation", is open as a draft and materially affects this audit. It should be treated as a high-risk watchlist item, not as merged schema. If merged, it would improve owners, past performances, workouts, trainer stats, and value-calculation lineage, but it still requires ingestion, quality checks, and model validation before training.

No migrations were created. No Supabase writes were performed. No production changes were made.

## Evidence Reviewed

- Product source of truth: `PRD.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE_REVIEW.md`.
- Database docs: `docs/DATA_ARCHITECTURE_AND_AI_TRAINING.md`, `docs/OPPORTUNITY_GENERATION.md`, migration plans and verification reports under `docs/`.
- Supabase migrations: all 24 migration files currently on `main`, from `20260607143207_0001_security_hardening.sql` through `20260615141628_opportunity_tracking_watchlist_grants.sql`.
- Application modules:
  - `lib/races/data-access.ts`
  - `lib/imports/data-access.ts`
  - `lib/opportunities/features.ts`
  - `lib/opportunities/scoring/value-overlay-demo.ts`
  - `lib/opportunities/persistence.ts`
  - `lib/opportunities/data-access.ts`
  - `lib/opportunities/actions.ts`
  - `scripts/generate-demo-opportunities.ts`
- GitHub PR state:
  - Open draft PR #60: `codex/racing-form-data-foundation` -> `main`.
  - Recent merged PRs affecting data, grants, Opportunity flow, and ingestion UI were reviewed as context.

## Readiness States

- `ready`: schema and access path exist for the intended Strideo use, with no obvious duplicate-table need.
- `partial`: schema exists but lacks required fields, ingestion coverage, data quality guarantees, or operational semantics for trusted ML.
- `missing`: current `main` lacks a first-class table/field path for the category.
- `duplicate-risk`: current or proposed work overlaps existing schema and future agents must reuse or extend existing objects instead of creating parallel tables.
- `blocked`: training or product trust is blocked until upstream data, lineage, validation, or policy decisions exist.

## Current Database Shape

### Race And Market Core

Current `main` has provider-aware core tables for `tracks`, `surfaces`, `races`, `race_entries`, `horses`, `jockeys`, `trainers`, `entry_events`, `odds_snapshots`, `result_versions`, and `result_entries`.

Strengths:

- Race-card records are partitioned by `race_date`.
- Entries link to horse, jockey, trainer, race, and provider identifiers.
- Odds snapshots preserve time-series market observations with `pool_type`, odds values, implied probability, and pool total.
- Result versions are append-only and can represent corrections.
- Result entries can capture finish position, beaten lengths, and win/place/show payouts.

Current gaps:

- Owners are not first-class on `main`.
- Historical past performances and workouts are not first-class on `main`.
- Class, race conditions, final odds, pool semantics, exotic payouts, and market-close rules are not explicit enough for trusted ML.
- Odds support is generic enough to avoid immediate schema duplication, but it needs stronger semantics before model trust.

### Opportunity And Learning Core

Current `main` has `strategies`, `strategy_versions`, `strategy_feature_snapshots`, `strategy_matches`, `opportunities`, `opportunity_subjects`, `opportunity_strategy_matches`, `opportunity_events`, `opportunity_scores`, `opportunity_explanations`, and `opportunity_visibility_events`.

Learning/performance tables include `model_versions`, `feature_snapshots`, `prediction_outputs`, `model_training_runs`, `model_evaluation_runs`, `model_promotions`, `performance_runs`, `recommendation_results`, `user_wager_results`, and rollups for Opportunity, strategy, and model performance.

This is the correct product architecture: models should serve Opportunities, not replace them. Future ML work should write versioned model evidence into existing learning tables and link it through Opportunity score and strategy-match records.

## Data Category Readiness Matrix

| Category | State | Current evidence | Blocker or next requirement |
| --- | --- | --- | --- |
| tracks | ready | `tracks` has provider identity, code, name, location, timezone, metadata. | Keep reusing `tracks`; do not create a racing-form-specific track table. |
| races | partial | `races` has track, date, number, status, schedule/off time, distance, surface, type, class rating, purse, conditions. | Needs structured condition/class fields and source coverage checks before training. PR #60 proposes improvements. |
| race entries | partial | `race_entries` has horse, jockey, trainer, post, program number, status, morning line, weight, medication, equipment. | Owners, claims, layoff, comments, and richer entry notes are absent on `main`; PR #60 proposes them. |
| horses | partial | `horses` has provider identity, name, foaling year, sex, country, metadata. | Pedigree, breeder, color, stable identity, and lifecycle normalization are not first-class. |
| jockeys | partial | `jockeys` has provider identity and name. | Needs historical performance aggregates and feature lineage before fundamental modeling. |
| trainers | partial | `trainers` has provider identity and name. | Needs stable performance aggregates; PR #60 proposes trainer stats. |
| owners | missing | No `owners` table on `main`; owner fields are null/unavailable in current feature extraction. | PR #60 proposes provider-aware `owners` plus entry links. |
| past performances | missing | No first-class past-performance table on `main`. | PR #60 proposes `horse_past_performances`; ingestion, dedupe, and label validation still required. |
| race conditions | partial | `races.conditions` exists as text and metadata can carry provider payloads. | Needs structured condition payload/class/age/sex/weight fields for model features. |
| distance | ready | `races.distance_text` and `races.distance_yards` exist. | Validate provider normalization and units in ingestion. |
| surface | ready | `surfaces` and `races.surface_id` exist. | Track condition variants still need explicit handling. |
| post position | ready | `race_entries.post_position` exists. | Ensure scratches and coupled entries are represented consistently. |
| class level | partial | `races.class_rating`, `race_type`, and `conditions` exist. | Needs structured class level and claiming/stakes/allowance semantics. PR #60 proposes `class_level` and `claiming_price`. |
| purse | ready | `races.purse` exists. | Validate currency and provider completeness. |
| speed figures | missing | No first-class speed figure columns/table on `main`. | Needs source, figure type, scale, date, and lineage, likely through past performances/features. |
| pace figures | missing | No first-class pace figure columns/table on `main`. | Needs source, segment definitions, scale, and lineage. |
| fractional times | missing | No first-class fractional-time storage on `main`. | Required for Chapman-style richer variables and pace modeling. |
| final times | missing | Official current race final times are not first-class in `result_entries`; no historical final-time table on `main`. | Needed for speed/pace validation and historical labels. |
| beaten lengths | partial | `result_entries.beaten_lengths` exists for official result rows. | Historical beaten lengths require past-performance ingestion. PR #60 proposes this path. |
| workouts | missing | No first-class workouts table on `main`. | PR #60 proposes `horse_workouts`; requires source coverage and recency checks. |
| scratches | ready | `entry_events` plus `race_entries.status` can represent scratches/reinstatements. | Need consistent event typing in ingestion. |
| morning line odds | ready | `race_entries.morning_line_odds` exists. | Consider normalized decimal/implied fields if training uses morning-line probability directly. |
| live odds snapshots | ready | `odds_snapshots` captures snapshot time, odds, implied probability, pool type, and pool total. | Needs ingestion density and latency checks by track/race. |
| final odds | partial | Latest or closing odds can be inferred only by convention; `recommendation_results.closing_odds_snapshot_id` can link settlement to a snapshot. | Needs explicit close/final snapshot semantics or documented market-close rule. |
| win/place/show pools | partial | `odds_snapshots.pool_type` and `pool_total` can represent WPS pools; payouts support WPS in result entries. | Needs pool taxonomy and completeness checks. |
| exotic pools | partial | Generic `pool_type` and wager enums cover some exotic concepts, but no full exotic pool/result structure exists. | Harville/exotics require explicit pool definitions, legs, takeout, payouts, and result combinations. |
| official results | ready | `result_versions` and `result_entries` support official result rows and versioned corrections. | Ensure result ingestion records source and version state. |
| payouts | partial | `result_entries` stores win/place/show payouts. | Exotic payouts are not first-class; WPS payout quality needs validation. |
| result corrections | ready | `result_versions` is append-only and can record correction/version metadata. | Build operational process for correction ingestion and downstream invalidation. |
| feature snapshots | partial | `feature_snapshots` and `strategy_feature_snapshots` exist; current demo stores payloads on strategy match/score and marks placeholder fields. | Must populate exact model input snapshots before trusted prediction output. |
| model versions | ready | `model_versions` and promotion/evaluation tables exist. | Do not insert fake model rows for demo scoring. |
| prediction outputs | partial | `prediction_outputs` exists and can link model version, feature snapshot, race, and entry. | Blocked until real feature snapshots and model versions exist. |
| value scores | partial | `opportunity_scores` stores fair value, edge, score, confidence, and payload. Current generator is deterministic demo. | Needs model-backed value calculation lineage; PR #60 proposes `value_calculations`. |
| Opportunity links | ready | Opportunities link to races, entries/subjects, strategy matches, scores, explanations, events, recommendations, results, and rollups. | Preserve this as the center of all ML work. |
| ROI/performance attribution | partial | `recommendation_results`, `user_wager_results`, `performance_runs`, and rollups exist. | Requires settled recommendations, reliable payouts, and result linkage at scale. |

## Five-Paper Model Readiness

| Component | State | Current support | Trust blocker |
| --- | --- | --- | --- |
| `fundamental_win_probability_v1` | blocked | Identity tables, race cards, results, model/version tables, and feature snapshot tables exist. | Historical past performances, workouts, speed/pace/fractional/final-time data, structured class/conditions, owner/trainer/jockey performance, source lineage, and holdout datasets are incomplete or missing on `main`. |
| `market_implied_probability_v1` | partial | `odds_snapshots` stores odds, implied probability, pool type, snapshot time, and pool total. | Needs explicit final/closing odds semantics, pool taxonomy, takeout handling, WPS/exotic coverage checks, and market snapshot quality thresholds. |
| `benter_blended_probability_v1` | blocked | Schema can store model versions, feature snapshots, prediction outputs, Opportunity scores, and performance rollups. | Blocked until both a validated fundamental model and validated market-implied model exist, with calibration, holdout testing, and longshot behavior analysis. |
| `value_overlay_v1` | partial | `opportunity_scores` can carry fair value, edge, score, confidence, payload, and Opportunity linkage. | Current value-overlay generator is a deterministic demo. Needs model-backed probability, market odds, explicit value calculation lineage, wager costs, and realized ROI attribution. |
| `harville_finish_order_v1` | blocked | Results have finish positions; wager recommendation legs exist for some bet types; prediction output tables can store future outputs. | Requires calibrated entrant win probabilities, scratch-adjusted fields, finish-order probability outputs, exotic pool/payout structures, and validation against historical finish orders. |

## Training Blockers Before Any Trusted Model

1. Historical racing-form facts are not yet complete on `main`. Fundamental modeling needs past performances, speed/pace/fractional/final-time facts, workouts, structured class movement, trainer/jockey/owner context, and labels across a meaningful historical window.
2. Market data semantics are not strong enough. Benter-style blending needs reliable opening/live/final odds, pool type definitions, takeout assumptions, pool totals, and market-close rules.
3. Feature snapshots are not populated as durable model inputs. A prediction cannot be trusted unless the exact input payload is frozen, versioned, source-linked, and tied to a model version.
4. Current demo Opportunities are not ML. `demo-value-overlay-v1` should remain clearly separated from `model_versions` and `prediction_outputs` until real training exists.
5. ROI attribution needs settled outputs. `recommendation_results`, payouts, result corrections, and rollups must be populated and reconciled before claims about edge or expected value.
6. Holdout and longshot validation are not optional. The Chapman extension and Benter framework require out-of-sample testing, calibration, longshot filtering, and positive-return analysis before production recommendations.

## High-Risk PR Watchlist

| PR | Status | Risk area | Audit handling |
| --- | --- | --- | --- |
| #60 Add racing-form data foundation | Open draft, base `main`, branch `codex/racing-form-data-foundation` | Migration, racing-form schema, owners, past performances, workouts, trainer stats, value calculations, Opportunity score lineage | Treat as proposed but not merged. It is the main dependency before fundamental ML work, and it must be reviewed for duplication, RLS, grants, and ingestion readiness. |
| #58 Add Opportunity tracking workflow | Recently merged | Opportunity tracking, watchlist grants, user workflow | Reuse current `watchlist_items` and Opportunity tracking path. Do not create duplicate alert/watchlist tables. |
| #51 Tighten Opportunity generator service-role grants | Recently merged | Service-role privileges, generator writes | Preserve narrow server-only grant posture. Do not add broad anon/authenticated grants for generator paths. |
| #50 Race Read-Model Scalability | Recently merged | Race-card data access and read-model performance | Reuse existing race-card query patterns before adding new serving tables. |
| #44 Opportunity Read Access Migration | Recently merged | Opportunity read grants and UI access | Reuse existing Opportunity read model and RLS policies; avoid parallel Opportunity summary tables unless justified by measured performance. |
| #38 Import Status Read Access | Recently merged | Import state read path | Reuse `data_ingestion_batches` and import status modules for ingestion operations. |
| #36 Race Data Import Planning | Recently merged | Race data ingestion direction | Keep ingestion aligned with existing archive/batch/source-file lineage model. |

## Do Not Duplicate

Future agents should reuse or extend these existing tables/modules instead of creating parallel versions.

### Tables

- Race/reference: `tracks`, `surfaces`, `races`, `race_entries`, `horses`, `jockeys`, `trainers`.
- Events/results/market: `entry_events`, `odds_snapshots`, `result_versions`, `result_entries`.
- Opportunity: `strategies`, `strategy_versions`, `strategy_feature_snapshots`, `strategy_matches`, `opportunities`, `opportunity_subjects`, `opportunity_strategy_matches`, `opportunity_events`, `opportunity_scores`, `opportunity_explanations`, `opportunity_visibility_events`.
- Wagers/recommendations: `wager_templates`, `wager_template_legs`, `wager_recommendations`, `wager_recommendation_legs`, `wager_recommendation_leg_entries`, `wager_recommendation_events`.
- Learning/performance: `model_versions`, `model_training_runs`, `model_evaluation_runs`, `model_promotions`, `feature_snapshots`, `prediction_outputs`, `prediction_runs`, `prediction_results`, `live_prediction_cache`, `performance_runs`, `recommendation_results`, `recommendation_result_events`, `user_wager_results`, `opportunity_performance_rollups`, `strategy_performance_rollups`, `model_performance_rollups`.
- Ingestion/lineage: `raw_archive_objects`, `data_ingestion_batches`, `source_data_files`, `horse_features`, `trainer_features`, `jockey_features`, `track_features`, `odds_features`, `model_training_datasets`, `model_evaluation_metrics`.
- User workflow: `watchlist_items`, `bet_sheets`, `user_recorded_wagers`, `alert_preferences`.

### Modules

- `lib/races/data-access.ts` for race-card read models.
- `lib/imports/data-access.ts` for ingestion status reads.
- `lib/opportunities/features.ts` for Opportunity feature extraction contracts.
- `lib/opportunities/scoring/value-overlay-demo.ts` for the current demo scorer only.
- `lib/opportunities/persistence.ts` for Opportunity-centered writes.
- `lib/opportunities/data-access.ts` and `lib/opportunities/actions.ts` for Opportunity UI and watchlist access.
- `scripts/generate-demo-opportunities.ts` for Dev-only demo Opportunity generation.

## Duplicate-Risk Areas

- Owners: PR #60 proposes `owners`. Do not add a second owner identity table.
- Past performances: PR #60 proposes `horse_past_performances`. Future speed/pace/fractional/final-time work should attach to or derive from this path unless a reviewed schema decision says otherwise.
- Workouts: PR #60 proposes `horse_workouts`. Do not store workouts only in horse metadata or feature JSON.
- Value calculations: PR #60 proposes `value_calculations` linked from `opportunity_scores`. Avoid creating another value/edge table that bypasses Opportunity.
- Prediction output: current schema already has `prediction_outputs`, `prediction_results`, and `live_prediction_cache`. Do not create a new `predictions` table for the same lifecycle without deprecating or integrating the existing tables.
- Feature snapshots: current schema already has `feature_snapshots` and strategy feature snapshots. Do not treat transient JSON payloads as sufficient training lineage.
- Odds/final odds: extend `odds_snapshots` semantics before adding a parallel final-odds table.
- Results/corrections: reuse `result_versions` and `result_entries`; do not overwrite result rows in place.

## Recommended Next PRs

1. Review and harden PR #60 before merge.
   - Confirm it extends existing race, horse, entry, Opportunity, and value paths without duplicate identity tables.
   - Confirm RLS is enabled on new tables and grants remain narrow.
   - Confirm indexes support race-date, provider identity, horse/date, trainer/date, and Opportunity score joins.
   - Add documentation that PR #60 is schema foundation only, not model readiness.
2. Add racing-form ingestion quality and coverage checks.
   - Report track/date/race/entry coverage, duplicate provider IDs, missing past-performance rows, missing workouts, missing class/condition fields, and source-file lineage.
   - Reuse `raw_archive_objects`, `data_ingestion_batches`, and `source_data_files`.
3. Add market semantics for closing/final odds and pool taxonomy.
   - Define market-close rule, final snapshot selection, pool type vocabulary, takeout assumptions, and WPS/exotic support.
   - Extend `odds_snapshots` or add narrowly scoped child tables only if existing columns cannot represent the semantics.
4. Populate durable `feature_snapshots` for a non-training dry run.
   - Freeze exact feature payloads for historical races and link to source files, but do not train models yet.
   - Add validation that no placeholder-only payload reaches a real model version.
5. Add evaluation dataset and holdout manifest support.
   - Use existing `model_training_datasets`, `model_evaluation_runs`, and metrics tables.
   - Require temporal split, track split, longshot segment, and leakage checks.
6. Implement `market_implied_probability_v1` as a lineage-only calculation.
   - Store versioned calculation output with odds snapshot links and no claims of predictive model training.
7. Implement `fundamental_win_probability_v1` only after historical feature coverage passes thresholds.
   - Require documented minimum coverage, out-of-sample metrics, calibration, and result-label quality.
8. Implement Benter blend, value overlay, and Harville layers after the prior models are validated.
   - Preserve Opportunity as the product object and write all recommendations, scores, explanations, wagers, and performance records back to Opportunity-linked tables.

## Supabase And Security Notes

- Target project for any future Dev validation remains Strideo Dev: `strideo-dev`, ref `ntxtakbggtljjbalgris`.
- This audit did not use Supabase write tools and did not apply migrations.
- This audit did not create, edit, reorder, squash, or delete migration files.
- Any future schema work must use timestamped Supabase CLI migration naming and must pass the repository migration checks before application.
- New tables exposed through Supabase APIs must have RLS enabled.
- Browser/SSR paths must not receive service-role credentials.
- Do not add broad `anon` or `authenticated` grants to solve service-role ingestion or generation problems.

## Validation

Commands run for this documentation-only branch:

```bash
npm run verify
git diff --check
```

Results:

- `npm run verify` passed, including migration filename checks, lint, production build, and `npm audit --audit-level=moderate`.
- `git diff --check` passed.
