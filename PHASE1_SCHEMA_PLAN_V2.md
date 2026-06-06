# Phase 1 Schema Plan V2

## Purpose

This document revises the Phase 1 database schema plan to resolve the blockers
identified in `PHASE1_SCHEMA_REVIEW.md`.

This remains planning-only:

- No application tables are created.
- No SQL migrations are included.
- No application code is written.
- No external racing API is connected.
- No OpenAI integration is connected.

## V2 Design Decisions

- Global Opportunity lifecycle is separated from user-specific workflow state.
- Multi-entry Opportunities are modeled through `opportunity_subjects`.
- Multi-horse wagers use normalized recommendation legs and leg entries.
- User-recorded wagers are distinct from Strideo system recommendations.
- Recommendation replacement and validity history are first-class.
- Results are versioned so official corrections can be audited.
- Prediction outputs and feature snapshots provide learning lineage.
- Entitlement/RLS model is required before shared browser-readable data.
- `odds_snapshots` include `race_date` for partition pruning.
- Strategy ownership/versioning supports future Strategy Marketplace.
- User workflow event tables include mobile-safe idempotency fields.

## Schema Principles

- Opportunity is the central aggregate.
- Append-only records are the source of truth for odds, predictions, scores,
  recommendations, lifecycle events, result versions, and verification runs.
- Mutable columns are allowed only as read-model pointers or user workflow state.
- No table is publicly exposed by default.
- Data API access must be explicitly granted after RLS policies exist.
- Every user-owned table includes `user_id`, `created_at`, and `updated_at`
  where user edits are possible.
- User workflow event tables include `client_mutation_id` for mobile/offline
  idempotency.
- Service role is server-side only.
- Frontend clients never call external racing APIs or AI providers directly.

## Table Groups

Identity, access, and entitlement:

- `profiles`
- `subscriptions`
- `entitlements`
- `profile_roles`

Reference:

- `tracks`
- `horses`
- `jockeys`
- `trainers`
- `surfaces`

Race transaction:

- `races`
- `race_entries`
- `entry_events`
- `odds_snapshots`
- `result_versions`
- `result_entries`

Learning/model lineage:

- `model_versions`
- `feature_snapshots`
- `prediction_outputs`
- `model_training_runs`
- `model_evaluation_runs`
- `model_promotions`

Strategy and opportunity:

- `strategies`
- `strategy_versions`
- `strategy_feature_snapshots`
- `strategy_matches`
- `opportunities`
- `opportunity_subjects`
- `opportunity_strategy_matches`
- `opportunity_events`
- `opportunity_scores`
- `opportunity_explanations`
- `opportunity_visibility_events`

Wager recommendation:

- `wager_templates`
- `wager_recommendations`
- `wager_recommendation_legs`
- `wager_recommendation_leg_entries`

User wagering workflow:

- `daily_bet_sheets`
- `daily_bet_sheet_entries`
- `daily_bet_sheet_events`
- `user_recorded_wagers`
- `watchlist_items`
- `alert_preferences`

Performance:

- `performance_runs`
- `recommendation_results`
- `recommendation_result_events`
- `user_wager_results`
- `opportunity_performance_rollups`
- `strategy_performance_rollups`
- `model_performance_rollups`

Agent and audit:

- `job_runs`
- `agent_logs`
- `event_log`

Future mobile/notification:

- `user_devices`
- `notification_tokens`
- `notification_events`

Future marketplace:

- `strategy_authors`
- `strategy_marketplace_listings`
- `strategy_marketplace_versions`
- `strategy_purchases`
- `strategy_reviews`
- `strategy_revenue_events`
- `user_strategy_installs`

Future assistant:

- `conversation_sessions`
- `conversation_messages`
- `assistant_actions`

## Identity, Access, And Entitlement

### profiles

Required fields:

- `id`
- `user_id`
- `display_name`
- `email`
- `status`
- `default_plan`
- `created_at`
- `updated_at`

Rules:

- `user_id` references Supabase Auth users.
- Users can read/update only their own profile through RLS.
- Authorization decisions must not use user-editable metadata.

