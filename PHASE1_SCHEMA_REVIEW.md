# Phase 1 Schema Review

## Executive Assessment

`PHASE1_SCHEMA_PLAN.md` is directionally strong. It correctly centers
Opportunity, protects append-only history, separates user-owned workflow data
from system-generated intelligence, and defers Data API exposure until grants
and RLS are intentionally designed.

This plan is not yet ready for SQL migration. The main gaps are structural:

- Multi-horse and exotic wagers need normalized legs/participants, not only JSON.
- Opportunity lifecycle mixes global Opportunity state with per-user bet-sheet
  state.
- Result history needs versioning strong enough for official corrections.
- Learning/model tables are too thin for explainability and performance drift.
- Strategy Marketplace ownership, publishing, pricing, and version fork support
  are missing.
- RLS needs entitlement and tenant/visibility concepts before broad read access.
- Partition design needs race-date denormalization and retention operations.

Recommendation: revise the schema plan once more before creating application
tables.

## 1. Opportunity Model

### Strengths

- Opportunity is correctly treated as the central aggregate.
- Links to race, strategy, recommendation, score, explanation, result, and
  performance are explicit.
- Append-only companion tables for scores and explanations are appropriate.

### Challenges

- `opportunities.race_entry_id` is insufficient even as nullable. Exacta,
  trifecta, favorite-fade, and chaos-race Opportunities may involve multiple
  entries, exclusion logic, or race-level structures.
- `primary_wager_recommendation_id` creates a circular dependency if
  recommendations also require `opportunity_id`.
- `expected_roi`, `confidence_score`, `opportunity_score`, `value_score`, and
  `edge_score` on `opportunities` risk becoming mutable truth unless they are
  clearly denormalized latest pointers.
- `current_state` is useful for feed speed, but the plan should state how it is
  maintained and reconciled.

### Recommended Changes

- Add `opportunity_subjects`:
  - `id`
  - `opportunity_id`
  - `race_entry_id`
  - `subject_role` such as `primary`, `include`, `exclude`, `key`, `under`,
    `over`, `contender`
  - `sort_order`
  - `metadata`
  - `created_at`
- Replace `primary_wager_recommendation_id` with either:
  - nullable latest pointer maintained after recommendation creation, or
  - derived latest recommendation view.
- Store latest denormalized scores on `opportunities` only as read-model fields;
  source of truth remains `opportunity_scores`.
- Add `latest_opportunity_score_id`, `latest_value_score_id`,
  `latest_explanation_id` if feed speed needs direct pointers.

## 2. Opportunity Lifecycle

### Strengths

- Event-sourced lifecycle is the right design.
- States cover generation, publication, closure, result, verification, voiding,
  and archival.

### Challenges

- User states such as `watched`, `sheet_draft`, `sheet_planned`, and `placed`
  do not belong to global Opportunity lifecycle. One Opportunity can be watched
  or placed by many users.
- `closed`, `resulted`, and `verified` are global/system states; `placed` is
  user-specific.
- `archived` may be either a system retention state or a user hide/archive
  preference; those should not be conflated.

### Recommended Changes

- Keep global Opportunity states limited to:
  - `candidate`
  - `qualified`
  - `published`
  - `suspended`
  - `closed`
  - `resulted`
  - `verified`
  - `voided`
  - `archived`
- Move user workflow states to:
  - `watchlist_items`
  - `daily_bet_sheet_entries`
  - `daily_bet_sheet_events`
- Add `opportunity_visibility_events` only if publication and entitlement
  visibility need separate auditing.
- Add allowed transition rules before SQL. Example: `published -> closed`,
  `closed -> resulted`, `resulted -> verified`, `published -> voided`.

## 3. Strategy Model

### Strengths

- Separating `strategies` and `strategy_versions` is essential.
- Strategy matches store strategy version and source job metadata.

### Missing Tables

- `strategy_inputs` or `strategy_feature_snapshots`
- `strategy_publications`
- `strategy_authors`
- `strategy_marketplace_listings` for future Elite support
- `strategy_subscriptions` or `user_strategy_installs`

### Recommended Changes

Add fields to `strategies`:

- `owner_user_id` nullable for system strategies
- `visibility` such as `system`, `private`, `marketplace`, `retired`
- `marketplace_eligible`
- `created_by_agent_run_id`

Add fields to `strategy_versions`:

- `parent_strategy_version_id`
- `semantic_version`
- `is_active`
- `is_default`
- `published_at`
- `retired_at`
- `change_summary`
- `validation_status`

