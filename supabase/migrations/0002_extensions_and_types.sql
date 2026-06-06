-- Phase 1A migration design: extensions, schemas, and shared types.
-- Purpose: define stable primitives used by later Strideo application tables.
-- Dependencies: Supabase PostgreSQL with pgcrypto available.
-- Future considerations: add values with ALTER TYPE in future migrations; never
-- reorder or rename enum values without an explicit data migration plan.

begin;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists btree_gin with schema extensions;

create schema if not exists private;
comment on schema private is
  'Private helper schema for entitlement/RLS helpers and server-only functions. Do not expose through Data API.';

create type public.subscription_plan as enum ('free', 'pro', 'elite');
create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'cancelled', 'expired');
create type public.profile_status as enum ('active', 'disabled', 'deleted');
create type public.profile_role as enum ('user', 'operator', 'admin');

create type public.race_status as enum ('scheduled', 'open', 'closed', 'resulted', 'official', 'cancelled');
create type public.entry_status as enum ('entered', 'scratched', 'reinstated', 'started', 'finished');
create type public.result_status as enum ('unofficial', 'official', 'corrected', 'voided');

create type public.model_status as enum ('draft', 'evaluating', 'active', 'retired', 'rejected');
create type public.strategy_visibility as enum ('system', 'private', 'marketplace', 'retired');
create type public.strategy_status as enum ('draft', 'active', 'retired', 'disabled');
create type public.strategy_publication_status as enum ('draft', 'review', 'published', 'rejected', 'retired');
create type public.strategy_license_type as enum ('system', 'private', 'marketplace_free', 'marketplace_paid');
create type public.strategy_validation_status as enum ('untested', 'testing', 'validated', 'failed');

create type public.opportunity_state as enum (
  'candidate',
  'qualified',
  'published',
  'suspended',
  'closed',
  'resulted',
  'verified',
  'voided',
  'archived'
);
create type public.opportunity_type as enum ('single_entry', 'multi_entry', 'race_level', 'exotic');
create type public.opportunity_subject_role as enum (
  'primary',
  'include',
  'exclude',
  'key',
  'under',
  'over',
  'contender',
  'fade'
);

create type public.wager_type as enum ('win', 'place', 'show', 'exacta', 'trifecta');
create type public.wager_recommendation_status as enum ('active', 'superseded', 'invalidated', 'settled', 'voided');
create type public.wager_selection_role as enum ('win', 'place', 'show', 'key', 'include', 'exclude');

create type public.bet_sheet_status as enum ('draft', 'planned', 'placed', 'settled', 'archived');
create type public.bet_sheet_entry_status as enum ('draft', 'planned', 'recorded', 'settled', 'voided', 'archived');
create type public.recorded_wager_status as enum ('planned', 'placed', 'settled', 'voided');

create type public.verification_status as enum ('pending', 'verified', 'corrected', 'voided');
create type public.job_status as enum ('queued', 'running', 'succeeded', 'failed', 'cancelled');
create type public.log_level as enum ('debug', 'info', 'warning', 'error');

create domain public.nonnegative_numeric as numeric
  check (value is null or value >= 0);
create domain public.score_0_100 as numeric
  check (value is null or (value >= 0 and value <= 100));
create domain public.probability_0_1 as numeric
  check (value is null or (value >= 0 and value <= 1));

comment on type public.opportunity_state is
  'Global system Opportunity lifecycle state. User workflow state lives in watchlists, bet sheets, and recorded wagers.';
comment on type public.wager_recommendation_status is
  'Immutable recommendation state for system-generated wager recommendations. Replacement history is modeled with supersedes_wager_recommendation_id.';
comment on domain public.score_0_100 is
  'Shared score domain for confidence, value, edge, and Opportunity score fields.';

commit;
