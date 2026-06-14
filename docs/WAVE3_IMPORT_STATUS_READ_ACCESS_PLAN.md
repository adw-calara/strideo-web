# Wave 3 Import Status Read Access Plan

## Summary

This report defines the first safe read-access plan for Strideo's protected
Data Imports page. It is planning only and does not create migration `0019`,
change app code, touch Supabase, apply fixtures, or create ingestion logic.

Current baseline:

- Main includes Wave 3 Race Card UI and polish through PR #35.
- Main includes `docs/WAVE3_RACE_DATA_IMPORT_PLAN.md` from PR #36.
- Main includes migrations through `0018_authenticated_race_data_read_access.sql`.
- Dev has verified authenticated read-only race-card data access.
- Production has not been touched.

## Goal For Import Status Read Access

The first protected Data Imports page should show a conservative import-status
summary without exposing raw provider payloads, provider credentials, raw file
URLs, service-role details, or broad job execution internals.

Initial display should support:

- latest import batch,
- provider/source,
- data domain,
- ingestion scope,
- status,
- started and completed timestamps,
- rows processed,
- rows failed,
- warning count when present in sanitized metadata,
- error count,
- affected race date or coverage range,
- affected track/race count when present in sanitized metadata,
- a clear "source details hidden" state for raw files and payloads.

The first display does not need to show raw archive objects, source file URIs,
full job inputs, full job outputs, logs, raw payloads, provider file contents,
or signed storage URLs.

## Table-By-Table Review

### `public.data_ingestion_batches`

Purpose:

- Server-side ingestion batch metadata connecting source systems and raw archive
  objects to normalized race-card facts.

Key UI columns:

- `id`
- `batch_key`
- `source_system`
- `data_domain`
- `ingestion_scope`
- `status`
- `coverage_start_date`
- `coverage_end_date`
- `started_at`
- `finished_at`
- `row_count`
- `error_count`
- `metadata`
- `created_at`

Existence:

- Exists in `0012_data_architecture_and_training_tables.sql`.

Current RLS status:

- RLS enabled in `0012_data_architecture_and_training_tables.sql`.

Current grants:

- No browser grants found in local migrations.

Sensitive data risk:

- Medium. The base columns are appropriate for status display, but `metadata`
  could become sensitive if future importers place raw provider payloads,
  credentials, file URIs, or large error payloads there.

Authenticated read safety:

- Safe for the first UI only if future importer metadata is kept sanitized.
  This table is the best first candidate because it summarizes import status
  without directly storing file URLs or raw object paths in first-class columns.

Recommended access:

- First migration can use global authenticated read access with `using (true)`,
  matching the race-card global-read pattern, because import batch status is
  operational status rather than user-owned data.
- Longer term, prefer operator/admin-gated visibility once role-based shared
  RLS helpers exist.

First UI inclusion:

- Include.

### `public.job_runs`

Purpose:

- Server-only execution metadata for ingestion, strategy, learning, and
  verification jobs.

Key UI columns:

- `job_key`
- `agent_key`
- `status`
- `idempotency_key`
- `started_at`
- `finished_at`
- `input`
- `output`
- `error_message`
- `created_at`
- `updated_at`

Existence:

- Exists in `0009_audit_tables.sql`.

Current RLS status:

- RLS enabled in `0010_rls_policies.sql`.

Current grants:

- No browser grants found in local migrations.

Sensitive data risk:

- High. `input`, `output`, and `error_message` may contain provider details,
  implementation internals, validation payloads, stack traces, or future
  secrets if a job writer is careless. The table also covers non-import jobs
  such as strategy, learning, and performance workflows.

Authenticated read safety:

- Not safe for broad authenticated read access as-is.

Recommended access:

- Exclude from migration `0019`.
- If job visibility becomes necessary, prefer a sanitized server-side view,
  server-only data access function, or operator/admin-gated policy that
  projects safe summary fields only.

First UI inclusion:

- Exclude. Show batch-level status from `data_ingestion_batches` instead.

### `public.source_data_files`

Purpose:

- Source-file tracking for archive ingestion and archive-to-feature lineage.

Key UI columns:

- `data_ingestion_batch_id`
- `raw_archive_object_id`
- `source_system`
- `data_domain`
- `file_name`
- `file_uri`
- `file_format`
- `compression`
- `coverage_start_date`
- `coverage_end_date`
- `size_bytes`
- `row_count`
- `checksum_sha256`
- `schema_fingerprint`
- `status`
- `metadata`
- `created_at`

Existence:

- Exists in `0012_data_architecture_and_training_tables.sql`.

Current RLS status:

- RLS enabled in `0012_data_architecture_and_training_tables.sql`.

Current grants:

- No browser grants found in local migrations.

Sensitive data risk:

- Medium to high. `file_uri`, `file_name`, checksums, schema fingerprints, and
  metadata are useful operationally, but can reveal storage layout, provider
  naming, file structure, or source details.

Authenticated read safety:

- Not recommended for first broad authenticated read access.

Recommended access:

- Exclude from migration `0019`.
- Expose only sanitized source-file summaries later, preferably through
  operator/admin-gated access or a safe projection that hides `file_uri` and
  raw object details.

First UI inclusion:

- Exclude from database reads. The UI may show "source details hidden" for now.

### `public.raw_archive_objects`

Purpose:

- Cold-storage metadata for raw historical provider/source files. Raw bytes live
  outside Postgres; this table tracks storage identity, checksums, object paths,
  status, coverage, and retention metadata.

Key UI columns:

- `storage_provider`
- `bucket_name`
- `object_key`
- `object_uri`
- `source_system`
- `data_domain`
- `file_format`
- `compression`
- `region`
- `storage_tier`
- `retention_class`
- `coverage_start_date`
- `coverage_end_date`
- `size_bytes`
- `record_count`
- `checksum_sha256`
- `status`
- `metadata`
- `discovered_at`
- `archived_at`

Existence:

- Exists in `0012_data_architecture_and_training_tables.sql`.

Current RLS status:

- RLS enabled in `0012_data_architecture_and_training_tables.sql`.

Current grants:

- No browser grants found in local migrations.

Sensitive data risk:

- High. Object keys, bucket names, object URIs, regions, and archive metadata
  may expose storage topology or provider-file details. These should remain
  server-owned until a separate projection and security review exists.

Authenticated read safety:

- Not safe for first broad authenticated read access.

Recommended access:

- Exclude from migration `0019`.
- Do not expose raw archive object paths, object URIs, signed URLs, or raw
  payload references in the first Data Imports UI.

First UI inclusion:

- Exclude.

## Recommended First Read-Access Scope

Minimal safe first scope for migration `0019`:

- Grant authenticated `select` on `public.data_ingestion_batches`.
- Add an authenticated select policy on `public.data_ingestion_batches`.
- Keep access read-only.
- Do not grant `insert`, `update`, or `delete`.
- Do not grant `anon`.
- Do not grant `public`.
- Do not expose `job_runs`, `source_data_files`, or `raw_archive_objects`.

Reason:

- `data_ingestion_batches` is the narrowest existing table that can power the
  first Data Imports status page.
- It can show provider/source, data domain, scope, status, coverage, row count,
  error count, timestamps, and sanitized metadata without exposing raw provider
  files or full job internals.
- The other reviewed tables contain columns that are too broad or sensitive for
  first-pass global authenticated read access.

## Proposed Migration 0019 Design

Do not create this migration in this task.

Proposed filename:

`supabase/migrations/20260608192857_0019_import_status_read_access.sql`

Proposed SQL shape:

```sql
-- Wave 3 import status read access.
-- Purpose: allow authenticated protected-app users to read sanitized import
-- batch status summaries while keeping raw source details and writes
-- server-owned.

begin;

grant select on table public.data_ingestion_batches to authenticated;

create policy data_ingestion_batches_select_authenticated
  on public.data_ingestion_batches for select
  to authenticated
  using (true);

commit;
```

Tables receiving authenticated `select` grants:

- `public.data_ingestion_batches`

Tables excluded:

- `public.job_runs`: broad job internals, inputs, outputs, and error messages.
- `public.source_data_files`: file URIs, names, checksums, schema fingerprints,
  and source metadata.
- `public.raw_archive_objects`: storage provider, bucket, object key, object
  URI, retention metadata, and raw archive details.

Policy shape:

- `using (true)` for `data_ingestion_batches`, because import batch status is
  global operational status rather than user-owned data.

Restrictions:

- No `anon` grants.
- No `public` grants.
- No authenticated `insert`, `update`, or `delete`.
- No policies on excluded tables.
- No access to raw payload bodies, provider credentials, provider file URLs, or
  production-only operational metadata.

Future alternative:

- If the product decides Data Imports should be visible only to trusted
  operators/admins, create an operator/admin RLS helper or server-only route
  before exposing the table. Do not rely on user-editable metadata for roles.

## Data Imports UI Requirements

The first protected `/protected/data-imports` UI should read only approved
batch-status data and show:

### Empty State

- "No import batches have been recorded yet."
- Short note that Dev demo race-card data may exist without import metadata.

### Demo Fixture Or Import Status State

