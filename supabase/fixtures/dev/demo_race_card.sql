-- Strideo Dev-only demo race-card fixture.
--
-- Purpose:
--   Populate the existing race/reference schema with small deterministic demo
--   data for race-list and race-detail UI development.
--
-- Safety:
--   - Dev-only. Do not run against production.
--   - Does not create or alter tables.
--   - Does not create predictions, Opportunities, wagers, bet sheets, ROI, or
--     betting recommendations.
--   - Uses provider = 'demo' and deterministic provider IDs.
--
-- Apply manually after review and explicit Dev-only authorization, for example:
--   node scripts/supabase-cli-with-env.mjs db query --linked \
--     --file supabase/fixtures/dev/demo_race_card.sql
--
-- Cleanup/reset:
--   Run the cleanup block at the bottom of this file, or re-run this fixture to
--   update the deterministic demo records in place.

begin;

insert into public.surfaces (code, name, description, metadata)
values
  ('DEMO_DIRT', 'Demo Dirt', 'Synthetic demo dirt surface for UI fixtures.', '{"fixture":"wave3_demo_race_card"}'),
  ('DEMO_TURF', 'Demo Turf', 'Synthetic demo turf surface for UI fixtures.', '{"fixture":"wave3_demo_race_card"}')
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  metadata = excluded.metadata,
  updated_at = now();

insert into public.tracks (
  provider,
  provider_track_id,
  code,
  name,
  country_code,
  region,
  timezone,
  metadata,
  last_seen_at
)
values (
  'demo',
  'demo-track-strideo-park',
  'SDP',
  'Strideo Park',
  'US',
  'KY',
  'America/New_York',
  '{"fixture":"wave3_demo_race_card","demo":true}',
  '2026-06-08 12:00:00+00'
)
on conflict (provider, provider_track_id) do update
set
  code = excluded.code,
  name = excluded.name,
  country_code = excluded.country_code,
  region = excluded.region,
  timezone = excluded.timezone,
  metadata = excluded.metadata,
  last_seen_at = excluded.last_seen_at,
  updated_at = now();

insert into public.horses (
  provider,
  provider_horse_id,
  name,
  foaling_year,
  sex,
  country_code,
  metadata,
  last_seen_at
)
values
  ('demo', 'demo-horse-northern-cipher', 'Northern Cipher', 2021, 'gelding', 'US', '{"fixture":"wave3_demo_race_card"}', '2026-06-08 12:00:00+00'),
  ('demo', 'demo-horse-river-lantern', 'River Lantern', 2020, 'mare', 'US', '{"fixture":"wave3_demo_race_card"}', '2026-06-08 12:00:00+00'),
  ('demo', 'demo-horse-quiet-variance', 'Quiet Variance', 2021, 'colt', 'US', '{"fixture":"wave3_demo_race_card"}', '2026-06-08 12:00:00+00'),
  ('demo', 'demo-horse-copper-turn', 'Copper Turn', 2019, 'gelding', 'US', '{"fixture":"wave3_demo_race_card"}', '2026-06-08 12:00:00+00'),
  ('demo', 'demo-horse-velvet-index', 'Velvet Index', 2020, 'filly', 'US', '{"fixture":"wave3_demo_race_card"}', '2026-06-08 12:00:00+00'),
  ('demo', 'demo-horse-blue-interval', 'Blue Interval', 2021, 'colt', 'US', '{"fixture":"wave3_demo_race_card"}', '2026-06-08 12:00:00+00'),
  ('demo', 'demo-horse-silver-cache', 'Silver Cache', 2020, 'mare', 'US', '{"fixture":"wave3_demo_race_card"}', '2026-06-08 12:00:00+00'),
  ('demo', 'demo-horse-final-stride', 'Final Stride', 2019, 'horse', 'US', '{"fixture":"wave3_demo_race_card"}', '2026-06-08 12:00:00+00'),
  ('demo', 'demo-horse-signal-peak', 'Signal Peak', 2021, 'gelding', 'US', '{"fixture":"wave3_demo_race_card"}', '2026-06-08 12:00:00+00'),
  ('demo', 'demo-horse-orchard-switch', 'Orchard Switch', 2020, 'mare', 'US', '{"fixture":"wave3_demo_race_card"}', '2026-06-08 12:00:00+00'),
  ('demo', 'demo-horse-railway-proof', 'Railway Proof', 2021, 'colt', 'US', '{"fixture":"wave3_demo_race_card"}', '2026-06-08 12:00:00+00'),
  ('demo', 'demo-horse-sunlit-ledger', 'Sunlit Ledger', 2020, 'filly', 'US', '{"fixture":"wave3_demo_race_card"}', '2026-06-08 12:00:00+00'),
  ('demo', 'demo-horse-meadow-hash', 'Meadow Hash', 2019, 'gelding', 'US', '{"fixture":"wave3_demo_race_card"}', '2026-06-08 12:00:00+00'),
  ('demo', 'demo-horse-priority-lane', 'Priority Lane', 2021, 'colt', 'US', '{"fixture":"wave3_demo_race_card"}', '2026-06-08 12:00:00+00')
