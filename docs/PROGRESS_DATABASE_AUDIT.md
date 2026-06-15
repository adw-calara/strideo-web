# Progress Database Audit

## Executive Summary

Audit date: 2026-06-15

Result: Strideo's current repo, migration chain, RLS posture, Opportunity-centered data model, and ML/value lineage are healthy enough to proceed with review of PR #60, `Add racing-form data foundation`.

PR #60 should remain draft until the owner chooses to mark it ready, but this audit found no blocking schema, migration, RLS, or product-architecture issue that requires changing PR #60 before review. The PR is additive, does not duplicate the existing race/horse/odds/result/prediction/Opportunity model, and preserves the current browser read surface.

The most important watchlist items are operational, not merge blockers:

- future ingestion must enforce semantic consistency between `value_calculations`, `feature_snapshots`, `prediction_outputs`, `odds_snapshots`, race entries, and Opportunities;
- high-volume past-performance/workout/value tables will eventually need partitioning or archival strategy once ingestion volume is real;
- no broad read grants should be added for the new source-fact tables before policy tests and product use cases exist;
- stale remote branches with legacy numeric-only migration names should not be revived without renaming/rebasing to the current timestamp convention.

## Current Repo And PR Status

- Audit branch: `codex/progress-database-audit`
- Latest local `main`: `8be35c364998abdef0b4af53a8530eadad1f8dec`
- Latest `origin/main`: `8be35c364998abdef0b4af53a8530eadad1f8dec`
- Audit branch base: latest `main`
- Working tree at audit start: clean except audit branch creation
- Open PRs: only PR #60, `Add racing-form data foundation`
- PR #60 URL: https://github.com/adw-calara/strideo-web/pull/60
- PR #60 branch: `codex/racing-form-data-foundation`
- PR #60 head commit: `800d3974a0949dab326df2f84c4cf81e42595eea`
- PR #60 merge state: `CLEAN`
- PR #60 files:
  - `docs/RACING_FORM_DATA_FOUNDATION_AUDIT.md`
  - `supabase/migrations/20260615183948_racing_form_data_foundation.sql`

Remote branch hygiene note: several old/stale remote branches still contain legacy numeric-only migration filenames such as `0013_fk_index_hardening.sql`, `0014_rls_initplan_optimization.sql`, `0015_profile_bootstrap.sql`, `0016_service_role_bootstrap_grants.sql`, and `0017_authenticated_profile_read_grants.sql`. They are not open PRs and do not block PR #60, but they should not be revived without rebasing/renaming to current timestamp migration rules.

## Migration History Audit

Current final migration on `main`:

- `20260615141628_opportunity_tracking_watchlist_grants.sql`

PR #60 migration:

- `20260615183948_racing_form_data_foundation.sql`

Findings:

- `main` has 24 SQL migration files.
- `npm run db:migrations:check` passes on `main`.
- Linked Dev migration list shows local and remote aligned through `20260615141628`.
- PR #60 appends a later timestamp migration and does not modify, rename, reorder, or delete prior migrations.
- The repo's documented migration convention is Supabase CLI timestamp naming: `YYYYMMDDHHMMSS_snake_case_name.sql`.
- `docs/SUPABASE_MIGRATION_WORKFLOW.md`, `README.md`, `AGENTS.md`, and `scripts/check-supabase-migrations.mjs` consistently enforce timestamp naming.
- Existing filenames with embedded labels such as `_0005_...` are still timestamp-prefixed and valid. They do not create ordering ambiguity because the leading 14-digit timestamp is the migration version.
- PR #60 was created with the Supabase timestamp pattern and fits cleanly after the current final migration.

Decision: PR #60's migration should be merged as-is from a naming/order perspective. Do not rename it.

## Database Domain Map

### Auth, Profiles, Roles

Tables:

- `profiles`
- `subscriptions`
- `entitlements`
- `profile_roles`
- `user_devices`

Type: user profile/read model, entitlement source, operational device state.

Key relationships:

- `profiles.user_id`, `subscriptions.user_id`, `entitlements.user_id`, `profile_roles.user_id`, and `user_devices.user_id` reference `auth.users`.
- RLS policies use `auth.uid()` and were later optimized with init-plan subselects.

Strengths:

- Trusted authorization data lives in database tables, not user-editable metadata.
- Browser reads are intentionally scoped to own profile/role data.
- Service-role profile bootstrap grants are narrow.

Incomplete:

- Subscription/payment automation is still future work.
- Role administration workflow is not yet modeled beyond trusted table state.

Duplicate concepts: none found.

### Tracks, Surfaces, Horses, Trainers, Jockeys

Tables:

- `tracks`
- `surfaces`
- `horses`
- `trainers`
- `jockeys`

Type: provider-aware canonical reference records.

Key relationships:

- `races.track_id` and `races.surface_id` link to track/surface.
- `race_entries.horse_id`, `race_entries.trainer_id`, and `race_entries.jockey_id` link entry facts to reference identities.
- Feature and PR #60 source-fact tables link back to these identities.

Strengths:

- Provider IDs are unique per provider.
- Reference tables are separated from race-entry facts, avoiding historical overwrites.

Incomplete:

- Cross-provider identity reconciliation is deferred.
- Horse pedigree detail is still mostly JSON/metadata until dedicated pedigree modeling exists.

Duplicate concepts: none found.

### Owners

Current `main`: owner reference records are not modeled.

PR #60:

- Adds `owners`.
- Adds owner and claim-owner links on `race_entries`.
- Adds owner context to `trainer_performance_stats`.

Type: provider-aware reference data and entry-level relationship context.

Strengths:

- Avoids overbuilding full ownership-history tables before ingestion proves provider shape.

Incomplete:

- Full stable/owner history and ownership shares are safe follow-ups.

Duplicate concepts: none found.

### Races And Race Entries

Tables:

- `races`
- `race_entries`
- `entry_events`
- default partitions for `races` and `race_entries`

Type: partitioned transaction/source facts, with `entry_events` append-only lifecycle history.

Key relationships:

- `race_entries` references `races`, `horses`, `trainers`, and `jockeys`.
- Opportunities and wager recommendations reference races and race entries by `(id, race_date)`.

Strengths:

- Race and entry facts are partitioned by `race_date`.
- Race-entry changes use events instead of overwriting lifecycle history.
- Current app race-card reads are bounded by date windows and limits.

Incomplete:

- On `main`, race condition fields are partially structured and partially free text.
- PR #60 improves this with structured race-condition columns.
- Monthly partitions are still operationally deferred; default partitions are only a safety net.

Duplicate concepts: none found.

### Odds Snapshots

Tables:

- `odds_snapshots`
- `odds_snapshots_default`
- `odds_features`

Type: append-only market/source facts plus derived feature-store facts.

Key relationships:

- `odds_snapshots` references races and optional race entries.
- `odds_features` and PR #60 `value_calculations` preserve odds-snapshot lineage.

Strengths:

- Append-only odds history is modeled correctly.
- Race-date partitioning supports high-volume feed ingestion.

Incomplete:

- Monthly partition creation automation remains a near-term hardening item.

Duplicate concepts: none found.

### Race Results And Result Entries

Tables:

- `result_versions`
- `result_entries`

Type: append-only result corrections and entry-level result facts.

Key relationships:

- `result_versions` references races.
- `result_entries` references result versions and race entries.
- Recommendation results and PR #60 value calculations can reference result versions.

Strengths:

- Official corrections create new versions instead of mutating previous result facts.

Incomplete:

- Deeper result payload parsing can evolve as providers are integrated.

Duplicate concepts: none found.

### Import And Data-Ingestion Status

Tables:

- `raw_archive_objects`
- `data_ingestion_batches`
- `source_data_files`
- `job_runs`
- `agent_logs`
- `event_log`

Type: operational lineage, raw archive metadata, ingestion status, and audit history.

Key relationships:

- Feature tables and PR #60 source-fact tables reference source files, ingestion batches, and job runs.

Strengths:

- Raw bytes are kept out of Postgres by design.
- Source checksums, coverage windows, job lineage, and operational state are modeled.

Incomplete:

- Archive lifecycle workers, import workers, and data quality dashboards are not yet built.

Duplicate concepts: none found.

### Opportunities

Tables:

- `opportunities`
- `opportunity_subjects`
- `opportunity_strategy_matches`
- `opportunity_scores`
- `opportunity_explanations`
- `opportunity_events`
- `opportunity_visibility_events`
- `opportunities_default`