### subscriptions

Required fields:

- `id`
- `user_id`
- `provider`
- `provider_customer_id`
- `provider_subscription_id`
- `plan`
- `status`
- `current_period_start`
- `current_period_end`
- `cancel_at_period_end`
- `created_at`
- `updated_at`

Rules:

- Users can read their own subscription summary.
- Writes are server-only.

### entitlements

Required fields:

- `id`
- `user_id`
- `entitlement_key`
- `source`
- `starts_at`
- `ends_at`
- `status`
- `created_at`
- `updated_at`

Examples:

- `opportunities:read:limited`
- `opportunities:read:full`
- `assistant:use`
- `marketplace:access`

### profile_roles

Required fields:

- `id`
- `user_id`
- `role`
- `created_by_user_id`
- `created_at`

Examples:

- `user`
- `operator`
- `admin`

## Global Opportunity Lifecycle

Global Opportunity state belongs only to the system-generated Opportunity. User
workflow states belong to watchlists, bet sheets, and recorded wagers.

Allowed global states:

- `candidate`
- `qualified`
- `published`
- `suspended`
- `closed`
- `resulted`
- `verified`
- `voided`
- `archived`

Recommended transitions:

- `candidate -> qualified`
- `candidate -> voided`
- `qualified -> published`
- `qualified -> suspended`
- `published -> suspended`
- `published -> closed`
- `published -> voided`
- `suspended -> published`
- `suspended -> voided`
- `closed -> resulted`
- `resulted -> verified`
- `resulted -> voided`
- `verified -> archived`
- `voided -> archived`

### opportunities

Required fields:

- `id`
- `race_id`
- `strategy_id`
- `strategy_version_id`
- `model_version_id`
- `latest_wager_recommendation_id`
- `latest_opportunity_score_id`
- `latest_value_score_id`
- `latest_explanation_id`
- `market_odds_snapshot_id`
- `current_state`
- `opportunity_type`
- `title`
- `summary`
- `latest_expected_roi`
- `latest_confidence_score`
- `latest_opportunity_score`
- `latest_value_score`
- `latest_edge_score`
- `generated_at`
- `published_at`
- `closed_at`
- `resulted_at`
- `verified_at`
- `source_job_run_id`
- `created_at`
- `updated_at`

Rules:

- Latest score columns are read-model fields only.
- Source of truth for scores is `opportunity_scores`.
- `latest_wager_recommendation_id` is a nullable read pointer, not the
  recommendation source of truth.

### opportunity_subjects

Required fields:

- `id`
- `opportunity_id`
- `race_entry_id`
- `subject_role`
- `sort_order`
- `metadata`
- `created_at`

Examples for `subject_role`:

- `primary`
- `include`
- `exclude`
- `key`
- `under`
- `over`
- `contender`
- `fade`

Rules:

- Multi-entry Opportunities must use this table.
- Single-horse Opportunities should still use this table for consistency.

### opportunity_strategy_matches

Required fields:

- `id`
- `opportunity_id`
- `strategy_match_id`
- `relationship_type`
- `created_at`

Rules:

- Allows one Opportunity to be created from multiple strategy matches.

### opportunity_events

Required fields:

- `id`
- `opportunity_id`
- `event_type`
- `from_state`
- `to_state`
- `reason`
- `metadata`
- `created_by_agent_run_id`
- `created_by_user_id`
- `created_at`

Rules:

- Append-only.
- Used to rebuild `opportunities.current_state` if needed.

### opportunity_visibility_events

Required fields:

- `id`
- `opportunity_id`
- `visibility_scope`
- `entitlement_key`
- `from_visible`
- `to_visible`
- `reason`
- `created_by_agent_run_id`
- `created_at`

Rules:

- Optional for MVP, but useful when Free/Pro/Elite visibility diverges.

## Race Transaction Tables

### races

Required fields:

