# Dev-Only Feature Snapshots Materialization

Date: 2026-06-27

## Goal

Implement Dev-only materialization for audited pre-race
`feature_snapshots` using the existing `public.feature_snapshots` table.

This is a Dev execution capability, not production rollout, real ML training,
prediction output generation, Opportunity scoring, provider ingestion, wager
settlement, Bet Sheet work, Alerts, Assistant work, or ROI attribution.

## Replay Safety

The existing table has no `source_hash` uniqueness constraint, so this slice
uses deterministic feature snapshot IDs plus skip-existing logic.

- The deterministic ID is derived from snapshot type, feature-set key/version,
  race identity, race-entry identity, captured time, source lineage, selected
  odds snapshot, and cutoff.
- Dry-run reads existing deterministic IDs and reports rows as
  `skipped_existing`.
- Apply mode inserts only planned rows whose deterministic IDs do not already
  exist.
- No upsert is used and no migration is created.

This keeps the table append-oriented while making repeated Dev runs safe for
the same source facts.

## Execution

Use:

```bash
npm run feature-snapshots:materialize:dev
```

Optional filters:

```bash
npm run feature-snapshots:materialize:dev -- --race-date 2026-06-22
npm run feature-snapshots:materialize:dev -- --race-id <race-id>
npm run feature-snapshots:materialize:dev -- --limit 10
```

Dry-run is the default and performs Supabase reads only.

Apply mode exists but must be explicitly requested:

```bash
npm run feature-snapshots:materialize:dev -- --apply
```

Apply mode refuses production, requires the Strideo Dev Supabase URL
(`ntxtakbggtljjbalgris`), requires a service-role key, and requires the linked
project marker for `strideo-dev` / `ntxtakbggtljjbalgris`.

## Boundaries

- Writes only `public.feature_snapshots` in apply mode.
- Keeps the PR #87 in-memory builder pure.
- Does not create, edit, or apply migrations.
- Does not grant browser, anon, or authenticated access.
- Does not expose service-role execution through app routes or protected UI.
- Does not write predictions, Opportunity scores, wagers, Bet Sheet rows,
  provider-ingestion rows, value calculations, model-training rows, or
  production data.
