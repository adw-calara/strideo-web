-- Phase 1A migration design: historical data architecture and AI training.
-- Purpose: add cold archive metadata, warm feature-store tables, prediction
-- run/result lineage, and a 30-day live serving layer without applying any
-- live Supabase changes.
-- Dependencies: 0003_reference_tables.sql, 0004_transaction_tables.sql,
-- 0008_learning_and_performance_tables.sql, 0009_audit_tables.sql, and
-- 0011_indexes_and_partitions.sql.
-- Future considerations: raw files should live in low-cost object storage; this
-- database stores metadata, lineage, feature facts, and serving indexes only.

begin;

create type public.archive_object_status as enum ('discovered', 'importing', 'available', 'quarantined', 'archived', 'deleted');
create type public.feature_store_status as enum ('pending', 'active', 'superseded', 'invalidated');
create type public.prediction_run_scope as enum ('backfill', 'training', 'evaluation', 'live', 'replay');
create type public.prediction_result_status as enum ('generated', 'served', 'expired', 'verified', 'voided');

create table public.raw_archive_objects (
  id uuid primary key default gen_random_uuid(),
  storage_provider text not null,
  bucket_name text not null,
  object_key text not null,
  object_uri text,
  source_system text not null,
  data_domain text not null,
  file_format text not null,
  compression text,
  region text,
  storage_tier text not null default 'cold',
  retention_class text not null default 'permanent',
  coverage_start_date date,
  coverage_end_date date,
  size_bytes bigint,
  record_count bigint,
  checksum_sha256 text,
  status public.archive_object_status not null default 'discovered',
  metadata jsonb not null default '{}'::jsonb,
  discovered_at timestamptz not null default now(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (storage_provider, bucket_name, object_key)
);

comment on table public.raw_archive_objects is
  'Cold-storage metadata for raw historical source files. Raw bytes live in low-cost object storage; Postgres stores lineage and discovery metadata.';

create table public.data_ingestion_batches (
  id uuid primary key default gen_random_uuid(),
  batch_key text not null unique,
  source_system text not null,
  data_domain text not null,
  ingestion_scope text not null,
  status public.job_status not null default 'queued',
  coverage_start_date date,
  coverage_end_date date,
  raw_archive_object_id uuid references public.raw_archive_objects (id),
  source_job_run_id uuid references public.job_runs (id),
  started_at timestamptz,
  finished_at timestamptz,
  row_count bigint,
  error_count bigint not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.data_ingestion_batches is
  'Server-side ingestion batch metadata connecting raw archive objects to normalized transaction and feature-store facts.';

create table public.source_data_files (
  id uuid primary key default gen_random_uuid(),
  data_ingestion_batch_id uuid not null references public.data_ingestion_batches (id),
  raw_archive_object_id uuid references public.raw_archive_objects (id),
  source_system text not null,
  data_domain text not null,
  file_name text not null,
  file_uri text,
  file_format text not null,
  compression text,
  coverage_start_date date,
  coverage_end_date date,
  size_bytes bigint,
  row_count bigint,
  checksum_sha256 text,
  schema_fingerprint text,
  status public.archive_object_status not null default 'available',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (source_system, file_name, checksum_sha256)
);

comment on table public.source_data_files is
  'Historical source-file tracking for 10-year U.S. thoroughbred archive ingestion and archive-to-feature-store lineage.';

create table public.horse_features (
  id uuid primary key default gen_random_uuid(),
  horse_id uuid not null references public.horses (id),
  feature_date date not null,
  feature_set_version text not null,
  training_window_start_date date,
  training_window_end_date date,
  features jsonb not null,
  status public.feature_store_status not null default 'active',
  source_data_file_id uuid references public.source_data_files (id),
  data_ingestion_batch_id uuid references public.data_ingestion_batches (id),
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (horse_id, feature_date, feature_set_version)
);

comment on table public.horse_features is
  'Warm feature-store facts for horse-level model inputs. Feature rows are versioned and lineage-linked to source files.';

create table public.trainer_features (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers (id),
  feature_date date not null,
  feature_set_version text not null,
  training_window_start_date date,
  training_window_end_date date,
  features jsonb not null,
  status public.feature_store_status not null default 'active',
  source_data_file_id uuid references public.source_data_files (id),
  data_ingestion_batch_id uuid references public.data_ingestion_batches (id),
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (trainer_id, feature_date, feature_set_version)
);

comment on table public.trainer_features is
  'Warm feature-store facts for trainer-level model inputs and rolling performance windows.';

create table public.jockey_features (
  id uuid primary key default gen_random_uuid(),
  jockey_id uuid not null references public.jockeys (id),
  feature_date date not null,
  feature_set_version text not null,
  training_window_start_date date,
  training_window_end_date date,
  features jsonb not null,
  status public.feature_store_status not null default 'active',
  source_data_file_id uuid references public.source_data_files (id),
  data_ingestion_batch_id uuid references public.data_ingestion_batches (id),
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (jockey_id, feature_date, feature_set_version)
);

comment on table public.jockey_features is
  'Warm feature-store facts for jockey-level model inputs and form signals.';

create table public.track_features (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks (id),
  feature_date date not null,
  feature_set_version text not null,
  training_window_start_date date,
  training_window_end_date date,
  features jsonb not null,
  status public.feature_store_status not null default 'active',
  source_data_file_id uuid references public.source_data_files (id),
  data_ingestion_batch_id uuid references public.data_ingestion_batches (id),
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (track_id, feature_date, feature_set_version)
);

comment on table public.track_features is
  'Warm feature-store facts for track, surface, bias, and race-condition model inputs.';

create table public.odds_features (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null,
  race_date date not null,
  race_entry_id uuid,
  odds_snapshot_id uuid,
  feature_set_version text not null,
  snapshot_at timestamptz not null,
  features jsonb not null,
  status public.feature_store_status not null default 'active',
  source_data_file_id uuid references public.source_data_files (id),
  data_ingestion_batch_id uuid references public.data_ingestion_batches (id),
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (race_id, race_date, race_entry_id, odds_snapshot_id, feature_set_version),
  foreign key (race_id, race_date) references public.races (id, race_date),
  foreign key (race_entry_id, race_date) references public.race_entries (id, race_date),
  foreign key (odds_snapshot_id, race_date) references public.odds_snapshots (id, race_date)
);

comment on table public.odds_features is
  'Warm feature-store facts derived from odds snapshots. Race-date FKs preserve odds snapshot lineage.';

create table public.model_training_datasets (
  id uuid primary key default gen_random_uuid(),
  model_training_run_id uuid references public.model_training_runs (id),
  dataset_key text not null unique,
  source_system text not null default 'strideo',
  training_window_start_date date not null,
  training_window_end_date date not null,
  lookback_years integer not null default 5,
  feature_set_versions jsonb not null default '{}'::jsonb,
  raw_archive_object_ids uuid[] not null default '{}'::uuid[],
  source_data_file_ids uuid[] not null default '{}'::uuid[],
  row_count bigint,
  storage_uri text,
  checksum_sha256 text,
  created_at timestamptz not null default now()
);

comment on table public.model_training_datasets is
  'Training dataset manifest for monthly retraining. The default lookback is the approved 5-year rolling window.';

create table public.model_evaluation_metrics (
  id uuid primary key default gen_random_uuid(),
  model_evaluation_run_id uuid references public.model_evaluation_runs (id),
  model_version_id uuid not null references public.model_versions (id),
  dataset_id uuid references public.model_training_datasets (id),
  metric_key text not null,
  metric_value numeric,
  metric_payload jsonb not null default '{}'::jsonb,
  evaluation_window_start_date date,
  evaluation_window_end_date date,
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (model_version_id, dataset_id, metric_key, evaluation_window_start_date, evaluation_window_end_date)
);

comment on table public.model_evaluation_metrics is
  'Append-only model evaluation metric facts used for monthly retraining decisions and model promotion review.';

create table public.prediction_runs (
  id uuid primary key default gen_random_uuid(),
  run_key text not null unique,
  model_version_id uuid not null references public.model_versions (id),
  scope public.prediction_run_scope not null,
  status public.job_status not null default 'queued',
  prediction_window_start timestamptz,
  prediction_window_end timestamptz,
  source_job_run_id uuid references public.job_runs (id),
  feature_set_versions jsonb not null default '{}'::jsonb,
  parameters jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.prediction_runs is
  'Prediction batch metadata for backfills, monthly evaluation, replay, and live serving runs.';

create table public.prediction_results (
  id uuid not null default gen_random_uuid(),
  prediction_date date not null,
  prediction_run_id uuid not null references public.prediction_runs (id),
  model_version_id uuid not null references public.model_versions (id),
  feature_snapshot_id uuid references public.feature_snapshots (id),
  race_id uuid not null,
  race_date date not null,
  race_entry_id uuid,
  prediction_type text not null,
  status public.prediction_result_status not null default 'generated',
  probability public.probability_0_1,
  score public.score_0_100,
  output jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  served_until timestamptz,
  created_at timestamptz not null default now(),
  primary key (id, prediction_date),
  foreign key (race_id, race_date) references public.races (id, race_date),
  foreign key (race_entry_id, race_date) references public.race_entries (id, race_date)
) partition by range (prediction_date);

comment on table public.prediction_results is
  'Permanent append-only prediction history. Live-serving retention is handled separately from this historical record.';

create table public.prediction_results_default
  partition of public.prediction_results default;
comment on table public.prediction_results_default is
  'Default partition safety net for permanent prediction history; create monthly prediction_date partitions before backfills.';

create table public.live_prediction_cache (
  id uuid primary key default gen_random_uuid(),
  prediction_result_id uuid not null,
  prediction_date date not null,
  race_id uuid not null,
  race_date date not null,
  race_entry_id uuid,
  model_version_id uuid not null references public.model_versions (id),
  score public.score_0_100,
  probability public.probability_0_1,
  output jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (prediction_result_id, prediction_date),
  foreign key (prediction_result_id, prediction_date) references public.prediction_results (id, prediction_date),
  foreign key (race_id, race_date) references public.races (id, race_date),
  foreign key (race_entry_id, race_date) references public.race_entries (id, race_date),
  check (expires_at <= generated_at + interval '30 days')
);

comment on table public.live_prediction_cache is
  'Thirty-day live prediction serving layer. Permanent history remains in prediction_results.';

alter table public.raw_archive_objects enable row level security;
alter table public.data_ingestion_batches enable row level security;
alter table public.source_data_files enable row level security;
alter table public.horse_features enable row level security;
alter table public.trainer_features enable row level security;
alter table public.jockey_features enable row level security;
alter table public.track_features enable row level security;
alter table public.odds_features enable row level security;
alter table public.model_training_datasets enable row level security;
alter table public.model_evaluation_metrics enable row level security;
alter table public.prediction_runs enable row level security;
alter table public.prediction_results enable row level security;
alter table public.prediction_results_default enable row level security;
alter table public.live_prediction_cache enable row level security;

-- Intentionally no GRANT statements here. Historical archive, feature-store,
-- prediction, and live-serving access must remain server-owned until explicit
-- RLS tests and Data API grants are reviewed.

create index raw_archive_objects_lookup_idx on public.raw_archive_objects (source_system, data_domain, coverage_start_date, coverage_end_date);
create index raw_archive_objects_status_idx on public.raw_archive_objects (status, storage_tier, created_at desc);
create index data_ingestion_batches_scope_idx on public.data_ingestion_batches (source_system, data_domain, status, created_at desc);
create index source_data_files_batch_idx on public.source_data_files (data_ingestion_batch_id, source_system, data_domain);
create index source_data_files_coverage_idx on public.source_data_files (source_system, data_domain, coverage_start_date, coverage_end_date);

create index horse_features_entity_date_idx on public.horse_features (horse_id, feature_date desc, feature_set_version);
create index trainer_features_entity_date_idx on public.trainer_features (trainer_id, feature_date desc, feature_set_version);
create index jockey_features_entity_date_idx on public.jockey_features (jockey_id, feature_date desc, feature_set_version);
create index track_features_entity_date_idx on public.track_features (track_id, feature_date desc, feature_set_version);
create index odds_features_race_entry_idx on public.odds_features (race_id, race_date, race_entry_id, snapshot_at desc);
create index odds_features_snapshot_idx on public.odds_features (odds_snapshot_id, race_date);

create index model_training_datasets_window_idx on public.model_training_datasets (training_window_start_date, training_window_end_date, lookback_years);
create index model_evaluation_metrics_model_metric_idx on public.model_evaluation_metrics (model_version_id, metric_key, computed_at desc);
create index prediction_runs_model_scope_idx on public.prediction_runs (model_version_id, scope, status, created_at desc);
create index prediction_results_race_idx on public.prediction_results (race_id, race_date, prediction_type, generated_at desc);
create index prediction_results_entry_idx on public.prediction_results (race_entry_id, race_date, prediction_type, generated_at desc);
create index prediction_results_run_idx on public.prediction_results (prediction_run_id, prediction_date);
create index live_prediction_cache_race_idx on public.live_prediction_cache (race_id, race_date, generated_at desc);
create index live_prediction_cache_expires_idx on public.live_prediction_cache (expires_at);

commit;