on conflict (provider, provider_horse_id) do update
set
  name = excluded.name,
  foaling_year = excluded.foaling_year,
  sex = excluded.sex,
  country_code = excluded.country_code,
  metadata = excluded.metadata,
  last_seen_at = excluded.last_seen_at,
  updated_at = now();

insert into public.jockeys (provider, provider_jockey_id, name, metadata, last_seen_at)
values
  ('demo', 'demo-jockey-avery-shaw', 'Avery Shaw', '{"fixture":"wave3_demo_race_card"}', '2026-06-08 12:00:00+00'),
  ('demo', 'demo-jockey-morgan-vale', 'Morgan Vale', '{"fixture":"wave3_demo_race_card"}', '2026-06-08 12:00:00+00'),
  ('demo', 'demo-jockey-casey-north', 'Casey North', '{"fixture":"wave3_demo_race_card"}', '2026-06-08 12:00:00+00'),
  ('demo', 'demo-jockey-jules-arden', 'Jules Arden', '{"fixture":"wave3_demo_race_card"}', '2026-06-08 12:00:00+00'),
  ('demo', 'demo-jockey-riley-cross', 'Riley Cross', '{"fixture":"wave3_demo_race_card"}', '2026-06-08 12:00:00+00'),
  ('demo', 'demo-jockey-devon-price', 'Devon Price', '{"fixture":"wave3_demo_race_card"}', '2026-06-08 12:00:00+00'),
  ('demo', 'demo-jockey-harper-line', 'Harper Line', '{"fixture":"wave3_demo_race_card"}', '2026-06-08 12:00:00+00')
on conflict (provider, provider_jockey_id) do update
set
  name = excluded.name,
  metadata = excluded.metadata,
  last_seen_at = excluded.last_seen_at,
  updated_at = now();

insert into public.trainers (provider, provider_trainer_id, name, metadata, last_seen_at)
values
  ('demo', 'demo-trainer-lena-west', 'Lena West', '{"fixture":"wave3_demo_race_card"}', '2026-06-08 12:00:00+00'),
  ('demo', 'demo-trainer-owen-field', 'Owen Field', '{"fixture":"wave3_demo_race_card"}', '2026-06-08 12:00:00+00'),
  ('demo', 'demo-trainer-mira-stone', 'Mira Stone', '{"fixture":"wave3_demo_race_card"}', '2026-06-08 12:00:00+00'),
  ('demo', 'demo-trainer-cal-rowan', 'Cal Rowan', '{"fixture":"wave3_demo_race_card"}', '2026-06-08 12:00:00+00')
on conflict (provider, provider_trainer_id) do update
set
  name = excluded.name,
  metadata = excluded.metadata,
  last_seen_at = excluded.last_seen_at,
  updated_at = now();

