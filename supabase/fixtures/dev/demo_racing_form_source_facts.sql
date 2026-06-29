-- Strideo Dev-only racing-form source-fact fixture.
--
-- Purpose:
--   Prepare deterministic demo past-performance and workout source facts with
--   minimal lineage for racing-form coverage readiness checks.
--
-- Safety:
--   - Dev only. Do not run against production.
--   - Requires demo_race_card.sql to be applied first.
--   - Inserts only sanitized demo lineage, horse_past_performances, and
--     horse_workouts rows.
--   - Does not create predictions, Opportunities, opportunity scores, value
--     scores, wagers, bet sheets, ROI, provider-ingestion writes, ML training,
--     production data, credentials, file URIs, or raw provider payloads.
--   - Does not run automatically.
--
-- Apply in Dev only after review and explicit authorization:
--   node scripts/supabase-cli-with-env.mjs db query --linked \
--     --file supabase/fixtures/dev/demo_racing_form_source_facts.sql

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
  'demo_racing_form_source_fact_fixture',
  'codex.fixture.dev',
  'succeeded',
  'demo-racing-form-source-facts-2026-06-08',
  '2026-06-08 14:35:00+00',
  '2026-06-08 14:36:00+00',
  jsonb_build_object(
    'fixture', 'demo_racing_form_source_facts',
    'related_fixture', 'wave3_demo_race_card',
    'provider', 'demo',
    'authorized_scope', 'dev_only_fixture_preparation'
  ),
  jsonb_build_object(
    'fixture', 'demo_racing_form_source_facts',
    'past_performance_rows', 14,
    'workout_rows', 14,
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
  'demo-racing-form-source-facts-2026-06-08',
  'demo',
  'racing_form_source_facts',
  'demo_racing_form_source_facts',
  'succeeded',
  '2026-06-08',
  '2026-06-08',
  (
    select id
    from public.job_runs
    where job_key = 'demo_racing_form_source_fact_fixture'
      and idempotency_key = 'demo-racing-form-source-facts-2026-06-08'
  ),
  '2026-06-08 14:35:00+00',
  '2026-06-08 14:36:00+00',
  28,
  0,
  jsonb_build_object(
    'fixture', 'demo_racing_form_source_facts',
    'related_fixture', 'wave3_demo_race_card',
    'provider', 'demo',
    'past_performance_rows', 14,
    'workout_rows', 14,
    'source_details_hidden', true,
    'source_details_note', 'Raw source details are intentionally omitted from this Dev fixture.'
  ),
  '2026-06-08 14:35:00+00'
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
    where batch_key = 'demo-racing-form-source-facts-2026-06-08'
  ),
  'demo',
  'racing_form_source_facts',
  'demo-racing-form-source-facts-2026-06-08.jsonl',
  'jsonl',
  '2026-06-08',
  '2026-06-08',
  28,
  '9d45f5f9c3c540d9b239d5fb5c1c9a9f7e4f3c2d1a0b8e7f6d5c4b3a29180706',
  'demo-racing-form-source-facts-v1',
  jsonb_build_object(
    'fixture', 'demo_racing_form_source_facts',
    'related_fixture', 'wave3_demo_race_card',
    'provider', 'demo',
    'source_details_hidden', true
  ),
  '2026-06-08 14:35:00+00'
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

