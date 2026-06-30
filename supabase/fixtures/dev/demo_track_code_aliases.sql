-- Dev-only reviewed track-code alias fixture for racing-form coverage readiness.
--
-- Scope:
-- - Requires supabase/fixtures/dev/demo_race_card.sql to already exist in Dev.
-- - Adds only the reviewed demo provider track-code alias for Strideo Park.
-- - Does not add predictions, opportunity scores, value calculations, wagers,
--   ML rows, provider-ingestion writes, raw payloads, credentials, or production
--   data.

begin;

with reviewed_demo_track as (
  select id
  from public.tracks
  where provider = 'demo'
    and provider_track_id = 'demo-track-strideo-park'
    and code = 'SDP'
    and name = 'Strideo Park'
  limit 1
)
insert into public.track_code_aliases (
  track_id,
  source_system,
  source_track_code,
  source_track_name,
  state,
  country,
  notes
)
select
  reviewed_demo_track.id,
  'demo',
  'SDP',
  'Strideo Park',
  'KY',
  'US',
  'Dev-only reviewed alias for the Strideo Park demo race-card track.'
from reviewed_demo_track
on conflict ((lower(source_system)), (lower(source_track_code)))
  where is_active and effective_to is null
do update set
  track_id = excluded.track_id,
  source_track_name = excluded.source_track_name,
  state = excluded.state,
  country = excluded.country,
  notes = excluded.notes,
  is_active = true,
  updated_at = now();

do $$
begin
  if not exists (
    select 1
    from public.track_code_aliases alias
    join public.tracks track on track.id = alias.track_id
    where track.provider = 'demo'
      and track.provider_track_id = 'demo-track-strideo-park'
      and track.code = 'SDP'
      and alias.source_system = 'demo'
      and alias.source_track_code = 'SDP'
      and alias.is_active
      and alias.effective_to is null
  ) then
    raise exception 'Expected reviewed demo track-code alias demo/SDP to be present.';
  end if;
end $$;

commit;
