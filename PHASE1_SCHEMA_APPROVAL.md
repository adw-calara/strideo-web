# Phase 1 Schema Approval

## Approval Status

Approved for migration planning.

`PHASE1_SCHEMA_PLAN_V2.md` resolves the blockers identified in
`PHASE1_SCHEMA_REVIEW.md` at the schema-design level and is approved as the
source document for the first application-table migration design.

This approval does not create migrations, tables, seed data, or application code.
The next step should be a SQL migration PR that implements the approved order
with explicit RLS, grants, indexes, and partition setup.

## Final Verification

### Blocker Resolution

All blockers from `PHASE1_SCHEMA_REVIEW.md` are resolved in V2:

- Global Opportunity lifecycle is separated from user workflow state.
- Multi-entry Opportunities are modeled through `opportunity_subjects`.
- Wager recommendations use normalized legs and leg entries.
- User recorded wagers are distinct from system wager recommendations.
- Recommendation replacement/version history is first-class.
- Result corrections are versioned through `result_versions`.
- Learning lineage is covered through feature snapshots and prediction outputs.
- Entitlements and roles exist before shared read exposure.
- `odds_snapshots` includes `race_date` for partition pruning.
- Strategy ownership/versioning supports future Marketplace needs.
- Mobile idempotency/offline concerns are addressed with `client_mutation_id`
  and mutable-table `updated_at`.

### Product Capability Support

Approved coverage:

- Opportunities: supported by `opportunities`, `opportunity_events`,
  `opportunity_scores`, `opportunity_explanations`, and read-model pointers.
- Multi-horse opportunities: supported by `opportunity_subjects` and
  `opportunity_strategy_matches`.
- Wager construction: supported by `wager_templates`,
  `wager_recommendations`, `wager_recommendation_legs`, and
  `wager_recommendation_leg_entries`.
- Daily bet sheets: supported by `daily_bet_sheets`,
  `daily_bet_sheet_entries`, `daily_bet_sheet_events`, and
  `user_recorded_wagers`.
- Strategy performance: supported by strategy versions, recommendation results,
  performance runs, and `strategy_performance_rollups`.
- Recommendation performance: supported by `recommendation_results`,
  `recommendation_result_events`, result versions, closing odds links, and
  performance runs.
- Learning engine: supported by `model_versions`, `feature_snapshots`,
  `prediction_outputs`, model training/evaluation runs, and model promotions.
- Strategy Marketplace: supported at the foundation level by strategy ownership,
  visibility, parent versions, publication status, and license fields.
- Mobile synchronization: supported by user-owned timestamps,
  `client_mutation_id`, idempotency guidance, and future device/notification
  tables.

### Architecture Verification

Partition strategy:

- Approved for first migration planning.
- `odds_snapshots` should be monthly range partitioned by `race_date` before
  production ingestion.
- `agent_logs` and `event_log` should be monthly range partitioned by
  `created_at`.
- Partition creation should be operationalized before live ingestion.

Indexing strategy:

- Approved as sufficient for the first migration.
- Feed, race-day, user workflow, performance, and audit access paths are covered.
- JSONB GIN indexes should be deferred until query patterns are proven.

RLS strategy:

- Approved.
- RLS must be enabled on every public-schema application table.
- No table should be granted to `anon` for MVP.
- `authenticated` grants must be table-by-table and only after policies exist.
- Server-only tables should have no browser grants.
- Entitlement checks must use trusted tables or `app_metadata`, never
  user-editable metadata.

Analytics warehouse compatibility:

- Approved.
- Append-only facts, immutable versions, job/run metadata, and denormalized
  rollups give a clean path to warehouse exports.
- Partitioned odds/event/log tables provide natural incremental extract windows.
- Feature snapshots and prediction outputs preserve model lineage for offline
  analytics.

Append-only/event-sourced principles:

- Approved.
- Odds snapshots, predictions, strategy matches, opportunity events, scores,
  explanations, wager recommendations, result versions, and recommendation
  results are modeled as append-only facts.
- Mutable columns are limited to read-model pointers and user workflow state.

## Remaining Risks

Migration complexity:

- The first migration is large. It should be split into carefully ordered
  sections inside one reviewed PR, or multiple migration PRs if review becomes
  difficult.

Partition operations:

- `odds_snapshots`, `event_log`, and `agent_logs` partition creation must be
  automated before ingestion volume begins.

RLS complexity:

- Entitlement policies can become hard to reason about. Keep helper functions in
  a private schema and test each role path before granting Data API access.

Recommendation-leg completeness:

- MVP exacta/trifecta structures are covered, but advanced superfecta and
  multi-race wagers may eventually need `wager_combinations` or multi-race leg
  modeling.

Marketplace scope:

- V2 supports marketplace-compatible ownership/versioning, but full commerce,
  reviews, purchases, revenue events, and installs remain future schema work.

Mobile/offline scope:

- `client_mutation_id` supports idempotency, but full offline sync still needs
  later `sync_checkpoints`, conflict rules, and compact read models.

Provider identity quality:

- Horse, jockey, trainer, and track dedupe will depend on provider identity
  quality and future reconciliation workflows.

## Recommended Migration Order

1. Foundation enums, private helper schemas, and extension prerequisites.
2. Identity, access, and entitlement tables.
3. Reference tables.
4. Agent/audit foundation tables.
5. Race transaction tables.
6. Partitioned odds snapshots.
7. Result version tables.
8. Learning/model lineage tables.
9. Strategy and strategy-version tables.
10. Opportunity core tables and events.
11. Wager recommendation tables and normalized legs.
12. User workflow and recorded wager tables.
13. Performance verification and rollup tables.
14. Future-compatible but optional notification/device placeholders only if
    needed immediately.
15. RLS policies for each table group.
16. Explicit grants, added only after RLS is verified.
17. Indexes and partition-local indexes.
18. Supabase advisors and verification queries.

## Recommended Table Creation Order

1. `profiles`
2. `subscriptions`
3. `entitlements`
4. `profile_roles`
5. `tracks`
6. `surfaces`
7. `horses`
8. `jockeys`
9. `trainers`
10. `job_runs`
11. `agent_logs`
12. `event_log`
13. `races`
14. `race_entries`
15. `entry_events`
16. `odds_snapshots`
17. `result_versions`
18. `result_entries`
19. `model_versions`
20. `feature_snapshots`
21. `prediction_outputs`
22. `model_training_runs`
23. `model_evaluation_runs`
24. `model_promotions`
25. `strategies`
26. `strategy_versions`
27. `strategy_feature_snapshots`
28. `strategy_matches`
29. `opportunities`
30. `opportunity_subjects`
31. `opportunity_strategy_matches`
32. `opportunity_events`
33. `opportunity_scores`
34. `opportunity_explanations`
35. `opportunity_visibility_events`
36. `wager_templates`
37. `wager_recommendations`
38. `wager_recommendation_legs`
39. `wager_recommendation_leg_entries`
40. `watchlist_items`
41. `daily_bet_sheets`
42. `daily_bet_sheet_entries`
43. `daily_bet_sheet_events`
44. `user_recorded_wagers`
45. `performance_runs`
46. `recommendation_results`
47. `recommendation_result_events`
48. `user_wager_results`
49. `opportunity_performance_rollups`
50. `strategy_performance_rollups`
51. `model_performance_rollups`

Deferred table groups:

- assistant conversation tables
- notification/device tables
- full Strategy Marketplace commerce tables
- advanced mobile sync checkpoint tables

## Recommended Agent Onboarding Order

1. Race Data Agent
   - Onboard after reference, race, entry, odds, result, job, and log tables
     exist.
2. Prediction Agent
   - Onboard after feature snapshots, model versions, and prediction outputs
     exist.
3. Value Agent
   - Onboard after prediction outputs and odds snapshots exist.
4. Strategy Agent
   - Onboard after strategies, strategy versions, strategy matches,
     opportunities, subjects, and events exist.
5. Wager Construction Agent
   - Onboard after wager templates, recommendations, legs, and leg entries
     exist.
6. Race Analyst Agent
   - Onboard after opportunity explanations and supporting fact links exist.
7. Performance Verification Agent
   - Onboard after result versions, recommendation results, performance runs,
     and rollups exist.
8. Bet Sheet Agent
   - Onboard after user workflow tables and entitlement checks exist.
9. Alert Agent
   - Onboard after alert preferences and notification/event strategy are
     finalized.
10. Strideo Intelligence Agent
    - Onboard after enough performance history exists for learning loops.
11. Strideo Assistant Agent
    - Onboard last, after structured tools, RLS, entitlements, and audit logging
      are proven.

## Migration Approval Gate

The next PR may create SQL migrations for application tables if it follows this
approval document and keeps the following guardrails:

- RLS enabled for every application table.
- No public table exposure by default.
- No `anon` grants for MVP.
- No service-role value in application or browser code.
- No external racing API calls from frontend clients.
- Append-only fact tables are not implemented with destructive update paths.
- Verification queries and Supabase advisor output are included in the PR
  summary.
