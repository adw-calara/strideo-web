# Progress Database Audit

Audit date: 2026-06-16

## Executive Summary

Result: Strideo's repo, database schema direction, migration chain, RLS posture, ML/value lineage, racing-form data foundation, glossary/normalization layer, unresolved-code workflow, and Opportunity-centered architecture are healthy enough to proceed with review of PR #63. No schema blocker was found in PR #60 or PR #63.

Important workflow finding: the task described PR #60 as open/pending, but current GitHub/local evidence shows PR #60 is already merged into `main` via merge commit `7d3b9373`. This audit did not merge PR #60, did not merge PR #63, did not mark PR #63 ready, and did not apply migrations.

The strongest technical finding is positive: the current design preserves the core Strideo loop:

historical source data -> source shorthand normalization -> feature snapshot -> model version -> prediction output -> value calculation -> Opportunity -> wager/recommendation -> final result -> post-race evaluation -> model improvement.

The main watchlist items are operational follow-ups, not blockers:

- PR #63 should remain draft until the owner is ready to review and merge the glossary foundation.
- Future seed data for glossary/track aliases must be source-reviewed and kept separate from schema work.
- Future ingestion must preserve raw source values, use glossary aliases before feature materialization, and upsert unresolved codes idempotently.
- Broad browser read grants must not be added for source-fact, glossary, unresolved-code, model, or operational tables without a specific reviewed product surface.
- High-volume history tables will eventually need partitioning/archival strategy beyond default partitions.

## Current Repo And PR Status

- Audit branch: `codex/progress-database-audit`
- Current branch when writing report: `codex/progress-database-audit`
- Latest local `main`: `6ccfb7ef5e18b114c7859573a5b2070b49d1d5a9`
- Latest `origin/main`: `6ccfb7ef5e18b114c7859573a5b2070b49d1d5a9`
- Local `main` is up to date with `origin/main`.
- Working tree before report rewrite: clean except this audit report on the audit branch.
- Open relevant PRs:
  - PR #63, `Add racing-form glossary reference foundation`, draft, branch `codex/racing-form-glossary-audit`, merge state `CLEAN`.
  - PR #61, `Add ML data readiness audit`, draft; related to ML audit posture but not part of this requested database foundation sequence.
- PR #60, `Add racing-form data foundation`, branch `codex/racing-form-data-foundation`, is already `MERGED` according to `gh pr view 60`.
- PR #60 branch is an ancestor of current `main`; `main` is ahead of the PR #60 branch by three commits.
- PR #63 is based cleanly on latest `main`; `git rev-list --left-right --count main...origin/codex/racing-form-glossary-audit` reports `0 2`.
- PR #63 no longer needs to wait for PR #60 to merge because PR #60 is already in `main`. It can remain draft until final schema-review/owner approval.
- No uncommitted unrelated progress files were present. Two old local stashes exist, but they are not in the working tree and cannot contaminate the database PRs unless manually applied.

## Migration History And Sequencing Audit

Current final migration on `main`:

- `20260615183948_racing_form_data_foundation.sql`

PR #60 migration:

- `20260615183948_racing_form_data_foundation.sql`

PR #63 migrations:

- `20260616104649_racing_form_glossary_reference_tables.sql`
- `20260616110309_racing_form_unresolved_source_codes.sql`

Findings:

- All current local migration filenames use the documented `YYYYMMDDHHMMSS_snake_case_name.sql` pattern.
- The migration convention is documented in `AGENTS.md` and enforced by `scripts/check-supabase-migrations.mjs`.
- PR #60 is already merged into `main` and fits after `20260615141628_opportunity_tracking_watchlist_grants.sql`.
- PR #63 appends two later timestamp migrations after PR #60 and does not modify migration history.
- No duplicate timestamp versions or conflicting migration filenames were found in the current local chain.
- Expected order is:
  1. `20260615183948_racing_form_data_foundation.sql`
  2. `20260616104649_racing_form_glossary_reference_tables.sql`
  3. `20260616110309_racing_form_unresolved_source_codes.sql`
- PR #63 does not need renaming. It should stay draft until review, but not because of PR #60 sequencing.

## Database Domain Map

