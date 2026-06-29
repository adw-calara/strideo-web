-- Strideo Dev-only racing-form owner/context fixture.
--
-- Purpose:
--   Prepare deterministic demo owner links and simple entry-level context
--   signals for the existing demo race-card entries.
--
-- Safety:
--   - Dev only. Do not run against production.
--   - Requires demo_race_card.sql to be applied first.
--   - Inserts only sanitized demo owners and updates existing demo race_entries
--     with owner_id, layoff_days, and entry_comments.
--   - Does not create claim transfers, trainer stats, predictions,
--     Opportunities, opportunity scores, value scores, wagers, bet sheets, ROI,
--     provider-ingestion writes, ML training, production data, credentials, file
--     URIs, or raw provider payloads.
--   - Does not run automatically.
--
-- Apply in Dev only after review and explicit authorization:
--   node scripts/supabase-cli-with-env.mjs db query --linked \
--     --file supabase/fixtures/dev/demo_racing_form_owner_context.sql

begin;

insert into public.owners (
  provider,
  provider_owner_id,
  name,
  metadata,
  first_seen_at,
  last_seen_at
)
values
  ('demo', 'demo-owner-fixture-01', 'Demo Fixture Owner 01', '{"fixture":"demo_racing_form_owner_context","demo":true}', '2026-06-08 12:00:00+00', '2026-06-08 12:00:00+00'),
  ('demo', 'demo-owner-fixture-02', 'Demo Fixture Owner 02', '{"fixture":"demo_racing_form_owner_context","demo":true}', '2026-06-08 12:00:00+00', '2026-06-08 12:00:00+00'),
  ('demo', 'demo-owner-fixture-03', 'Demo Fixture Owner 03', '{"fixture":"demo_racing_form_owner_context","demo":true}', '2026-06-08 12:00:00+00', '2026-06-08 12:00:00+00'),
  ('demo', 'demo-owner-fixture-04', 'Demo Fixture Owner 04', '{"fixture":"demo_racing_form_owner_context","demo":true}', '2026-06-08 12:00:00+00', '2026-06-08 12:00:00+00'),
  ('demo', 'demo-owner-fixture-05', 'Demo Fixture Owner 05', '{"fixture":"demo_racing_form_owner_context","demo":true}', '2026-06-08 12:00:00+00', '2026-06-08 12:00:00+00'),
  ('demo', 'demo-owner-fixture-06', 'Demo Fixture Owner 06', '{"fixture":"demo_racing_form_owner_context","demo":true}', '2026-06-08 12:00:00+00', '2026-06-08 12:00:00+00'),
  ('demo', 'demo-owner-fixture-07', 'Demo Fixture Owner 07', '{"fixture":"demo_racing_form_owner_context","demo":true}', '2026-06-08 12:00:00+00', '2026-06-08 12:00:00+00'),
  ('demo', 'demo-owner-fixture-08', 'Demo Fixture Owner 08', '{"fixture":"demo_racing_form_owner_context","demo":true}', '2026-06-08 12:00:00+00', '2026-06-08 12:00:00+00'),
  ('demo', 'demo-owner-fixture-09', 'Demo Fixture Owner 09', '{"fixture":"demo_racing_form_owner_context","demo":true}', '2026-06-08 12:00:00+00', '2026-06-08 12:00:00+00'),
  ('demo', 'demo-owner-fixture-10', 'Demo Fixture Owner 10', '{"fixture":"demo_racing_form_owner_context","demo":true}', '2026-06-08 12:00:00+00', '2026-06-08 12:00:00+00'),
  ('demo', 'demo-owner-fixture-11', 'Demo Fixture Owner 11', '{"fixture":"demo_racing_form_owner_context","demo":true}', '2026-06-08 12:00:00+00', '2026-06-08 12:00:00+00'),
  ('demo', 'demo-owner-fixture-12', 'Demo Fixture Owner 12', '{"fixture":"demo_racing_form_owner_context","demo":true}', '2026-06-08 12:00:00+00', '2026-06-08 12:00:00+00'),
  ('demo', 'demo-owner-fixture-13', 'Demo Fixture Owner 13', '{"fixture":"demo_racing_form_owner_context","demo":true}', '2026-06-08 12:00:00+00', '2026-06-08 12:00:00+00'),
  ('demo', 'demo-owner-fixture-14', 'Demo Fixture Owner 14', '{"fixture":"demo_racing_form_owner_context","demo":true}', '2026-06-08 12:00:00+00', '2026-06-08 12:00:00+00')
