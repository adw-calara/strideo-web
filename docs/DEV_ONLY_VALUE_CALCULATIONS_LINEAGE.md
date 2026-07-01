# Dev-Only Value Calculations Lineage

Date: 2026-07-01

## Scope

This slice materialized Dev-only `public.value_calculations` rows for the 7
existing Dev pre-race `feature_snapshots`.

Target:

- Supabase project: `strideo-dev`
- Supabase ref: `ntxtakbggtljjbalgris`
- Table written in apply mode: `public.value_calculations`

Out of scope:

- production access
- migrations
- provider ingestion
- model training
- `model_versions` writes
- `prediction_outputs` writes
- `opportunity_scores` writes
- fake scoring
- real Opportunity scoring
- wager recommendations
- Bet Sheet, Assistant, Alerts, Stripe, deployment, or PWA work

## Implementation

The materialization path reuses the existing pure value-calculation input
lineage planner in
`lib/opportunities/scoring/value-calculation-input-lineage-core.ts`.

The Dev-only server path in
`lib/opportunities/scoring/value-calculation-input-lineage.ts`:

- reads the 7 persisted Dev `opportunity_pre_race` feature snapshots,
- builds deterministic value-calculation input rows from existing feature
  snapshot market input,
- checks for existing rows by deterministic calculation identity,
- inserts only planned rows into `public.value_calculations` when `--apply` is
  provided,
- verifies inserted rows do not populate model, prediction, probability, or
  Opportunity lineage fields.

The CLI is:

```bash
npm run value-calculations:materialize:dev
npm run value-calculations:materialize:dev -- --apply
```

Dry-run is the default. The script refuses production, requires the Dev
Supabase URL for `ntxtakbggtljjbalgris`, requires the linked project marker for
`strideo-dev`, and requires `SUPABASE_SERVICE_ROLE_KEY` before any apply.

## Dev Apply Result

The controlled Dev apply inserted 7 rows:

- `da40d40d-25e6-4075-8214-e5bf5e1c003c`
- `0134eca0-533a-47a2-b224-2d2d24c31226`
- `30028a25-b8ea-4956-8b98-7cc9ea310fd9`
- `57601104-73fe-4d36-b4c9-5b04d9a91a6c`
- `eb0f3720-0004-4f3e-96d0-b126bc040032`
- `e9a1034b-de70-44b1-b93b-aad7479d3016`
- `ec6b80ca-cde9-4245-b99b-2395eb1480f7`

Replay dry-run after apply reported:

- `featureSnapshotsReviewed: 7`
- `plannedRows: 0`
- `blockedRows: 0`
- `skippedExistingRows: 7`
- `writesPerformed: false`

The Dev racing-form coverage report now shows 7 available
`value_calculations` for the 7 existing Dev feature snapshots.

## Fields That Must Remain Null

These fields intentionally remain null in this slice:

- `value_calculations.model_version_id`
- `value_calculations.prediction_output_id`
- `value_calculations.model_probability`
- `value_calculations.opportunity_id`
- `opportunity_scores.value_calculation_id`

Do not backfill these fields until a separate task explicitly authorizes real
model-version, prediction-output, and Opportunity-score lineage.

## Readiness Status

Ready for the scoped Dev set:

- feature-snapshot-to-value-calculation lineage
- pre-race leakage boundary through existing feature snapshots
- market-input lineage through feature snapshot market provenance
- append-only value fact replay safety

Still partial by design:

- model-version lineage
- prediction-output lineage
- calibrated `model_probability`
- Opportunity score linkage
- production scoring readiness
- wagering guidance readiness

## Recommended Next Slice

Plan the smallest Dev-only model-version and prediction-output lineage slice.
That next slice should still avoid fake ML claims, production writes,
`opportunity_scores` updates, wagers, Bet Sheet, Assistant, Alerts, and launch
readiness claims.
