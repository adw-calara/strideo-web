-- Racing-form unresolved source-code queue.
-- Purpose: let ingestion flag source/vendor shorthand that cannot yet resolve
-- through the glossary, without losing the original value or blocking
-- Opportunity-centered source-fact preservation.
-- Dependencies: racing-form data foundation and glossary reference tables.

begin;

create table public.racing_unresolved_source_codes (
  id uuid primary key default gen_random_uuid(),
  code_set_id uuid references public.racing_code_sets (id),
  source_system text not null,
  source_field text not null,
  source_code text not null,
  source_label text,
  source_description text,
  source_context jsonb not null default '{}'::jsonb,
  sample_payload jsonb not null default '{}'::jsonb,
  sample_source_table text,
  sample_source_id uuid,
  race_id uuid,
  race_date date,
  opportunity_id uuid,
  effective_on date,
  source_url text,
  source_job_run_id uuid references public.job_runs (id),
  status text not null default 'open',
  resolution_code_alias_id uuid references public.racing_code_aliases (id),
  resolution_track_alias_id uuid references public.track_code_aliases (id),
  occurrence_count integer not null default 1,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by_user_id uuid references auth.users (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (race_id, race_date) references public.races (id, race_date),
  foreign key (opportunity_id, race_date) references public.opportunities (id, race_date),
  constraint racing_unresolved_source_codes_source_system_not_blank check (length(btrim(source_system)) > 0),
  constraint racing_unresolved_source_codes_source_field_not_blank check (length(btrim(source_field)) > 0),
  constraint racing_unresolved_source_codes_source_code_not_blank check (length(btrim(source_code)) > 0),
  constraint racing_unresolved_source_codes_status_allowed check (
    status in ('open', 'reviewing', 'mapped', 'ignored', 'deferred')
  ),
  constraint racing_unresolved_source_codes_occurrence_count_positive check (occurrence_count > 0),
  constraint racing_unresolved_source_codes_race_pair check (
    (race_id is null and race_date is null and opportunity_id is null) or
    (race_date is not null)
  ),
  constraint racing_unresolved_source_codes_mapped_resolution check (
    status <> 'mapped' or
    resolution_code_alias_id is not null or
    resolution_track_alias_id is not null
  )
);

comment on table public.racing_unresolved_source_codes is
  'Server-managed review queue for source/vendor racing-form codes that ingestion could not resolve through racing_code_aliases or track_code_aliases.';
comment on column public.racing_unresolved_source_codes.source_code is
  'Raw source shorthand exactly as received from the provider. Ingestion must preserve this value on the source fact and log it here when no canonical alias resolves.';
comment on column public.racing_unresolved_source_codes.source_field is
  'Provider field or parsing context, such as race_type, track_condition, workout_location, equipment, medication, horse_color, or track_code.';
comment on column public.racing_unresolved_source_codes.source_context is
  'Structured context useful for review, for example provider schema version, parser version, field path, track code, race date, or source document type.';
comment on column public.racing_unresolved_source_codes.effective_on is
  'Source-effective date used to resolve aliases when rules, track codes, medication status, or provider semantics change over time.';
comment on column public.racing_unresolved_source_codes.opportunity_id is
  'Optional Opportunity link when an unresolved source code affected Opportunity evidence, scoring, or explanation lineage.';

alter table public.racing_unresolved_source_codes enable row level security;

-- Intentionally no anon/authenticated grants or browser-facing policies. The
-- unresolved-code queue is operational ingestion metadata and remains
-- server-managed until a reviewed admin surface exists.
grant select, insert, update on table public.racing_unresolved_source_codes
to service_role;

create index racing_unresolved_source_codes_status_idx
  on public.racing_unresolved_source_codes (status, last_seen_at desc);
create index racing_unresolved_source_codes_source_idx
  on public.racing_unresolved_source_codes (source_system, source_field, source_code);
create index racing_unresolved_source_codes_code_set_idx
  on public.racing_unresolved_source_codes (code_set_id, status);
create index racing_unresolved_source_codes_job_idx
  on public.racing_unresolved_source_codes (source_job_run_id);
create index racing_unresolved_source_codes_opportunity_idx
  on public.racing_unresolved_source_codes (opportunity_id, race_date)
  where opportunity_id is not null;
create unique index racing_unresolved_source_codes_active_queue_uniq
  on public.racing_unresolved_source_codes (
    lower(source_system),
    coalesce(code_set_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(source_field),
    lower(source_code),
    coalesce(effective_on, '9999-12-31'::date)
  )
  where status in ('open', 'reviewing', 'deferred');

commit;
