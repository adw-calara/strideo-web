# Value Calculation Input Lineage Readiness Plan

Date: 2026-07-01

Status update: this planning artifact has been followed by the Dev-only
materialization slice documented in
`docs/DEV_ONLY_VALUE_CALCULATIONS_LINEAGE.md`. Keep this file as historical
planning context; use the materialization doc and current Dev coverage report
for the latest value-calculation lineage status.

## Current Baseline

- Repo: `/Users/andrewwhetsel/Documents/Strideo`
- Branch at planning start: `codex/value-calculation-lineage-plan`
- Baseline HEAD: `f8610ef356eba85e3ee30647fe2a85bcdd78c5fe`
- Source branch: current `main`, aligned with `origin/main` before branching
- Supabase Dev target for read-only checks: `strideo-dev` /
  `ntxtakbggtljjbalgris`
- Dev server was already running at `http://localhost:3000`
- Open PR #61, "Add ML data readiness audit", is draft and dirty; this plan
  treats it as stale/background and does not depend on it.

This is a planning artifact only. It creates no migrations, fixtures, provider
ingestion, model training, prediction outputs, Opportunity scores, wagers,
Bet Sheet behavior, Alerts, Assistant features, ROI/settlement logic, or
production access.

## Layer Classification

Primary: Layer 1 - Product Differentiator Readiness.

The work advances the Opportunity loop by defining how future value evidence
can trace from exact pre-race inputs to market probability and later to model,
prediction, value, and Opportunity score lineage.

Secondary: Layer 2 - Production Readiness.

The plan touches model lineage, RLS/grant assumptions, service-role-only paths,
and append-only database facts. Those boundaries must stay explicit before any
future Dev write is authorized.

## Problem Statement

The Dev racing-form coverage report is currently `partial` because
`value_calculation_inputs` is not proven. The current Dev evidence is:

- 2 reviewed races
- 14 reviewed race entries
- 1 reviewed track
- 7 persisted Dev pre-race `feature_snapshots`
- 14 `odds_snapshots`
- 14 entries with `morning_line_odds`
- 0 `model_versions`
- 0 `prediction_outputs`
- 0 `value_calculations`
- 0 `opportunity_scores.value_calculation_id`
- no read errors
- no writes, no production, no provider ingestion, no ML training, no scoring

The `0/7` value-calculation row count means zero `value_calculations` rows
over seven Dev feature snapshots. It does not mean seven value-input signals
already exist.

The first bridge should focus on:

1. `feature_snapshot_lineage`
2. `market_odds_input`

It should not try to clear model-version, prediction-output, calibrated
probability, Opportunity score, wager, settlement, or ROI lineage yet.

## Tables Involved

### `public.feature_snapshots`

Relevant fields:

- `id`
- `race_id`
- `race_date`
- `race_entry_id`
- `provider`
- `feature_set_key`
- `feature_set_version`
- `features`
- `captured_at`
- `source_job_run_id`
- `created_at`

Current Dev-specific materialization uses:

- `feature_set_key = 'opportunity_pre_race'`
- deterministic feature snapshot IDs
- skip-existing replay safety
- JSON `features.snapshot.market` and `features.builderAudit` lineage
- no prediction, score, wager, provider-ingestion, model-training, or
  `value_calculations` writes

### `public.odds_snapshots`

Relevant fields:

- `id`
- `race_date`
- `race_id`
- `race_entry_id`
- `provider`
- `pool_type`
- `odds_fractional`
- `odds_decimal`
- `implied_probability`
- `pool_total`
- `snapshot_at`
- `sequence_number`
- `payload`
- `source_job_run_id`

The first bridge should use only pre-race eligible market input already
selected by the persisted feature snapshot envelope. If `latestOddsSnapshotId`
is present, the future value row can use `odds_snapshot_id`. If the feature
snapshot used a morning-line fallback, `odds_snapshot_id` should stay `null`
and the fallback provenance must be explicit in `output`.

### `public.model_versions`

Relevant fields:

- `id`
- `model_key`
- `version`
- `status`
- `training_data_window`
- `artifact_uri`
- `parameters`
- `metrics`

The table exists, but the current report shows zero rows. Do not insert fake
model versions for this bridge.

### `public.prediction_outputs`

Relevant fields:

- `id`
- `model_version_id`
- `feature_snapshot_id`
- `race_id`
- `race_date`
- `race_entry_id`
- `prediction_type`
- `probability`
- `score`
- `output`
- `predicted_at`
- `source_job_run_id`

The table exists, but the current report shows zero rows. Do not generate
prediction outputs for this bridge.

### `public.value_calculations`

Relevant fields:

- `id`
- `race_id`
- `race_date`
- `race_entry_id`
- `horse_id`
- `opportunity_id`
- `model_version_id`
- `feature_snapshot_id`
- `odds_snapshot_id`
- `prediction_output_id`
- `result_version_id`
- `value_method_key`
- `value_method_version`
- `model_probability`
- `market_probability`
- `fair_odds_decimal`
- `fair_value`
- `edge`
- `expected_value`
- `value_score`
- `stake_basis`
- `output`
- `calculated_at`
- `source_job_run_id`

Existing constraints and indexes already support the first bridge:

- `feature_snapshot_id` is required and references `feature_snapshots(id)`
- `odds_snapshot_id, race_date` references `odds_snapshots(id, race_date)`
- `model_version_id` is nullable
- `prediction_output_id` is nullable
- `opportunity_id, race_date` is nullable and references `opportunities`
- unique nulls-not-distinct identity over `feature_snapshot_id`,
  `odds_snapshot_id`, `prediction_output_id`, `value_method_key`, and
  `value_method_version`
- indexes exist for feature snapshot, odds snapshot, prediction output,
  Opportunity, race entry, model, and result lookup paths

### `public.opportunity_scores`

Relevant fields:

- `id`
- `opportunity_id`
- `race_date`
- `score`
- `confidence`
- `edge`
- `fair_value`
- `model_version_id`
- `prediction_output_id`
- `value_calculation_id`
- `scoring_version`
- `payload`

This plan does not recommend writing `opportunity_scores` in the first bridge.
`opportunity_score_lineage` should remain partial until real value and scoring
lineage are authorized together.

## Current Readiness Gap

The current report implements seven value-input signals:

- `feature_snapshot_lineage`
- `pre_race_leakage_boundary`
- `model_version_lineage`
- `prediction_probability_lineage`
- `market_odds_input`
- `append_only_value_fact`
- `opportunity_score_lineage`

Today all seven are implemented but not evidence-sufficient. The first two
target signals cannot become sufficient through schema existence alone:

- `feature_snapshot_lineage` requires at least one `value_calculations` row
  whose `feature_snapshot_id` points to a real persisted feature snapshot.
- `market_odds_input` requires at least one `value_calculations` row with
  `market_probability` and market provenance through either
  `odds_snapshot_id` or explicit morning-line fallback evidence.

Because current Dev has no model versions and no prediction outputs, the first
bridge must not pretend to clear `model_version_lineage` or
`prediction_probability_lineage`.

## Required Lineage Path

Target end-to-end path, in final form:

1. `feature_snapshots.id`
2. `model_versions.id`
3. `prediction_outputs.id`
4. `odds_snapshots.id` or explicit morning-line market provenance
5. `value_calculations.id`
6. `opportunity_scores.value_calculation_id`

First bridge path only:

1. Existing `feature_snapshots.id`
2. Existing market input embedded in the feature snapshot envelope:
   `features.snapshot.market.latestOddsSnapshotId`,
   `features.snapshot.market.marketImpliedProbability`, and
   `features.snapshot.market.marketProbabilitySource`
3. Future planned `value_calculations.feature_snapshot_id`
4. Future planned `value_calculations.market_probability`
5. Future planned `value_calculations.odds_snapshot_id` when the market source
   is a live odds snapshot