- `id`
- `provider`
- `provider_race_id`
- `track_id`
- `race_date`
- `race_number`
- `scheduled_post_time`
- `actual_post_time`
- `race_name`
- `race_type`
- `surface_id`
- `distance`
- `distance_unit`
- `purse`
- `age_restriction`
- `sex_restriction`
- `class_rating`
- `track_condition`
- `weather`
- `field_size`
- `status`
- `imported_at`
- `source_job_run_id`
- `created_at`
- `updated_at`

Uniqueness:

- unique on `provider`, `provider_race_id`
- unique on `track_id`, `race_date`, `race_number`

### race_entries

Required fields:

- `id`
- `race_id`
- `provider_entry_id`
- `horse_id`
- `jockey_id`
- `trainer_id`
- `post_position`
- `program_number`
- `entry_coupling`
- `morning_line_odds`
- `current_status`
- `scratch_reason`
- `weight_carried`
- `medication`
- `equipment`
- `last_race_summary`
- `created_at`
- `updated_at`

### entry_events

Required fields:

- `id`
- `race_entry_id`
- `event_type`
- `from_status`
- `to_status`
- `reason`
- `metadata`
- `source_job_run_id`
- `created_at`

Rules:

- Scratches and reinstatements are captured append-only here.

### odds_snapshots

Append-only and partitioned.

Required fields:

- `id`
- `race_date`
- `race_id`
- `race_entry_id`
- `provider`
- `pool_type`
- `odds_decimal`
- `odds_fractional`
- `implied_probability`
- `pool_total`
- `rank_in_pool`
- `captured_at`
- `source_job_run_id`
- `raw_payload_hash`
- `created_at`

Rules:

- `race_date` is copied from `races` for partition pruning.
- Current odds are derived from latest snapshot per race entry and pool.
- Normal operation never updates odds rows.

### result_versions

Required fields:

- `id`
- `race_id`
- `provider`
- `provider_result_id`
- `result_version`
- `official_status`
- `resulted_at`
- `official_at`
- `winning_time`
- `track_condition_final`
- `correction_of_result_version_id`
- `correction_reason`
- `result_payload`
- `source_job_run_id`
- `created_at`

Rules:

- New official corrections insert new result versions.
- Verification references the result version used.

### result_entries

Required fields:

- `id`
- `result_version_id`
- `race_entry_id`
- `finish_position`
- `official_position`
- `margin`
- `payout_win`
- `payout_place`
- `payout_show`
- `disqualified`
- `dead_heat`
- `created_at`

## Learning And Prediction Lineage

### model_versions

Required fields:

- `id`
- `model_family`
- `model_name`
- `version`
- `provider`
- `configuration`
- `training_data_window`
- `evaluation_summary`
- `status`
- `created_at`

### feature_snapshots

Append-only.

Required fields:

- `id`
- `entity_type`
- `entity_id`
- `feature_family`
- `feature_version`
- `features`
- `source_job_run_id`
- `created_at`

Rules:

- Large feature payloads live here instead of bloating hot fact tables.

### prediction_outputs

Append-only.

Required fields:

- `id`
- `race_id`
- `race_entry_id`
- `model_version_id`
- `feature_snapshot_id`
- `probability`
- `ranking`
- `confidence_score`
- `source_job_run_id`
- `created_at`

Rules:

- Value and strategy outputs reference these predictions where applicable.

### model_training_runs

Required fields:

- `id`
- `model_version_id`
- `training_window_start`
- `training_window_end`
- `dataset_summary`
- `status`
- `source_job_run_id`
- `created_at`

### model_evaluation_runs

Required fields:

- `id`
- `model_version_id`
- `evaluation_window_start`
- `evaluation_window_end`
- `metrics`
- `status`
- `source_job_run_id`
- `created_at`

### model_promotions

Required fields:

- `id`
- `model_version_id`
- `from_status`
- `to_status`
- `reason`
- `promoted_by_user_id`
- `created_at`

## Strategy Model And Marketplace Foundations

### strategies

Required fields:

- `id`
- `owner_user_id`
- `slug`
- `name`
- `description`
- `category`
- `visibility`
- `marketplace_eligible`
- `status`
- `created_by_agent_run_id`
- `created_at`
- `updated_at`

Visibility examples:

