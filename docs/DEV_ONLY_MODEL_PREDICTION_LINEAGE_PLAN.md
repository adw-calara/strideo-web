# Dev-Only Model And Prediction Lineage Plan

Date: 2026-07-03
Updated: 2026-07-22

## Scope

This slice adds a Dev-only dry-run planner/report for `public.model_versions`
and `public.prediction_outputs` lineage after the Dev-only value-calculation
lineage slice.

This document is also the planning home for a future, separately authorized
Dev-only materialization slice. PR #109 subsequently merged the required
insert-only service-role grant migration. The grant prerequisite is complete;
this document still does not authorize Supabase writes, an apply mode, or a
materialization script by itself.

Target:

- Supabase project: `strideo-dev`
- Supabase ref: `ntxtakbggtljjbalgris`
- Tables read by the report:
  - `public.feature_snapshots`
  - `public.value_calculations`
  - `public.model_versions`
  - `public.prediction_outputs`

Out of scope:

- database writes
- new migrations or service-role grant changes
- production access
- provider ingestion
- model training
- fake ML claims
- fake scoring
- `value_calculations` updates
- `opportunity_scores` updates
- wager recommendations
- Bet Sheet, Assistant, Alerts, Stripe, deployment, ROI, settlement, or PWA work
- provider-ingestion writes
- Opportunity generation
- materialization apply mode or script changes

## Implementation

The pure planner lives in
`lib/opportunities/scoring/model-prediction-lineage-core.ts`.

The Dev-only server report path in
`lib/opportunities/scoring/model-prediction-lineage.ts`:

- reads the 7 persisted Dev `opportunity_pre_race` feature snapshots,
- reads existing `value_calculations` linked to those feature snapshots,
- reads any existing matching Dev model-version identity,
- reads any existing matching prediction-output identities,
- proposes one honest non-production model-version row shape,
- proposes prediction-output row shapes tied to the existing feature snapshots,
- links each planned prediction-output row shape to the existing Dev
  `value_calculations` by `feature_snapshot_id`,
- blocks any row shape that lacks pre-race snapshot lineage, market input, or
  matching value-calculation lineage.

The CLI is:

```bash
npm run model-prediction-lineage:plan:dev
```

The command has no apply mode. It performs Supabase reads only, refuses
production, requires the Dev Supabase URL for `ntxtakbggtljjbalgris`, requires
the linked project marker for `strideo-dev`, and requires
`SUPABASE_SERVICE_ROLE_KEY` for the existing server-side read path.

## Dry-Run Evidence To Carry Forward

The successful Dev dry-run reviewed the existing scoped lineage set without
writing rows:

- 7 persisted Dev `opportunity_pre_race` feature snapshots,
- 7 existing Dev `value_calculations` linked to those feature snapshots,
- 1 planned `model_versions` row shape,
- 7 planned `prediction_outputs` row shapes,
- 0 blockers,
- `writesPerformed: false`.

Future planning should prefer this existing dry-run evidence unless a new
read-only report is explicitly needed. Any rerun must remain a confirmed
read-only, non-mutating Supabase report.

## Honest Model-Version Label

The planned model version is a lineage fixture only:

- `model_key`: `market_implied_probability_v1`
- `version`: `dev_lineage_fixture_not_trained_v1`
- `status`: `draft`
- `artifact_uri`: `null`
- `training_data_window`: `null`
- `promoted_at`: `null`
- `retired_at`: `null`

Its parameters explicitly state:

- `devOnly: true`
- `notTrained: true`
- `notProduction: true`
- `scoringAuthorized: false`
- `fixtureKind: baseline/dev lineage fixture`

The planner must not describe this row shape as trained ML, calibrated model
output, production scoring, or wagering guidance.

## Prediction-Output Semantics

Planned prediction outputs are market-derived baseline lineage row shapes only.
Their `probability` is copied from existing feature snapshot market input. It is
not calibrated `model_probability`, not trained ML, and not scoring-authorized.

The planned prediction-output `output` payload records:

- `dryRunOnly: true`
- `productionReady: false`
- `trainedMl: false`
- `calibratedModelProbability: false`
- `scoringAuthorized: false`
- `probabilityMeaning: market-derived baseline lineage only`

## Future Materialization Path

A future materialization slice, if separately authorized, should be the smallest
Dev-only write path that turns the successful dry-run row shapes into lineage
fixtures:

1. Reuse the insert-only service-role grants merged in PR #109; do not add or
   broaden grants.
2. Keep the current dry-run planner as the source of row shapes and replay
   identities.
3. Add a Dev-only apply path only after explicit reauthorization.
4. Refuse production and require `strideo-dev` (`ntxtakbggtljjbalgris`) before
   any write.
5. Insert or skip one deterministic `public.model_versions` identity.
6. Insert or skip deterministic `public.prediction_outputs` identities linked
   to the existing Dev feature snapshots.
7. Read back the model-version row and all seven prediction-output rows directly
   before replay.
8. Verify replay by requiring one existing model-version identity and all seven
   previously materialized prediction identities to report as skipped existing
   rows, with zero planned inserts.

