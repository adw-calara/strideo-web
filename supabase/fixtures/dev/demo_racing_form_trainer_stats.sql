-- Strideo Dev-only racing-form trainer-stat fixture.
--
-- Purpose:
--   Prepare deterministic demo trainer performance source facts with sanitized
--   lineage for racing-form coverage readiness checks.
--
-- Safety:
--   - Dev only. Do not run against production.
--   - Requires demo_race_card.sql to be applied first.
--   - Intended to run after the reviewed source-fact and owner/context fixtures
--     in the Dev racing-form readiness ladder.
--   - Inserts only sanitized demo lineage and 4 trainer_performance_stats rows,
--     one for each distinct demo trainer represented on the demo race card.
--   - Does not create predictions, Opportunities, opportunity scores, value
--     scores, wagers, bet sheets, ROI, provider-ingestion writes, ML training,
--     production data, credentials, file URIs, or raw provider details.
--   - Does not run automatically.
--
-- Apply in Dev only after review and explicit authorization:
--   node scripts/supabase-cli-with-env.mjs db query --linked \
--     --file supabase/fixtures/dev/demo_racing_form_trainer_stats.sql

begin;

insert into public.job_runs (
  job_key,
  agent_key,
  status,
  idempotency_key,
  started_at,
  finished_at,
  input,
  output
)
values (
  'demo_racing_form_trainer_stats_fixture',
  'codex.fixture.dev',
  'succeeded',
  'demo-racing-form-trainer-stats-2026-06-08',
  '2026-06-08 15:05:00+00',
  '2026-06-08 15:06:00+00',
  jsonb_build_object(
    'fixture', 'demo_racing_form_trainer_stats',
    'related_fixture', 'wave3_demo_race_card',
    'provider', 'demo',
    'authorized_scope', 'dev_only_fixture_preparation'
  ),
  jsonb_build_object(
    'fixture', 'demo_racing_form_trainer_stats',
    'trainer_stat_rows', 4,
    'distinct_trainer_profiles', 4,
    'source_details_hidden', true
  )
)
on conflict (job_key, idempotency_key) do update
set
  agent_key = excluded.agent_key,
  status = excluded.status,
  started_at = excluded.started_at,
  finished_at = excluded.finished_at,
  input = excluded.input,
  output = excluded.output,
  updated_at = now();

insert into public.data_ingestion_batches (
  batch_key,
  source_system,
  data_domain,
  ingestion_scope,
  status,
  coverage_start_date,
  coverage_end_date,
  source_job_run_id,
  started_at,
  finished_at,
  row_count,
  error_count,
  metadata,
  created_at
)
values (
  'demo-racing-form-trainer-stats-2026-06-08',
  'demo',
  'racing_form_trainer_stats',
  'demo_racing_form_trainer_stats',
  'succeeded',
  '2026-06-08',
  '2026-06-08',
  (
    select id
    from public.job_runs
    where job_key = 'demo_racing_form_trainer_stats_fixture'
      and idempotency_key = 'demo-racing-form-trainer-stats-2026-06-08'
  ),
  '2026-06-08 15:05:00+00',
  '2026-06-08 15:06:00+00',
  4,
  0,
  jsonb_build_object(
    'fixture', 'demo_racing_form_trainer_stats',
    'related_fixture', 'wave3_demo_race_card',
    'provider', 'demo',
    'trainer_stat_rows', 4,
    'distinct_trainer_profiles', 4,
    'source_details_hidden', true,
    'source_details_note', 'Source details are intentionally omitted from this Dev fixture.'
  ),
  '2026-06-08 15:05:00+00'
)
on conflict (batch_key) do update
set
  source_system = excluded.source_system,
  data_domain = excluded.data_domain,
  ingestion_scope = excluded.ingestion_scope,
  status = excluded.status,
  coverage_start_date = excluded.coverage_start_date,
  coverage_end_date = excluded.coverage_end_date,
  source_job_run_id = excluded.source_job_run_id,
  started_at = excluded.started_at,
  finished_at = excluded.finished_at,
  row_count = excluded.row_count,
  error_count = excluded.error_count,
  metadata = excluded.metadata,
  created_at = excluded.created_at;