insert into public.horse_past_performances (
  horse_id,
  observed_for_race_entry_id,
  observed_for_race_date,
  provider,
  provider_past_performance_id,
  prior_race_date,
  prior_track_id,
  prior_race_number,
  surface_id,
  distance_text,
  distance_yards,
  track_condition,
  race_type,
  class_level,
  purse,
  field_size,
  post_position,
  first_call_position,
  second_call_position,
  stretch_call_position,
  finish_position,
  beaten_lengths,
  fractional_times,
  final_time_seconds,
  speed_figure,
  beyer_speed_figure,
  pace_figures,
  odds_fractional,
  odds_decimal,
  jockey_id,
  trainer_id,
  weight_lbs,
  medication,
  trip_notes,
  winner_name,
  top_finishers,
  source_data_file_id,
  data_ingestion_batch_id,
  source_job_run_id,
  captured_at
)
select
  race_entries.horse_id,
  race_entries.id,
  race_entries.race_date,
  'demo',
  facts.provider_past_performance_id,
  facts.prior_race_date::date,
  tracks.id,
  facts.prior_race_number,
  surfaces.id,
  facts.distance_text,
  facts.distance_yards,
  facts.track_condition,
  facts.race_type,
  facts.class_level,
  facts.purse,
  facts.field_size,
  facts.post_position,
  facts.first_call_position,
  facts.second_call_position,
  facts.stretch_call_position,
  facts.finish_position,
  facts.beaten_lengths,
  jsonb_build_object(
    'quarter', facts.quarter_time,
    'half', facts.half_time,
    'stretch', facts.stretch_time
  ),
  facts.final_time_seconds,
  facts.speed_figure,
  facts.beyer_speed_figure,
  jsonb_build_object(
    'early', facts.early_pace,
    'late', facts.late_pace
  ),
  facts.odds_fractional,
  facts.odds_decimal,
  race_entries.jockey_id,
  race_entries.trainer_id,
  race_entries.weight_lbs,
  race_entries.medication,
  facts.trip_notes,
  facts.winner_name,
  jsonb_build_array(facts.winner_name, facts.second_name, facts.third_name),
  source_data_files.id,
  data_ingestion_batches.id,
  job_runs.id,
  '2026-06-08 14:35:00+00'::timestamptz
