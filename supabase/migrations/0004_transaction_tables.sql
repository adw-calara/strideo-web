-- Phase 1A migration design: race transaction and result-version tables.
-- Purpose: preserve race cards, entries, odds snapshots, and result corrections
-- as historical facts.
-- Dependencies: 0002_extensions_and_types.sql and 0003_reference_tables.sql.
-- Future considerations: operational partition creation must run before live
-- ingestion; this design uses default partitions added in 0011 as a safety net.

begin;

create table public.races (
  id uuid not null default gen_random_uuid(),
  race_date date not null,
  provider text not null,
  provider_race_id text not null,
  track_id uuid not null references public.tracks (id),
  surface_id uuid references public.surfaces (id),
  race_number integer not null,
  name text,
  status public.race_status not null default 'scheduled',
  scheduled_at timestamptz,
  off_at timestamptz,
  distance_text text,
  distance_yards integer,
  race_type text,
  class_rating text,
  purse public.nonnegative_numeric,
  conditions text,
  metadata jsonb not null default '{}'::jsonb,
  source_job_run_id uuid,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id, race_date),
  unique (provider, provider_race_id, race_date),
  unique (track_id, race_date, race_number)
) partition by range (race_date);

comment on table public.races is
  'Race-level transaction facts partitioned by race_date for feed, opportunity, and warehouse extract access paths.';
comment on column public.races.source_job_run_id is
  'References job_runs after audit tables exist; intentionally not constrained in this ordered design migration.';

create table public.race_entries (
  id uuid not null default gen_random_uuid(),
  race_date date not null,
  race_id uuid not null,
  provider text not null,
  provider_entry_id text not null,
  post_position integer,
  program_number text,
  horse_id uuid references public.horses (id),
  jockey_id uuid references public.jockeys (id),
  trainer_id uuid references public.trainers (id),
  status public.entry_status not null default 'entered',
  morning_line_odds text,
  weight_lbs integer,
  medication text,
  equipment text,
  metadata jsonb not null default '{}'::jsonb,
  source_job_run_id uuid,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id, race_date),
  unique (provider, provider_entry_id, race_date),
  unique (race_id, race_date, program_number),
  foreign key (race_id, race_date) references public.races (id, race_date)
) partition by range (race_date);

comment on table public.race_entries is
  'Race-entry transaction facts. Entry changes are recorded through entry_events instead of overwriting historical state.';

create table public.entry_events (
  id uuid primary key default gen_random_uuid(),
  race_entry_id uuid not null,
  race_date date not null,
  event_type text not null,
  event_at timestamptz not null default now(),
  previous_status public.entry_status,
  new_status public.entry_status,
  payload jsonb not null default '{}'::jsonb,
  source_job_run_id uuid,
  created_at timestamptz not null default now(),
  foreign key (race_entry_id, race_date) references public.race_entries (id, race_date)
);

comment on table public.entry_events is
  'Append-only entry lifecycle events such as scratches and reinstatements.';

create table public.odds_snapshots (
  id uuid not null default gen_random_uuid(),
  race_date date not null,
  race_id uuid not null,
  race_entry_id uuid,
  provider text not null,
  pool_type text not null,
  odds_fractional text,
  odds_decimal numeric,
  implied_probability public.probability_0_1,
  pool_total public.nonnegative_numeric,
  snapshot_at timestamptz not null,
  sequence_number bigint,
  payload jsonb not null default '{}'::jsonb,
  source_job_run_id uuid,
  created_at timestamptz not null default now(),
  primary key (id, race_date),
  foreign key (race_id, race_date) references public.races (id, race_date),
  foreign key (race_entry_id, race_date) references public.race_entries (id, race_date)
) partition by range (race_date);

comment on table public.odds_snapshots is
  'Append-only odds facts partitioned by race_date. Odds are never updated in place.';

create table public.result_versions (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null,
  race_date date not null,
  result_version integer not null,
  status public.result_status not null default 'unofficial',
  official_at timestamptz,
  correction_of_result_version_id uuid references public.result_versions (id),
  source text not null,
  payload jsonb not null default '{}'::jsonb,
  source_job_run_id uuid,
  created_at timestamptz not null default now(),
  unique (race_id, race_date, result_version),
  foreign key (race_id, race_date) references public.races (id, race_date)
);

comment on table public.result_versions is
  'Append-only race result versions. Corrections create new versions and preserve the prior result.';

create table public.result_entries (
  id uuid primary key default gen_random_uuid(),
  result_version_id uuid not null references public.result_versions (id),
  race_entry_id uuid not null,
  race_date date not null,
  finish_position integer,
  dead_heat_group text,
  beaten_lengths numeric,
  payout_win public.nonnegative_numeric,
  payout_place public.nonnegative_numeric,
  payout_show public.nonnegative_numeric,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (result_version_id, race_entry_id),
  foreign key (race_entry_id, race_date) references public.race_entries (id, race_date)
);

comment on table public.result_entries is
  'Entry-level facts for each result version, including payout and correction history.';

commit;