Type: central product aggregate, normalized subjects, append-only score/explanation/event history, and visibility facts.

Key relationships:

- Opportunities reference races.
- Opportunity subjects reference race entries.
- Scores reference model and prediction outputs.
- PR #60 adds optional `opportunity_scores.value_calculation_id`.
- Wager recommendations and recommendation results reference Opportunities.

Strengths:

- Opportunity remains the durable center of recommendation, explanation, wager, and performance history.
- User workflow state is kept separate in watchlists and bet sheets.

Incomplete:

- Opportunity generation is still early and mostly demo/scaffolded.
- Future generation must require value/prediction lineage when applicable.

Duplicate concepts: none found.

### Wagers And Recommendations

Tables:

- `wager_templates`
- `wager_recommendations`
- `wager_recommendation_events`
- `wager_recommendation_legs`
- `wager_recommendation_leg_entries`
- `daily_bet_sheets`
- `daily_bet_sheet_entries`
- `daily_bet_sheet_events`
- `user_recorded_wagers`
- `user_wager_results`
- `recommendation_results`
- `recommendation_result_events`

Type: system recommendations, user workflow, user-recorded wagers, and performance verification facts.

Key relationships:

- System recommendations reference Opportunities and races.
- Recommendation results reference recommendation, Opportunity, result version, performance run, and closing odds.
- User-recorded wagers are separate from system recommendations.

Strengths:

- Clear separation between system facts and user workflow.
- Recommendation performance can be evaluated against versioned results.

Incomplete:

- More exotic/multi-race wager combinations are deferred.

Duplicate concepts: none found.

### Model, Prediction, Feature, And Value

Tables on `main`:

- `model_versions`
- `feature_snapshots`
- `prediction_outputs`
- `model_training_runs`
- `model_evaluation_runs`
- `model_promotions`
- `horse_features`
- `trainer_features`
- `jockey_features`
- `track_features`
- `odds_features`
- `model_training_datasets`
- `model_evaluation_metrics`
- `prediction_runs`
- `prediction_results`
- `live_prediction_cache`
- performance rollups

PR #60 adds:

- `horse_past_performances`
- `horse_workouts`
- `trainer_performance_stats`
- `value_calculations`

Type: feature store, model registry, prediction history, live-serving cache, source facts, and append-only value calculations.

Strengths:

- The main chain already supports feature snapshot -> model version -> prediction output.
- PR #60 adds the missing normalized source-fact layer for racing-form data and the missing append-only value calculation layer.

Incomplete:

- The ingestion and feature materialization code has not yet been built.
- Cross-row semantic consistency for value lineage must be enforced by ingestion/application logic or future database constraints.

Duplicate concepts: none found.

## Racing-Form Data Audit

### Race-Level Context

Supported on `main`:

- track
- race date
- race number
- scheduled/off time
- surface
- distance text/yards
- race type
- conditions text
- purse
- class rating

Added or improved by PR #60:

- claiming price
- class level
- age restrictions
- sex restrictions
- weight conditions
- field size
- weather
- track condition
- available wager types
- provider-specific condition payload

Assessment: fully supported enough for the next foundation step. More exact provider-specific normalization can safely follow after ingestion starts.

### Horse-Level Context

Supported on `main`:

- canonical provider-aware horse identity
- foaling year, sex, country code, metadata
- trainer, jockey, program number, post position
- morning-line odds
- live odds snapshots
- weight, medication, equipment

Added or improved by PR #60:

- owner
- claimed from/by owner
- layoff days
- physical notes
- entry comments
- trip notes

Partially supported/deferred:

- color, sire, dam, dam sire, breeder, and detailed pedigree remain metadata/raw-payload fields until provider shape and query needs justify dedicated columns or tables.

Assessment: adequate for PR #60; pedigree/physical depth is a safe follow-up, not a merge blocker.

### Historical Performance

Added by PR #60:

- `horse_past_performances`
- prior race date, track, race number, race type, class, claiming price, purse, field size
- surface, distance, track condition
- post position, running positions, finish position
- beaten lengths, final time, fractional times
- speed, Beyer, and pace figure support
- odds
- jockey, trainer, weight, medication, equipment
- trip/trouble notes
- winner/top finishers
- next-out indicators
- source file, ingestion batch, job, and raw payload lineage

