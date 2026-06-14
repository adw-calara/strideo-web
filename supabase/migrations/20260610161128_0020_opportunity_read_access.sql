-- Wave 3 Opportunity read access.
-- Purpose: allow authenticated app users to read the first approved global
-- Opportunity feed fields without adding browser writes or internal lineage
-- exposure.

begin;

grant select (
  id,
  race_date,
  race_id,
  opportunity_type,
  state,
  current_score,
  current_confidence,
  current_edge,
  first_detected_at,
  published_at,
  closed_at,
  resulted_at,
  verified_at,
  created_at,
  updated_at
) on table public.opportunities to authenticated;

grant select (
  id,
  opportunity_id,
  race_date,
  race_entry_id,
  subject_role,
  ordinal,
  weight,
  created_at
) on table public.opportunity_subjects to authenticated;

grant select (
  id,
  opportunity_id,
  race_date,
  score,
  confidence,
  edge,
  fair_value,
  scoring_version,
  scored_at,
  created_at
) on table public.opportunity_scores to authenticated;

grant select (
  id,
  opportunity_id,
  race_date,
  explanation_version,
  headline,
  summary,
  generated_at,
  created_at
) on table public.opportunity_explanations to authenticated;

create policy opportunities_select_published
  on public.opportunities for select
  to authenticated
  using (
    published_at is not null
    and published_at <= now()
    and state in ('published', 'closed', 'resulted', 'verified')
  );

create policy opportunity_subjects_select_published_opportunity
  on public.opportunity_subjects for select
  to authenticated
  using (
    exists (
      select 1
      from public.opportunities o
      where o.id = opportunity_subjects.opportunity_id
        and o.race_date = opportunity_subjects.race_date
        and o.published_at is not null
        and o.published_at <= now()
        and o.state in ('published', 'closed', 'resulted', 'verified')
    )
  );

create policy opportunity_scores_select_published_opportunity
  on public.opportunity_scores for select
  to authenticated
  using (
    exists (
      select 1
      from public.opportunities o
      where o.id = opportunity_scores.opportunity_id
        and o.race_date = opportunity_scores.race_date
        and o.published_at is not null
        and o.published_at <= now()
        and o.state in ('published', 'closed', 'resulted', 'verified')
    )
  );

create policy opportunity_explanations_select_published_opportunity
  on public.opportunity_explanations for select
  to authenticated
  using (
    exists (
      select 1
      from public.opportunities o
      where o.id = opportunity_explanations.opportunity_id
        and o.race_date = opportunity_explanations.race_date
        and o.published_at is not null
        and o.published_at <= now()
        and o.state in ('published', 'closed', 'resulted', 'verified')
    )
  );

commit;
