-- Phase 1A migration design: user identity, entitlement, and wagering workflow.
-- Purpose: create RLS-ready user-owned tables while keeping user wagers separate
-- from system recommendations.
-- Dependencies: 0002_extensions_and_types.sql and 0006_wager_tables.sql.
-- Future considerations: add sync checkpoints and conflict-resolution read
-- models before shipping full offline mobile clients.

begin;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  display_name text,
  email text,
  status public.profile_status not null default 'active',
  default_plan public.subscription_plan not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'User profile read model. Authorization must rely on auth.users, entitlements, and roles, not user-editable fields.';

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  provider_customer_id text,
  provider_subscription_id text,
  plan public.subscription_plan not null,
  status public.subscription_status not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_subscription_id)
);

comment on table public.subscriptions is
  'Server-owned subscription state. Browser clients may only read their own summary after explicit grants.';

create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entitlement_key text not null,
  source text not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entitlement_key, source, starts_at)
);

comment on table public.entitlements is
  'Trusted entitlement table used by RLS helpers before any shared Opportunity read exposure.';

create table public.profile_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.profile_role not null,
  created_by_user_id uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

comment on table public.profile_roles is
  'Trusted operator/admin role assignments. Writes are server-only and must not rely on user-editable metadata.';

create table public.user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  device_id text not null,
  platform text not null,
  app_version text,
  last_seen_at timestamptz,
  sync_cursor text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, device_id)
);

comment on table public.user_devices is
  'Mobile-ready device registry for future offline sync checkpoints and notification routing.';

create table public.watchlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  opportunity_id uuid not null,
  opportunity_race_date date not null,
  workflow_state text not null default 'watching',
  notes text,
  client_mutation_id text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, opportunity_id, opportunity_race_date),
  unique (user_id, client_mutation_id),
  foreign key (opportunity_id, opportunity_race_date) references public.opportunities (id, race_date)
);

comment on table public.watchlist_items is
  'User-specific Opportunity workflow state. This intentionally does not mutate the global Opportunity lifecycle.';

create table public.daily_bet_sheets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  sheet_date date not null,
  status public.bet_sheet_status not null default 'draft',
  bankroll public.nonnegative_numeric,
  target_stake public.nonnegative_numeric,
  notes text,
  client_mutation_id text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, sheet_date),
  unique (id, user_id),
  unique (user_id, client_mutation_id)
);

comment on table public.daily_bet_sheets is
  'User-owned daily planning container for recommendations and recorded wagers.';

create table public.daily_bet_sheet_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  daily_bet_sheet_id uuid not null,
  opportunity_id uuid,
  opportunity_race_date date,
  wager_recommendation_id uuid,
  wager_recommendation_race_date date,
  status public.bet_sheet_entry_status not null default 'draft',
  planned_stake public.nonnegative_numeric,
  planned_notes text,
  sort_order integer not null default 0,
  client_mutation_id text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (id, user_id, daily_bet_sheet_id),
  unique (user_id, client_mutation_id),
  foreign key (daily_bet_sheet_id, user_id) references public.daily_bet_sheets (id, user_id) on delete cascade,
  foreign key (opportunity_id, opportunity_race_date) references public.opportunities (id, race_date),
  foreign key (wager_recommendation_id, wager_recommendation_race_date)
    references public.wager_recommendations (id, race_date)
);

comment on table public.daily_bet_sheet_entries is
  'User-owned plan entries that may reference system recommendations without becoming system recommendations.';

create table public.daily_bet_sheet_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  daily_bet_sheet_id uuid not null,
  daily_bet_sheet_entry_id uuid,
  event_type text not null,
  event_at timestamptz not null default now(),
  client_mutation_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, client_mutation_id),
  foreign key (daily_bet_sheet_id, user_id) references public.daily_bet_sheets (id, user_id) on delete cascade,
  foreign key (daily_bet_sheet_entry_id, user_id, daily_bet_sheet_id)
    references public.daily_bet_sheet_entries (id, user_id, daily_bet_sheet_id) on delete cascade
);

comment on table public.daily_bet_sheet_events is
  'Append-only user workflow events with mobile idempotency through client_mutation_id.';

create table public.user_recorded_wagers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  daily_bet_sheet_entry_id uuid,
  wager_recommendation_id uuid,
  wager_recommendation_race_date date,
  race_id uuid not null,
  race_date date not null,
  wager_type public.wager_type not null,
  status public.recorded_wager_status not null default 'planned',
  stake public.nonnegative_numeric not null,
  odds_decimal numeric,
  placed_at timestamptz,
  settled_at timestamptz,
  payout public.nonnegative_numeric,
  notes text,
  client_mutation_id text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, client_mutation_id),
  foreign key (daily_bet_sheet_entry_id, user_id) references public.daily_bet_sheet_entries (id, user_id),
  foreign key (race_id, race_date) references public.races (id, race_date),
  foreign key (wager_recommendation_id, wager_recommendation_race_date)
    references public.wager_recommendations (id, race_date)
);

comment on table public.user_recorded_wagers is
  'User-entered wagers and outcomes. These are separate from Strideo system recommendations.';

create table public.alert_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  channel text not null,
  preference_key text not null,
  enabled boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  client_mutation_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, channel, preference_key),
  unique (user_id, client_mutation_id)
);

comment on table public.alert_preferences is
  'User-owned alert preference state. Notification delivery tables remain deferred until mobile push scope is approved.';

commit;