| Domain | Existing tables | Type | Key relationships | Audit finding |
| --- | --- | --- | --- | --- |
| auth/profile/roles | `profiles`, `subscriptions`, `entitlements`, `profile_roles`, `user_devices` | user workflow/reference | user ids reference `auth.users`; own-row RLS | Strong foundation; subscription automation still future. |
| tracks | `tracks`, PR #63 `track_code_aliases` | canonical reference + alias reference | races and aliases link to `tracks.id` | Strong canonical track model; all-U.S. alias seed data remains separate. |
| races | `races`, `races_default` | transaction/source fact | race-date composite FKs from entries, odds, results, opportunities | Strong; PR #60 adds race conditions/class/wager context. |
| race entries | `race_entries`, `entry_events`, `race_entries_default` | transaction/source fact + event history | entries link race, horse, trainer, jockey, PR #60 owner fields | Strong; owner/claim context now covered. |
| horses | `horses`, `horse_features`, PR #60 `horse_past_performances`, `horse_workouts` | canonical reference + source facts + derived features | source facts derive feature inputs by horse/date | Stronger after PR #60; pedigree remains deferred. |
| owners | PR #60 `owners` | canonical provider-aware reference | race entries and trainer stats link owners | Adequate first owner foundation; full ownership history is follow-up. |
| trainers | `trainers`, `trainer_features`, PR #60 `trainer_performance_stats` | canonical reference + source/derived facts | trainer stats link trainer/track/jockey/owner/context | Strong racing-form support; source-specific stat semantics need glossary/seed discipline. |
| jockeys | `jockeys`, `jockey_features` | canonical reference + derived features | entries and trainer stats link jockeys | Adequate; deeper jockey form stats can be added later. |
| odds snapshots | `odds_snapshots`, `odds_snapshots_default`, `odds_features` | append-only market facts + derived features | value calculations and prediction/value lineage can reference odds snapshots | Strong append-only posture; partition automation remains follow-up. |
| race results | `result_versions`, `result_entries`, `recommendation_results` | append-only result facts/evaluation | results link races/entries; value calculations can link result versions | Strong correction/versioning model. |
| import/data-ingestion | `raw_archive_objects`, `data_ingestion_batches`, `source_data_files`, `job_runs`, `agent_logs`, `event_log` | operational lineage/audit | PR #60 source facts and PR #63 unresolved queue can link source files, batches, jobs | Strong enough for auditable ingestion. |
| Opportunities | `opportunities`, `opportunity_subjects`, `opportunity_strategy_matches`, `opportunity_scores`, `opportunity_explanations`, `opportunity_events`, `opportunity_visibility_events` | central product aggregate + history | scores/explanations/subjects link back to Opportunity; PR #60 adds `value_calculation_id` | Strong and still central. |
| wager/recommendation | `wager_templates`, `wager_recommendations`, `wager_recommendation_events`, `wager_recommendation_legs`, `wager_recommendation_leg_entries`, bet sheet tables, user-recorded wager tables | recommendation/user workflow | recommendations and bet-sheet entries link Opportunities | Strong enough for MVP; wager logic still future. |
| model versions | `model_versions`, `model_training_runs`, `model_evaluation_runs`, `model_promotions`, `model_training_datasets`, `model_evaluation_metrics` | ML lineage/ops | prediction and value rows link model versions | Strong model versioning foundation. |
| prediction outputs | `prediction_outputs`, `prediction_runs`, `prediction_results`, `live_prediction_cache` | ML output history/cache | feature snapshots/model versions feed predictions; value calculations can link prediction output | Some duplicate-era naming exists, but not a blocker if contracts clarify usage. |
| feature snapshots | `feature_snapshots`, `strategy_feature_snapshots`, entity feature tables | derived feature history | model/prediction/value lineage references snapshots | Strong enough; future ingestion must preserve normalized and raw source inputs. |
| value calculations | PR #60 `value_calculations` | derived append-only value lineage | links race, entry, horse, Opportunity, model version, feature snapshot, odds snapshot, prediction output, result version | Strong and directly improves PRD alignment. |
| racing shorthand/code sets | PR #63 `racing_code_sets`, `racing_code_values`, `racing_code_aliases` | reference/normalization | aliases map source codes to canonical values by code set/source/effective dates | Strong foundation; seed data intentionally deferred. |
| track code aliases | PR #63 `track_code_aliases` | reference/normalization | source track codes map to canonical tracks | Strong foundation; U.S. coverage is a seed/review task. |
| unresolved source code queue | PR #63 `racing_unresolved_source_codes` | unresolved queue/operational | links code set, source context, job run, race, optional Opportunity, resolution aliases | Strong workflow foundation. |
| audit/lineage/history | `event_log`, `agent_logs`, job/model/performance/event tables | append-only audit/lineage | jobs and generated outputs can be reconstructed | Strong; future jobs must consistently populate links. |

