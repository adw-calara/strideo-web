# Wave 3 Race Data Import Plan

## Summary

This report defines the next backend workstream for moving Strideo from
Dev-only demo race cards toward reviewed provider-backed race-card imports.

Current product state:

- Main includes protected race-card UI and polish through PR #35.
- Main includes migrations through `0018_authenticated_race_data_read_access.sql`.
- Dev has applied and verified race-card read access and the demo fixture.
- Production has not been touched.
- This plan is documentation only. It does not create migrations, ingestion
  code, provider credentials, fixtures, or Supabase changes.

## Current Boundary

The current app can display canonical race-card facts:

- `public.surfaces`
- `public.tracks`
- `public.horses`
- `public.jockeys`
- `public.trainers`
- `public.races`
- `public.race_entries`
- `public.entry_events`
- `public.odds_snapshots`
- `public.result_versions`
- `public.result_entries`

Migration `0018` grants authenticated read-only access to those global
race-card facts. It does not grant browser write access.

Import lineage and operational tables exist, but remain server-owned and not
yet visible through the protected app:

- `public.job_runs`
- `public.raw_archive_objects`
- `public.data_ingestion_batches`
- `public.source_data_files`
- `public.agent_logs`
- `public.event_log`

## Existing Schema Findings

### Canonical Reference Tables

`surfaces` stores canonical surface labels. Provider-specific surface strings
should be normalized into this table before race rows are written.

`tracks` stores provider-aware track records with unique
`(provider, provider_track_id)`. Importers should upsert by that key and update
`last_seen_at` on successful sightings.

`horses`, `jockeys`, and `trainers` follow the same provider-aware pattern:
unique provider identity, name fields, metadata, `first_seen_at`, and
`last_seen_at`.

### Race Card Transaction Tables

`races` is partitioned by `race_date` and uniquely identifies races by
`(provider, provider_race_id, race_date)` and
`(track_id, race_date, race_number)`.

`race_entries` is partitioned by `race_date` and uniquely identifies entries by
`(provider, provider_entry_id, race_date)` and
`(race_id, race_date, program_number)`.

`entry_events` is append-only for lifecycle changes such as scratches,
reinstatements, status corrections, or other provider events.

`odds_snapshots` is append-only. Importers must not update odds rows in place.
Each odds row should retain `snapshot_at`, optional `sequence_number`, raw
payload, and `source_job_run_id`.

`result_versions` is append-only. Official results and corrections should
create result versions rather than replacing prior results.

`result_entries` stores entry-level finish and payout facts for each result
version.

### Import And Lineage Tables

`job_runs` stores server-only execution metadata with `job_key`,
`agent_key`, `status`, `idempotency_key`, `input`, `output`, and
`error_message`.

`raw_archive_objects` stores cold archive metadata for provider payloads or
source files. Raw bytes should live outside Postgres; this table tracks object
identity, checksum, status, coverage, format, and retention metadata.

`data_ingestion_batches` links an import batch to source system, data domain,
coverage window, raw archive object, `job_runs`, status, counts, and errors.

`source_data_files` tracks individual source files and their checksums,
schema fingerprints, coverage windows, and batch linkage.

These tables are RLS-enabled. Migration `0012` intentionally adds no browser
grants for archive, ingestion, feature-store, prediction, or live-serving
tables.

## Recommended Provider Import Workflow

The Race Data Agent should use a server-only workflow:

1. Create a `job_runs` row with a deterministic `job_key` and
   `idempotency_key`.
2. Discover or receive provider payloads.
3. Store raw provider bytes in approved object storage.
4. Insert or upsert a `raw_archive_objects` metadata row with checksum and
   coverage fields.
5. Create a `data_ingestion_batches` row for the normalized import attempt.
6. Add one or more `source_data_files` rows for source file lineage.
7. Validate provider payloads before canonical writes.
8. Normalize and upsert reference records.
9. Upsert current race and entry facts.
10. Append entry events, odds snapshots, and result versions.
11. Update batch and job status, counts, errors, and output summary.

The importer should be server-only. Browser clients should not write canonical
race facts, import metadata, job rows, raw archive metadata, odds snapshots, or
results.

## Idempotency Rules

Use deterministic keys:

- `job_runs`: unique `(job_key, idempotency_key)`.
- `tracks`: unique `(provider, provider_track_id)`.
- `horses`: unique `(provider, provider_horse_id)`.
- `jockeys`: unique `(provider, provider_jockey_id)`.
- `trainers`: unique `(provider, provider_trainer_id)`.
- `races`: unique `(provider, provider_race_id, race_date)`.
- `race_entries`: unique `(provider, provider_entry_id, race_date)`.
- `raw_archive_objects`: unique `(storage_provider, bucket_name, object_key)`.
- `data_ingestion_batches`: unique `batch_key`.
- `source_data_files`: unique `(source_system, file_name, checksum_sha256)`.

Importer behavior:

- Re-running the same file should not duplicate reference, race, or entry rows.
- Race and entry current-state rows may be upserted with newer provider fields,
  but append-only historical facts must remain append-only.
- Odds snapshots should append when `snapshot_at`, provider identity, pool type,
  entry, or sequence indicates a new observation.
- Result corrections should create a new `result_versions` row and link to the
  prior version when applicable.
- Entry status changes should create `entry_events` only when the status or
  provider event materially changes.
- Failed batches should remain visible with status and error details; do not
  silently delete job or batch history.

## Validation Checks