insert into public.races (
  race_date,
  provider,
  provider_race_id,
  track_id,
  surface_id,
  race_number,
  name,
  status,
  scheduled_at,
  off_at,
  distance_text,
  distance_yards,
  race_type,
  class_rating,
  class_level,
  track_condition,
  field_size,
  purse,
  conditions,
  metadata,
  last_seen_at
)
values
  (
    '2026-06-08',
    'demo',
    'demo-race-2026-06-08-01',
    (select id from public.tracks where provider = 'demo' and provider_track_id = 'demo-track-strideo-park'),
    (select id from public.surfaces where code = 'DEMO_DIRT'),
    1,
    'Strideo Demo Sprint',
    'official',
    '2026-06-08 17:05:00+00',
    '2026-06-08 17:07:00+00',
    '6 furlongs',
    1320,
    'Allowance',
    'N1X',
    'allowance_n1x',
    'fast',
    7,
    54000,
    'Demo allowance sprint for deterministic fixture testing.',
    '{"fixture":"wave3_demo_race_card","ui_state":"completed"}',
    '2026-06-08 18:00:00+00'
  ),
  (
    '2026-06-08',
    'demo',
    'demo-race-2026-06-08-02',
    (select id from public.tracks where provider = 'demo' and provider_track_id = 'demo-track-strideo-park'),
    (select id from public.surfaces where code = 'DEMO_TURF'),
    2,
    'Strideo Demo Turf Mile',
    'scheduled',
    '2026-06-08 18:10:00+00',
    null,
    '1 mile',
    1760,
    'Starter Optional Claiming',
    'SOC',
    'starter_optional_claiming',
    'firm',
    7,
    48000,
    'Demo scheduled race with no final results yet.',
    '{"fixture":"wave3_demo_race_card","ui_state":"scheduled"}',
    '2026-06-08 12:00:00+00'
  )
on conflict (provider, provider_race_id, race_date) do update
set
  track_id = excluded.track_id,
  surface_id = excluded.surface_id,
  race_number = excluded.race_number,
  name = excluded.name,
  status = excluded.status,
  scheduled_at = excluded.scheduled_at,
  off_at = excluded.off_at,
  distance_text = excluded.distance_text,
  distance_yards = excluded.distance_yards,
  race_type = excluded.race_type,
  class_rating = excluded.class_rating,
  class_level = excluded.class_level,
  track_condition = excluded.track_condition,
  field_size = excluded.field_size,
  purse = excluded.purse,
  conditions = excluded.conditions,
  metadata = excluded.metadata,
  last_seen_at = excluded.last_seen_at,
  updated_at = now();

