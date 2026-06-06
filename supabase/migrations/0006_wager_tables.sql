-- Phase 1A migration design: system wager recommendation structures.
-- Purpose: separate Strideo-generated recommendations from user-recorded
-- wagers and normalize multi-leg/multi-entry constructions.
-- Dependencies: 0005_opportunity_tables.sql.
-- Future considerations: add wager_combinations before supporting superfecta,
-- multi-race exotics, or optimizer-generated ticket grids.

begin;

create table public.wager_templates (
  id uuid primary key default gen_random_uuid(),
  strategy_id uuid references public.strategies (id),
  name text not null,
  wager_type public.wager_type not null,
  description text,
  template jsonb not null default '{}'::jsonb,
  min_bankroll public.nonnegative_numeric,
  max_bankroll public.nonnegative_numeric,
  status public.strategy_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.wager_templates is
  'Reusable system wager construction templates. These are not user-recorded wagers.';

create table public.wager_recommendations (
  id uuid not null default gen_random_uuid(),
  race_date date not null,
  opportunity_id uuid not null,
  race_id uuid not null,
  strategy_id uuid references public.strategies (id),
  strategy_version_id uuid references public.strategy_versions (id),
  wager_template_id uuid references public.wager_templates (id),
  wager_type public.wager_type not null,
  status public.wager_recommendation_status not null default 'active',
  version_number integer not null default 1,
  supersedes_wager_recommendation_id uuid,
  recommended_stake public.nonnegative_numeric,
  min_odds_decimal numeric,
  expected_value numeric,
  confidence public.score_0_100,
  rationale text,
  generated_at timestamptz not null default now(),
  expires_at timestamptz,
  source_job_run_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (id, race_date),
  unique (opportunity_id, race_date, version_number),
  foreign key (opportunity_id, race_date) references public.opportunities (id, race_date),
  foreign key (race_id, race_date) references public.races (id, race_date),
  foreign key (supersedes_wager_recommendation_id, race_date)
    references public.wager_recommendations (id, race_date)
) partition by range (race_date);

comment on table public.wager_recommendations is
  'Append-only system recommendations. Replacement/version history is represented by newer rows pointing to superseded recommendations.';

create table public.wager_recommendation_events (
  id uuid primary key default gen_random_uuid(),
  wager_recommendation_id uuid not null,
  race_date date not null,
  previous_status public.wager_recommendation_status,
  new_status public.wager_recommendation_status not null,
  event_type text not null,
  event_at timestamptz not null default now(),
  actor_type text not null default 'system',
  actor_user_id uuid,
  source_job_run_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (wager_recommendation_id, race_date) references public.wager_recommendations (id, race_date)
);

comment on table public.wager_recommendation_events is
  'Append-only recommendation status and replacement history. The current status column is a read model.';

create table public.wager_recommendation_legs (
  id uuid primary key default gen_random_uuid(),
  wager_recommendation_id uuid not null,
  race_date date not null,
  leg_number integer not null,
  leg_role text not null,
  required_finish_position integer,
  created_at timestamptz not null default now(),
  unique (wager_recommendation_id, race_date, leg_number),
  foreign key (wager_recommendation_id, race_date) references public.wager_recommendations (id, race_date)
);

comment on table public.wager_recommendation_legs is
  'Normalized recommendation legs for win/place/show/exacta/trifecta structures.';

create table public.wager_recommendation_leg_entries (
  id uuid primary key default gen_random_uuid(),
  wager_recommendation_leg_id uuid not null references public.wager_recommendation_legs (id),
  race_date date not null,
  race_entry_id uuid not null,
  selection_role public.wager_selection_role not null,
  ordinal integer not null default 1,
  created_at timestamptz not null default now(),
  unique (wager_recommendation_leg_id, race_entry_id, selection_role),
  foreign key (race_entry_id, race_date) references public.race_entries (id, race_date)
);

comment on table public.wager_recommendation_leg_entries is
  'Normalized entries selected within a recommendation leg, supporting multi-horse wager construction.';

commit;
