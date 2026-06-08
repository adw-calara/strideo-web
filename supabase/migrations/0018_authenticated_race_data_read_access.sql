-- Wave 3 race data read foundation.
-- Purpose: allow authenticated app users to read canonical race-card data
-- through RLS while keeping all race-data writes server-owned.
-- Scope: global non-user-owned race/reference facts only.

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

create policy surfaces_select_authenticated
  on public.surfaces for select
  to authenticated
  using (true);

create policy tracks_select_authenticated
  on public.tracks for select
  to authenticated
  using (true);

create policy horses_select_authenticated
  on public.horses for select
  to authenticated
  using (true);

create policy jockeys_select_authenticated
  on public.jockeys for select
  to authenticated
  using (true);

create policy trainers_select_authenticated
  on public.trainers for select
  to authenticated
  using (true);

create policy races_select_authenticated
  on public.races for select
  to authenticated
  using (true);

create policy race_entries_select_authenticated
  on public.race_entries for select
  to authenticated
  using (true);

create policy entry_events_select_authenticated
  on public.entry_events for select
  to authenticated
  using (true);

create policy odds_snapshots_select_authenticated
  on public.odds_snapshots for select
  to authenticated
  using (true);

create policy result_versions_select_authenticated
  on public.result_versions for select
  to authenticated
  using (true);

create policy result_entries_select_authenticated
  on public.result_entries for select
  to authenticated
  using (true);

commit;
