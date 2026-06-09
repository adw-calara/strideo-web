-- Wave 3 race read access ensure migration.
-- Purpose: keep authenticated protected-app reads available for approved
-- canonical race-card/reference tables without adding browser writes.

begin;

grant select on table
  public.surfaces,
  public.tracks,
  public.horses,
  public.jockeys,
  public.trainers,
  public.races,
  public.race_entries,
  public.entry_events,
  public.odds_snapshots,
  public.result_versions,
  public.result_entries
to authenticated;

do $$
declare
  policy record;
begin
  for policy in
    select *
    from (values
      ('surfaces', 'surfaces_select_authenticated'),
      ('tracks', 'tracks_select_authenticated'),
      ('horses', 'horses_select_authenticated'),
      ('jockeys', 'jockeys_select_authenticated'),
      ('trainers', 'trainers_select_authenticated'),
      ('races', 'races_select_authenticated'),
      ('race_entries', 'race_entries_select_authenticated'),
      ('entry_events', 'entry_events_select_authenticated'),
      ('odds_snapshots', 'odds_snapshots_select_authenticated'),
      ('result_versions', 'result_versions_select_authenticated'),
      ('result_entries', 'result_entries_select_authenticated')
    ) as policies(table_name, policy_name)
  loop
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = policy.table_name
        and policyname = policy.policy_name
    ) then
      execute format(
        'create policy %I on public.%I for select to authenticated using (true)',
        policy.policy_name,
        policy.table_name
      );
    end if;
  end loop;
end;
$$;

commit;