insert into public.race_entries (
  race_date,
  race_id,
  provider,
  provider_entry_id,
  post_position,
  program_number,
  horse_id,
  jockey_id,
  trainer_id,
  status,
  morning_line_odds,
  weight_lbs,
  medication,
  equipment,
  metadata,
  last_seen_at
)
values
  ('2026-06-08', (select id from public.races where provider = 'demo' and provider_race_id = 'demo-race-2026-06-08-01' and race_date = '2026-06-08'), 'demo', 'demo-entry-r1-01', 1, '1', (select id from public.horses where provider = 'demo' and provider_horse_id = 'demo-horse-northern-cipher'), (select id from public.jockeys where provider = 'demo' and provider_jockey_id = 'demo-jockey-avery-shaw'), (select id from public.trainers where provider = 'demo' and provider_trainer_id = 'demo-trainer-lena-west'), 'finished', '5/2', 124, 'L', null, '{"fixture":"wave3_demo_race_card","race_label":"completed"}', '2026-06-08 18:00:00+00'),
  ('2026-06-08', (select id from public.races where provider = 'demo' and provider_race_id = 'demo-race-2026-06-08-01' and race_date = '2026-06-08'), 'demo', 'demo-entry-r1-02', 2, '2', (select id from public.horses where provider = 'demo' and provider_horse_id = 'demo-horse-river-lantern'), (select id from public.jockeys where provider = 'demo' and provider_jockey_id = 'demo-jockey-morgan-vale'), (select id from public.trainers where provider = 'demo' and provider_trainer_id = 'demo-trainer-owen-field'), 'finished', '4/1', 121, 'L', null, '{"fixture":"wave3_demo_race_card","race_label":"completed"}', '2026-06-08 18:00:00+00'),
  ('2026-06-08', (select id from public.races where provider = 'demo' and provider_race_id = 'demo-race-2026-06-08-01' and race_date = '2026-06-08'), 'demo', 'demo-entry-r1-03', 3, '3', (select id from public.horses where provider = 'demo' and provider_horse_id = 'demo-horse-quiet-variance'), (select id from public.jockeys where provider = 'demo' and provider_jockey_id = 'demo-jockey-casey-north'), (select id from public.trainers where provider = 'demo' and provider_trainer_id = 'demo-trainer-mira-stone'), 'finished', '6/1', 122, 'L', null, '{"fixture":"wave3_demo_race_card","race_label":"completed"}', '2026-06-08 18:00:00+00'),
  ('2026-06-08', (select id from public.races where provider = 'demo' and provider_race_id = 'demo-race-2026-06-08-01' and race_date = '2026-06-08'), 'demo', 'demo-entry-r1-04', 4, '4', (select id from public.horses where provider = 'demo' and provider_horse_id = 'demo-horse-copper-turn'), (select id from public.jockeys where provider = 'demo' and provider_jockey_id = 'demo-jockey-jules-arden'), (select id from public.trainers where provider = 'demo' and provider_trainer_id = 'demo-trainer-cal-rowan'), 'finished', '8/1', 123, 'L', null, '{"fixture":"wave3_demo_race_card","race_label":"completed"}', '2026-06-08 18:00:00+00'),
  ('2026-06-08', (select id from public.races where provider = 'demo' and provider_race_id = 'demo-race-2026-06-08-01' and race_date = '2026-06-08'), 'demo', 'demo-entry-r1-05', 5, '5', (select id from public.horses where provider = 'demo' and provider_horse_id = 'demo-horse-velvet-index'), (select id from public.jockeys where provider = 'demo' and provider_jockey_id = 'demo-jockey-riley-cross'), (select id from public.trainers where provider = 'demo' and provider_trainer_id = 'demo-trainer-lena-west'), 'finished', '10/1', 119, 'L', null, '{"fixture":"wave3_demo_race_card","race_label":"completed"}', '2026-06-08 18:00:00+00'),
  ('2026-06-08', (select id from public.races where provider = 'demo' and provider_race_id = 'demo-race-2026-06-08-01' and race_date = '2026-06-08'), 'demo', 'demo-entry-r1-06', 6, '6', (select id from public.horses where provider = 'demo' and provider_horse_id = 'demo-horse-blue-interval'), (select id from public.jockeys where provider = 'demo' and provider_jockey_id = 'demo-jockey-devon-price'), (select id from public.trainers where provider = 'demo' and provider_trainer_id = 'demo-trainer-owen-field'), 'finished', '12/1', 120, 'L', null, '{"fixture":"wave3_demo_race_card","race_label":"completed"}', '2026-06-08 18:00:00+00'),
  ('2026-06-08', (select id from public.races where provider = 'demo' and provider_race_id = 'demo-race-2026-06-08-01' and race_date = '2026-06-08'), 'demo', 'demo-entry-r1-07', 7, '7', (select id from public.horses where provider = 'demo' and provider_horse_id = 'demo-horse-silver-cache'), (select id from public.jockeys where provider = 'demo' and provider_jockey_id = 'demo-jockey-harper-line'), (select id from public.trainers where provider = 'demo' and provider_trainer_id = 'demo-trainer-mira-stone'), 'finished', '15/1', 121, 'L', null, '{"fixture":"wave3_demo_race_card","race_label":"completed"}', '2026-06-08 18:00:00+00'),
  ('2026-06-08', (select id from public.races where provider = 'demo' and provider_race_id = 'demo-race-2026-06-08-02' and race_date = '2026-06-08'), 'demo', 'demo-entry-r2-01', 1, '1', (select id from public.horses where provider = 'demo' and provider_horse_id = 'demo-horse-final-stride'), (select id from public.jockeys where provider = 'demo' and provider_jockey_id = 'demo-jockey-avery-shaw'), (select id from public.trainers where provider = 'demo' and provider_trainer_id = 'demo-trainer-cal-rowan'), 'entered', '3/1', 124, 'L', null, '{"fixture":"wave3_demo_race_card","race_label":"scheduled"}', '2026-06-08 12:00:00+00'),
  ('2026-06-08', (select id from public.races where provider = 'demo' and provider_race_id = 'demo-race-2026-06-08-02' and race_date = '2026-06-08'), 'demo', 'demo-entry-r2-02', 2, '2', (select id from public.horses where provider = 'demo' and provider_horse_id = 'demo-horse-signal-peak'), (select id from public.jockeys where provider = 'demo' and provider_jockey_id = 'demo-jockey-morgan-vale'), (select id from public.trainers where provider = 'demo' and provider_trainer_id = 'demo-trainer-mira-stone'), 'entered', '7/2', 122, 'L', null, '{"fixture":"wave3_demo_race_card","race_label":"scheduled"}', '2026-06-08 12:00:00+00'),
  ('2026-06-08', (select id from public.races where provider = 'demo' and provider_race_id = 'demo-race-2026-06-08-02' and race_date = '2026-06-08'), 'demo', 'demo-entry-r2-03', 3, '3', (select id from public.horses where provider = 'demo' and provider_horse_id = 'demo-horse-orchard-switch'), (select id from public.jockeys where provider = 'demo' and provider_jockey_id = 'demo-jockey-casey-north'), (select id from public.trainers where provider = 'demo' and provider_trainer_id = 'demo-trainer-owen-field'), 'entered', '5/1', 120, 'L', null, '{"fixture":"wave3_demo_race_card","race_label":"scheduled"}', '2026-06-08 12:00:00+00'),
  ('2026-06-08', (select id from public.races where provider = 'demo' and provider_race_id = 'demo-race-2026-06-08-02' and race_date = '2026-06-08'), 'demo', 'demo-entry-r2-04', 4, '4', (select id from public.horses where provider = 'demo' and provider_horse_id = 'demo-horse-railway-proof'), (select id from public.jockeys where provider = 'demo' and provider_jockey_id = 'demo-jockey-jules-arden'), (select id from public.trainers where provider = 'demo' and provider_trainer_id = 'demo-trainer-lena-west'), 'entered', '8/1', 123, 'L', null, '{"fixture":"wave3_demo_race_card","race_label":"scheduled"}', '2026-06-08 12:00:00+00'),
  ('2026-06-08', (select id from public.races where provider = 'demo' and provider_race_id = 'demo-race-2026-06-08-02' and race_date = '2026-06-08'), 'demo', 'demo-entry-r2-05', 5, '5', (select id from public.horses where provider = 'demo' and provider_horse_id = 'demo-horse-sunlit-ledger'), (select id from public.jockeys where provider = 'demo' and provider_jockey_id = 'demo-jockey-riley-cross'), (select id from public.trainers where provider = 'demo' and provider_trainer_id = 'demo-trainer-cal-rowan'), 'entered', '10/1', 119, 'L', null, '{"fixture":"wave3_demo_race_card","race_label":"scheduled"}', '2026-06-08 12:00:00+00'),
  ('2026-06-08', (select id from public.races where provider = 'demo' and provider_race_id = 'demo-race-2026-06-08-02' and race_date = '2026-06-08'), 'demo', 'demo-entry-r2-06', 6, '6', (select id from public.horses where provider = 'demo' and provider_horse_id = 'demo-horse-meadow-hash'), (select id from public.jockeys where provider = 'demo' and provider_jockey_id = 'demo-jockey-devon-price'), (select id from public.trainers where provider = 'demo' and provider_trainer_id = 'demo-trainer-mira-stone'), 'entered', '12/1', 121, 'L', null, '{"fixture":"wave3_demo_race_card","race_label":"scheduled"}', '2026-06-08 12:00:00+00'),
  ('2026-06-08', (select id from public.races where provider = 'demo' and provider_race_id = 'demo-race-2026-06-08-02' and race_date = '2026-06-08'), 'demo', 'demo-entry-r2-07', 7, '7', (select id from public.horses where provider = 'demo' and provider_horse_id = 'demo-horse-priority-lane'), (select id from public.jockeys where provider = 'demo' and provider_jockey_id = 'demo-jockey-harper-line'), (select id from public.trainers where provider = 'demo' and provider_trainer_id = 'demo-trainer-owen-field'), 'entered', '15/1', 120, 'L', null, '{"fixture":"wave3_demo_race_card","race_label":"scheduled"}', '2026-06-08 12:00:00+00')
