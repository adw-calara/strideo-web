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
- trainer stats
- value calculation inputs
- glossary and normalization readiness

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