Partially supported/deferred:

- owner context inside historical performance is not first-class in PR #60. It can be carried in `raw_payload` or inferred through future owner/history modeling. This is not a blocker for the foundation slice.

Assessment: substantially supported for first ingestion foundation. Safe to merge with owner-in-past-performance as a watchlist item.

### Training Numbers

Added by PR #60:

- `horse_workouts`
- workout date
- track/location
- distance
- surface
- time
- rank and total horses at distance
- breezing, handily, gate, bullet indicators
- layoff workout sequence
- workout spacing
- explainable inferred signals
- source file, ingestion batch, job, and raw payload lineage

Assessment: supported for the next foundation step.

### Trainer Numbers

Added by PR #60:

- `trainer_performance_stats`
- starts, wins, places, shows
- win/place/show percentages
- earnings and ROI
- track, surface, owner, jockey, distance category, race type, class level dimensions
- flexible `stat_context` for first off layoff, second off layoff, first after claim, first-time starter, sprint-to-route, route-to-sprint, turf/dirt switches, medication/equipment changes, and recent 30/60/90 day form
- metrics JSON for provider-specific stats

Assessment: supported for the foundation slice. The flexible `stat_context` is appropriate now; later PRs can promote high-value contexts to enums or generated dimensions once ingestion proves provider consistency.

## ML And Value Lineage Audit

Target loop:

historical source data -> feature snapshot -> model version -> prediction output -> value calculation -> Opportunity -> wager/recommendation -> final result -> post-race evaluation -> model improvement

Current support:

- Historical source metadata exists through raw archive and source file tables.
- Warm features exist for horse, trainer, jockey, track, and odds.
- `feature_snapshots` preserves exact model input payloads.
- `model_versions` preserves model identity and version metadata.
- `prediction_outputs` preserves append-only model output linked to model and feature snapshot.
- `prediction_runs` and `prediction_results` add batch and permanent prediction history.
- `odds_snapshots` preserves market state over time.
- Opportunities link to races, subjects, strategy matches, scores, explanations, wagers, and performance.
- Result versions and recommendation results allow post-race verification.
- PR #60 adds `value_calculations` linked to race, race entry, horse, Opportunity, model version, feature snapshot, odds snapshot, prediction output, and result version.

Strengths:

- Prior model decisions can be reconstructed when feature snapshots, prediction outputs, odds snapshots, and value calculations are recorded together.
- Predicted probability can be compared with market probability, fair odds, expected value, and final outcomes.
- Value facts are append-only by table design and have versioned method keys.
- Opportunity score history can link to value calculations without replacing existing score history.

Gaps:

- Critical later: ingestion/generation code must enforce semantic consistency across linked rows. Example: a `value_calculation` should not link a feature snapshot, odds snapshot, and prediction output from different race entries.
- Safe follow-up: add richer evaluation links from value calculations to recommendation/performance result rows if analysis needs direct joins beyond result version.
- Watchlist: avoid writing Opportunities without model/value lineage once the value engine is active.

Assessment: no PR #60 merge blocker. The lineage design is strong enough for the next database foundation step.

## RLS And Security Audit

Baseline posture:

- Default privileges revoke broad automatic grants from `anon` and `authenticated`.
- All current public application tables and default partitions have RLS enabled through migrations.
- PR #60 enables RLS on all new tables.
- The April 28, 2026 Supabase Data API change reinforces the repo's existing pattern: tables are not assumed to be exposed; grants are explicit.

Broad authenticated read currently exists for:

- Race-card/reference facts: `surfaces`, `tracks`, `horses`, `jockeys`, `trainers`, `races`, `race_entries`, `entry_events`, `odds_snapshots`, `result_versions`, `result_entries`.
- Import status: `data_ingestion_batches`.
- Published Opportunity feed fields: column-scoped grants on `opportunities`, `opportunity_subjects`, `opportunity_scores`, and `opportunity_explanations`.
- User profile/role summary: `profiles`, `profile_roles`.
- User-owned workflow: `watchlist_items` with ownership policies.

Policies using `true`:

- Race-card/reference tables use authenticated `using (true)` policies because these are shared, non-user-owned race facts.
- Published Opportunity read policies are gated by state and linked published Opportunities rather than blanket exposure.
- Import status read is intentionally minimal and status-focused.

