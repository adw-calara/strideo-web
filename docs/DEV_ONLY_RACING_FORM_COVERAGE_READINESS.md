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

Current-state finding:

- The repo does not currently define seven named
  `value_calculation_inputs` readiness signals.
- The current coverage checker computes the `value_calculation_inputs` domain
  from aggregate counts only:
  `valueCalculations / (featureSnapshots > 0 ? featureSnapshots : raceEntries)`.
- The current Dev report's `0/7` means `0` rows in `public.value_calculations`
  over `7` rows in `public.feature_snapshots`.
- The `7` therefore refers to the seven Dev-only feature snapshot rows
  materialized by the PR #89 path, not seven implemented value-input
  sub-signals.
- The current domain remains `partial`; it must not be marked ready until real
  value-calculation lineage exists.

Reconciliation:

The `0/7` value is a readiness-reporting artifact derived from existing Dev
row counts. It is not a schema-defined signal list and not a contract that
seven value signals already exist. The seven rows are the controlled Dev
feature snapshots documented in
`docs/DEV_ONLY_FEATURE_SNAPSHOTS_MATERIALIZATION.md`. Those rows are useful
lineage prerequisites, but they do not prove model-backed probabilities, market
semantics, value calculations, Opportunity score linkage, or production
readiness.

### Proposed Canonical Value Input Readiness Model

The following model is proposed, not implemented. It should be used to scope a
future read-only checker enhancement before any fixture, write, migration,
provider-ingestion, prediction, scoring, wager, or production work.

| Proposed signal | Semantic meaning | Source dependency | Current evidence | Current status | Blocker | Future readiness check | Future implementation path |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `feature_snapshot_lineage` | A value calculation can point to the exact pre-race feature payload used at calculation time. | `feature_snapshots`, `value_calculations.feature_snapshot_id` | Seven Dev `feature_snapshots` exist; `value_calculations.feature_snapshot_id` is required by schema. | Partial | No value calculation rows reference those snapshots. | Count feature snapshots eligible for value calculation and matching value rows by `feature_snapshot_id`. | Add read-only join coverage from feature snapshots to value calculations after real value rows exist. |
| `pre_race_leakage_boundary` | Inputs used for value calculation are provably captured before outcome facts. | `feature_snapshots.captured_at`, pre-race builder audit payload, race scheduled/cutoff fields, result tables for exclusion checks | Pre-race builder excludes post-cutoff odds and result/payout/settlement inputs; broader persisted read checks are not wired. | Partial | Current report only counts rows; it does not inspect persisted snapshot leakage metadata. | Verify persisted feature snapshot payloads include pre-race audit evidence and no result-derived input in the feature envelope. | Extend the read-only report to inspect bounded metadata from feature snapshot envelopes without dumping raw payloads. |
| `model_version_lineage` | Value output can identify the model or value method version that produced it. | `model_versions`, `value_calculations.model_version_id`, `value_method_key`, `value_method_version` | Schema supports model and method lineage; the ML contract says no fake model rows should be inserted for demo scoring. | Missing for value readiness | No real model-backed value calculation rows exist. | Count value rows with a real model/method version and reject demo/fake scoring rows. | Define an approved non-production model-version policy before any prediction or value write path. |
| `prediction_probability_lineage` | Value calculation uses a real prediction output or explicitly records why prediction lineage is unavailable. | `prediction_outputs`, `value_calculations.prediction_output_id`, `model_probability`, `output` | Schema supports prediction lineage and model probability. The value overlay contract requires calibrated win probabilities. | Missing | No real prediction output lineage or calibration evidence is populated. | Count value rows with `prediction_output_id` and valid `model_probability`, plus contract evidence for calibration readiness. | Implement a read-only contract check before any real prediction-output generation. |
| `market_odds_input` | Value calculation uses a measured pre-race market input rather than fabricated odds. | `odds_snapshots`, `race_entries.morning_line_odds`, `value_calculations.odds_snapshot_id`, `market_probability` | The pre-race snapshot builder can use eligible live odds or morning line; `odds_snapshot_id` is optional in value rows. | Partial | Final/closing odds semantics and production market-close rules are not formalized. | Count value rows with valid `market_probability` and either eligible `odds_snapshot_id` lineage or explicit morning-line fallback provenance. | Add read-only distinction between live-odds-backed and morning-line-backed value inputs. |
| `append_only_value_fact` | An append-only value fact exists for each eligible feature snapshot/value method input set. | `value_calculations`, unique calculation identity, value output columns | `value_calculations` exists with append-oriented uniqueness and value fields. | Missing | Dev currently has zero value calculation rows. | Count value rows by feature snapshot, odds snapshot, prediction output, method key, and method version; report duplicates or gaps. | Implement only after real model-backed value rows are authorized in a separate write slice. |
| `opportunity_score_lineage` | Opportunity scoring can trace back to the exact value fact that supported it. | `opportunities`, `opportunity_scores.value_calculation_id`, `value_calculations.opportunity_id` | Schema supports value-to-Opportunity and score-to-value linkage. | Missing | No value calculations or linked Opportunity score rows exist. | Count Opportunity scores with valid `value_calculation_id` and matching composite Opportunity/race-date lineage. | Add read-only linkage checks after the first approved value and score write path exists. |

### Do Not Do Yet

- Do not apply fixtures.
- Do not write to Supabase.
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
next. Any provider-ingestion, materialization, or model-readiness work should
remain separately scoped and explicitly authorized.
