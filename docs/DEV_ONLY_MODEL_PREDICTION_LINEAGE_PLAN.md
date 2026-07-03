# Dev-Only Model And Prediction Lineage Dry-Run Plan

Date: 2026-07-03

## Scope

This slice adds a Dev-only dry-run planner/report for `public.model_versions`
and `public.prediction_outputs` lineage after the Dev-only value-calculation
lineage slice.

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
- migrations or service-role insert grants
- production access
- provider ingestion
- model training
- fake ML claims
- fake scoring
- `value_calculations` updates
- `opportunity_scores` updates
- wager recommendations
- Bet Sheet, Assistant, Alerts, Stripe, deployment, ROI, settlement, or PWA work

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

## Readiness Status

Ready for the scoped dry-run:

- planning one non-production model-version identity,
- planning prediction-output row shapes for the existing Dev feature snapshots,
- linking planned prediction-output row shapes back to existing Dev
  `value_calculations`,
- confirming the planner performs no writes.

Still partial by design:

- materialized `model_versions` rows,
- materialized `prediction_outputs` rows,
- existing `value_calculations.model_version_id`,
- existing `value_calculations.prediction_output_id`,
- existing `value_calculations.model_probability`,
- Opportunity score linkage,
- real model training, calibration, scoring, and production readiness.

## Fields That Must Remain Null

These fields intentionally remain null or out of scope in this slice:

- existing `value_calculations.model_version_id`
- existing `value_calculations.prediction_output_id`
- existing `value_calculations.model_probability`
- existing `value_calculations.opportunity_id`
- `opportunity_scores.value_calculation_id`
- `opportunity_scores.model_version_id`
- `opportunity_scores.prediction_output_id`

## Recommended Next Slice

Review the dry-run report output and decide whether to authorize a separate
Dev-only materialization slice. A materialization slice would need an explicit
migration for narrow service-role insert grants on `model_versions` and
`prediction_outputs`, plus replay verification. It should still avoid
`opportunity_scores`, scoring, wagers, provider ingestion, production access,
and launch-readiness claims.
