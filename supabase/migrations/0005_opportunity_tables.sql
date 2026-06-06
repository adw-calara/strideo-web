-- Phase 1A migration design: strategy and Opportunity aggregate tables.
-- Purpose: model global Opportunities separately from user workflow state while
-- preserving strategy, score, explanation, and lifecycle history.
-- Dependencies: 0002_extensions_and_types.sql and 0004_transaction_tables.sql.
-- Future considerations: owner_user_id columns receive RLS in 0010; marketplace
-- commerce tables remain deferred until the product requires monetization.

begin;

create table public.strategies (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid,
  slug text not null unique,
  name text not null,
  description text,
  visibility public.strategy_visibility not null default 'private',
  status public.strategy_status not null default 'draft',
  publication_status public.strategy_publication_status not null default 'draft',
  license_type public.strategy_license_type not null default 'private',
  validation_status public.strategy_validation_status not null default 'untested',
  current_version_id uuid,
  parent_strategy_id uuid references public.strategies (id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.strategies is
  'Strategy ownership and marketplace-ready identity. User ownership is enforced by RLS before any browser grants are added.';

create table public.strategy_versions (
  id uuid primary key default gen_random_uuid(),
  strategy_id uuid not null references public.strategies (id),
  version_number integer not null,
  name text not null,
  description text,
  config jsonb not null default '{}'::jsonb,
  feature_contract jsonb not null default '{}'::jsonb,
  scoring_contract jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  retired_at timestamptz,
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  unique (strategy_id, version_number)
);

comment on table public.strategy_versions is
  'Immutable strategy versions. New versions are appended instead of mutating prior evaluation logic.';

create table public.strategy_feature_snapshots (
  id uuid primary key default gen_random_uuid(),
  strategy_version_id uuid not null references public.strategy_versions (id),
  feature_snapshot_id uuid,
  snapshot_role text not null default 'evaluation',
  created_at timestamptz not null default now(),
  unique (strategy_version_id, feature_snapshot_id, snapshot_role)
);

comment on table public.strategy_feature_snapshots is
  'Bridge from strategy versions to learning feature snapshots. The feature_snapshot_id constraint is added once learning tables exist.';

create table public.strategy_matches (
  id uuid primary key default gen_random_uuid(),
  strategy_id uuid not null references public.strategies (id),
  strategy_version_id uuid not null references public.strategy_versions (id),
  race_id uuid not null,
  race_date date not null,
  race_entry_id uuid,
  prediction_output_id uuid,
  score public.score_0_100,
  confidence public.score_0_100,
  edge public.score_0_100,
  matched_at timestamptz not null default now(),
  source_job_run_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (race_id, race_date) references public.races (id, race_date),
  foreign key (race_entry_id, race_date) references public.race_entries (id, race_date)
);

comment on table public.strategy_matches is
  'Append-only strategy match facts. Prediction lineage is linked by prediction_output_id after learning tables exist.';

alter table public.strategies
  add constraint strategies_current_version_fk
  foreign key (current_version_id) references public.strategy_versions (id);

create table public.opportunities (
  id uuid not null default gen_random_uuid(),
  race_date date not null,
  race_id uuid not null,
  opportunity_type public.opportunity_type not null,
  state public.opportunity_state not null default 'candidate',
  strategy_id uuid references public.strategies (id),
  strategy_version_id uuid references public.strategy_versions (id),
  current_score public.score_0_100,
  current_confidence public.score_0_100,
  current_edge public.score_0_100,
  latest_score_id uuid,
  latest_explanation_id uuid,
  latest_wager_recommendation_id uuid,
  first_detected_at timestamptz not null default now(),
  published_at timestamptz,
  closed_at timestamptz,
  resulted_at timestamptz,
  verified_at timestamptz,
  source_job_run_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id, race_date),
  foreign key (race_id, race_date) references public.races (id, race_date)
) partition by range (race_date);

comment on table public.opportunities is
  'Global Opportunity aggregate partitioned by race_date. User-specific state lives in watchlists, daily bet sheets, and recorded wagers.';
comment on column public.opportunities.latest_wager_recommendation_id is
  'Read-model pointer to the newest recommendation; historical replacement records remain append-only.';

create table public.opportunity_subjects (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null,
  race_date date not null,
  race_entry_id uuid not null,
  subject_role public.opportunity_subject_role not null,
  ordinal integer not null default 1,
  weight numeric,
  created_at timestamptz not null default now(),
  unique (opportunity_id, race_date, race_entry_id, subject_role),
  foreign key (opportunity_id, race_date) references public.opportunities (id, race_date),
  foreign key (race_entry_id, race_date) references public.race_entries (id, race_date)
);

comment on table public.opportunity_subjects is
  'Normalized subjects for single-entry and multi-entry Opportunities, including key/include/exclude roles.';

create table public.opportunity_strategy_matches (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null,
  race_date date not null,
  strategy_match_id uuid not null references public.strategy_matches (id),
  contribution_score public.score_0_100,
  created_at timestamptz not null default now(),
  unique (opportunity_id, race_date, strategy_match_id),
  foreign key (opportunity_id, race_date) references public.opportunities (id, race_date)
);

comment on table public.opportunity_strategy_matches is
  'Append-only link from Opportunities to the strategy matches that created or supported them.';

create table public.opportunity_events (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null,
  race_date date not null,
  previous_state public.opportunity_state,
  new_state public.opportunity_state not null,
  event_type text not null,
  event_at timestamptz not null default now(),
  actor_type text not null default 'system',
  actor_user_id uuid,
  source_job_run_id uuid,
  reason text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (opportunity_id, race_date) references public.opportunities (id, race_date)
);

comment on table public.opportunity_events is
  'Append-only global Opportunity lifecycle events. The current state on opportunities is a read model.';

create table public.opportunity_scores (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null,
  race_date date not null,
  score public.score_0_100,
  confidence public.score_0_100,
  edge public.score_0_100,
  fair_value numeric,
  model_version_id uuid,
  prediction_output_id uuid,
  scoring_version text,
  scored_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  source_job_run_id uuid,
  created_at timestamptz not null default now(),
  foreign key (opportunity_id, race_date) references public.opportunities (id, race_date)
);

comment on table public.opportunity_scores is
  'Append-only scoring history for Opportunities. Prediction and model lineage columns are constrained after learning tables exist.';

create table public.opportunity_explanations (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null,
  race_date date not null,
  explanation_version text not null,
  headline text,
  summary text,
  factors jsonb not null default '[]'::jsonb,
  generated_at timestamptz not null default now(),
  source_job_run_id uuid,
  created_at timestamptz not null default now(),
  foreign key (opportunity_id, race_date) references public.opportunities (id, race_date)
);

comment on table public.opportunity_explanations is
  'Append-only generated explanation history for each Opportunity.';

create table public.opportunity_visibility_events (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null,
  race_date date not null,
  visibility_key text not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  reason text,
  source_job_run_id uuid,
  created_at timestamptz not null default now(),
  foreign key (opportunity_id, race_date) references public.opportunities (id, race_date)
);

comment on table public.opportunity_visibility_events is
  'Append-only entitlement visibility events used before shared Opportunity reads are exposed to browser clients.';

commit;
