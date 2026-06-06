-- Phase 1A migration design: racing reference tables.
-- Purpose: create canonical provider-aware reference records used by races and
-- Entries without creating application facts yet.
-- Dependencies: 0002_extensions_and_types.sql.
-- Future considerations: add provider reconciliation tables before ingesting
-- multiple racing feeds with materially different identity quality.

begin;

create table public.surfaces (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.surfaces is
  'Canonical racing surface reference data used by races. This is server-managed reference data with no public access by default.';

create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_track_id text not null,
  code text,
  name text not null,
  country_code text,
  region text,
  timezone text not null default 'America/New_York',
  metadata jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_track_id)
);

comment on table public.tracks is
  'Provider-aware racing track reference records. Future provider reconciliation should map multiple provider identities to canonical tracks.';

create table public.horses (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_horse_id text not null,
  name text not null,
  foaling_year integer,
  sex text,
  country_code text,
  metadata jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_horse_id)
);

comment on table public.horses is
  'Provider-aware horse reference records. Race-entry facts link here without overwriting historical entry data.';

create table public.jockeys (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_jockey_id text not null,
  name text not null,
  metadata jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_jockey_id)
);

comment on table public.jockeys is
  'Provider-aware jockey reference records used by immutable race-entry facts.';

create table public.trainers (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_trainer_id text not null,
  name text not null,
  metadata jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_trainer_id)
);

comment on table public.trainers is
  'Provider-aware trainer reference records used by immutable race-entry facts.';

commit;