Add `strategy_feature_snapshots` if feature inputs are too large to store in
every `strategy_matches.features` row.

## 4. Multi-Horse Wager Model

### Current Risk

The current plan stores `construction` and `legs` on `wager_recommendations`.
That is acceptable for early prototyping, but weak for exacta/trifecta
analytics, validation, replay, and mobile rendering.

Multi-horse wager support should not depend only on JSON.

### Missing Tables

- `wager_recommendation_legs`
- `wager_recommendation_leg_entries`
- `wager_recommendation_versions` or immutable replacement relationship

### Recommended Structure

`wager_recommendation_legs`:

- `id`
- `wager_recommendation_id`
- `leg_index`
- `leg_type`
- `selection_rule`
- `created_at`

`wager_recommendation_leg_entries`:

- `id`
- `wager_recommendation_leg_id`
- `race_entry_id`
- `selection_role` such as `win`, `place`, `show`, `key`, `include`, `exclude`
- `sort_order`
- `created_at`

Add to `wager_recommendations`:

- `supersedes_wager_recommendation_id`
- `recommendation_status`
- `valid_from`
- `valid_until`
- `invalidated_reason`

Use JSON as a display/cache shape, not the relational source of truth.

## 5. Daily Bet Sheet Model

### Strengths

- User ownership is explicit.
- Bet-sheet events retain workflow history.

### Challenges

- `daily_bet_sheets.status` is too coarse for a sheet containing entries in
  different states.
- `book` is a weak field if users place the same recommendation at different
  books or manually adjust stake/odds.
- There is no distinction between Strideo's recommended wager and the user's
  actual recorded wager.

### Missing Tables

- `user_recorded_wagers`
- `bet_sheet_entry_price_snapshots`
- `sportsbooks` or `wager_books` if book-level tracking matters

### Recommended Changes

Add `user_recorded_wagers`:

- `id`
- `user_id`
- `daily_bet_sheet_entry_id`
- `wager_recommendation_id`
- `stake_units`
- `actual_cost`
- `actual_odds`
- `actual_payout`
- `book_name`
- `placed_at`
- `settled_at`
- `status`
- `created_at`
- `updated_at`

Keep bet-sheet entries as planning rows. Treat actual user placement as a
separate record.

## 6. Recommendation History Model

### Strengths

- Wager recommendations are immutable after creation.
- Scratches and odds changes create new recommendations.

### Challenges

- Replacement history needs a first-class relationship.
- Recommendation validity windows are missing.
- Recommendation input snapshots are underspecified.

### Recommended Changes

Add fields to `wager_recommendations`:

- `recommendation_version`
- `supersedes_wager_recommendation_id`
- `valid_from`
- `valid_until`
- `input_odds_snapshot_id`
- `input_feature_snapshot`
- `invalidated_by_event_id`

Add indexes:

- `wager_recommendations(opportunity_id, recommendation_version desc)`
- `wager_recommendations(opportunity_id, valid_from desc)`
- `wager_recommendations(supersedes_wager_recommendation_id)`

## 7. Performance Tracking Model

### Strengths

- Individual recommendation results and rollups are separated.
- Strategy/model version IDs are treated as mandatory for comparison.

### Challenges

- `opportunity_performance` may accidentally become mutable truth.
- User-recorded wagers and system recommendations have different performance
  meanings.
- Result corrections need rerun history.
- No confidence interval, expected-vs-actual delta, or closing-line/value
  comparison fields are planned.

### Missing Tables

- `performance_runs`
- `recommendation_result_events`
- `user_wager_results`
- `closing_odds_snapshots` or a derived relationship to the last odds snapshot
  before close

### Recommended Changes

Add `performance_runs`:

- `id`
- `run_type`
- `status`
- `result_id`
- `started_at`
- `completed_at`
- `source_job_run_id`

Add fields to `recommendation_results`:

- `performance_run_id`
- `result_version`
- `closing_odds_snapshot_id`
- `expected_roi_at_recommendation`
- `closing_value_delta`
- `settlement_method`

Treat `opportunity_performance` as a rollup/read model that can be rebuilt.

## 8. Learning Engine Model

### Current Gap

The plan lists `model_versions`, rollups, and future learning tables, but it
does not yet model feature lineage, training/evaluation datasets, or model
promotion. This is central to "Improve Every Race."

### Missing Tables

