# Dev-Only Racing-Form Coverage Readiness

Date: 2026-06-28

## Goal

Provide a Dev-only, read-only coverage report for the racing-form source-fact
foundation that future Opportunity and ML work depends on.

This checker reports coverage. It does not ingest provider data, apply feature
snapshots, train models, run scoring, create Opportunities, write wagers, touch
production, or mark production ingestion as complete.

## Execution

Use:

```bash
npm run racing-form:coverage:dev
```

The script refuses production, requires the Strideo Dev Supabase URL
(`ntxtakbggtljjbalgris`), requires server-only service-role configuration for
Dev reads, and requires the linked project marker for `strideo-dev` /
`ntxtakbggtljjbalgris` before any Supabase read.

## Report Scope

The report uses aggregate/count reads and bounded metadata only. It does not
dump full race entries, past performances, workouts, raw payloads, auth data, or
secret state.

Coverage domains:

- race metadata
- race entries
- owner, claim, layoff, and comment context
- past performances
- workouts
- trainer stats, measured as distinct reviewed trainer profile coverage
- value calculation inputs
- glossary and normalization readiness

## Value Calculation Input Semantics Audit

Audit date: 2026-06-30

Layer classification: Layer 2 operational hygiene and data-readiness planning.
This audit is read-only planning. It does not authorize fixtures, writes,
migrations, provider ingestion, scoring, real ML, wagers, or production
Opportunity work.

Materialization update: on 2026-07-01, a separately authorized Dev-only
value-calculation lineage slice inserted 7 `public.value_calculations` rows for
the 7 existing Dev pre-race `feature_snapshots`. That update is documented in
`docs/DEV_ONLY_VALUE_CALCULATIONS_LINEAGE.md`. It did not create model versions,
prediction outputs, Opportunity scores, wagers, provider ingestion, migrations,
or production writes.

Pre-implementation audit finding:

- The repo did not previously define seven named
  `value_calculation_inputs` readiness signals.
- The coverage checker previously computed the `value_calculation_inputs`
  domain from aggregate counts only:
  `valueCalculations / (featureSnapshots > 0 ? featureSnapshots : raceEntries)`.
- The pre-materialization Dev report's `0/7` meant `0` rows in `public.value_calculations`
  over `7` rows in `public.feature_snapshots`.
- The `7` therefore refers to the seven Dev-only feature snapshot rows
  materialized by the PR #89 path, not seven pre-existing value-input
  sub-signals.
- After the 2026-07-01 Dev-only materialization, the domain remains `partial`
  because model-version lineage, prediction-output lineage, calibrated
  `model_probability`, and Opportunity-score linkage are still absent by
  design.

Reconciliation:

The pre-materialization `0/7` value was a readiness-reporting artifact derived
from existing Dev row counts. It was not a schema-defined signal list or a
contract that
seven value signals already exist. The seven rows are the controlled Dev
feature snapshots documented in
`docs/DEV_ONLY_FEATURE_SNAPSHOTS_MATERIALIZATION.md`. Those rows are useful
lineage prerequisites, and the 2026-07-01 Dev-only value rows now prove the
market-input value-calculation bridge for that scoped Dev set. They still do
not prove model-backed probabilities, prediction outputs, Opportunity score
linkage, wagering guidance, or production readiness.

### Implemented Canonical Value Input Readiness Model

The following model is implemented as read-only readiness observability. It
uses bounded count and metadata checks only. It does not apply fixtures, write
rows, add migrations, run provider ingestion, generate prediction outputs,
score Opportunities, create wagers, or touch production.

Each signal reports:

- signal name
- status
- current evidence
- blocker
- source dependencies
- whether the readiness check is implemented
- whether current evidence is sufficient