insert into public.source_data_files (
  data_ingestion_batch_id,
  source_system,
  data_domain,
  file_name,
  file_format,
  coverage_start_date,
  coverage_end_date,
  row_count,
  checksum_sha256,
  schema_fingerprint,
  metadata,
  created_at
)
values (
  (
    select id
    from public.data_ingestion_batches
    where batch_key = 'demo-racing-form-trainer-stats-2026-06-08'
  ),
  'demo',
  'racing_form_trainer_stats',
  'demo-racing-form-trainer-stats-2026-06-08.jsonl',
  'jsonl',
  '2026-06-08',
  '2026-06-08',
  4,
  '7c9f2e1d4a6b8c0f13579bdf2468ace05eadbeef1234567890abcdef12345678',
  'demo-racing-form-trainer-stats-v1',
  jsonb_build_object(
    'fixture', 'demo_racing_form_trainer_stats',
    'related_fixture', 'wave3_demo_race_card',
    'provider', 'demo',
    'source_details_hidden', true
  ),
  '2026-06-08 15:05:00+00'
)
on conflict (source_system, file_name, checksum_sha256) do update
set
  data_ingestion_batch_id = excluded.data_ingestion_batch_id,
  data_domain = excluded.data_domain,
  file_format = excluded.file_format,
  coverage_start_date = excluded.coverage_start_date,
  coverage_end_date = excluded.coverage_end_date,
  row_count = excluded.row_count,
  schema_fingerprint = excluded.schema_fingerprint,
  metadata = excluded.metadata,
  created_at = excluded.created_at;

do $$
declare
  missing_trainer_count integer;
begin
  with expected_trainers(provider_trainer_id) as (
    values
      ('demo-trainer-lena-west'),
      ('demo-trainer-owen-field'),
      ('demo-trainer-mira-stone'),
      ('demo-trainer-cal-rowan')
  )
  select count(*)
  into missing_trainer_count
  from expected_trainers
  left join public.trainers
    on trainers.provider = 'demo'
   and trainers.provider_trainer_id = expected_trainers.provider_trainer_id
  where trainers.id is null;

  if missing_trainer_count <> 0 then
    raise exception
      'demo_racing_form_trainer_stats requires the four demo_race_card.sql trainers; missing %',
      missing_trainer_count;
  end if;
end $$;

with trainer_profiles as (
  select *
  from (
    values
      (
        '9e9b23db-3285-41f7-862d-90b4bea821b7'::uuid,
        'demo-trainer-lena-west',
        'demo-trainer-stat-profile-lena-west',
        3,
        48,
        12,
        10,
        7,
        0.250000::numeric,
        0.208333::numeric,
        0.145833::numeric,
        684000::numeric,
        0.08::numeric
      ),
      (
        '8b1d6003-a873-4a2e-8eca-327e21d7c149'::uuid,
        'demo-trainer-owen-field',
        'demo-trainer-stat-profile-owen-field',
        4,
        52,
        10,
        13,
        9,
        0.192308::numeric,
        0.250000::numeric,
        0.173077::numeric,
        721500::numeric,
        -0.02::numeric
      ),
      (
        '62a975cf-f612-42e9-abaa-950ce584eebb'::uuid,
        'demo-trainer-mira-stone',
        'demo-trainer-stat-profile-mira-stone',
        4,
        44,
        11,
        8,
        8,
        0.250000::numeric,
        0.181818::numeric,
        0.181818::numeric,
        604750::numeric,
        0.11::numeric
      ),
      (
        '34259a04-312a-49fd-a1a9-e7cd7d9f8f45'::uuid,
        'demo-trainer-cal-rowan',
        'demo-trainer-stat-profile-cal-rowan',
        3,
        39,
        7,
        9,
        6,
        0.179487::numeric,
        0.230769::numeric,
        0.153846::numeric,
        488250::numeric,
        -0.04::numeric
      )
  ) as profiles(
    id,
    provider_trainer_id,
    profile_key,
    entries_represented,
    starts,
    wins,
    places,
    shows,
    win_percentage,
    place_percentage,
    show_percentage,
    earnings,
    roi
  )
),
lineage as (
  select
    source_data_files.id as source_data_file_id,
    data_ingestion_batches.id as data_ingestion_batch_id,
    job_runs.id as source_job_run_id
  from public.data_ingestion_batches
  join public.source_data_files
    on source_data_files.data_ingestion_batch_id = data_ingestion_batches.id
   and source_data_files.source_system = 'demo'
   and source_data_files.file_name = 'demo-racing-form-trainer-stats-2026-06-08.jsonl'
  join public.job_runs
    on job_runs.id = data_ingestion_batches.source_job_run_id
  where data_ingestion_batches.batch_key = 'demo-racing-form-trainer-stats-2026-06-08'
)
insert into public.trainer_performance_stats (
  id,
  trainer_id,
  provider,
  stat_date,
  window_start_date,
  window_end_date,
  stat_context,
  starts,
  wins,
  places,
  shows,
  win_percentage,
  place_percentage,
  show_percentage,
  earnings,
  roi,
  metrics,
  source_data_file_id,
  data_ingestion_batch_id,
  source_job_run_id,
  captured_at,
  created_at
)
select
  trainer_profiles.id,
  trainers.id,
  'demo',
  '2026-06-08'::date,
  '2025-06-09'::date,
  '2026-06-08'::date,
  'overall',
  trainer_profiles.starts,
  trainer_profiles.wins,
  trainer_profiles.places,
  trainer_profiles.shows,
  trainer_profiles.win_percentage,
  trainer_profiles.place_percentage,
  trainer_profiles.show_percentage,
  trainer_profiles.earnings,
  trainer_profiles.roi,
  jsonb_build_object(
    'fixture', 'demo_racing_form_trainer_stats',
    'profile_key', trainer_profiles.profile_key,
    'provider_trainer_id', trainer_profiles.provider_trainer_id,
    'entries_represented', trainer_profiles.entries_represented,
    'stat_window', 'trailing_365_days',
    'source', 'sanitized_demo',
    'source_details_hidden', true
  ),
  lineage.source_data_file_id,
  lineage.data_ingestion_batch_id,
  lineage.source_job_run_id,
  '2026-06-08 15:05:00+00'::timestamptz,
  '2026-06-08 15:05:00+00'::timestamptz