- `feature_snapshots`
- `prediction_outputs`
- `model_training_runs`
- `model_evaluation_runs`
- `model_promotions`
- `learning_feedback_events`

### Recommended Minimal Additions Before SQL

`model_versions` should include:

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

Add `prediction_outputs`:

- `id`
- `race_id`
- `race_entry_id`
- `model_version_id`
- `probability`
- `ranking`
- `confidence_score`
- `feature_snapshot_id`
- `source_job_run_id`
- `created_at`

Prediction outputs should be append-only and referenced by value/strategy
outputs.

## 9. Partition Strategy

### Strengths

- `odds_snapshots`, `event_log`, and `agent_logs` are correctly identified as
  partition candidates.

### Risks

- Partitioning `odds_snapshots` by `captured_at` alone may not optimize race-day
  queries if most UI filters by `race_date`.
- Foreign keys to partitioned tables can become migration friction.
- Partition maintenance is not yet specified.

### Recommended Changes

- Add `race_date` directly to `odds_snapshots`, copied from `races`, for
  partition pruning and query speed.
- Partition `odds_snapshots` monthly by `race_date` for product queries, or by
  `captured_at` only if ingestion-time retention is the main operation.
- Add a documented partition creation job before live ingestion.
- Keep partitions coarse at first: monthly, not daily.
- Define retention/archive jobs as server-side jobs only.

### Missing Indexes For Partitions

- local partition index on `(race_id, race_entry_id, pool_type, captured_at desc)`
- local partition index on `(race_date, provider, captured_at desc)`
- BRIN index on `captured_at` for very large append-only partitions if useful.

## 10. RLS Strategy

### Strengths

- The plan correctly blocks default exposure.
- User-owned data includes `user_id`.
- Service-role usage is server-only.

### Risks

- Shared read data access is vague. Without entitlement tables, teams may either
  overexpose racing/opportunity data or block frontend development.
- Admin/operator access is not modeled.
- Marketplace/private strategies will require ownership-based RLS.
- Assistant tables need stricter isolation because they can include user intent
  and sensitive analysis.

### Recommended Changes

Add access-control tables:

- `profiles`
- `subscriptions`
- `entitlements`
- `role_assignments` or `profile_roles`

Add explicit policy classes:

- user-owned CRUD
- entitled read
- system/server write only
- admin/operator read
- marketplace owner read/write

Avoid policy dependence on `user_metadata`. Use trusted tables or
`app_metadata`.

For server-only tables, enable RLS anyway and grant no browser role access.
RLS can remain deny-all for browser roles while service-role jobs write.

## 11. Future Strategy Marketplace Support

### Current Gap

The plan mentions Strategy Marketplace in the PRD context but does not model it.
Retrofitting ownership and publication after strategies exist will be painful.

### Missing Tables

- `strategy_authors`
- `strategy_marketplace_listings`
- `strategy_marketplace_versions`
- `strategy_purchases`
- `strategy_reviews`
- `strategy_revenue_events`
- `user_strategy_installs`

### Recommended MVP-Friendly Additions

Even if marketplace tables are deferred, add fields now that avoid migration
pain:

- `strategies.owner_user_id`
- `strategies.visibility`
- `strategy_versions.parent_strategy_version_id`
- `strategy_versions.publication_status`
- `strategy_versions.license_type`

This lets system strategies, private user strategies, and future marketplace
strategies share the same foundation.

## 12. Future Mobile Support

### Strengths

- The plan keeps backend access through Supabase/RLS and server boundaries.
- User-owned data has clear ownership.

### Risks

- Mobile clients need stable, compact read models; raw relational shapes will
  be too chatty.
- Offline/PWA behavior needs sync-safe timestamps and conflict handling.
- Push notification preferences and device tokens are not modeled.

### Missing Tables

- `user_devices`
- `notification_tokens`
- `notification_events`
- `sync_checkpoints` if offline workflows become real

### Recommended Changes

- Add `updated_at` to all user-owned mutable tables.
- Add `client_mutation_id` to user workflow event tables for idempotent mobile
  writes.
- Add `notification_preferences` or extend `alert_preferences` to include
  channel/device-level settings.
- Plan read-only API views for mobile feed payloads, preferably server-side and
  entitlement-aware.

## Missing Tables Summary

High priority before first migration:

- `opportunity_subjects`
- `wager_recommendation_legs`
- `wager_recommendation_leg_entries`
- `user_recorded_wagers`
- `performance_runs`
- `prediction_outputs`
- `feature_snapshots`
- `entitlements`
- `profile_roles` or `role_assignments`