from (
  values
    ('demo-entry-r1-01', 'demo-pp-r1-01-2026-05-12', '2026-05-12', 4, 'DEMO_DIRT', '6 furlongs', 1320, 'fast', 'Allowance', 'allowance_n1x', 52000, 8, 3, 2, 2, 1, 1, 0.00, 22.80, 46.10, 71.20, 72.40, 88, 86, 91, 94, '5/2', 3.50, 'pressed pace, clear late', 'Northern Cipher', 'River Lantern', 'Quiet Variance'),
    ('demo-entry-r1-02', 'demo-pp-r1-02-2026-05-18', '2026-05-18', 6, 'DEMO_DIRT', '6 furlongs', 1320, 'fast', 'Claiming', 'claiming_40000', 40000, 9, 5, 4, 4, 3, 2, 1.25, 23.10, 46.40, 71.80, 73.10, 82, 80, 86, 88, '4/1', 5.00, 'inside bid, held place', 'Northern Cipher', 'River Lantern', 'Quiet Variance'),
    ('demo-entry-r1-03', 'demo-pp-r1-03-2026-05-20', '2026-05-20', 3, 'DEMO_DIRT', '6 furlongs', 1320, 'good', 'Allowance', 'allowance_n1x', 50000, 7, 2, 5, 3, 2, 3, 2.00, 22.90, 46.30, 71.60, 73.30, 80, 79, 84, 87, '6/1', 7.00, 'mild rally, needed more', 'Northern Cipher', 'River Lantern', 'Quiet Variance'),
    ('demo-entry-r1-04', 'demo-pp-r1-04-2026-05-14', '2026-05-14', 5, 'DEMO_DIRT', '6 furlongs', 1320, 'fast', 'Starter Allowance', 'starter_allowance', 36000, 8, 6, 6, 5, 4, 4, 4.50, 23.40, 47.10, 72.30, 74.20, 76, 75, 78, 82, '8/1', 9.00, 'wide trip, one paced', 'Northern Cipher', 'River Lantern', 'Quiet Variance'),
    ('demo-entry-r1-05', 'demo-pp-r1-05-2026-05-19', '2026-05-19', 2, 'DEMO_DIRT', '5.5 furlongs', 1210, 'fast', 'Claiming', 'claiming_32000', 32000, 7, 1, 3, 5, 6, 5, 6.00, 22.30, 45.90, 70.80, 73.90, 74, 73, 83, 78, '10/1', 11.00, 'speed, faded lane', 'Northern Cipher', 'River Lantern', 'Quiet Variance'),
    ('demo-entry-r1-06', 'demo-pp-r1-06-2026-05-16', '2026-05-16', 1, 'DEMO_DIRT', '6 furlongs', 1320, 'fast', 'Allowance', 'allowance_n1x', 48000, 8, 7, 7, 6, 5, 6, 7.75, 23.60, 47.40, 73.00, 75.10, 71, 70, 75, 77, '12/1', 13.00, 'slow start, passed tired', 'Northern Cipher', 'River Lantern', 'Quiet Variance'),
    ('demo-entry-r1-07', 'demo-pp-r1-07-2026-05-21', '2026-05-21', 7, 'DEMO_DIRT', '6 furlongs', 1320, 'muddy', 'Claiming', 'claiming_25000', 25000, 9, 8, 8, 8, 7, 7, 9.50, 23.90, 48.00, 73.70, 76.40, 68, 67, 70, 74, '15/1', 16.00, 'trailed, no threat', 'Northern Cipher', 'River Lantern', 'Quiet Variance'),
    ('demo-entry-r2-01', 'demo-pp-r2-01-2026-05-11', '2026-05-11', 2, 'DEMO_TURF', '1 mile', 1760, 'firm', 'Starter Optional Claiming', 'starter_optional_claiming', 47000, 8, 4, 3, 2, 2, 1, 0.00, 24.20, 48.30, 96.40, 97.80, 87, 85, 84, 93, '3/1', 4.00, 'tracked, kicked clear', 'Final Stride', 'Signal Peak', 'Orchard Switch'),
    ('demo-entry-r2-02', 'demo-pp-r2-02-2026-05-17', '2026-05-17', 5, 'DEMO_TURF', '1 mile', 1760, 'firm', 'Allowance', 'allowance_optional', 51000, 9, 3, 5, 4, 3, 2, 0.75, 24.00, 48.00, 96.00, 98.00, 85, 84, 86, 90, '7/2', 4.50, 'split horses, gaining', 'Final Stride', 'Signal Peak', 'Orchard Switch'),
    ('demo-entry-r2-03', 'demo-pp-r2-03-2026-05-22', '2026-05-22', 1, 'DEMO_TURF', '1 mile', 1760, 'good', 'Starter Optional Claiming', 'starter_optional_claiming', 46000, 8, 2, 2, 3, 4, 3, 1.50, 23.80, 47.90, 96.70, 98.30, 83, 82, 88, 86, '5/1', 6.00, 'set pace, held third', 'Final Stride', 'Signal Peak', 'Orchard Switch'),
    ('demo-entry-r2-04', 'demo-pp-r2-04-2026-05-13', '2026-05-13', 6, 'DEMO_TURF', '1 mile', 1760, 'firm', 'Claiming', 'claiming_40000', 40000, 10, 7, 7, 6, 5, 4, 3.25, 24.50, 49.00, 97.90, 99.10, 79, 78, 80, 83, '8/1', 9.00, 'outside, flattened', 'Final Stride', 'Signal Peak', 'Orchard Switch'),
    ('demo-entry-r2-05', 'demo-pp-r2-05-2026-05-15', '2026-05-15', 4, 'DEMO_TURF', '1 mile', 1760, 'firm', 'Allowance', 'allowance_n1x', 50000, 8, 5, 6, 7, 6, 5, 4.00, 24.30, 48.70, 97.50, 99.30, 77, 76, 79, 81, '10/1', 11.00, 'saved ground, even', 'Final Stride', 'Signal Peak', 'Orchard Switch'),
    ('demo-entry-r2-06', 'demo-pp-r2-06-2026-05-23', '2026-05-23', 7, 'DEMO_TURF', '1 mile', 1760, 'soft', 'Starter Optional Claiming', 'starter_optional_claiming', 45000, 9, 8, 8, 8, 7, 6, 5.50, 24.80, 49.50, 98.60, 100.20, 74, 73, 76, 78, '12/1', 13.00, 'failed to menace', 'Final Stride', 'Signal Peak', 'Orchard Switch'),
    ('demo-entry-r2-07', 'demo-pp-r2-07-2026-05-10', '2026-05-10', 8, 'DEMO_TURF', '1 mile', 1760, 'firm', 'Claiming', 'claiming_32000', 32000, 10, 9, 9, 9, 8, 7, 6.75, 25.00, 50.00, 99.10, 101.00, 72, 71, 72, 77, '15/1', 16.00, 'never involved', 'Final Stride', 'Signal Peak', 'Orchard Switch')
) as facts(
  provider_entry_id,
  provider_past_performance_id,
  prior_race_date,
  prior_race_number,
  surface_code,
  distance_text,
  distance_yards,
  track_condition,
  race_type,
  class_level,
  purse,
  field_size,
  post_position,
  first_call_position,
  second_call_position,
  stretch_call_position,
  finish_position,
  beaten_lengths,
  quarter_time,
  half_time,
  stretch_time,
  final_time_seconds,
  speed_figure,
  beyer_speed_figure,
  early_pace,
  late_pace,
  odds_fractional,
  odds_decimal,
  trip_notes,
  winner_name,
  second_name,
  third_name
)
join public.race_entries
  on race_entries.provider = 'demo'
 and race_entries.provider_entry_id = facts.provider_entry_id
 and race_entries.race_date = '2026-06-08'