6. Future planned `value_calculations.output.marketInput` for explicit
   provenance, especially when the market source is `morning_line`

Model-version, prediction-output, Opportunity-score, recommendation, wager, and
ROI links remain intentionally out of scope for the first bridge.

## Proposed Minimal Lineage Bridge

The safest first implementation should be a migration-free, no-database-write
dry-run planner for Dev value-calculation input rows.

Recommended module shape:

- Add a server-only core planner, for example
  `lib/opportunities/scoring/value-calculation-input-lineage-core.ts`
- Accept bounded persisted `feature_snapshots` rows and, when needed, joined
  `odds_snapshots`/`race_entries` evidence supplied by a Dev-only wrapper
- Produce deterministic planned `value_calculations` row shapes, but do not
  insert them
- Reject rows unless the feature snapshot is `opportunity_pre_race`
- Reject rows unless market probability is finite and in `[0, 1]`
- Reject rows if the feature snapshot payload says the market source is
  unavailable
- Use `odds_snapshot_id` only when it matches the selected live-odds snapshot
  in the feature snapshot envelope
- Preserve morning-line fallback provenance in `output` when
  `odds_snapshot_id` is `null`
- Keep `model_version_id`, `prediction_output_id`, `model_probability`,
  value scores, fair odds, edge, expected value, Opportunity linkage, and score
  linkage `null` in the planned shape
- Mark the plan as not production-ready and not a scorer

Suggested future planned row shape:

```text
race_id: from feature snapshot
race_date: from feature snapshot
race_entry_id: from feature snapshot
horse_id: from features.snapshot.entry.horseId when present
opportunity_id: null
model_version_id: null
feature_snapshot_id: feature_snapshots.id
odds_snapshot_id: selected live odds snapshot id, or null for morning line
prediction_output_id: null
result_version_id: null
value_method_key: "market_input_lineage_readiness_v1"
value_method_version: "dev_dry_run_v1"
model_probability: null
market_probability: selected market implied probability
fair_odds_decimal: null
fair_value: null
edge: null
expected_value: null
value_score: null
stake_basis: null
output: bounded audit envelope
source_job_run_id: null
```

This plan intentionally does not recommend an immediate Dev fixture/apply PR.
The first implementation PR should prove deterministic row shape, safety flags,
and coverage reporting in dry-run mode. A later explicitly authorized Dev write
slice can decide whether these rows should be inserted into
`value_calculations`.

## No-Write Implementation Recommendation

The first slice should be a separate follow-up implementation PR with a
migration-free test contract update and dry-run planner. It should not be a
database fixture/apply PR yet.

Why:

- Read-only signal reporting already exists on `main`.
- The schema already supports the fields required for the first bridge.
- Writing `value_calculations` rows without a reviewed row contract risks
  making market-input probes look like real value calculations.
- Dry-run row planning can prove the exact shape and guardrails before any
  Dev insert is authorized.
- It keeps model versions, prediction outputs, scoring, Opportunities, wagers,
  and production safely separated.

The dry-run planner can also expose whether the 7 current Dev snapshots are
eligible for a future value-input apply. That is useful even before any write.

## Follow-Up Implementation PR Scope

Recommended next PR:

`codex/value-calculation-input-lineage-dry-run`

Scope:

- Add a pure planner for Dev value-calculation input lineage rows.
- Add tests for feature-snapshot lineage and market-input provenance.
- Add a Dev-only read wrapper or script only if needed, with the same target
  guardrails as existing Dev readiness scripts.
- Output planned/skipped/blocked rows without dumping raw feature payloads.
- Optionally extend the existing coverage report with a dry-run eligibility
  summary, but do not mark `value_calculation_inputs` ready from planned rows.
- Do not insert `value_calculations`.
- Do not create migrations.
- Do not create `model_versions` or `prediction_outputs`.
- Do not write `opportunity_scores`.

Recommended later PR, only after explicit authorization:

- Add a Dev-only apply path for the reviewed deterministic
  `value_calculations` row shape, if the dry-run plan proves eligible rows and
  the team accepts that market-input lineage probe rows belong in
  `value_calculations`.