Before canonical writes:

- Provider value is present and approved for the environment.
- Race date and coverage window are within the intended import scope.
- Required provider IDs are present for tracks, races, and entries.
- Track, race number, race date, and provider race identity are consistent.
- Surface labels can be mapped to an existing or new canonical surface.
- Entry rows reference a known race.
- Horse, jockey, and trainer references can be resolved or created.
- Status values map to existing enums for race and entry status.
- Odds payloads include `snapshot_at`, provider, race, pool type, and either an
  entry reference or a documented race/pool-level reason.
- Result payloads include race identity, version semantics, status, and entry
  finish data where available.
- Checksums and schema fingerprints are recorded for source files.

After canonical writes:

- Batch row counts reconcile with inserted, updated, appended, skipped, and
  errored records.
- Every canonical write has `source_job_run_id` where the table supports it.
- Every batch references the source file or raw archive object used.
- No Opportunity, prediction, wager, bet sheet, bankroll, ROI, or
  recommendation rows are written by the race-data importer.

## Admin Visibility Needs

The existing `/protected/data-imports` route is a placeholder for future import
visibility. The first admin-facing version should be read-only and show:

- Recent `data_ingestion_batches` with provider, domain, scope, status,
  coverage window, row count, error count, and timestamps.
- Source files with file name, checksum, schema fingerprint, status, coverage,
  and batch link.
- Raw archive object metadata with storage location labels, checksum, status,
  retention class, and coverage. Do not expose signed object URLs by default.
- Job run status with job key, agent key, idempotency key, input summary,
  output summary, and error message.
- Validation summaries and counts, preferably from batch/job `metadata` or
  `output`.

Admin visibility should not include provider credentials, service-role keys,
production connection strings, or raw file contents.

## Security, RLS, And Grants

Current posture:

- Canonical race-card tables are authenticated read-only in the app.
- Race-card writes remain server-owned.
- Import lineage tables are RLS-enabled and intentionally not granted to
  browser roles yet.
- `anon` and `public` should receive no import or race-card grants.
- Production remains untouched.

Recommended future access pattern:

- Keep canonical race-data writes behind server-only service-role execution.
- Add a narrow future migration for read-only import status visibility only if
  the protected app needs it.
- Prefer operator/admin-scoped read access for import metadata once role checks
  are formalized.
- Do not expose `raw_archive_objects.object_uri` or provider file URLs to
  ordinary authenticated users without an explicit security review.
- Do not add browser insert, update, or delete policies on import metadata or
  race-card tables.

## Recommended Implementation Sequence

### 1. Import Status Read Access Planning Agent

Plan whether `/protected/data-imports` should read import status now and which
role should see it. This should decide between:

- server-only data access using service role, or
- narrow authenticated/operator read grants with RLS policies.

Potential future migration:

`supabase/migrations/0019_import_status_read_access.sql`

This migration should not expose raw archive URLs, feature-store tables,
prediction tables, or model artifacts.

### 2. Provider Import Adapter Planning Agent

Define the first provider contract without storing credentials:

- supported provider name,
- expected payload shape,
- provider race-card domains,
- source file naming,
- checksum strategy,
- schema fingerprint strategy,
- validation errors,
- idempotency key construction,
- Dev-only test fixture strategy.

### 3. Dev Import Fixture Execution Agent

Create a reviewable Dev-only import fixture that writes import lineage rows and
canonical race-card rows through the same future importer pathway. This should
not run automatically and should not touch production.

### 4. Race Data Importer Implementation Agent

Implement server-only importer code after the provider contract is approved.
The importer should write to `job_runs`, archive metadata, ingestion batches,
source files, and canonical race-card tables. It should not create predictions,
Opportunities, wagers, or recommendations.

### 5. Data Imports UI Agent

Build the read-only `/protected/data-imports` visibility surface after access
rules are approved and verified in Dev.

## Out Of Scope For This Workstream

The import workstream should not create:

- predictions,
- Opportunity scores,
- value scores,
- betting recommendations,
- wagers,
- bet sheets,
- bankroll data,
- ROI or performance logic,
- live production ingestion,
- provider credential management in the repo,
- production execution.

## Blockers Before Implementation

No schema blocker prevents planning. Implementation should wait for:

- approval of the first provider source and payload contract,
- decision on whether import status visibility is server-only or RLS/grant
  based,
- a Dev-only credential and execution path outside the repo,
- confirmation that future importer execution will use Dev only until
  production authorization is explicit.

## Recommended Immediate Next Agent

Recommended next agent: **Wave 3 Import Status Read Access Planning Agent**.

Reason:

- The protected Data Imports page already exists as a placeholder.
- Import lineage tables exist but are not yet browser-visible.
- A read-access plan should come before importer code so visibility and
  security do not drift.
- This keeps provider ingestion separate from prediction, Opportunity, and
  wagering logic.

## Acceptance Criteria For The Next Task

- Reviews `job_runs`, `raw_archive_objects`, `data_ingestion_batches`, and
  `source_data_files`.
- Recommends server-only versus RLS/grant-based read access.
- If a migration is needed, proposes append-only migration `0019`.
- Does not expose raw provider URLs or credentials.
- Does not add browser writes.
- Does not touch Supabase.
- Does not modify app code unless explicitly requested later.
- Production remains untouched.

## Safety Confirmation

- Supabase touched: no.
- Migrations created: no.
- Fixtures created or applied: no.
- App code modified: no.
- Production touched: no.
