-- Racing form data foundation.
-- Purpose: preserve normalized racing-form source facts needed for horse
-- history, workouts, trainer stats, structured race conditions, and
-- append-only value-calculation lineage without changing current app reads.
-- Dependencies: existing Phase 1 reference, transaction, Opportunity,
-- learning, source-file, and feature-store tables.

begin;

create table public.owners (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_owner_id text not null,
  name text not null,
  metadata jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_owner_id)
);

comment on table public.owners is
  'Provider-aware owner reference records used by racing-form source facts and entry-level owner relationships.';

alter table public.races
  add column claiming_price public.nonnegative_numeric,
  add column class_level text,
  add column age_restriction text,
  add column sex_restriction text,
  add column weight_conditions text,
  add column field_size integer,
  add column weather text,
  add column track_condition text,
  add column available_wager_types text[] not null default '{}'::text[],
  add column condition_payload jsonb not null default '{}'::jsonb,
  add constraint races_field_size_positive check (field_size is null or field_size > 0);

comment on column public.races.claiming_price is
  'Structured claiming price when available from the racing form or provider feed.';
comment on column public.races.class_level is
  'Structured race class level; preserves class_rating while enabling model features and filtering.';
comment on column public.races.age_restriction is
  'Race-level age restrictions as published by the source provider.';
comment on column public.races.sex_restriction is
  'Race-level sex restrictions as published by the source provider.';
comment on column public.races.weight_conditions is
  'Race-level weight conditions as published by the source provider.';
comment on column public.races.field_size is
  'Published field size for the race card at ingestion time.';
comment on column public.races.available_wager_types is
  'Published wager types available for this race when provided by the source feed.';
comment on column public.races.condition_payload is
  'Provider-specific structured race-condition payload not yet promoted to first-class columns.';

alter table public.race_entries
  add column owner_id uuid references public.owners (id),
  add column claimed_from_owner_id uuid references public.owners (id),
  add column claimed_by_owner_id uuid references public.owners (id),
  add column layoff_days integer,
  add column physical_notes text,
  add column entry_comments text,
  add column trip_notes text,
  add constraint race_entries_layoff_days_nonnegative check (layoff_days is null or layoff_days >= 0);

comment on column public.race_entries.owner_id is
  'Owner associated with this specific race entry when available from the racing form.';
comment on column public.race_entries.claimed_from_owner_id is
  'Prior owner when the entry reflects a claim event.';
comment on column public.race_entries.claimed_by_owner_id is
  'New owner when the entry reflects a claim event.';
comment on column public.race_entries.layoff_days is
  'Days since the horse last raced, when available or safely derived at ingestion time.';
comment on column public.race_entries.physical_notes is
  'Provider-published physical observations for this entry.';
comment on column public.race_entries.entry_comments is
  'Provider-published entry comments or form notes.';
comment on column public.race_entries.trip_notes is
  'Trip notes relevant to this entry when supplied on the current form.';

create table public.horse_past_performances (
  id uuid primary key default gen_random_uuid(),
  horse_id uuid not null references public.horses (id),
  observed_for_race_entry_id uuid,
  observed_for_race_date date,
  provider text not null,
  provider_past_performance_id text,
  prior_race_id uuid,
  prior_race_date date not null,
  prior_track_id uuid references public.tracks (id),
  prior_race_number integer,
  surface_id uuid references public.surfaces (id),
  distance_text text,
  distance_yards integer,
  track_condition text,
  race_type text,
  class_level text,
  claiming_price public.nonnegative_numeric,
  purse public.nonnegative_numeric,
  field_size integer,
  post_position integer,
  start_call_position integer,
  first_call_position integer,
  second_call_position integer,
  stretch_call_position integer,
  finish_position integer,
  beaten_lengths numeric,
  fractional_times jsonb not null default '{}'::jsonb,
  final_time_seconds numeric,
  speed_figure numeric,
  beyer_speed_figure numeric,
  pace_figures jsonb not null default '{}'::jsonb,
  odds_fractional text,
  odds_decimal numeric,
  jockey_id uuid references public.jockeys (id),
  trainer_id uuid references public.trainers (id),
  weight_lbs integer,
  medication text,
  equipment text,
  trip_notes text,
  trouble_notes text,
  winner_name text,
  top_finishers jsonb not null default '[]'::jsonb,
  next_out_indicators jsonb not null default '{}'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  source_data_file_id uuid references public.source_data_files (id),
  data_ingestion_batch_id uuid references public.data_ingestion_batches (id),
  source_job_run_id uuid references public.job_runs (id),
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  foreign key (observed_for_race_entry_id, observed_for_race_date)
    references public.race_entries (id, race_date),
  foreign key (prior_race_id, prior_race_date)
    references public.races (id, race_date),
  check (
    (observed_for_race_entry_id is null and observed_for_race_date is null) or
    (observed_for_race_entry_id is not null and observed_for_race_date is not null)
  ),
  check (prior_race_number is null or prior_race_number > 0),
  check (distance_yards is null or distance_yards > 0),
  check (field_size is null or field_size > 0),
  check (post_position is null or post_position > 0),
  check (start_call_position is null or start_call_position > 0),
  check (first_call_position is null or first_call_position > 0),
  check (second_call_position is null or second_call_position > 0),
  check (stretch_call_position is null or stretch_call_position > 0),
  check (finish_position is null or finish_position > 0),
  check (final_time_seconds is null or final_time_seconds > 0),
  check (odds_decimal is null or odds_decimal >= 0),
  check (weight_lbs is null or weight_lbs > 0)
);