That future slice must stop before linking these fixtures into
`value_calculations`, `opportunity_scores`, scoring, wagering, provider
ingestion, Opportunity generation, or production runtime behavior.

## Narrow Service-Role Grant Status

PR #109 merged migration
`20260704203738_service_role_model_prediction_insert_grants.sql`, containing
only:

```sql
grant insert on table public.model_versions to service_role;
grant insert on table public.prediction_outputs to service_role;
```

The existing read path already expects server-only service-role reads for the
dry-run report. The merged migration adds no `anon` or `authenticated` access,
no browser-facing policies, and no update or delete access.

The insert-only grant is enough for the planned append-only fixture behavior:

- `model_versions` already has deterministic identity plus unique
  `(model_key, version)`.
- `prediction_outputs` already has deterministic identity plus unique
  `(model_version_id, feature_snapshot_id, prediction_type)`.
- Existing rows are detected before insert and treated as replay skips.

If materialization discovers that a different permission is required, the task
must stop and document the blocker rather than broadening grants in the same
slice.

## Deterministic Replay Expectations

Replay safety depends on stable identities from the existing pure planner:

- model-version identity:
  `[model_key, version]`
- prediction-output identity:
  `[model_version_id, feature_snapshot_id, prediction_type]`
- replay strategy:
  `deterministic_identity_skip_existing`

The first authorized apply should insert only missing fixture rows. Subsequent
runs against the same Dev data should skip the existing model-version identity
and all existing prediction-output identities without duplicating rows.

The materialization result should be considered valid only if replay reports:

- the same scoped feature-snapshot count,
- the same linked value-calculation count,
- zero blocked rows,
- zero new planned prediction rows after apply,
- the model-version identity as `skipped_existing`,
- all previously inserted prediction rows as `skipped_existing`,
- no writes to prohibited side-effect targets.

## Lineage Fixture Boundaries

Rows planned here remain lineage fixtures only:

- not trained ML,
- not calibrated `model_probability`,
- not scoring-authorized,
- not production-ready,
- not wagering guidance,
- not provider ingestion,
- not Opportunity generation.

The planned `prediction_outputs.probability` remains a market-derived baseline
lineage value copied from existing pre-race market input. It must not be copied
into `value_calculations.model_probability` or presented as calibrated model
output.

## Fields And Links To Keep Untouched

The future materialization plan must keep these existing fields and links
untouched:

- `value_calculations.model_probability`
- `value_calculations.opportunity_id`
- `opportunity_scores.value_calculation_id`
- `opportunity_scores.model_version_id`
- `opportunity_scores.prediction_output_id`

The seven existing Dev `value_calculations` are append-only market-input lineage
fixtures. They must not be updated by this or a later real-scoring slice. Future
real model-backed value work must insert new value-calculation rows with their
own model, prediction, market, cutoff, and Opportunity lineage.

This planning slice also does not authorize updates to:

- `value_calculations.model_version_id`
- `value_calculations.prediction_output_id`
- any `opportunity_scores` row or linkage

## Readiness Status

Ready for the scoped dry-run:

- planning one non-production model-version identity,
- planning prediction-output row shapes for the existing Dev feature snapshots,
- linking planned prediction-output row shapes back to existing Dev
  `value_calculations`,
- confirming the planner performs no writes.

Ready for a separately authorized Dev-only materialization implementation:

- row shapes are already defined by the dry-run planner,
- the insert-only service-role grant prerequisite is merged,
- deterministic first-run and replay expectations are defined,
- fixture semantics are explicit and non-production,
- existing `value_calculations` remain unchanged.

Still partial by design:

- materialized `model_versions` rows,
- materialized `prediction_outputs` rows,
- new real model-backed value-calculation rows and their model/prediction links,
- Opportunity score linkage,
- real model training, calibration, scoring, and production readiness.

## Fields That Must Remain Null

These fields intentionally remain null on the seven existing Dev
`value_calculations` and must not be backfilled:

- existing `value_calculations.model_version_id`
- existing `value_calculations.prediction_output_id`
- existing `value_calculations.model_probability`
- existing `value_calculations.opportunity_id`
- `opportunity_scores.value_calculation_id`
- `opportunity_scores.model_version_id`
- `opportunity_scores.prediction_output_id`

## Recommended Next Slice

After the repository reliability baseline is green, implement the smallest
Dev-only materialization path using the existing planner and merged grants.

Acceptance criteria:

- against the currently verified empty target set, the first authorized apply
  inserts exactly one model-version identity and seven prediction-output
  identities
- direct readback confirms that model row and all seven prediction rows before
  replay is attempted
- replay reports one skipped existing model identity, seven skipped existing
  prediction identities, zero planned inserts, and zero blockers
- the seven existing `value_calculations` keep their model, prediction,
  probability, Opportunity, and score-lineage fields unchanged
- no `opportunity_scores`, scoring runtime, wagers, provider ingestion,
  Opportunity generation, production access, or launch-readiness claims are
  introduced