- `system`
- `private`
- `marketplace`
- `retired`

### strategy_versions

Required fields:

- `id`
- `strategy_id`
- `parent_strategy_version_id`
- `version`
- `semantic_version`
- `configuration`
- `scoring_formula`
- `min_confidence`
- `min_expected_roi`
- `is_active`
- `is_default`
- `publication_status`
- `license_type`
- `validation_status`
- `active_from`
- `active_to`
- `published_at`
- `retired_at`
- `change_summary`
- `created_by_user_id`
- `created_at`

Rules:

- Matches and Opportunities store strategy version.
- Future marketplace/fork support uses parent version fields.

### strategy_feature_snapshots

Required fields:

- `id`
- `strategy_version_id`
- `race_id`
- `race_entry_id`
- `feature_snapshot_id`
- `created_at`

### strategy_matches

Append-only.

Required fields:

- `id`
- `race_id`
- `race_entry_id`
- `strategy_id`
- `strategy_version_id`
- `model_version_id`
- `prediction_output_id`
- `feature_snapshot_id`
- `match_score`
- `confidence_score`
- `expected_roi`
- `features`
- `matched_at`
- `source_job_run_id`
- `created_at`

Rules:

- Reruns create new rows.
- Feature JSON can be a summary; full feature lineage should reference
  `feature_snapshots`.

### Future marketplace tables

Do not implement in MVP unless requested, but reserve design compatibility for:

- `strategy_authors`
- `strategy_marketplace_listings`
- `strategy_marketplace_versions`
- `strategy_purchases`
- `strategy_reviews`
- `strategy_revenue_events`
- `user_strategy_installs`

## Wager Recommendation Model

### wager_templates

Required fields:

- `id`
- `wager_type`
- `name`
- `description`
- `rules`
- `is_active`
- `created_at`
- `updated_at`

### wager_recommendations

Append-only.

Required fields:

- `id`
- `opportunity_id`
- `race_id`
- `wager_template_id`
- `wager_type`
- `recommendation_version`
- `supersedes_wager_recommendation_id`
- `recommendation_status`
- `valid_from`
- `valid_until`
- `invalidated_reason`
- `invalidated_by_event_id`
- `stake_units`
- `estimated_cost`
- `expected_payout`
- `expected_roi`
- `confidence_score`
- `input_odds_snapshot_id`
- `input_feature_snapshot_id`
- `display_construction`
- `source_strategy_match_id`
- `source_agent_run_id`
- `created_at`

Rules:

- Replacement recommendations point to prior rows.
- `display_construction` is a cached display shape, not the relational source of
  truth.

### wager_recommendation_legs

Required fields:

- `id`
- `wager_recommendation_id`
- `leg_index`
- `leg_type`
- `selection_rule`
- `created_at`

### wager_recommendation_leg_entries

Required fields:

- `id`
- `wager_recommendation_leg_id`
- `race_entry_id`
- `selection_role`
- `sort_order`
- `created_at`

Examples for `selection_role`:

- `win`
- `place`
- `show`
- `key`
- `include`
- `exclude`

## User Workflow And Recorded Wagers

### watchlist_items

User-owned.

Required fields:

- `id`
- `user_id`
- `opportunity_id`
- `client_mutation_id`
- `created_at`
- `updated_at`

### daily_bet_sheets

User-owned.

Required fields:

- `id`
- `user_id`
- `race_date`
- `name`
- `status`
- `total_planned_units`
- `total_recorded_units`
- `client_mutation_id`
- `created_at`
- `updated_at`

### daily_bet_sheet_entries

User-owned planning rows.

Required fields:

- `id`
- `user_id`
- `daily_bet_sheet_id`
- `opportunity_id`
- `wager_recommendation_id`
- `status`
- `planned_units`
- `user_notes`
- `client_mutation_id`
- `created_at`
- `updated_at`

### daily_bet_sheet_events

Append-only and user-owned.

Required fields:

- `id`
- `user_id`
- `daily_bet_sheet_id`
- `daily_bet_sheet_entry_id`
- `event_type`
- `from_status`
- `to_status`
- `metadata`
- `client_mutation_id`
- `created_at`