join public.tracks
  on tracks.provider = 'demo'
 and tracks.provider_track_id = 'demo-track-strideo-park'
join public.surfaces
  on surfaces.code = facts.surface_code
join public.data_ingestion_batches
  on data_ingestion_batches.batch_key = 'demo-racing-form-source-facts-2026-06-08'
join public.source_data_files
  on source_data_files.data_ingestion_batch_id = data_ingestion_batches.id
 and source_data_files.source_system = 'demo'
 and source_data_files.file_name = 'demo-racing-form-source-facts-2026-06-08.jsonl'
join public.job_runs
  on job_runs.id = data_ingestion_batches.source_job_run_id
on conflict (provider, provider_past_performance_id)
  where provider_past_performance_id is not null
do update
set
  horse_id = excluded.horse_id,
  observed_for_race_entry_id = excluded.observed_for_race_entry_id,
  observed_for_race_date = excluded.observed_for_race_date,
  prior_race_date = excluded.prior_race_date,
  prior_track_id = excluded.prior_track_id,
  prior_race_number = excluded.prior_race_number,
  surface_id = excluded.surface_id,
  distance_text = excluded.distance_text,
  distance_yards = excluded.distance_yards,
  track_condition = excluded.track_condition,
  race_type = excluded.race_type,
  class_level = excluded.class_level,
  purse = excluded.purse,
  field_size = excluded.field_size,
  post_position = excluded.post_position,
  first_call_position = excluded.first_call_position,
  second_call_position = excluded.second_call_position,
  stretch_call_position = excluded.stretch_call_position,
  finish_position = excluded.finish_position,
  beaten_lengths = excluded.beaten_lengths,
  fractional_times = excluded.fractional_times,
  final_time_seconds = excluded.final_time_seconds,
  speed_figure = excluded.speed_figure,
  beyer_speed_figure = excluded.beyer_speed_figure,
  pace_figures = excluded.pace_figures,
  odds_fractional = excluded.odds_fractional,
  odds_decimal = excluded.odds_decimal,
  jockey_id = excluded.jockey_id,
  trainer_id = excluded.trainer_id,
  weight_lbs = excluded.weight_lbs,
  medication = excluded.medication,
  trip_notes = excluded.trip_notes,
  winner_name = excluded.winner_name,
  top_finishers = excluded.top_finishers,
  source_data_file_id = excluded.source_data_file_id,
  data_ingestion_batch_id = excluded.data_ingestion_batch_id,
  source_job_run_id = excluded.source_job_run_id,
  captured_at = excluded.captured_at;

