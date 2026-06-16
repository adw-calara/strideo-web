# Racing-Form Unresolved-Code Reporting

Strideo normalizes racing-form shorthand before values can be trusted in ML
features, value calculations, explanations, or Opportunity scoring. Unknown
provider codes should stay visible in `racing_unresolved_source_codes` until a
reviewer maps, ignores, or defers them. They should not silently default to
"unknown" in model features, because that hides provider drift and can split or
collapse categories in ways that are hard to audit later.

This reporting path is server-side and Dev/admin-oriented. It reads the
service-role-only unresolved-code queue and does not expose unresolved rows to
browser clients.

## Run The Report

Run from the repo root with Dev service-role environment variables loaded:

```bash
npm run racing-codes:unresolved:report
```

For automation-friendly output:

```bash
npm run racing-codes:unresolved:report -- --json
```

The script refuses `NODE_ENV=production` and refuses Supabase URLs outside the
Strideo Dev project, `strideo-dev` / `ntxtakbggtljjbalgris`. It does not print
service-role keys or database credentials.

## What It Shows

The report summarizes:

- total unresolved rows
- unresolved rows by status
- unresolved rows by source system
- unresolved rows by code set or intended source field
- unresolved rows by context/entity type
- oldest and newest unresolved timestamps
- a grouped review queue with occurrence count, first/last seen timestamps,
  latest job-run id, Opportunity ids, reviewer fields, and resolution fields

The safety section flags:

- unknown codes seen more than once
- unknown codes linked to Opportunities
- unknown codes seen in feature, model, prediction, value, or scoring contexts
- open/reviewing/deferred codes stale for more than 7 days
- source codes with no source system
- source codes with no code-set context
- source codes that appear across multiple contexts

## Status Meanings

- `open`: unknown value needs review.
- `reviewing`: a reviewer is investigating the source meaning.
- `mapped`: a reviewed alias or track alias now resolves the source value.
- `ignored`: the value is intentionally not part of canonical normalization.
- `deferred`: review is postponed because the source meaning is ambiguous,
  low-confidence, or needs more provider evidence.

## Review Cadence

Review unresolved codes weekly while provider ingestion is active, and review
immediately after adding or changing a provider parser. Repeated codes,
Opportunity-linked codes, and model/value-context codes should be handled first.
Those rows are most likely to affect feature quality or user-visible value
explanations.

Before a code is promoted to a canonical alias:

- confirm the source system and source field/context
- preserve the raw source value on the source fact
- verify the canonical code set and canonical value already exist or are added
  through a reviewed glossary change
- record source attribution, confidence, notes, and effective dates when needed
- avoid mapping ambiguous shorthand from the token alone
- keep broad track-code alias sets in a separate reviewed seed/update

## Future Ingestion Fit

Provider ingestion should resolve source shorthand through
`racing_code_aliases` or `track_code_aliases`. If no safe mapping exists, it
should insert or increment an unresolved-code queue row with source-system,
field/context, sample payload, job-run lineage, and optional Opportunity linkage.

Feature snapshots and value calculations should use reviewed canonical values.
Unknown shorthand should block or flag feature generation instead of becoming a
catch-all model category. That keeps model history explainable: later alias
updates can explain which canonical values were used at prediction time without
rewriting historical model inputs.