- Provider/source.
- Data domain.
- Ingestion scope.
- Coverage date range.
- Batch status.
- Created, started, and finished timestamps.
- Row count and error count.
- Warning count from sanitized `metadata.warning_count` if present.
- Affected track/race counts from sanitized metadata if present.

### Failed Or Warning State

- Status label.
- Error count.
- Sanitized validation summary from metadata if present.
- No raw stack traces, provider payloads, secrets, file URLs, or object paths.

### Successful Import State

- Succeeded status.
- Rows processed.
- Coverage range.
- Import duration if derivable from `started_at` and `finished_at`.
- Counts for affected tracks/races/entries if present in sanitized metadata.

### Source Details Hidden State

- If `source_data_files` and `raw_archive_objects` remain excluded, show a
  clear UI line such as "Source file details are hidden until operator access
  is implemented."

## Demo Fixture Needs

A future Import Status Fixture Agent should add deterministic Dev-only records
only after migration `0019` is reviewed.

Recommended fixture tables:

- `public.job_runs`
- `public.data_ingestion_batches`

Optional later fixture tables:

- `public.source_data_files`, only if the UI has approved sanitized file
  visibility or the rows are inserted but not browser-readable.
- `public.raw_archive_objects`, only if object metadata is needed for lineage
  verification and remains hidden from browser users.

Minimum demo records:

- One `job_runs` row for a completed demo race-card import.
- One `data_ingestion_batches` row linked to that job.
- `source_system = 'demo'`
- `data_domain = 'race_card'`
- `ingestion_scope = 'wave3_demo_race_card'`
- `status = 'succeeded'`
- Coverage date `2026-06-08`.
- `row_count` matching the fixture summary where practical.
- `error_count = 0`.
- Sanitized metadata with warning count, affected race count, affected track
  count, and note that raw source details are intentionally omitted.

Cleanup/reset strategy:

- Dev-only SQL fixture should not run automatically.
- Cleanup should be explicitly commented or separately documented.
- Cleanup should delete only deterministic demo import-status records using
  stable `job_key`, `idempotency_key`, and `batch_key` values.
- Cleanup should not delete seeded demo race-card data unless separately
  authorized.

Connection to current demo race data:

- Use deterministic metadata references such as `provider = 'demo'`,
  `coverage_start_date = '2026-06-08'`, `coverage_end_date = '2026-06-08'`,
  and `ingestion_scope = 'wave3_demo_race_card'`.
- Do not require raw provider payload bodies.
- Do not add production data.

## Security, RLS, And Grant Posture

Required posture:

- No browser writes.
- No `anon` access.
- No `public` access.
- Server-only/service-role writes for import execution.
- Authenticated read-only access only to approved import-status rows if
  migration `0019` is created.
- Future operator/admin gating should be considered before exposing job internals
  or raw source details.
- Production execution requires separate explicit authorization.
- No secrets, service-role keys, provider credentials, signed URLs, or raw
  payload bodies in the UI.

Implementation safety notes:

- Keep `job_runs`, `source_data_files`, and `raw_archive_objects` out of first
  browser-readable scope.
- Treat `data_ingestion_batches.metadata` as sanitized display metadata only.
- Do not store provider credentials or raw payloads in `metadata`.
- Do not use user-editable metadata for authorization decisions.

## Recommended Next Implementation Agent

Recommended next agent: **Create Migration 0019 For Import Status Read Access**.

Choice:

- A. Create migration `0019` for approved import/status read access.

Reason:

- Current tables are safe enough for a narrow first migration if only
  `data_ingestion_batches` is exposed read-only.
- The protected Data Imports page can remain useful while source-file and raw
  archive details stay hidden.
- A migration-first step lets Dev verify grants/RLS before UI work or fixture
  work depends on database reads.

## Acceptance Criteria For Migration 0019

- Append-only migration only.
- Grants `select` only on `public.data_ingestion_batches` to `authenticated`.
- Creates exactly one authenticated select policy on
  `public.data_ingestion_batches`.
- Uses `using (true)`.
- Grants no access to `anon`, `public`, `job_runs`, `source_data_files`, or
  `raw_archive_objects`.
- Grants no authenticated `insert`, `update`, or `delete`.
- Does not alter RLS on unrelated tables.
- Does not modify existing migrations.
- Does not touch Supabase until separately authorized.
- Production remains untouched.

## Safety Confirmation

- Supabase touched: no.
- Migrations created: no.
- Migration `0019` created: no.
- Fixtures created or applied: no.
- App code modified: no.
- Provider credentials created: no.
- Ingestion code created: no.
- Production touched: no.