comment on table public.horse_past_performances is
  'Normalized horse past-performance lines captured from racing forms and provider feeds. Feature tables and model snapshots should derive from these facts instead of replacing them.';
comment on column public.horse_past_performances.observed_for_race_entry_id is
  'Optional current race entry whose published form included this past-performance line.';
comment on column public.horse_past_performances.raw_payload is
  'Provider-specific past-performance payload retained for fields not yet modeled as first-class columns.';

create table public.horse_workouts (
  id uuid primary key default gen_random_uuid(),
  horse_id uuid not null references public.horses (id),
  trainer_id uuid references public.trainers (id),
  provider text not null,
  provider_workout_id text,
  workout_date date not null,
  track_id uuid references public.tracks (id),
  location_text text,
  surface_id uuid references public.surfaces (id),
  distance_text text,
  distance_yards integer,
  workout_time_seconds numeric,
  rank_at_distance integer,
  work_count_at_distance integer,
  work_type text,
  breezing boolean,
  handily boolean,
  gate boolean,
  bullet boolean not null default false,
  layoff_sequence_number integer,
  days_since_previous_workout integer,
  workout_trend text,
  inferred_signals jsonb not null default '{}'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  source_data_file_id uuid references public.source_data_files (id),
  data_ingestion_batch_id uuid references public.data_ingestion_batches (id),
  source_job_run_id uuid references public.job_runs (id),
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (distance_yards is null or distance_yards > 0),
  check (workout_time_seconds is null or workout_time_seconds > 0),
  check (rank_at_distance is null or rank_at_distance > 0),
  check (work_count_at_distance is null or work_count_at_distance > 0),
  check (
    rank_at_distance is null or
    work_count_at_distance is null or
    rank_at_distance <= work_count_at_distance
  ),
  check (layoff_sequence_number is null or layoff_sequence_number > 0),
  check (days_since_previous_workout is null or days_since_previous_workout >= 0)
);

comment on table public.horse_workouts is
  'Normalized horse workout and training facts used for form analysis, feature engineering, and explainable trainer-intent signals.';
comment on column public.horse_workouts.inferred_signals is
  'Explainable derived workout signals. Store only auditable signals derived from preserved source facts.';

create table public.trainer_performance_stats (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers (id),
  provider text not null,
  stat_date date not null,
  window_start_date date,
  window_end_date date,
  stat_context text not null,
  track_id uuid references public.tracks (id),
  surface_id uuid references public.surfaces (id),
  jockey_id uuid references public.jockeys (id),
  owner_id uuid references public.owners (id),
  distance_category text,
  race_type text,
  class_level text,
  starts integer not null default 0,
  wins integer not null default 0,
  places integer not null default 0,
  shows integer not null default 0,
  win_percentage public.probability_0_1,
  place_percentage public.probability_0_1,
  show_percentage public.probability_0_1,
  earnings public.nonnegative_numeric,
  roi numeric,
  metrics jsonb not null default '{}'::jsonb,
  source_data_file_id uuid references public.source_data_files (id),
  data_ingestion_batch_id uuid references public.data_ingestion_batches (id),
  source_job_run_id uuid references public.job_runs (id),
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (window_start_date is null or window_end_date is null or window_start_date <= window_end_date),
  check (starts >= 0),
  check (wins >= 0 and wins <= starts),
  check (places >= 0 and places <= starts),
  check (shows >= 0 and shows <= starts)
);

comment on table public.trainer_performance_stats is
  'Provider-published or ingestion-derived trainer performance statistics by context. Trainer feature rows should derive from these preserved facts.';
comment on column public.trainer_performance_stats.stat_context is
  'Context key such as overall, track, surface, first_off_layoff, first_after_claim, jockey_combo, owner_combo, sprint_to_route, or recent_30_days.';
comment on column public.trainer_performance_stats.metrics is
  'Provider-specific trainer metrics not yet promoted to stable first-class columns.';

