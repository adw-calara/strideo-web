-- Phase 1A migration design: agent job, audit, and event tables.
-- Purpose: provide operational lineage for ingestion, strategy, learning, and
-- verification jobs without exposing audit data to browser clients.
-- Dependencies: all prior Phase 1A table migrations.
-- Future considerations: partition management for logs should be automated
-- before high-volume agents or mobile event streams are enabled.

begin;

create table public.job_runs (
  id uuid primary key default gen_random_uuid(),
  job_key text not null,
  agent_key text,
  status public.job_status not null default 'queued',
  idempotency_key text,
  started_at timestamptz,
  finished_at timestamptz,
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_key, idempotency_key)
);

comment on table public.job_runs is
  'Server-only job execution metadata for ingestion, strategy, learning, and verification agents.';

create table public.agent_logs (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  job_run_id uuid references public.job_runs (id),
  agent_key text not null,
  level public.log_level not null,
  message text not null,
  context jsonb not null default '{}'::jsonb,
  primary key (id, created_at)
) partition by range (created_at);

comment on table public.agent_logs is
  'Append-only agent logs partitioned by created_at. This remains server-only and should not be exposed through Data API.';

create table public.event_log (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_key text not null,
  aggregate_type text not null,
  aggregate_id uuid,
  user_id uuid references auth.users (id) on delete set null,
  job_run_id uuid references public.job_runs (id),
  payload jsonb not null default '{}'::jsonb,
  primary key (id, created_at)
) partition by range (created_at);

comment on table public.event_log is
  'Append-only system event log for audit and future analytics warehouse extraction.';

alter table public.races
  add constraint races_source_job_run_fk foreign key (source_job_run_id) references public.job_runs (id);
alter table public.race_entries
  add constraint race_entries_source_job_run_fk foreign key (source_job_run_id) references public.job_runs (id);
alter table public.entry_events
  add constraint entry_events_source_job_run_fk foreign key (source_job_run_id) references public.job_runs (id);
alter table public.odds_snapshots
  add constraint odds_snapshots_source_job_run_fk foreign key (source_job_run_id) references public.job_runs (id);
alter table public.result_versions
  add constraint result_versions_source_job_run_fk foreign key (source_job_run_id) references public.job_runs (id);
alter table public.strategy_matches
  add constraint strategy_matches_source_job_run_fk foreign key (source_job_run_id) references public.job_runs (id);
alter table public.opportunities
  add constraint opportunities_source_job_run_fk foreign key (source_job_run_id) references public.job_runs (id);
alter table public.opportunity_events
  add constraint opportunity_events_source_job_run_fk foreign key (source_job_run_id) references public.job_runs (id);
alter table public.opportunity_scores
  add constraint opportunity_scores_source_job_run_fk foreign key (source_job_run_id) references public.job_runs (id);
alter table public.opportunity_explanations
  add constraint opportunity_explanations_source_job_run_fk foreign key (source_job_run_id) references public.job_runs (id);
alter table public.opportunity_visibility_events
  add constraint opportunity_visibility_events_source_job_run_fk foreign key (source_job_run_id) references public.job_runs (id);
alter table public.wager_recommendations
  add constraint wager_recommendations_source_job_run_fk foreign key (source_job_run_id) references public.job_runs (id);
alter table public.wager_recommendation_events
  add constraint wager_recommendation_events_source_job_run_fk foreign key (source_job_run_id) references public.job_runs (id);
alter table public.feature_snapshots
  add constraint feature_snapshots_source_job_run_fk foreign key (source_job_run_id) references public.job_runs (id);
alter table public.prediction_outputs
  add constraint prediction_outputs_source_job_run_fk foreign key (source_job_run_id) references public.job_runs (id);
alter table public.model_training_runs
  add constraint model_training_runs_source_job_run_fk foreign key (source_job_run_id) references public.job_runs (id);
alter table public.model_evaluation_runs
  add constraint model_evaluation_runs_source_job_run_fk foreign key (source_job_run_id) references public.job_runs (id);
alter table public.performance_runs
  add constraint performance_runs_source_job_run_fk foreign key (source_job_run_id) references public.job_runs (id);

comment on constraint races_source_job_run_fk on public.races is
  'Late-bound operational lineage constraint because job_runs is owned by the audit migration.';

commit;
