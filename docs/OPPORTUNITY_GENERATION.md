# Opportunity Generation

This slice adds the first server-only Opportunity generation path for the
`value_overlay_demo` strategy and `demo-value-overlay-v1` scoring version.

The scoring version is a deterministic placeholder for Dev/demo safety. It is
not a real ML model, does not claim predictive quality, and should not be
presented as wagering advice.

## Current Pipeline

The implemented bridge is:

`race facts -> race entry subject -> feature extraction -> placeholder prediction/value output -> strategy match -> Opportunity -> Opportunity subject -> Opportunity score -> Opportunity explanation -> lifecycle event -> future result verification -> future retraining feedback`

The server-only module lives at `lib/opportunities/generation.ts` and separates:

- eligible race and entry loading
- feature extraction
- isolated probability/value scoring
- strategy threshold matching
- Opportunity persistence
- explanation creation
- lifecycle event creation

The scoring seam is `scoreOpportunityCandidate(...)`. A future model-backed
engine should replace that function or adapt behind the same shape, while the
Opportunity persistence path can remain stable.

## Manual Dev Execution

Run manually after confirming the target Supabase project is Strideo Dev
(`strideo-dev`, ref `ntxtakbggtljjbalgris`) and the service-role environment
variables point to Dev:

```bash
npm run opportunities:generate:demo -- --race-date=2026-06-08 --dry-run
```

When the dry-run summary looks correct, run the write path:

```bash
npm run opportunities:generate:demo -- --race-date=2026-06-08
```

Optional filters:

```bash
npm run opportunities:generate:demo -- --race-ids=<race_uuid>,<race_uuid>
npm run opportunities:generate:demo -- --max-races=10
npm run opportunities:generate:demo -- --dry-run
```

The command refuses to run with `NODE_ENV=production`. It is intentionally not a
browser action and does not add a user-facing generate button.

Dry-run mode uses the same Dev race fact loading, feature extraction, scoring,
and strategy threshold checks as write mode. It does not create or update
strategies, strategy versions, Opportunities, subjects, strategy match links,
scores, explanations, lifecycle events, or read-model pointers.

Operational prerequisite: the server-only `service_role` role needs explicit
table privileges for generator reads and writes. Dry-run requires `select` on
race/reference fact tables. Write mode also requires the narrow Opportunity and
strategy write privileges used by `lib/opportunities/persistence.ts`. If dry-run
fails with `permission denied`, add the missing grants through a timestamped
Supabase migration before running generation.

## Idempotency

The Opportunity identity is:

`race_date + race_id + race_entry_id + strategy_id + strategy_version_id + scoring_version`

Odds movement is not part of the Opportunity identity. Latest/opening odds
snapshot identifiers are recorded in the score input payload so reruns with the
same inputs do not duplicate the strategy match or score child records, while
future odds changes can still preserve a new calculation record against the same
Opportunity.

The generator publishes only after the Opportunity has:

- a linked race
- a primary race-entry subject
- a linked strategy match
- current score, confidence, and edge values
- a score child record
- an explanation child record
- a lifecycle event

## Lineage Table Usability

- `model_versions`: Usable schema, but intentionally not written in this slice
  because `demo-value-overlay-v1` is a placeholder scoring version, not a real
  model artifact.
- `feature_snapshots`: Usable schema, but deferred. The same feature payload is
  stored on `strategy_matches.payload` and `opportunity_scores.payload` for now.
- `prediction_outputs`: Usable only with a real `model_versions` row and
  `feature_snapshots` row, so it is deferred to avoid fake ML lineage.
- `strategy_matches`: Used for qualified candidates.
- `opportunity_scores`: Used for append-ready scoring history and current score
  pointers.
- `opportunity_explanations`: Used with safe placeholder language.
- `opportunity_events`: Used for the publish lifecycle event.
- `result_versions`: Not used by this generation slice; it remains available
  for future outcome verification.
- `result_entries`: Not used by this generation slice; it remains available for
  entry-level outcome verification.
- `recommendation_results`: Not used because this slice does not create wager
  recommendations or settlement records.

Future PR: connect a real model-backed scorer by writing `model_versions`,
`feature_snapshots`, and `prediction_outputs`, then linking
`strategy_matches.prediction_output_id` and
`opportunity_scores.prediction_output_id`.

## Current Source-Fact Note

The earlier owner schema gap is closed on current main: the racing-form data
foundation added `owners` plus owner and claim links on `race_entries`, and
`docs/STRIDEO_ML_DATA_CONTRACT.md` treats owner identity as an existing
source-fact foundation with remaining ingestion, dedupe, reconciliation, and
coverage work.

This demo generation slice still predates that owner/source-fact wiring and
must not create duplicate owner schema. Future Opportunity-lineage work should
reuse the existing `owners`, `race_entries` owner fields, `feature_snapshots`,
`prediction_outputs`, `value_calculations`, and `opportunity_scores` lineage
tables instead of introducing parallel identity or scoring paths.