create table public.value_calculations (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null,
  race_date date not null,
  race_entry_id uuid,
  horse_id uuid references public.horses (id),
  opportunity_id uuid,
  model_version_id uuid references public.model_versions (id),
  feature_snapshot_id uuid not null references public.feature_snapshots (id),
  odds_snapshot_id uuid,
  prediction_output_id uuid references public.prediction_outputs (id),
  result_version_id uuid,
  value_method_key text not null,
  value_method_version text not null,
  model_probability public.probability_0_1,
  market_probability public.probability_0_1,
  fair_odds_decimal numeric,
  fair_value numeric,
  edge numeric,
  expected_value numeric,
  value_score public.score_0_100,
  stake_basis public.nonnegative_numeric,
  output jsonb not null default '{}'::jsonb,
  calculated_at timestamptz not null default now(),
  source_job_run_id uuid references public.job_runs (id),
  created_at timestamptz not null default now(),
  constraint value_calculations_calculation_identity_uniq unique nulls not distinct (
    feature_snapshot_id,
    odds_snapshot_id,
    prediction_output_id,
    value_method_key,
    value_method_version
  ),
  foreign key (race_id, race_date) references public.races (id, race_date),
  foreign key (race_entry_id, race_date) references public.race_entries (id, race_date),
  foreign key (opportunity_id, race_date) references public.opportunities (id, race_date),
  foreign key (odds_snapshot_id, race_date) references public.odds_snapshots (id, race_date),
  foreign key (result_version_id, race_date) references public.result_versions (id, race_date),
  check (fair_odds_decimal is null or fair_odds_decimal > 0)
);

comment on table public.value_calculations is
  'Append-only value and fair-price calculations linked to model, feature, odds, Opportunity, and result lineage.';
comment on column public.value_calculations.feature_snapshot_id is
  'Exact model feature snapshot available at calculation time.';
comment on column public.value_calculations.odds_snapshot_id is
  'Market odds snapshot used for odds-vs-fair-value comparison.';
comment on column public.value_calculations.prediction_output_id is
  'Model prediction output used as an input to the value calculation, when applicable.';

alter table public.opportunity_scores
  add column value_calculation_id uuid references public.value_calculations (id);

comment on column public.opportunity_scores.value_calculation_id is
  'Optional link to the append-only value calculation that supported this Opportunity score.';

alter table public.owners enable row level security;
alter table public.horse_past_performances enable row level security;
alter table public.horse_workouts enable row level security;
alter table public.trainer_performance_stats enable row level security;
alter table public.value_calculations enable row level security;

-- Intentionally no anon/authenticated grants or browser-facing policies. These
-- source facts remain server-owned until explicit access patterns are approved.
grant select, insert, update on table public.owners to service_role;
grant select, insert on table
  public.horse_past_performances,
  public.horse_workouts,
  public.trainer_performance_stats,
  public.value_calculations
to service_role;

create index owners_name_idx on public.owners (name);

create index races_conditions_lookup_idx
  on public.races (race_date, track_id, race_type, class_level);
create index race_entries_owner_idx
  on public.race_entries (owner_id, race_date);
create index race_entries_layoff_idx
  on public.race_entries (horse_id, layoff_days, race_date);

create unique index horse_past_performances_provider_id_idx
  on public.horse_past_performances (provider, provider_past_performance_id)
  where provider_past_performance_id is not null;
create index horse_past_performances_horse_date_idx
  on public.horse_past_performances (horse_id, prior_race_date desc);
create index horse_past_performances_observed_entry_idx
  on public.horse_past_performances (observed_for_race_entry_id, observed_for_race_date, prior_race_date desc);
create index horse_past_performances_prior_race_idx
  on public.horse_past_performances (prior_race_id, prior_race_date);
create index horse_past_performances_trainer_date_idx
  on public.horse_past_performances (trainer_id, prior_race_date desc);

create unique index horse_workouts_provider_id_idx
  on public.horse_workouts (provider, provider_workout_id)
  where provider_workout_id is not null;
create index horse_workouts_horse_date_idx
  on public.horse_workouts (horse_id, workout_date desc);
create index horse_workouts_trainer_date_idx
  on public.horse_workouts (trainer_id, workout_date desc);
create index horse_workouts_track_date_idx
  on public.horse_workouts (track_id, workout_date desc);

create index trainer_performance_stats_trainer_date_idx
  on public.trainer_performance_stats (trainer_id, stat_date desc, stat_context);
create index trainer_performance_stats_track_idx
  on public.trainer_performance_stats (trainer_id, track_id, stat_date desc);
create index trainer_performance_stats_jockey_idx
  on public.trainer_performance_stats (trainer_id, jockey_id, stat_date desc);
create index trainer_performance_stats_owner_idx
  on public.trainer_performance_stats (trainer_id, owner_id, stat_date desc);
create index trainer_performance_stats_provider_context_idx
  on public.trainer_performance_stats (provider, stat_context, stat_date desc);

create index value_calculations_feature_snapshot_idx
  on public.value_calculations (feature_snapshot_id, calculated_at desc);
create index value_calculations_odds_snapshot_idx
  on public.value_calculations (odds_snapshot_id, race_date);
create index value_calculations_prediction_output_idx
  on public.value_calculations (prediction_output_id, calculated_at desc);
create index value_calculations_opportunity_idx
  on public.value_calculations (opportunity_id, race_date, calculated_at desc);
create index value_calculations_race_entry_idx
  on public.value_calculations (race_entry_id, race_date, calculated_at desc);
create index value_calculations_model_idx
  on public.value_calculations (model_version_id, race_date, value_method_key);
create index value_calculations_result_idx
  on public.value_calculations (result_version_id, race_date);
create index opportunity_scores_value_calculation_idx
  on public.opportunity_scores (value_calculation_id);

commit;