on conflict (provider, provider_entry_id, race_date) do update
set
  race_id = excluded.race_id,
  post_position = excluded.post_position,
  program_number = excluded.program_number,
  horse_id = excluded.horse_id,
  jockey_id = excluded.jockey_id,
  trainer_id = excluded.trainer_id,
  status = excluded.status,
  morning_line_odds = excluded.morning_line_odds,
  weight_lbs = excluded.weight_lbs,
  medication = excluded.medication,
  equipment = excluded.equipment,
  metadata = excluded.metadata,
  last_seen_at = excluded.last_seen_at,
  updated_at = now();

insert into public.entry_events (
  race_entry_id,
  race_date,
  event_type,
  event_at,
  previous_status,
  new_status,
  payload
)
select
  race_entries.id,
  race_entries.race_date,
  'fixture_entry_status',
  case
    when race_entries.provider_entry_id like 'demo-entry-r1-%' then '2026-06-08 18:00:00+00'::timestamptz
    else '2026-06-08 12:00:00+00'::timestamptz
  end,
  null::public.entry_status,
  race_entries.status,
  jsonb_build_object('fixture', 'wave3_demo_race_card', 'provider_entry_id', race_entries.provider_entry_id)
from public.race_entries
where race_entries.provider = 'demo'
  and race_entries.provider_entry_id like 'demo-entry-r_-__'
  and race_entries.race_date = '2026-06-08'
  and not exists (
    select 1
    from public.entry_events existing
    where existing.race_entry_id = race_entries.id
      and existing.race_date = race_entries.race_date
      and existing.event_type = 'fixture_entry_status'
      and existing.payload ->> 'fixture' = 'wave3_demo_race_card'
  );