Duplicate concept watchlist: older `prediction_outputs` and newer `prediction_results`/`live_prediction_cache` overlap conceptually. This is not a blocker, but future ML data contracts should specify which table feeds value calculations and which exists for compatibility/cache.

## Racing-Form Data Foundation Audit

| Area | Status | Finding |
| --- | --- | --- |
| race-level context | Fully supported | PR #60 adds claiming price, class, age/sex/weight restrictions, field size, weather, track condition, wager types, and condition payload. |
| horse-level context | Fully supported | Past performances, workouts, entry comments, physical notes, trip notes, and layoff days are represented. |
| owner/trainer/jockey relationships | Fully supported | Owners are added; entries link owner/claimed owners; trainer stats can scope to jockey/owner/track/surface/context. |
| claims/transfers | Partially supported | Entry-level claimed-from/claimed-by is present; full ownership/share history is deferred. Safe follow-up. |
| layoff indicators | Fully supported | `race_entries.layoff_days` and workout layoff sequence fields support this. |
| horse past performances | Fully supported | `horse_past_performances` preserves normalized fields, raw payload, source file/batch/job, and current-entry observation context. |
| horse workouts/training numbers | Fully supported | `horse_workouts` captures workout facts, ranks, flags, raw payload, and ingestion lineage. |
| trainer performance stats | Fully supported | `trainer_performance_stats` captures context windows and metrics with source lineage. |
| odds snapshots | Fully supported | Existing append-only odds snapshots plus PR #60 value links cover market context. |
| result linkage | Fully supported | `value_calculations.result_version_id` links post-race evaluation to official result versions. |
| value calculations | Fully supported | PR #60 adds append-only value lineage and links it to `opportunity_scores`. |
| ML feature snapshot linkage | Fully supported | `value_calculations.feature_snapshot_id` is required. |

No missing racing-form area should block PR #63. PR #60 is already merged, and no post-merge blocker was found.

## Glossary And Normalization Audit

PR #63 supports the needed foundation for:

- racing-form shorthand normalization through `racing_code_sets` and `racing_code_values`
- source-specific aliases through `racing_code_aliases`
- track-code alias strategy through `track_code_aliases`
- race/class, surface/condition, workout, medication, equipment, horse color/sex, finish/running-line, odds/wager/result, and vendor-specific code categories through generic code sets
- effective-date handling through `effective_from`, `effective_to`, and active/current uniqueness
- source attribution through source system/code/label/description/url/notes
- ML canonical mapping through `normalized_value`
- raw source preservation by design: fact tables keep raw payload/source fields while aliases resolve canonical meaning

Seed data should remain a separate reviewed task. The schema is intentionally seedless, which is the right merge boundary because source-specific code meanings need citation and review.

## Unresolved-Code Workflow Audit

`racing_unresolved_source_codes` supports:

- preserving raw source/vendor values with `source_system`, `source_field`, `source_code`, label/description, context, and sample payload
- context for where the unresolved value appeared through source field, sample table/id, race/date, source context, and source URL
- optional `job_runs` linkage through `source_job_run_id`
- optional Opportunity linkage through `opportunity_id` plus race-date FK
- effective-date resolution through `effective_on`
- service-role-only management with RLS enabled and no anon/authenticated grants
- status workflow: `open`, `reviewing`, `mapped`, `ignored`, `deferred`
- reviewer notes and source URLs
- idempotent queue behavior through the active queue unique index on source system, code set, source field, source code, and effective date

Gaps and classification:

- Safe follow-up: ingestion needs an upsert helper that increments `occurrence_count`, updates `last_seen_at`, and preserves first sample payload.
- Safe follow-up: admin/review UI or scheduled weekly review job is not built.
- Safe follow-up: mapped rows should be reconciled to newly created aliases and then excluded from future unresolved training inputs.
- Watchlist: `sample_source_table`/`sample_source_id` are flexible rather than enforced by polymorphic FK. This is acceptable for an operational queue but should be validated by ingestion code.

No unresolved-code gap blocks PR #63.

## ML And Value Lineage Audit

The database can support the full Strideo core loop:

1. Historical source data: races, entries, odds, results, raw archive objects, source files, PR #60 source facts.
2. Source shorthand normalization: PR #63 code sets, aliases, track aliases, unresolved-code queue.
3. Feature snapshot: `feature_snapshots` and entity feature tables.
4. Model version: `model_versions`, training/evaluation/promotions.
5. Prediction output: `prediction_outputs`, `prediction_runs`, `prediction_results`.
6. Value calculation: PR #60 `value_calculations`.
7. Opportunity: central Opportunity tables with score/explanation linkage.
8. Wager/recommendation: recommendation and bet-sheet tables link to Opportunities.
9. Final result: result versions/entries and recommendation results.
10. Post-race evaluation/model improvement: performance runs and rollups.

Critical now: none found.

Safe follow-ups:

- Define a formal ML contract that chooses between `prediction_outputs` and `prediction_results` for production value calculation inputs.
- Require ingestion/feature jobs to store both raw source values and canonical glossary ids/values.
- Add policy tests before exposing any model/value/source fact rows to browsers.

Watchlist:

- Prior model decisions are reconstructable only if future jobs consistently populate model version, feature snapshot, odds snapshot, prediction output, value calculation, Opportunity, recommendation, and result links.
- Append-only value history is strong, but mutable columns on some workflow tables still require event discipline from application code.

## RLS And Security Audit

Findings:

- Current public application tables and default partitions have RLS enabled in migrations.
- PR #60 enables RLS on `owners`, `horse_past_performances`, `horse_workouts`, `trainer_performance_stats`, and `value_calculations`.
- PR #63 enables RLS on `racing_code_sets`, `racing_code_values`, `racing_code_aliases`, `track_code_aliases`, and `racing_unresolved_source_codes`.
- PR #60 and PR #63 intentionally add no anon grants and no authenticated/browser-facing policies.
- PR #60 grants service role:
  - `select, insert, update` on `owners`
  - `select, insert` on source-fact/value tables
- PR #63 grants service role `select, insert, update` on glossary and unresolved-code tables.
- Broad authenticated read exists for race-card reference/fact tables via `using (true)` policies: surfaces, tracks, horses, jockeys, trainers, races, race entries, entry events, odds snapshots, result versions, result entries.
- Published Opportunity read access exists for selected Opportunity fields and related subjects/scores/explanations.
- User-owned workflow tables use own-row RLS policies.
- Import status broad read was later revoked; `data_ingestion_batches` is service-role read only after hardening.
- No risky new browser exposure was found in PR #60 or PR #63.

Recommendations before any future exposure:

- Keep source-fact, glossary, unresolved-code, model, prediction, and value tables service-role only until an explicit UI/API access plan exists.
- Add automated policy/grant checks before future PRs broaden authenticated reads.
- Avoid `using (true)` for model/value/ops tables unless the product intentionally makes those rows public to authenticated users.

## Scalability And Performance Audit

Strengths:

- Race, entry, odds, Opportunity, recommendation-result, agent-log, and event-log high-volume tables have partition/default-partition posture.
- PR #60 adds indexes for horse/date, observed-entry, workout horse/date, trainer/date/context, value by feature/odds/prediction/Opportunity/race-entry/model/result.
- PR #63 adds lookup indexes for code alias resolution and unresolved review queues.
- Unique indexes support provider idempotency on past performances/workouts when provider ids exist.
- Unresolved-code unique active queue index avoids duplicate open/reviewing/deferred values.

Scaling risks:

- Default partitions are a safety net, not a long-term partition management strategy.
- Horse lifetime histories, odds snapshots, workouts, and value calculations will grow quickly once all U.S. tracks and multiple years are ingested.
- Alias lookup indexes are adequate for initial ingestion, but future effective-date resolution may need source/code/date-specific query testing.
- Result correction/versioning is modeled, but operational jobs must avoid overwriting evaluation history.

Near-term hardening recommendations:

- Add partition creation/retention automation before high-volume ingestion.
- Add ingestion query benchmarks for track/date, horse/date, entry, odds snapshot, value calculation, alias lookup, and unresolved queue paths.
- Add schema-level or application-level contract tests for idempotent source fact and unresolved-code ingestion.

## PRD And Opportunity Alignment Audit

Strideo remains aligned with the PRD:

- It is still AI-powered wagering intelligence, not a generic race-card viewer.
- Opportunity remains the central object.
- PR #60 strengthens value-focused lineage through `value_calculations` and `opportunity_scores.value_calculation_id`.
- PR #63 strengthens explainability and ML hygiene by decoding source shorthand instead of letting raw racing-form tokens become accidental model categories.
- Results, recommendation outcomes, and performance rollups preserve the continuous-improvement loop.

No drift was found toward standalone picks, disconnected model outputs, unnormalized racing-form text, or workflows outside Opportunity.