| Signal | Semantic meaning | Source dependency | Current evidence | Current Dev status | Blocker | Implemented readiness check | Future implementation path |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `feature_snapshot_lineage` | A value calculation can point to the exact pre-race feature payload used at calculation time. | `feature_snapshots`, `value_calculations.feature_snapshot_id` | Seven Dev `feature_snapshots` exist and 7 Dev `value_calculations` reference them. | Ready for the scoped Dev set | None for the Dev-only input-lineage bridge. | Count feature snapshots eligible for value calculation and matching value rows by `feature_snapshot_id`. | Keep this Dev-only until production ingestion and model lineage are separately authorized. |
| `pre_race_leakage_boundary` | Inputs used for value calculation are provably captured before outcome facts. | `feature_snapshots.feature_set_key`, `feature_snapshots.captured_at`, `feature_snapshots.features` | Pre-race builder excludes post-cutoff odds and result/payout/settlement inputs; 7 Dev value rows use those pre-race snapshots. | Ready for the scoped Dev set | None for the Dev-only input-lineage bridge. | Count pre-race feature snapshots and require value rows before the signal can be sufficient. | Extend bounded metadata checks only when broader provider-ingested data exists. |
| `model_version_lineage` | Value output can identify the model or value method version that produced it. | `model_versions`, `value_calculations.model_version_id`, `value_method_key`, `value_method_version` | Schema supports model and method lineage; the ML contract says no fake model rows should be inserted for demo scoring. | Partial | No real model-backed value calculation rows exist. | Count value rows with `model_version_id`; method key/version are required by schema. | Define an approved non-production model-version policy before any prediction or value write path. |
| `prediction_probability_lineage` | Value calculation uses a real prediction output or explicitly records why prediction lineage is unavailable. | `prediction_outputs`, `value_calculations.prediction_output_id`, `model_probability`, `output` | Schema supports prediction lineage and model probability. The value overlay contract requires calibrated win probabilities. | Partial | No real prediction output lineage or calibration evidence is populated. | Count value rows with `prediction_output_id` and valid `model_probability`. | Add calibration contract evidence before any real prediction-output generation. |
| `market_odds_input` | Value calculation uses a measured pre-race market input rather than fabricated odds. | `odds_snapshots`, `race_entries.morning_line_odds`, `value_calculations.odds_snapshot_id`, `market_probability` | The 7 Dev value rows preserve market probability from the pre-race feature snapshot envelope, using explicit morning-line fallback provenance where no odds snapshot applies. | Ready for the scoped Dev set | Production market-close semantics remain out of scope. | Count value rows with valid `market_probability` and either eligible `odds_snapshot_id` lineage or explicit morning-line fallback provenance. | Add broader live-odds and market-close checks when provider-ingested market data is in scope. |
| `append_only_value_fact` | An append-only value fact exists for each eligible feature snapshot/value method input set. | `value_calculations`, unique calculation identity, value output columns | Seven Dev `value_calculations` exist for the seven Dev feature snapshots, and replay skips all 7 existing deterministic identities. | Ready for the scoped Dev set | None for the Dev-only input-lineage bridge. | Count value rows; schema preserves append-oriented calculation identity. | Keep model-backed value facts in a later model/prediction lineage slice. |
| `opportunity_score_lineage` | Opportunity scoring can trace back to the exact value fact that supported it. | `opportunities`, `opportunity_scores.value_calculation_id`, `value_calculations.opportunity_id` | Schema supports value-to-Opportunity and score-to-value linkage; the 7 Dev value rows intentionally keep `opportunity_id` null. | Partial | No linked Opportunity score rows exist, and `opportunity_scores.value_calculation_id` remains empty. | Count value rows with `opportunity_id` and Opportunity score rows with `value_calculation_id`. | Add linkage checks only after a separately authorized score write path exists. |

The domain still includes the historical row-count context for backward
compatibility, but the row-count denominator is context only. The domain is not
ready unless all implemented sub-signals have sufficient evidence.

### Do Not Do Yet

- Do not apply fixtures.
- Do not write to Supabase from the readiness report.
- Do not create, edit, or apply migrations.
- Do not run provider ingestion.
- Do not implement scoring or real ML.
- Do not generate prediction outputs.
- Do not add wager, Bet Sheet, settlement, ROI, Alert, or Assistant behavior.
- Do not create production Opportunities or touch production Supabase.
- Do not mark `value_calculation_inputs` ready from schema existence alone.

Glossary normalization includes canonical racing code sets, canonical values,
source aliases, and reviewed track-code alias coverage. Track-code alias
readiness is measured against reviewed track/provider identity, not raw
`track_code_aliases` row count, so an unrelated alias row cannot clear the
component. The current reviewed demo race-card target is the Strideo Park track
alias for source system `demo` and source track code `SDP`.

The output includes explicit no-write flags:

- `writesPerformed: false`
- `productionTouched: false`
- `providerIngestionRun: false`
- `mlTrainingRun: false`
- `scoringRun: false`

Read failures are classified for planning only. A `permission_or_api_exposure`
classification means the checker could not read the table through the current
Dev API path; it does not apply grants, change RLS, or fix schema exposure.
The prepared service-role read-access migration for model/result lineage tables
must be reviewed and applied to Dev in a separate explicitly authorized task
before those read blockers can clear.

## Boundaries

- Reads only Strideo Dev.
- Does not expose service-role access through app routes, browser code, client
  components, or public UI.
- Does not create, edit, or apply migrations.
- Does not add grants or RLS policies.
- Does not modify Supabase config.
- Does not run provider ingestion.
- Does not run real ML, fake ML, scoring, wagering, settlement, Bet Sheet,
  Alerts, Assistant, ROI, or bankroll work.

## Next Use

Review the Dev report to decide which coverage blockers should be addressed
next. After the Dev-only value-calculation lineage slice, the smallest remaining
blockers are model-version lineage, prediction-output lineage, calibrated
`model_probability`, and later Opportunity-score linkage. Any provider
ingestion, model-readiness, scoring, or production work should remain
separately scoped and explicitly authorized.