from trainer_profiles
join public.trainers
  on trainers.provider = 'demo'
 and trainers.provider_trainer_id = trainer_profiles.provider_trainer_id
cross join lineage
on conflict (id) do update
set
  trainer_id = excluded.trainer_id,
  provider = excluded.provider,
  stat_date = excluded.stat_date,
  window_start_date = excluded.window_start_date,
  window_end_date = excluded.window_end_date,
  stat_context = excluded.stat_context,
  starts = excluded.starts,
  wins = excluded.wins,
  places = excluded.places,
  shows = excluded.shows,
  win_percentage = excluded.win_percentage,
  place_percentage = excluded.place_percentage,
  show_percentage = excluded.show_percentage,
  earnings = excluded.earnings,
  roi = excluded.roi,
  metrics = excluded.metrics,
  source_data_file_id = excluded.source_data_file_id,
  data_ingestion_batch_id = excluded.data_ingestion_batch_id,
  source_job_run_id = excluded.source_job_run_id,
  captured_at = excluded.captured_at,
  created_at = excluded.created_at;

do $$
declare
  prepared_profile_count integer;
begin
  select count(*)
  into prepared_profile_count
  from public.trainer_performance_stats
  where id in (
    '9e9b23db-3285-41f7-862d-90b4bea821b7'::uuid,
    '8b1d6003-a873-4a2e-8eca-327e21d7c149'::uuid,
    '62a975cf-f612-42e9-abaa-950ce584eebb'::uuid,
    '34259a04-312a-49fd-a1a9-e7cd7d9f8f45'::uuid
  )
    and provider = 'demo'
    and metrics ->> 'fixture' = 'demo_racing_form_trainer_stats';

  if prepared_profile_count <> 4 then
    raise exception
      'demo_racing_form_trainer_stats expected to prepare 4 trainer profiles, found %',
      prepared_profile_count;
  end if;
end $$;

commit;

-- Cleanup/reset for Dev only.
--
-- Review before running. This deletes only deterministic demo trainer-stat
-- fixture rows and their sanitized lineage records. It does not delete the
-- base demo race-card, source-fact, or owner/context fixtures.
/*
begin;

delete from public.trainer_performance_stats
where id in (
  '9e9b23db-3285-41f7-862d-90b4bea821b7'::uuid,
  '8b1d6003-a873-4a2e-8eca-327e21d7c149'::uuid,
  '62a975cf-f612-42e9-abaa-950ce584eebb'::uuid,
  '34259a04-312a-49fd-a1a9-e7cd7d9f8f45'::uuid
)
  and provider = 'demo'
  and metrics ->> 'fixture' = 'demo_racing_form_trainer_stats';

delete from public.source_data_files
where source_system = 'demo'
  and data_domain = 'racing_form_trainer_stats'
  and file_name = 'demo-racing-form-trainer-stats-2026-06-08.jsonl'
  and metadata ->> 'fixture' = 'demo_racing_form_trainer_stats';

delete from public.data_ingestion_batches
where batch_key = 'demo-racing-form-trainer-stats-2026-06-08'
  and metadata ->> 'fixture' = 'demo_racing_form_trainer_stats';

delete from public.job_runs
where job_key = 'demo_racing_form_trainer_stats_fixture'
  and idempotency_key = 'demo-racing-form-trainer-stats-2026-06-08';

commit;
*/