Medium priority:

- `result_entries`
- `recommendation_result_events`
- `strategy_feature_snapshots`
- `model_training_runs`
- `model_evaluation_runs`
- `model_promotions`
- `learning_feedback_events`
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

## Missing Indexes Summary

Add or clarify:

- `opportunity_subjects(opportunity_id)`
- `opportunity_subjects(race_entry_id, subject_role)`
- `opportunity_events(opportunity_id, created_at desc)`
- `opportunity_scores(opportunity_id, created_at desc)`
- `opportunity_explanations(opportunity_id, created_at desc)`
- `strategy_versions(strategy_id, active_from desc)`
- `strategy_matches(strategy_version_id, matched_at desc)`
- `wager_recommendation_legs(wager_recommendation_id, leg_index)`
- `wager_recommendation_leg_entries(wager_recommendation_leg_id, sort_order)`
- `daily_bet_sheet_events(user_id, daily_bet_sheet_id, created_at desc)`
- `user_recorded_wagers(user_id, status, placed_at desc)`
- `prediction_outputs(race_id, model_version_id, created_at desc)`
- `prediction_outputs(race_entry_id, model_version_id, created_at desc)`
- `feature_snapshots(entity_type, entity_id, created_at desc)`
- `entitlements(user_id, entitlement_key)`
- `profile_roles(user_id, role)`

## Missing Relationships Summary

Clarify these before SQL:

- Opportunity to multiple race entries through `opportunity_subjects`.
- Opportunity to one or more strategy matches.
- Wager recommendation to normalized wager legs and leg entries.
- Recommendation replacement chain through `supersedes_wager_recommendation_id`.
- Result versions to verification runs.
- Prediction outputs to feature snapshots and model versions.
- Strategy versions to parent/fork versions.
- User recorded wagers to daily bet sheet entries and recommendation results.
- Entitlements/subscriptions to profiles and RLS helper policies.

## Future Migration Risks

- Adding multi-leg wager tables after JSON-only production data exists will
  require backfills and fragile parsing.
- Adding marketplace ownership after strategies exist will require retroactive
  ownership and visibility defaults.
- Adding result versioning after settlement will make corrected results hard to
  audit.
- Adding entitlements after Data API grants risks temporary overexposure.
- Partitioning `odds_snapshots` after high-volume ingestion will require a
  disruptive rewrite or backfill.
- Changing global Opportunity states after user-specific states are mixed in
  will require workflow data cleanup.

## Scaling Risks

- Odds snapshots can become the largest table quickly; partition before
  production ingestion.
- JSONB feature payloads can bloat hot tables if not moved to feature snapshots.
- Opportunity feed queries will need denormalized latest fields or materialized
  read models.
- Assistant search across raw tables can become expensive and risky; use
  structured scoped tools and read models.
- Rollups must be incremental or job-based; do not compute historical ROI from
  raw rows on every request.

## Recommended Changes Before Migration

Required before first application-table migration:

1. Separate global Opportunity lifecycle from user bet-sheet/watchlist workflow.
2. Add `opportunity_subjects`.
3. Normalize wager recommendation legs and leg entries.
4. Add user recorded wager table separate from recommendations.
5. Add result detail/version strategy.
6. Add prediction outputs and feature snapshots for learning lineage.
7. Add entitlement/role model before browser-readable shared data.
8. Add race-date strategy for odds snapshot partitioning.
9. Add marketplace-safe strategy ownership fields.
10. Add idempotency fields for user workflow events and future mobile clients.

Recommended first migration boundary:

- User/entitlement foundation.
- Reference race identity tables.
- Race/race entry tables.
- Partitioned odds snapshots.
- Strategy/version tables with ownership fields.
- Opportunity core plus subjects/events/scores.
- Wager recommendation core plus legs.
- Bet sheet core plus user recorded wagers.
- Job/model audit foundation.

Defer but design for:

- Full marketplace commerce.
- Advanced notification delivery.
- Assistant conversations.
- Model training/evaluation run depth.

## Final Readiness Decision

Not approved for table creation yet.

The plan is close, but the SQL migration should wait until the review changes
above are incorporated into `PHASE1_SCHEMA_PLAN.md` or a follow-up migration
spec. The most important blockers are multi-horse wager normalization,
Opportunity subject modeling, user-vs-global lifecycle separation, entitlement
RLS, and learning lineage.