on conflict (provider, provider_owner_id) do update
set
  name = excluded.name,
  metadata = excluded.metadata,
  first_seen_at = excluded.first_seen_at,
  last_seen_at = excluded.last_seen_at,
  updated_at = now();

do $$
declare
  updated_count integer;
begin
  with owner_context (
    provider_entry_id,
    provider_owner_id,
    layoff_days,
    entry_comments
  ) as (
    values
      ('demo-entry-r1-01', 'demo-owner-fixture-01', 21, 'Demo owner-context signal 01; sanitized fixture note.'),
      ('demo-entry-r1-02', 'demo-owner-fixture-02', 34, 'Demo owner-context signal 02; sanitized fixture note.'),
      ('demo-entry-r1-03', 'demo-owner-fixture-03', 28, 'Demo owner-context signal 03; sanitized fixture note.'),
      ('demo-entry-r1-04', 'demo-owner-fixture-04', 42, 'Demo owner-context signal 04; sanitized fixture note.'),
      ('demo-entry-r1-05', 'demo-owner-fixture-05', 18, 'Demo owner-context signal 05; sanitized fixture note.'),
      ('demo-entry-r1-06', 'demo-owner-fixture-06', 56, 'Demo owner-context signal 06; sanitized fixture note.'),
      ('demo-entry-r1-07', 'demo-owner-fixture-07', 31, 'Demo owner-context signal 07; sanitized fixture note.'),
      ('demo-entry-r2-01', 'demo-owner-fixture-08', 24, 'Demo owner-context signal 08; sanitized fixture note.'),
      ('demo-entry-r2-02', 'demo-owner-fixture-09', 37, 'Demo owner-context signal 09; sanitized fixture note.'),
      ('demo-entry-r2-03', 'demo-owner-fixture-10', 45, 'Demo owner-context signal 10; sanitized fixture note.'),
      ('demo-entry-r2-04', 'demo-owner-fixture-11', 22, 'Demo owner-context signal 11; sanitized fixture note.'),
      ('demo-entry-r2-05', 'demo-owner-fixture-12', 63, 'Demo owner-context signal 12; sanitized fixture note.'),
      ('demo-entry-r2-06', 'demo-owner-fixture-13', 29, 'Demo owner-context signal 13; sanitized fixture note.'),
      ('demo-entry-r2-07', 'demo-owner-fixture-14', 51, 'Demo owner-context signal 14; sanitized fixture note.')
  ),
  resolved_owner_context as (
    select
      owner_context.provider_entry_id,
      owners.id as owner_id,
      owner_context.layoff_days,
      owner_context.entry_comments
    from owner_context
    join public.owners
      on owners.provider = 'demo'
     and owners.provider_owner_id = owner_context.provider_owner_id
  )
  update public.race_entries
  set
    owner_id = resolved_owner_context.owner_id,
    layoff_days = resolved_owner_context.layoff_days,
    entry_comments = resolved_owner_context.entry_comments,
    metadata = coalesce(race_entries.metadata, '{}'::jsonb) || jsonb_build_object(
      'owner_context_fixture',
      'demo_racing_form_owner_context',
      'owner_context_fixture_version',
      'v1'
    ),
    updated_at = now()
  from resolved_owner_context
  where race_entries.provider = 'demo'
    and race_entries.provider_entry_id = resolved_owner_context.provider_entry_id
    and race_entries.race_date = '2026-06-08';

  get diagnostics updated_count = row_count;

  if updated_count <> 14 then
    raise exception
      'demo_racing_form_owner_context expected to update 14 demo race_entries, updated %',
      updated_count;
  end if;
end $$;

commit;

-- Cleanup/reset, for reviewed Dev-only use:
--
-- begin;
--
-- update public.race_entries
-- set
--   owner_id = null,
--   layoff_days = null,
--   entry_comments = null,
--   metadata = metadata - 'owner_context_fixture' - 'owner_context_fixture_version',
--   updated_at = now()
-- where provider = 'demo'
--   and race_date = '2026-06-08'
--   and provider_entry_id like 'demo-entry-r_-%'
--   and metadata ->> 'owner_context_fixture' = 'demo_racing_form_owner_context';
--
-- delete from public.owners
-- where provider = 'demo'
--   and provider_owner_id like 'demo-owner-fixture-%'
--   and metadata ->> 'fixture' = 'demo_racing_form_owner_context';
--
-- commit;