insert into public.odds_snapshots (
  race_date,
  race_id,
  race_entry_id,
  provider,
  pool_type,
  odds_fractional,
  odds_decimal,
  implied_probability,
  pool_total,
  snapshot_at,
  sequence_number,
  payload
)
select
  '2026-06-08'::date,
  races.id,
  race_entries.id,
  'demo',
  'win',
  odds.odds_fractional,
  odds.odds_decimal,
  odds.implied_probability,
  odds.pool_total,
  odds.snapshot_at,
  odds.sequence_number,
  jsonb_build_object(
    'fixture', 'wave3_demo_race_card',
    'provider_entry_id', race_entries.provider_entry_id,
    'snapshot_label', odds.snapshot_label
  )
from (
  values
    ('demo-entry-r1-01', 'opening', '3/1', 4.00, 0.2500, 12400, '2026-06-08 16:35:00+00'::timestamptz, 101::bigint),
    ('demo-entry-r1-02', 'opening', '9/2', 5.50, 0.1818, 12400, '2026-06-08 16:35:00+00'::timestamptz, 102::bigint),
    ('demo-entry-r1-03', 'opening', '6/1', 7.00, 0.1429, 12400, '2026-06-08 16:35:00+00'::timestamptz, 103::bigint),
    ('demo-entry-r1-04', 'opening', '8/1', 9.00, 0.1111, 12400, '2026-06-08 16:35:00+00'::timestamptz, 104::bigint),
    ('demo-entry-r1-05', 'opening', '12/1', 13.00, 0.0769, 12400, '2026-06-08 16:35:00+00'::timestamptz, 105::bigint),
    ('demo-entry-r1-06', 'opening', '14/1', 15.00, 0.0667, 12400, '2026-06-08 16:35:00+00'::timestamptz, 106::bigint),
    ('demo-entry-r1-07', 'opening', '18/1', 19.00, 0.0526, 12400, '2026-06-08 16:35:00+00'::timestamptz, 107::bigint),
    ('demo-entry-r1-01', 'near_post', '5/2', 3.50, 0.2857, 28600, '2026-06-08 17:02:00+00'::timestamptz, 201::bigint),
    ('demo-entry-r1-02', 'near_post', '4/1', 5.00, 0.2000, 28600, '2026-06-08 17:02:00+00'::timestamptz, 202::bigint),
    ('demo-entry-r1-03', 'near_post', '13/2', 7.50, 0.1333, 28600, '2026-06-08 17:02:00+00'::timestamptz, 203::bigint),
    ('demo-entry-r1-04', 'near_post', '8/1', 9.00, 0.1111, 28600, '2026-06-08 17:02:00+00'::timestamptz, 204::bigint),
    ('demo-entry-r1-05', 'near_post', '10/1', 11.00, 0.0909, 28600, '2026-06-08 17:02:00+00'::timestamptz, 205::bigint),
    ('demo-entry-r1-06', 'near_post', '12/1', 13.00, 0.0769, 28600, '2026-06-08 17:02:00+00'::timestamptz, 206::bigint),
    ('demo-entry-r1-07', 'near_post', '16/1', 17.00, 0.0588, 28600, '2026-06-08 17:02:00+00'::timestamptz, 207::bigint)
) as odds(provider_entry_id, snapshot_label, odds_fractional, odds_decimal, implied_probability, pool_total, snapshot_at, sequence_number)
join public.race_entries
  on race_entries.provider = 'demo'
 and race_entries.provider_entry_id = odds.provider_entry_id
 and race_entries.race_date = '2026-06-08'
join public.races
  on races.id = race_entries.race_id
 and races.race_date = race_entries.race_date