User-owned policies:

- Profiles, roles, subscriptions, entitlements, devices, watchlist, bet sheets, recorded wagers, alert preferences, and user wager results use `auth.uid()` ownership patterns, later optimized for init-plan behavior.

Service-role grants:

- Profile bootstrap: `profiles`, `profile_roles`.
- Import status read: `data_ingestion_batches`.
- Opportunity generator: selected strategy, match, Opportunity, score, explanation, and event tables, with later revokes for unnecessary update grants.
- PR #60: `owners` gets select/insert/update; `horse_past_performances`, `horse_workouts`, `trainer_performance_stats`, and `value_calculations` get select/insert only.

No user-facing access:

- Internal model/training/feature/archive/prediction serving tables remain without broad browser grants.
- PR #60's new source-fact/value tables have no `anon` or `authenticated` grants and no browser-facing policies.

Risk findings:

- No active `anon` grants were found beyond comments/revokes.
- No missing RLS blocker was found in migration text.
- The main risk remains future PRs adding broad authenticated reads to unfinished model/source-fact tables.

Recommendation before PR #60 merge:

- No security blocker. Keep PR #60 as written. Do not add browser grants in the same PR.

## Scalability And Performance Audit

Strengths:

- Large race-date facts are partitioned: `races`, `race_entries`, `odds_snapshots`, `opportunities`, `wager_recommendations`, and `recommendation_results`.
- Default partitions exist as safety nets.
- Core query paths have indexes: race date/track, race entries by race/horse/status, odds by race/pool/time and entry/time, results by race/status and entry, Opportunity feed/state/score, Opportunity subjects, score/explanation history, user workflow, model/prediction, and performance rollups.
- Feature-store tables have entity/date/version indexes.
- PR #60 adds indexes for horse/date history, observed-entry past performances, horse/trainer/track workouts, trainer/stat/date dimensions, race-condition lookup, owner/layoff entry lookup, and value lineage lookups.

Scaling risks:

- Default partitions are not enough for production-scale odds, race entries, Opportunities, prediction results, and recommendation results. Monthly partition creation remains a required operational hardening item.
- PR #60 source-fact tables are not partitioned. That is acceptable for a small foundation PR but will need revisiting before high-volume multi-year ingestion.
- JSON payloads are useful for provider variance but should not become the only query path for high-cardinality model features.
- App read paths are currently bounded, but future racing-form UI must avoid unbounded horse lifetime reads and should page by horse/date.
- Feature snapshots and prediction/value history can grow quickly; warehouse exports and retention/read-model strategy should be planned before large backfills.

Does PR #60 worsen scalability?

- No. It adds appropriate lookup indexes and avoids UI/read expansion.
- It does add future high-volume tables, so partitioning/archival strategy becomes a watchlist item before real ingestion.

Near-term hardening recommendations:

- Add monthly partition automation before production feed volume.
- Define ingestion batch idempotency/upsert rules for PR #60 tables.
- Add semantic consistency checks in ingestion code for race/date/entry alignment across value lineage.
- Add warehouse/export plan before large model backfills.

## PRD And Opportunity Alignment Audit

The repo remains aligned with the PRD:

- Strideo is modeled as AI-powered wagering intelligence, not a generic race-card viewer.
- `Opportunity` remains the central aggregate connecting race context, subjects, scores, explanations, recommendations, user workflow, and performance.
- Race-card tables support Opportunity generation and context instead of becoming a separate product center.
- ML lineage tables preserve model versions, features, predictions, and evaluation loops.
- PR #60 strengthens upstream data needed to produce better Opportunities without adding UI, generic picks flows, or disconnected recommendation objects.

No drift found toward:

- generic race-card viewer;
- generic picks app;
- UI before data foundation;
- disconnected model outputs;
- duplicate workflows outside Opportunity.

## PR #60 Readiness Assessment

Readiness result: safe to mark ready for review and safe to merge from this audit's perspective, subject to normal reviewer approval.

Blockers: none found.

Non-blocking watchlist:

- Confirm future ingestion enforces cross-row semantic consistency for `value_calculations`.
- Do not apply PR #60 to Dev until explicitly authorized.
- Do not add browser grants for the new source-fact tables in this PR.
- Plan partitioning before high-volume historical ingestion.

