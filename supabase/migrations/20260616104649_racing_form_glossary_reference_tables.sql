-- Racing-form glossary reference tables.
-- Purpose: normalize source/vendor shorthand into canonical values that can
-- support ingestion, ML feature engineering, and explainable Opportunity value
-- calculations without adding UI, ingestion jobs, or seed data.
-- Dependencies: existing Phase 1 reference tables, especially public.tracks.

begin;

create table public.racing_code_sets (
  id uuid primary key default gen_random_uuid(),
  code_set_key text not null,
  display_name text not null,
  description text,
  created_at timestamptz not null default now(),
  constraint racing_code_sets_key_not_blank check (length(btrim(code_set_key)) > 0),
  constraint racing_code_sets_display_name_not_blank check (length(btrim(display_name)) > 0),
  constraint racing_code_sets_key_uniq unique (code_set_key)
);

comment on table public.racing_code_sets is
  'Server-managed glossary categories for racing-form shorthand such as race type, track condition, workout type, equipment, medication, surface, horse color, horse sex, finish margin, trouble note, and wager type.';

create table public.racing_code_values (
  id uuid primary key default gen_random_uuid(),
  code_set_id uuid not null references public.racing_code_sets (id),
  canonical_code text not null,
  canonical_label text not null,
  description text,
  normalized_value jsonb not null default '{}'::jsonb,
  sort_order integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint racing_code_values_code_not_blank check (length(btrim(canonical_code)) > 0),
  constraint racing_code_values_label_not_blank check (length(btrim(canonical_label)) > 0),
  constraint racing_code_values_set_id_uniq unique (id, code_set_id),
  constraint racing_code_values_set_code_uniq unique (code_set_id, canonical_code)
);

comment on table public.racing_code_values is
  'Canonical normalized values inside a racing-form glossary category. These values are the stable feature/explanation targets for source-specific shorthand aliases.';
comment on column public.racing_code_values.normalized_value is
  'Structured normalized payload used by ingestion and feature engineering, for example standardized condition severity, surface family, or model feature keys.';

create table public.racing_code_aliases (
  id uuid primary key default gen_random_uuid(),
  code_set_id uuid not null references public.racing_code_sets (id),
  code_value_id uuid not null,
  source_system text not null,
  source_code text not null,
  source_label text,
  source_description text,
  confidence numeric not null default 1,
  effective_from date,
  effective_to date,
  is_active boolean not null default true,
  source_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (code_value_id, code_set_id)
    references public.racing_code_values (id, code_set_id),
  constraint racing_code_aliases_source_system_not_blank check (length(btrim(source_system)) > 0),
  constraint racing_code_aliases_source_code_not_blank check (length(btrim(source_code)) > 0),
  constraint racing_code_aliases_confidence_range check (confidence >= 0 and confidence <= 1),
  constraint racing_code_aliases_effective_dates_order check (
    effective_from is null or effective_to is null or effective_from <= effective_to
  )
);

comment on table public.racing_code_aliases is
  'Source-specific shorthand mappings from DRF, Equibase, BRISnet, TrackMaster, API providers, or track programs to canonical racing_code_values.';
comment on column public.racing_code_aliases.source_code is
  'Raw source shorthand or code as published by the provider. Preserve exact source values on fact tables and resolve through this alias layer.';

create table public.track_code_aliases (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks (id),
  source_system text not null,
  source_track_code text not null,
  source_track_name text,
  state text,
  country text,
  is_active boolean not null default true,
  effective_from date,
  effective_to date,
  source_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint track_code_aliases_source_system_not_blank check (length(btrim(source_system)) > 0),
  constraint track_code_aliases_source_track_code_not_blank check (length(btrim(source_track_code)) > 0),
  constraint track_code_aliases_effective_dates_order check (
    effective_from is null or effective_to is null or effective_from <= effective_to
  )
);

comment on table public.track_code_aliases is
  'Vendor/source-specific track-code mappings to canonical public.tracks records, including active, historical, training, and alternate codes.';
comment on column public.track_code_aliases.track_id is
  'Canonical Strideo track identity. Multiple vendor aliases may map to one track when sources differ.';

alter table public.racing_code_sets enable row level security;
alter table public.racing_code_values enable row level security;
alter table public.racing_code_aliases enable row level security;
alter table public.track_code_aliases enable row level security;

-- Intentionally no anon/authenticated grants or browser-facing policies. These
-- glossary tables remain server-managed until a specific read surface is
-- approved. service_role can maintain reference data for ingestion/value jobs.
grant select, insert, update on table
  public.racing_code_sets,
  public.racing_code_values,
  public.racing_code_aliases,
  public.track_code_aliases
to service_role;

create index racing_code_values_set_active_idx
  on public.racing_code_values (code_set_id, is_active, sort_order, canonical_code);

create index racing_code_aliases_value_idx
  on public.racing_code_aliases (code_value_id);
create index racing_code_aliases_lookup_idx
  on public.racing_code_aliases (code_set_id, source_system, source_code)
  where is_active;
create unique index racing_code_aliases_active_current_uniq
  on public.racing_code_aliases (code_set_id, lower(source_system), lower(source_code))
  where is_active and effective_to is null;

create index track_code_aliases_track_idx
  on public.track_code_aliases (track_id);
create index track_code_aliases_lookup_idx
  on public.track_code_aliases (source_system, source_track_code)
  where is_active;
create unique index track_code_aliases_active_current_uniq
  on public.track_code_aliases (lower(source_system), lower(source_track_code))
  where is_active and effective_to is null;

commit;