where not exists (
  select 1
  from public.odds_snapshots existing
  where existing.race_entry_id = race_entries.id
    and existing.race_date = race_entries.race_date
    and existing.provider = 'demo'
    and existing.pool_type = 'win'
    and existing.sequence_number = odds.sequence_number
);

insert into public.result_versions (
  race_id,
  race_date,
  result_version,
  status,
  official_at,
  source,
  payload
)
values (
  (select id from public.races where provider = 'demo' and provider_race_id = 'demo-race-2026-06-08-01' and race_date = '2026-06-08'),
  '2026-06-08',
  1,
  'official',
  '2026-06-08 17:20:00+00',
  'demo',
  '{"fixture":"wave3_demo_race_card","result_scope":"official_demo"}'
)
on conflict (race_id, race_date, result_version) do update
set
  status = excluded.status,
  official_at = excluded.official_at,
  source = excluded.source,
  payload = excluded.payload;

insert into public.result_entries (
  result_version_id,
  race_entry_id,
  race_date,
  finish_position,
  dead_heat_group,
  beaten_lengths,
  payout_win,
  payout_place,
  payout_show,
  payload
)
select
  result_versions.id,
  race_entries.id,
  race_entries.race_date,
  results.finish_position,
  null,
  results.beaten_lengths,
  results.payout_win,
  results.payout_place,
  results.payout_show,
  jsonb_build_object('fixture', 'wave3_demo_race_card', 'provider_entry_id', race_entries.provider_entry_id)
from (
  values
    ('demo-entry-r1-01', 1, 0.00, 7.00, 3.80, 2.60),
    ('demo-entry-r1-03', 2, 1.25, null, 4.20, 2.90),
    ('demo-entry-r1-02', 3, 2.00, null, null, 2.40),
    ('demo-entry-r1-04', 4, 4.50, null, null, null),
    ('demo-entry-r1-06', 5, 6.00, null, null, null),
    ('demo-entry-r1-05', 6, 7.75, null, null, null),
    ('demo-entry-r1-07', 7, 9.50, null, null, null)
) as results(provider_entry_id, finish_position, beaten_lengths, payout_win, payout_place, payout_show)
join public.race_entries
  on race_entries.provider = 'demo'
 and race_entries.provider_entry_id = results.provider_entry_id
 and race_entries.race_date = '2026-06-08'
join public.result_versions
  on result_versions.race_id = race_entries.race_id
 and result_versions.race_date = race_entries.race_date
 and result_versions.result_version = 1
where result_versions.source = 'demo'
on conflict (result_version_id, race_entry_id) do update
set
  finish_position = excluded.finish_position,
  dead_heat_group = excluded.dead_heat_group,
  beaten_lengths = excluded.beaten_lengths,
  payout_win = excluded.payout_win,
  payout_place = excluded.payout_place,
  payout_show = excluded.payout_show,
  payload = excluded.payload;

commit;

-- Cleanup/reset block for Dev only.
-- Review before running. This removes only records identified by provider =
-- 'demo' or by the fixture-specific surface codes used above.
/*
begin;

delete from public.result_entries
where payload ->> 'fixture' = 'wave3_demo_race_card';

delete from public.result_versions
where source = 'demo'
  and payload ->> 'fixture' = 'wave3_demo_race_card';

delete from public.odds_snapshots
where provider = 'demo'
  and payload ->> 'fixture' = 'wave3_demo_race_card';

delete from public.entry_events
where payload ->> 'fixture' = 'wave3_demo_race_card';

delete from public.race_entries
where provider = 'demo'
  and metadata ->> 'fixture' = 'wave3_demo_race_card';

delete from public.races
where provider = 'demo'
  and metadata ->> 'fixture' = 'wave3_demo_race_card';

delete from public.horses
where provider = 'demo'
  and metadata ->> 'fixture' = 'wave3_demo_race_card';

delete from public.jockeys
where provider = 'demo'
  and metadata ->> 'fixture' = 'wave3_demo_race_card';

delete from public.trainers
where provider = 'demo'
  and metadata ->> 'fixture' = 'wave3_demo_race_card';

delete from public.tracks
where provider = 'demo'
  and metadata ->> 'fixture' = 'wave3_demo_race_card';

delete from public.surfaces
where code in ('DEMO_DIRT', 'DEMO_TURF')
  and metadata ->> 'fixture' = 'wave3_demo_race_card';

commit;
*/