insert into public.horse_workouts (
  horse_id,
  trainer_id,
  provider,
  provider_workout_id,
  workout_date,
  track_id,
  location_text,
  surface_id,
  distance_text,
  distance_yards,
  workout_time_seconds,
  rank_at_distance,
  work_count_at_distance,
  work_type,
  breezing,
  handily,
  gate,
  bullet,
  layoff_sequence_number,
  days_since_previous_workout,
  workout_trend,
  inferred_signals,
  source_data_file_id,
  data_ingestion_batch_id,
  source_job_run_id,
  captured_at
)
select
  race_entries.horse_id,
  race_entries.trainer_id,
  'demo',
  facts.provider_workout_id,
  facts.workout_date::date,
  tracks.id,
  'Strideo Park',
  surfaces.id,
  facts.distance_text,
  facts.distance_yards,
  facts.workout_time_seconds,
  facts.rank_at_distance,
  facts.work_count_at_distance,
  facts.work_type,
  facts.breezing,
  facts.handily,
  facts.gate_work,
  facts.bullet,
  facts.layoff_sequence_number,
  facts.days_since_previous_workout,
  facts.workout_trend,
  jsonb_build_object(
    'fixture', 'demo_racing_form_source_facts',
    'intent_signal', facts.intent_signal,
    'source', 'sanitized_demo'
  ),
  source_data_files.id,
  data_ingestion_batches.id,
  job_runs.id,
  '2026-06-08 14:35:00+00'::timestamptz
from (
  values
    ('demo-entry-r1-01', 'demo-workout-r1-01-2026-06-01', '2026-06-01', 'DEMO_DIRT', '4 furlongs', 880, 48.80, 4, 39, 'breezing', true, false, false, false, 1, 7, 'sharp_maintenance', 'sharp maintenance work'),
    ('demo-entry-r1-02', 'demo-workout-r1-02-2026-06-02', '2026-06-02', 'DEMO_DIRT', '4 furlongs', 880, 49.20, 8, 42, 'breezing', true, false, false, false, 1, 8, 'steady', 'steady maintenance work'),
    ('demo-entry-r1-03', 'demo-workout-r1-03-2026-06-01', '2026-06-01', 'DEMO_DIRT', '5 furlongs', 1100, 61.40, 6, 24, 'handily', false, true, false, false, 1, 6, 'building', 'useful stamina work'),
    ('demo-entry-r1-04', 'demo-workout-r1-04-2026-06-03', '2026-06-03', 'DEMO_DIRT', '4 furlongs', 880, 50.10, 21, 44, 'breezing', true, false, false, false, 1, 9, 'maintenance', 'routine work'),
    ('demo-entry-r1-05', 'demo-workout-r1-05-2026-05-31', '2026-05-31', 'DEMO_DIRT', '3 furlongs', 660, 36.80, 3, 31, 'breezing', true, false, false, true, 1, 5, 'speed_sharpener', 'quick short work'),
    ('demo-entry-r1-06', 'demo-workout-r1-06-2026-06-02', '2026-06-02', 'DEMO_DIRT', '4 furlongs', 880, 50.40, 25, 42, 'handily', false, true, false, false, 1, 10, 'maintenance', 'even drill'),
    ('demo-entry-r1-07', 'demo-workout-r1-07-2026-06-01', '2026-06-01', 'DEMO_DIRT', '4 furlongs', 880, 51.00, 34, 39, 'breezing', true, false, false, false, 1, 12, 'light', 'light maintenance'),
    ('demo-entry-r2-01', 'demo-workout-r2-01-2026-06-01', '2026-06-01', 'DEMO_TURF', '5 furlongs', 1100, 60.90, 2, 18, 'breezing', true, false, false, true, 1, 7, 'sharp_turf', 'sharp turf prep'),
    ('demo-entry-r2-02', 'demo-workout-r2-02-2026-06-02', '2026-06-02', 'DEMO_TURF', '4 furlongs', 880, 48.90, 5, 37, 'breezing', true, false, false, false, 1, 8, 'steady', 'solid turf maintenance'),
    ('demo-entry-r2-03', 'demo-workout-r2-03-2026-06-03', '2026-06-03', 'DEMO_TURF', '4 furlongs', 880, 49.50, 13, 41, 'breezing', true, false, false, false, 1, 9, 'maintenance', 'controlled work'),
    ('demo-entry-r2-04', 'demo-workout-r2-04-2026-06-01', '2026-06-01', 'DEMO_TURF', '5 furlongs', 1100, 62.20, 11, 18, 'handily', false, true, false, false, 1, 10, 'stamina', 'longer stamina drill'),
    ('demo-entry-r2-05', 'demo-workout-r2-05-2026-06-02', '2026-06-02', 'DEMO_TURF', '4 furlongs', 880, 50.20, 22, 37, 'breezing', true, false, false, false, 1, 11, 'maintenance', 'routine turf breeze'),
    ('demo-entry-r2-06', 'demo-workout-r2-06-2026-05-31', '2026-05-31', 'DEMO_TURF', '4 furlongs', 880, 50.80, 29, 40, 'handily', false, true, false, false, 1, 12, 'light', 'light prep'),
    ('demo-entry-r2-07', 'demo-workout-r2-07-2026-06-03', '2026-06-03', 'DEMO_TURF', '3 furlongs', 660, 37.60, 12, 29, 'breezing', true, false, false, false, 1, 14, 'maintenance', 'short maintenance work')
) as facts(
  provider_entry_id,
  provider_workout_id,
  workout_date,
  surface_code,
  distance_text,
  distance_yards,
  workout_time_seconds,
  rank_at_distance,
  work_count_at_distance,
  work_type,
  breezing,
  handily,
  gate_work,
  bullet,
  layoff_sequence_number,
  days_since_previous_workout,
  workout_trend,
  intent_signal
)
join public.race_entries
  on race_entries.provider = 'demo'
 and race_entries.provider_entry_id = facts.provider_entry_id
 and race_entries.race_date = '2026-06-08'