PR #60 should not be renamed. Its migration naming is correct and current.

## High-Risk PR Watchlist

### PR #60 racing-form foundation merge/application

- Risk: applying to the wrong Supabase environment or applying before review.
- Why it matters: PR #60 creates new source-fact and value lineage surfaces.
- Verify before merge/apply: branch is current, migration check passes, Dev dry-run shows only the intended migration, Production authorization is explicit before any production work.

### Future ingestion code linking PR #60 tables

- Risk: inconsistent links between horse, race entry, feature snapshot, odds snapshot, prediction output, and Opportunity.
- Why it matters: bad lineage breaks model evaluation and value attribution.
- Verify before merge: idempotency keys, source file/batch/job links, race-date FKs, semantic consistency tests, and no destructive upserts of append-only facts.

### Future feature snapshot/prediction/value linkage

- Risk: generating features or predictions without preserving the exact inputs.
- Why it matters: prior model decisions must be reconstructable.
- Verify before merge: feature snapshot creation is mandatory before predictions; prediction and value rows reference model version, feature snapshot, odds snapshot, and result path where available.

### Future broad read grants

- Risk: exposing model/source/operational data before product needs and policy tests exist.
- Why it matters: Supabase RLS and Data API exposure require explicit least-privilege review.
- Verify before merge: table grants are column-scoped where possible, RLS policies are tested, and sensitive internal tables remain server-only.

### Future racing-form UI

- Risk: drifting into a generic racing-form viewer or creating unbounded horse-history queries.
- Why it matters: the PRD centers value intelligence and Opportunities.
- Verify before merge: UI starts from Opportunity or value-analysis needs, paginates horse history, and does not expose raw provider payloads casually.

### Future Opportunity generation changes

- Risk: creating Opportunities without durable strategy/prediction/value lineage.
- Why it matters: Opportunity history is Strideo's learning unit.
- Verify before merge: generated Opportunities link to race entries, strategy matches, prediction outputs, value calculations where applicable, score history, and explanations.

### Future wager/recommendation logic

- Risk: bypassing Opportunities or overwriting recommendation history.
- Why it matters: performance and ROI must roll up to Opportunities.
- Verify before merge: recommendations reference Opportunities, corrections append events/results, and user wagers remain separate from system recommendations.

### Future model-training jobs

- Risk: training on unversioned data or losing source-file provenance.
- Why it matters: model improvement depends on auditable datasets.
- Verify before merge: training datasets list source files/features/windows, model versions are immutable, evaluation metrics are append-only, and promotion events are recorded.

### Future production migration application

- Risk: accidental production mutation.
- Why it matters: production work requires explicit current-task authorization.
- Verify before merge/apply: target project and ref are confirmed, dry-run passes, SQL is inspected, and production authorization is explicit.

## Recommended Next Actions

1. Keep PR #60 draft until the project owner is ready to request final review.
2. When ready, mark PR #60 ready; no schema changes are required by this audit.
3. Before applying PR #60 to Dev, rerun `npm run db:migrations:dry-run` from the PR branch and confirm it lists only `20260615183948_racing_form_data_foundation.sql`.
4. After Dev apply is explicitly authorized and completed, rerun dry-run and require "Remote database is up to date."
5. Plan a follow-up ingestion-design PR for idempotency, source lineage, semantic consistency, and partition strategy before large historical imports.

## Validation Results

Commands run during this audit:

- `git status --short --branch`: clean on `codex/progress-database-audit` before writing this report.
- `git pull --ff-only origin main`: `main` already up to date.
- `gh pr list`: PR #60 is the only open PR.
- `gh pr view 60`: PR #60 is draft, clean, and contains one commit.
- `npm run db:migrations:check`: passed on current `main` migration chain.
- `npm run db:migrations:list`: Dev `strideo-dev` / `ntxtakbggtljjbalgris` is aligned with local `main` through `20260615141628`.
- Supabase changelog reviewed: the April 28, 2026 Data API exposure change remains relevant and supports explicit-grant posture.
- `npm run verify`: passed.
- `npm run db:migrations:dry-run`: passed; linked Dev reported "Remote database is up to date."
- `git diff --check`: passed.

No migrations were applied. Production was not touched.