Rules:

- `client_mutation_id` supports idempotent mobile/PWA retries.

### user_recorded_wagers

User-owned actual placement records, separate from Strideo recommendations.

Required fields:

- `id`
- `user_id`
- `daily_bet_sheet_entry_id`
- `wager_recommendation_id`
- `stake_units`
- `actual_cost`
- `actual_odds`
- `actual_payout`
- `book_name`
- `status`
- `placed_at`
- `settled_at`
- `client_mutation_id`
- `created_at`
- `updated_at`

Rules:

- A recommendation can exist without a recorded user wager.
- A user can adjust actual stake/price without mutating the recommendation.

## Performance Verification

### performance_runs

Required fields:

- `id`
- `run_type`
- `status`
- `result_version_id`
- `started_at`
- `completed_at`
- `source_job_run_id`
- `created_at`

### recommendation_results

Append-only.

Required fields:

- `id`
- `performance_run_id`
- `wager_recommendation_id`
- `opportunity_id`
- `race_id`
- `result_version_id`
- `verification_status`
- `stake_units`
- `return_units`
- `profit_units`
- `roi`
- `hit`
- `expected_roi_at_recommendation`
- `closing_odds_snapshot_id`
- `closing_value_delta`
- `settlement_method`
- `payout_details`
- `verified_at`
- `source_job_run_id`
- `created_at`

### recommendation_result_events

Required fields:

- `id`
- `recommendation_result_id`
- `event_type`
- `metadata`
- `created_at`

### user_wager_results

User-owned.

Required fields:

- `id`
- `user_id`
- `user_recorded_wager_id`
- `result_version_id`
- `stake_units`
- `return_units`
- `profit_units`
- `roi`
- `hit`
- `settled_at`
- `created_at`

### Performance rollups

Rollup tables are rebuildable read models:

- `opportunity_performance_rollups`
- `strategy_performance_rollups`
- `model_performance_rollups`

Common required fields:

- `id`
- relevant entity IDs
- `period_start`
- `period_end`
- `sample_size`
- `hit_count`
- `stake_units`
- `return_units`
- `profit_units`
- `roi`
- `confidence_interval`
- `computed_at`
- `source_job_run_id`

Rules:

- Individual result rows are append-only.
- Rollups can be rebuilt, but every rebuild is linked to a job/performance run.

## Agent And Audit Tables

### job_runs

Required fields:

- `id`
- `job_type`
- `status`
- `started_at`
- `completed_at`
- `metadata`
- `created_at`

### agent_logs

Required fields:

- `id`
- `job_run_id`
- `agent_name`
- `entity_type`
- `entity_id`
- `level`
- `message`
- `metadata`
- `created_at`

### event_log

Required fields:

- `id`
- `entity_type`
- `entity_id`
- `event_type`
- `metadata`
- `source_job_run_id`
- `created_by_user_id`
- `created_at`

## RLS Design V2

Global posture:

- Enable RLS on every public-schema table.
- Grant no Data API access by default.
- Grant browser roles table-by-table only after policies exist.
- Keep `anon` blocked for MVP private surfaces.
- Service role is server-side only.

Policy classes:

- User-owned CRUD: row has `user_id = auth.uid()`.
- User-owned append: event rows require owned parent and idempotent
  `client_mutation_id`.
- Entitled read: row visible if user has active entitlement.
- System/server write: no browser grants; service-role or trusted server writes.
- Admin/operator read: controlled by `profile_roles`, not user metadata.
- Marketplace owner write: strategy owner can manage private/future marketplace
  strategy versions according to policy.

Shared read gate:

- Browser-readable race, Opportunity, strategy, and recommendation data requires
  both explicit grants and entitlement policy.
- Before entitlements are implemented, shared read tables remain server-only.

Private helper functions:

- Put entitlement helper functions in a private schema.
- Avoid `SECURITY DEFINER` functions in exposed schemas.

## API Access Boundaries

Browser/Supabase client:

- Uses publishable key only.
- Reads only through RLS and explicit grants.
- Writes only owned workflow rows when policies permit.
- Never calls The Racing API.
- Never calls OpenAI or other model providers.

Server routes/actions/jobs:

- Call racing providers.
- Call AI providers.
- Use service role only for trusted ingestion, verification, and admin writes.
- Validate session and entitlement before returning user-specific data.

Assistant:

- No free-form SQL.
- Uses scoped server tools.
- Logs assistant actions and user/session context.

## Index Strategy V2

Core indexes:

- `profiles(user_id)`
- `subscriptions(user_id, status)`
- `entitlements(user_id, entitlement_key, status)`
- `profile_roles(user_id, role)`
- `races(race_date, track_id, race_number)`
- `races(status, scheduled_post_time)`
- `race_entries(race_id, post_position)`
- `entry_events(race_entry_id, created_at desc)`
- `odds_snapshots(race_date, provider, captured_at desc)`
- `odds_snapshots(race_id, race_entry_id, pool_type, captured_at desc)`
- `result_versions(race_id, result_version desc)`
- `result_entries(result_version_id, official_position)`
- `feature_snapshots(entity_type, entity_id, created_at desc)`
- `prediction_outputs(race_id, model_version_id, created_at desc)`
- `prediction_outputs(race_entry_id, model_version_id, created_at desc)`
- `strategies(owner_user_id, visibility)`
- `strategy_versions(strategy_id, active_from desc)`
- `strategy_matches(race_id, strategy_id, matched_at desc)`
- `strategy_matches(strategy_version_id, matched_at desc)`
- `opportunities(current_state, generated_at desc)`
- `opportunities(race_id, current_state)`
- `opportunities(strategy_id, current_state, latest_opportunity_score desc)`
- `opportunity_subjects(opportunity_id)`
- `opportunity_subjects(race_entry_id, subject_role)`
- `opportunity_strategy_matches(opportunity_id, strategy_match_id)`
- `opportunity_events(opportunity_id, created_at desc)`
- `opportunity_scores(opportunity_id, created_at desc)`
- `opportunity_explanations(opportunity_id, created_at desc)`
- `wager_recommendations(opportunity_id, recommendation_version desc)`
- `wager_recommendations(opportunity_id, valid_from desc)`
- `wager_recommendations(supersedes_wager_recommendation_id)`
- `wager_recommendation_legs(wager_recommendation_id, leg_index)`
- `wager_recommendation_leg_entries(wager_recommendation_leg_id, sort_order)`
- `watchlist_items(user_id, opportunity_id)`
- `daily_bet_sheets(user_id, race_date desc)`
- `daily_bet_sheet_entries(user_id, daily_bet_sheet_id)`
- `daily_bet_sheet_events(user_id, daily_bet_sheet_id, created_at desc)`
- `user_recorded_wagers(user_id, status, placed_at desc)`
- `recommendation_results(opportunity_id)`
- `recommendation_results(wager_recommendation_id)`
- `user_wager_results(user_id, settled_at desc)`
- `job_runs(job_type, status, started_at desc)`
- `agent_logs(job_run_id, created_at)`
- `event_log(entity_type, entity_id, created_at desc)`

JSONB indexes:

- Add GIN indexes only after query patterns are proven.
- Do not index every feature payload by default.

## Partition Strategy V2

Partition immediately before production ingestion:

- `odds_snapshots`: monthly range partition by `race_date`.
- `agent_logs`: monthly range partition by `created_at`.
- `event_log`: monthly range partition by `created_at`.

Consider later:

- `recommendation_results` by `created_at` or `race_date`.
- `feature_snapshots` by `created_at` if model volume grows.

Rules:

- Create partitions ahead of the current month.
- Keep partitions monthly in MVP.
- Add local indexes to each partition.
- Retention/archive jobs are server-side only.

## Data Retention And Archive Strategy

Retain indefinitely unless legal/compliance requirements say otherwise:

- Opportunities
- Opportunity events
- Recommendations
- Result versions
- Recommendation results
- User recorded wager summaries
- Strategy/model rollups

Archive/compress after active analytics window:

- Raw provider payloads
- Verbose agent logs
- Large feature snapshots
- Old odds partitions after rollups are computed, if storage pressure requires
  archive.

Hot data target:

- Current and upcoming races.
- Recent odds snapshots.
- Active Opportunities.
- Current user bet sheets.

Warm data target:

- Last 12-24 months of Opportunities, recommendations, results, and
  performance.

## Agent Read/Write Ownership

Race Data Agent:

- Writes: reference tables, `races`, `race_entries`, `entry_events`,
  `odds_snapshots`, `result_versions`, `result_entries`, `job_runs`,
  `agent_logs`.
- Reads: provider identity mappings and existing race records.

Prediction Agent:

- Writes: `feature_snapshots`, `prediction_outputs`, `agent_logs`.
- Reads: race, entry, result, and odds history.

Value Agent:

- Writes: `opportunity_scores`, `agent_logs`.
- Reads: `prediction_outputs`, `odds_snapshots`, race context.

Strategy Agent:

- Writes: `strategy_feature_snapshots`, `strategy_matches`,
  `opportunities`, `opportunity_subjects`, `opportunity_strategy_matches`,
  `opportunity_events`, `agent_logs`.
- Reads: strategy versions, predictions, features, odds, race context.

Wager Construction Agent:

- Writes: `wager_recommendations`, `wager_recommendation_legs`,
  `wager_recommendation_leg_entries`, `opportunity_events`, `agent_logs`.
- Reads: Opportunities, strategy matches, odds, wager templates.

Race Analyst Agent:

- Writes: `opportunity_explanations`, `agent_logs`.
- Reads: Opportunity context and supporting facts.

Performance Verification Agent:

- Writes: `performance_runs`, `recommendation_results`,
  `recommendation_result_events`, rollups, `agent_logs`.
- Reads: result versions, recommendations, Opportunities, strategy/model
  versions.

Bet Sheet Agent:

- Writes: user workflow suggestions only through server-side user context.
- Reads: Opportunities, recommendations, user preferences, entitlements.

Strideo Assistant Agent:

- Writes: future assistant tables.
- Reads: only through scoped, authorization-aware server tools.

## Mobile And Offline Readiness

Required mobile-safe fields:

- `updated_at` on mutable user-owned tables.
- `client_mutation_id` on watchlists, bet sheets, bet sheet entries, bet sheet
  events, and recorded wagers.
- unique `(user_id, client_mutation_id)` where retries must be idempotent.

Future mobile tables:

- `user_devices`
- `notification_tokens`
- `notification_events`
- `sync_checkpoints`

Read models:

- Mobile feeds should use compact server-side views or API routes, not chatty
  multi-table browser queries.
- Views exposed to browser roles must be `security_invoker = true` when used in
  exposed schemas, or kept server-only.

## Future Migration Risks Resolved By V2

- Multi-horse wagers are normalized before production data exists.
- Opportunity subject modeling avoids later single-entry backfills.
- Result versioning avoids destructive official correction updates.
- Entitlement tables precede shared read exposure.
- Race-date-aware odds partitions avoid large post-ingestion rewrites.
- Strategy ownership fields avoid future Marketplace retrofit pain.
- Prediction and feature lineage support learning analysis from day one.
- Mobile idempotency fields avoid duplicate user actions during retry/offline
  flows.

## Remaining Open Questions

- Which racing provider endpoint is first, and what is the import cadence?
- Should `odds_snapshots` partitions be created by application job, Supabase
  scheduled function, or manual migration cadence?
- What is the initial Opportunity Score formula?
- Which read data is Free versus Pro once entitlements are implemented?
- Are wager recommendation legs sufficient for all MVP exotic structures, or is
  a separate `wager_combinations` table needed?
- What is the minimum Strategy Marketplace scope for Elite?
- What retention window is acceptable for large feature snapshots and raw
  provider payload archives?

## V2 Readiness Decision

Do not create tables yet.

This V2 plan resolves the structural blockers identified in
`PHASE1_SCHEMA_REVIEW.md`, but it still requires review and explicit approval
before SQL migrations are created.