## PR #60 Readiness Assessment

Status: already merged before this audit.

Assessment:

- No schema, RLS, migration-order, or product-architecture blocker was found.
- PR #60 should not be renamed or rewritten.
- Because it is already merged, there is no action to mark it ready or merge it now.
- If Dev has not yet applied the merged migration, apply only after explicit authorization and normal dry-run checks.

## PR #63 Readiness Assessment

Status: open draft, clean against current `main`.

Assessment:

- Safe to keep draft while final review happens.
- No blocker was found that requires schema changes before merge.
- It no longer needs to wait for PR #60 merge, because PR #60 is already on `main`.
- It should not include seed data in this PR. Seed data should be a separate reviewed PR with source citations.
- Before marking ready, rerun validation on the PR branch and confirm dry-run shows only the two PR #63 migrations as pending if Dev has PR #60 applied, or the expected pending sequence if Dev still lacks PR #60.

## High-Risk PR Watchlist

| Item | Risk | Why it matters | Verify before merge/apply |
| --- | --- | --- | --- |
| PR #60 merge/application | Already merged; Dev application may still be pending | Local `main` can outrun Dev migration history | Confirm target, dry-run expected pending set, no production action without authorization. |
| PR #63 merge/application | Adds reference/ops tables | Bad grants or ordering would affect ingestion normalization | Confirm clean on latest `main`, RLS enabled, no anon/auth grants, dry-run order. |
| future glossary seed data | Incorrect mapping corrupts ML features | Shorthand can vary by vendor/context/date | Require source citations, effective dates, confidence, review. |
| unresolved-code review workflow | Unknown codes could leak into features | Prevents silent model contamination | Upsert queue, block unknown canonicalization, weekly review cadence. |
| ingestion into PR #60 tables | Source facts must stay reconstructable | Lost raw payload breaks audit/backtesting | Preserve raw payload, source file, batch, job, provider ids. |
| feature/prediction/value linkage | Broken lineage undermines learning | Cannot evaluate old decisions | Require feature snapshot, model version, odds snapshot, prediction/value links. |
| broad read grants | Sensitive ops/model tables could leak | Supabase Data API exposure depends on grants and RLS | Review grants/policies field-by-field. |
| racing-form UI | Could expose raw/internal shorthand | Users need explanations, not ops metadata | Use canonical labels and Opportunity evidence. |
| Opportunity generation changes | Could create disconnected picks | Product rule requires Opportunity center | Require links from strategy, score, explanation, value, wager. |
| wager/recommendation logic | Bad settlement breaks ROI learning | Performance loop depends on recommendations/results | Preserve recommendation events and result links. |
| model-training jobs | Training on unresolved codes causes drift | Unknown categories create false signals | Reject/queue unresolved values before feature materialization. |
| production migration application | Irreversible operational risk | Production authorization is explicit-only | Confirm project/ref, dry-run, SQL review, rollback/forward plan. |

## Recommended Next Actions

1. Treat PR #60 as already merged and update project tracking language accordingly.
2. Keep PR #63 draft until owner review, then mark ready only when explicitly instructed.
3. Do not add glossary seed data to PR #63.
4. Add an ingestion contract for raw value preservation, alias lookup, unresolved-code upsert, and feature blocking when codes are unknown.
5. Add future tests/checks for browser grants before exposing any source-fact, glossary, unresolved-code, ML, or value tables.
6. Before any Dev apply, confirm target project `strideo-dev` / `ntxtakbggtljjbalgris` and rerun dry-run from the branch being applied.

## Validation Results

- `npm run verify`: passed.
  - Includes migration filename check, lint, tests, build, and `npm audit --audit-level=moderate`.
  - Test result: 8 passed, 0 failed.
  - Audit result: 0 vulnerabilities.
- `npm run db:migrations:check`: passed for 25 local migration files.
- `npm run db:migrations:dry-run`: passed and did not apply migrations.
  - Dev dry-run output from the audit branch reported one pending migration: `20260615183948_racing_form_data_foundation.sql`.
  - This means current Dev is behind local `main` by PR #60's merged migration.
  - A second read-only dry-run from `codex/racing-form-glossary-audit` confirmed the full expected pending sequence:
    1. `20260615183948_racing_form_data_foundation.sql`
    2. `20260616104649_racing_form_glossary_reference_tables.sql`
    3. `20260616110309_racing_form_unresolved_source_codes.sql`
- `git diff --check`: passed.

No migrations were applied as part of this audit. Production was not touched.
