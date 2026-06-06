-- Phase 1A migration design: learning lineage and performance verification.
-- Purpose: preserve feature snapshots, model predictions, recommendation
-- outcomes, and rollups without overwriting historical model behavior.
-- Dependencies: 0004_transaction_tables.sql, 0005_opportunity_tables.sql,
-- 0006_wager_tables.sql, and 0007_user_and_entitlement_tables.sql.
-- Future considerations: export append-only fact tables to an analytics
-- warehouse before introducing heavy analytical workloads in Postgres.

begin;

create table public.model_versions (
  id uuid primary key default gen_random_uuid(),
  model_key text not null,
  version text not null,
  status public.model_status not null default 'draft',
  training_data_window tstzrange,
  artifact_uri text,
  parameters jsonb not null default '{}'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  created_by_user_id uuid,
  promoted_at timestamptz,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  unique (model_key, version)
);

comment on table public.model_versions is
  'Immutable model version registry used to preserve prediction and score lineage.';

create table public.feature_snapshots (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null,
  race_date date not null,
  race_entry_id uuid,
  provider text,
  feature_set_key text not null,
  feature_set_version text not null,
  features jsonb not null,
  captured_at timestamptz not null default now(),
  source_job_run_id uuid,
  created_at timestamptz not null default now(),
  foreign key (race_id, race_date) references public.races (id, race_date),
  foreign key (race_entry_id, race_date) references public.race_entries (id, race_date)
);

comment on table public.feature_snapshots is
  'Append-only input feature snapshots. Predictions reference these exact inputs for reproducibility.';

create table public.prediction_outputs (
  id uuid primary key default gen_random_uuid(),
  model_version_id uuid not null references public.model_versions (id),
  feature_snapshot_id uuid not null references public.feature_snapshots (id),
  race_id uuid not null,
  race_date date not null,
  race_entry_id uuid,
  prediction_type text not null,
  probability public.probability_0_1,
  score public.score_0_100,
  output jsonb not null default '{}'::jsonb,
  predicted_at timestamptz not null default now(),
  source_job_run_id uuid,
  created_at timestamptz not null default now(),
  unique (model_version_id, feature_snapshot_id, prediction_type),
  foreign key (race_id, race_date) references public.races (id, race_date),
  foreign key (race_entry_id, race_date) references public.race_entries (id, race_date)
);

comment on table public.prediction_outputs is
  'Append-only model outputs linked to exact model versions and feature snapshots.';

create table public.model_training_runs (
  id uuid primary key default gen_random_uuid(),
  model_key text not null,
  model_version_id uuid references public.model_versions (id),
  status public.job_status not null default 'queued',
  started_at timestamptz,
  finished_at timestamptz,
  training_window tstzrange,
  parameters jsonb not null default '{}'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  source_job_run_id uuid,
  created_at timestamptz not null default now()
);

comment on table public.model_training_runs is
  'Training run audit trail. This table is append-oriented and ties later to job_runs.';

create table public.model_evaluation_runs (
  id uuid primary key default gen_random_uuid(),
  model_version_id uuid not null references public.model_versions (id),
  status public.job_status not null default 'queued',
  evaluation_window tstzrange,
  started_at timestamptz,
  finished_at timestamptz,
  metrics jsonb not null default '{}'::jsonb,
  source_job_run_id uuid,
  created_at timestamptz not null default now()
);

comment on table public.model_evaluation_runs is
  'Model evaluation results for promotion and learning decisions.';