## Test Plan

Minimum tests for the dry-run implementation PR:

- Builds deterministic planned `value_calculations` row shapes from existing
  `opportunity_pre_race` feature snapshot envelopes.
- Blocks feature snapshots that are not `opportunity_pre_race`.
- Blocks missing or invalid `market_probability`.
- Uses `odds_snapshot_id` only for live-odds-backed market input.
- Preserves morning-line fallback provenance in `output` when
  `odds_snapshot_id` is null.
- Keeps `model_version_id`, `prediction_output_id`, `model_probability`,
  `opportunity_id`, and score/value fields null for this first bridge.
- Rejects any planned side effect target outside `value_calculations`.
- Proves the planner produces no writes.
- Keeps `value_calculation_inputs` partial until actual persisted rows exist.
- Confirms provider-ingestion adapters still forbid `value_calculations`,
  `prediction_outputs`, and `feature_snapshots` writes.

Targeted existing tests to extend or mirror:

- `lib/racing-form/coverage-readiness-core.test.ts`
- `lib/opportunities/scoring/contracts.test.ts`
- `lib/opportunities/scoring/pre-race-snapshot-materialization-core.test.ts`
- `lib/ml/data-contract/readiness-check.test.ts`
- provider-ingestion forbidden-target tests

Validation for the implementation PR:

```bash
npm run db:migrations:check
npm run db:migrations:dry-run
npm run lint
npm run test
npm run build
npm audit --audit-level=moderate
```

`npm run verify` can cover everything except the linked database dry-run.

## Grants, RLS, Constraints, And Indexes

Current posture is sufficient for planning and dry-run reads:

- RLS is enabled on `feature_snapshots`, `model_versions`,
  `prediction_outputs`, `value_calculations`, `opportunity_scores`, and
  `odds_snapshots`.
- `feature_snapshots` has service-role `select, insert` only.
- `value_calculations` has service-role `select, insert`.
- `model_versions`, `prediction_outputs`, `result_versions`, and
  `result_entries` have service-role `select` for Dev coverage.
- `odds_snapshots` has service-role `select` through the Opportunity generator
  grant path.
- `opportunity_scores` has service-role `select, insert`, but this first
  bridge must not use it.
- No anon/browser write path is needed or recommended.
- Authenticated `opportunity_scores` read access intentionally omits internal
  model/prediction/value lineage columns.

No migration is required for the dry-run planner.

Potential later concerns before any apply path:

- Decide whether a market-input-only readiness probe belongs in
  `value_calculations`.
- Decide whether the future apply path should use deterministic IDs plus
  skip-existing behavior, mirroring feature snapshot materialization, or rely
  only on the existing unique nulls-not-distinct identity.
- Keep `value_calculations` service-role insert narrow; do not add browser,
  anon, authenticated, update, or delete grants.
- Do not broaden `opportunity_scores` grants or policies in this slice.

## Out Of Scope

- Dev writes
- Migrations
- Fixtures
- Provider ingestion
- ML training
- Prediction output generation
- Model-version insertion
- Scoring runtime
- Opportunity generation
- `opportunity_scores` writes
- Wagers, Bet Sheet, Alerts, Assistant, ROI, settlement, or bankroll work
- Production Supabase
- PR #61 changes
- UI work
- Roadmap or progress dashboard updates

## Validation Performed

Commands run during this planning task:

```bash
git status --short --branch
git rev-parse HEAD
git log --oneline -n 5
npm run racing-form:coverage:dev -- --json
```

The coverage command performed Strideo Dev reads only and reported:

- status `partial`
- no read errors
- `writesPerformed: false`
- `productionTouched: false`
- `providerIngestionRun: false`
- `mlTrainingRun: false`
- `scoringRun: false`

No Supabase writes, migrations, fixtures, provider ingestion, ML training,
scoring, wagers, deployment, production access, or PR #61 changes were
performed while creating this plan.
