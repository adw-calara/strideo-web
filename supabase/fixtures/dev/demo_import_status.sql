-- Strideo Dev-only import-status fixture.
--
-- Purpose:
--   Populate public.data_ingestion_batches with deterministic, sanitized demo
--   status rows for the future protected Data Imports UI.
--
-- Safety:
--   - Dev only. Do not run against production.
--   - Inserts only into public.data_ingestion_batches.
--   - Does not insert provider credentials, raw payloads, file URIs, storage
--     paths, job internals, predictions, opportunities, wagers, or bet sheets.
--   - Does not run automatically.
--
-- Apply in Dev only after review and explicit authorization:
--   psql "$STRIDEO_DEV_SUPABASE_DB_URL" -v ON_ERROR_STOP=1 \
--     -f supabase/fixtures/dev/demo_import_status.sql

begin;

insert into public.data_ingestion_batches (
  batch_key,
  source_system,
  data_domain,
  ingestion_scope,
  status,
  coverage_start_date,
  coverage_end_date,
  started_at,
  finished_at,
  row_count,
  error_count,
  metadata,
  created_at
)
values
  (
    'demo-wave3-race-card-import-2026-06-08',
    'demo',
    'race_card',
    'wave3_demo_race_card',
    'succeeded',
    '2026-06-08',
    '2026-06-08',
    '2026-06-08 15:00:00+00',
    '2026-06-08 15:03:00+00',
    54,
    0,
    jsonb_build_object(
      'fixture', 'wave3_demo_import_status',
      'related_fixture', 'wave3_demo_race_card',
      'display_name', 'Wave 3 demo race-card fixture',
      'summary', 'Seeded deterministic demo race-card records for protected UI development.',
      'provider', 'demo',
      'warning_count', 0,
      'affected_track_count', 1,
      'affected_race_count', 2,
      'affected_entry_count', 14,
      'completed_race_count', 1,
      'scheduled_race_count', 1,
      'odds_snapshot_count', 14,
      'result_version_count', 1,
      'result_entry_count', 7,
      'source_details_hidden', true,
      'source_details_note', 'Raw source details are intentionally omitted from this Dev fixture.'
    ),
    '2026-06-08 15:00:00+00'
  ),
  (
    'demo-wave3-race-card-warning-example-2026-06-08',
    'demo',
    'race_card',
    'wave3_demo_race_card_warning_example',
    'succeeded',
    '2026-06-08',
    '2026-06-08',
    '2026-06-08 15:10:00+00',
    '2026-06-08 15:11:00+00',
    14,
    0,
    jsonb_build_object(
      'fixture', 'wave3_demo_import_status',
      'related_fixture', 'wave3_demo_race_card',
      'display_name', 'Wave 3 demo warning-state example',
      'summary', 'Sanitized warning example for future Data Imports UI display states.',
      'provider', 'demo',
      'warning_count', 2,
      'affected_track_count', 1,
      'affected_race_count', 2,
      'affected_entry_count', 14,
      'source_details_hidden', true,
      'source_details_note', 'Raw source details are intentionally omitted from this Dev fixture.',
      'warnings', jsonb_build_array(
        'Demo warning: provider file details are hidden until operator access is implemented.',
        'Demo warning: this status row is synthetic and should not be treated as live provider ingestion.'
      )
    ),
    '2026-06-08 15:10:00+00'
  )
on conflict (batch_key) do update
set
  source_system = excluded.source_system,
  data_domain = excluded.data_domain,
  ingestion_scope = excluded.ingestion_scope,
  status = excluded.status,
  coverage_start_date = excluded.coverage_start_date,
  coverage_end_date = excluded.coverage_end_date,
  started_at = excluded.started_at,
  finished_at = excluded.finished_at,
  row_count = excluded.row_count,
  error_count = excluded.error_count,
  metadata = excluded.metadata,
  created_at = excluded.created_at;

commit;

-- Cleanup/reset for Dev only.
--
-- Review before running. This deletes only deterministic demo import-status
-- fixture rows and does not delete seeded demo race-card data.
--
-- begin;
--
-- delete from public.data_ingestion_batches
-- where batch_key in (
--   'demo-wave3-race-card-import-2026-06-08',
--   'demo-wave3-race-card-warning-example-2026-06-08'
-- )
--   and source_system = 'demo'
--   and metadata ->> 'fixture' = 'wave3_demo_import_status';
--
-- commit;