create table public.model_promotions (
  id uuid primary key default gen_random_uuid(),
  model_version_id uuid not null references public.model_versions (id),
  previous_model_version_id uuid references public.model_versions (id),
  promoted_by_user_id uuid,
  reason text,
  promoted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.model_promotions is
  'Append-only model promotion decisions. Rollbacks create new promotion events.';

alter table public.strategy_feature_snapshots
  add constraint strategy_feature_snapshots_feature_snapshot_fk
  foreign key (feature_snapshot_id) references public.feature_snapshots (id);

alter table public.strategy_matches
  add constraint strategy_matches_prediction_output_fk
  foreign key (prediction_output_id) references public.prediction_outputs (id);

alter table public.opportunity_scores
  add constraint opportunity_scores_model_version_fk
  foreign key (model_version_id) references public.model_versions (id),
  add constraint opportunity_scores_prediction_output_fk
  foreign key (prediction_output_id) references public.prediction_outputs (id);

create table public.performance_runs (
  id uuid primary key default gen_random_uuid(),
  run_key text not null unique,
  status public.job_status not null default 'queued',
  evaluation_start_date date,
  evaluation_end_date date,
  started_at timestamptz,
  finished_at timestamptz,
  parameters jsonb not null default '{}'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  source_job_run_id uuid,
  created_at timestamptz not null default now()
);

comment on table public.performance_runs is
  'Performance verification batch metadata for strategy, model, and recommendation result calculations.';

create table public.recommendation_results (
  id uuid not null default gen_random_uuid(),
  race_date date not null,
  wager_recommendation_id uuid not null,
  opportunity_id uuid not null,
  result_version_id uuid not null references public.result_versions (id),
  performance_run_id uuid references public.performance_runs (id),
  verification_status public.verification_status not null default 'pending',
  stake public.nonnegative_numeric,
  payout public.nonnegative_numeric,
  profit_loss numeric,
  roi numeric,
  closing_odds_snapshot_id uuid,
  verified_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (id, race_date),
  unique (wager_recommendation_id, race_date, result_version_id),
  foreign key (wager_recommendation_id, race_date) references public.wager_recommendations (id, race_date),
  foreign key (opportunity_id, race_date) references public.opportunities (id, race_date)
) partition by range (race_date);

comment on table public.recommendation_results is
  'Append-only recommendation verification facts partitioned by race_date. Corrections append new result-linked rows.';
comment on column public.recommendation_results.closing_odds_snapshot_id is
  'References odds_snapshots by id in application logic; race_date preserves the partition-pruning key.';

create table public.recommendation_result_events (
  id uuid primary key default gen_random_uuid(),
  recommendation_result_id uuid not null,
  race_date date not null,
  previous_status public.verification_status,
  new_status public.verification_status not null,
  event_type text not null,
  event_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (recommendation_result_id, race_date) references public.recommendation_results (id, race_date)
);

comment on table public.recommendation_result_events is
  'Append-only verification event history for recommendation results.';

create table public.user_wager_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_recorded_wager_id uuid not null references public.user_recorded_wagers (id),
  result_version_id uuid references public.result_versions (id),
  verification_status public.verification_status not null default 'pending',
  stake public.nonnegative_numeric,
  payout public.nonnegative_numeric,
  profit_loss numeric,
  roi numeric,
  verified_at timestamptz,
  client_mutation_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, user_recorded_wager_id, result_version_id),
  unique (user_id, client_mutation_id)
);

comment on table public.user_wager_results is
  'User-owned wager result verification, separated from system recommendation performance.';

create table public.opportunity_performance_rollups (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null,
  race_date date not null,
  performance_run_id uuid references public.performance_runs (id),
  result_count integer not null default 0,
  win_count integer not null default 0,
  total_staked public.nonnegative_numeric not null default 0,
  total_payout public.nonnegative_numeric not null default 0,
  total_profit_loss numeric not null default 0,
  roi numeric,
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  foreign key (opportunity_id, race_date) references public.opportunities (id, race_date)
);

comment on table public.opportunity_performance_rollups is
  'Derived rollup for Opportunity performance. Source facts remain recommendation_results.';

create table public.strategy_performance_rollups (
  id uuid primary key default gen_random_uuid(),
  strategy_id uuid not null references public.strategies (id),
  strategy_version_id uuid references public.strategy_versions (id),
  performance_run_id uuid references public.performance_runs (id),
  evaluation_start_date date,
  evaluation_end_date date,
  result_count integer not null default 0,
  win_count integer not null default 0,
  total_staked public.nonnegative_numeric not null default 0,
  total_payout public.nonnegative_numeric not null default 0,
  total_profit_loss numeric not null default 0,
  roi numeric,
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.strategy_performance_rollups is
  'Derived strategy performance read model for internal analytics and future marketplace trust signals.';

create table public.model_performance_rollups (
  id uuid primary key default gen_random_uuid(),
  model_version_id uuid not null references public.model_versions (id),
  performance_run_id uuid references public.performance_runs (id),
  evaluation_start_date date,
  evaluation_end_date date,
  prediction_count integer not null default 0,
  calibration_metrics jsonb not null default '{}'::jsonb,
  financial_metrics jsonb not null default '{}'::jsonb,
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.model_performance_rollups is
  'Derived model performance read model. Warehouse exports should use both this rollup and raw prediction/result facts.';

commit;