join public.tracks
  on tracks.provider = 'demo'
 and tracks.provider_track_id = 'demo-track-strideo-park'
join public.surfaces
  on surfaces.code = facts.surface_code
join public.data_ingestion_batches
  on data_ingestion_batches.batch_key = 'demo-racing-form-source-facts-2026-06-08'
join public.source_data_files
  on source_data_files.data_ingestion_batch_id = data_ingestion_batches.id
 and source_data_files.source_system = 'demo'
 and source_data_files.file_name = 'demo-racing-form-source-facts-2026-06-08.jsonl'
join public.job_runs
  on job_runs.id = data_ingestion_batches.source_job_run_id
on conflict (provider, provider_workout_id)
  where provider_workout_id is not null
do update
set
  horse_id = excluded.horse_id,
  trainer_id = excluded.trainer_id,
  workout_date = excluded.workout_date,
  track_id = excluded.track_id,
  location_text = excluded.location_text,
  surface_id = excluded.surface_id,
  distance_text = excluded.distance_text,
  distance_yards = excluded.distance_yards,
  workout_time_seconds = excluded.workout_time_seconds,
  rank_at_distance = excluded.rank_at_distance,
  work_count_at_distance = excluded.work_count_at_distance,
  work_type = excluded.work_type,
  breezing = excluded.breezing,
  handily = excluded.handily,
  gate = excluded.gate,
  bullet = excluded.bullet,
  layoff_sequence_number = excluded.layoff_sequence_number,
  days_since_previous_workout = excluded.days_since_previous_workout,
  workout_trend = excluded.workout_trend,
  inferred_signals = excluded.inferred_signals,
  source_data_file_id = excluded.source_data_file_id,
  data_ingestion_batch_id = excluded.data_ingestion_batch_id,
  source_job_run_id = excluded.source_job_run_id,
  captured_at = excluded.captured_at;

commit;

-- Cleanup/reset for Dev only.
--
-- Review before running. This deletes only deterministic demo source-fact
-- fixture rows and their sanitized lineage records. It does not delete the
-- base demo race-card fixture.
--
-- begin;
--
-- delete from public.horse_workouts
-- where provider = 'demo'
--   and provider_workout_id like 'demo-workout-r_-%';
--
-- delete from public.horse_past_performances
-- where provider = 'demo'
--   and provider_past_performance_id like 'demo-pp-r_-%';
--
-- delete from public.source_data_files
-- where source_system = 'demo'
--   and file_name = 'demo-racing-form-source-facts-2026-06-08.jsonl'
--   and metadata ->> 'fixture' = 'demo_racing_form_source_facts';
--
-- delete from public.data_ingestion_batches
-- where batch_key = 'demo-racing-form-source-facts-2026-06-08'
--   and source_system = 'demo'
--   and metadata ->> 'fixture' = 'demo_racing_form_source_facts';
--
-- delete from public.job_runs
-- where job_key = 'demo_racing_form_source_fact_fixture'
--   and idempotency_key = 'demo-racing-form-source-facts-2026-06-08';
--
-- commit;
