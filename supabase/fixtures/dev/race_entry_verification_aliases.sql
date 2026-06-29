-- Strideo Dev-only provider race-entry verification alias fixture.
--
-- Purpose:
--   Add the exact The Racing API fixture aliases needed to normalize the
--   controlled PR #71 race-entry persistence verification payload.
--
-- Safety:
--   - Dev only. Do not run against production.
--   - Does not create or alter tables.
--   - Does not insert unresolved-code rows.
--   - Does not insert track-code aliases.
--   - Does not write race_entries; PR #71's harness owns that controlled write.
--   - Does not create Opportunities, predictions, wagers, feature snapshots,
--     model-training rows, strategy marketplace rows, bankroll rows, bet-sheet
--     rows, or user workflow rows.
--
-- Apply manually after review and explicit Dev-only authorization:
--   node scripts/supabase-cli-with-env.mjs db query --linked \
--     --file supabase/fixtures/dev/race_entry_verification_aliases.sql

begin;

create temporary table race_entry_verification_code_sets (
  code_set_key text primary key,
  display_name text not null,
  description text not null
) on commit drop;

insert into race_entry_verification_code_sets (
  code_set_key,
  display_name,
  description
)
values
  ('race_type', 'Race Type', 'Race type and class shorthand used for racing-form normalization.'),
  ('surface', 'Surface', 'Canonical surface terms used for source normalization and feature engineering.'),
  ('track_condition', 'Track Condition', 'Track-condition shorthand used for racing-form normalization.'),
  ('horse_sex', 'Horse Sex', 'Horse sex shorthand used in past performances and horse records.'),
  ('horse_color', 'Horse Color', 'Horse color shorthand used in past performances and horse records.'),
  ('medication', 'Medication', 'Medication shorthand where the source context is medication.'),
  ('entry_status', 'Entry Status', 'Entry status shorthand for provider race-entry payloads.'),
  ('workout_type', 'Workout Type', 'Workout shorthand used in published workout lines.');

insert into public.racing_code_sets (
  code_set_key,
  display_name,
  description
)
select
  code_set_key,
  display_name,
  description
from race_entry_verification_code_sets
on conflict (code_set_key) do update
set
  display_name = excluded.display_name,
  description = excluded.description;

create temporary table race_entry_verification_code_values (
  code_set_key text not null,
  canonical_code text not null,
  canonical_label text not null,
  description text not null,
  normalized_value jsonb not null,
  sort_order integer not null,
  primary key (code_set_key, canonical_code)
) on commit drop;

insert into race_entry_verification_code_values (
  code_set_key,
  canonical_code,
  canonical_label,
  description,
  normalized_value,
  sort_order
)
values
  ('race_type', 'maiden_special_weight', 'Maiden Special Weight', 'Maiden race without claiming conditions.', '{"feature_key":"race_type_maiden_special_weight","race_type_family":"maiden","claiming":false}'::jsonb, 10),
  ('surface', 'dirt', 'Dirt', 'Dirt racing surface.', '{"feature_key":"surface_dirt","surface_family":"dirt"}'::jsonb, 10),
  ('track_condition', 'fast', 'Fast', 'Fast dirt track condition.', '{"feature_key":"track_condition_fast","surface_family":"dirt"}'::jsonb, 10),
  ('horse_sex', 'gelding', 'Gelding', 'Castrated male horse.', '{"feature_key":"horse_sex_gelding","sex":"male"}'::jsonb, 10),
  ('horse_color', 'bay', 'Bay', 'Bay horse color.', '{"feature_key":"horse_color_bay"}'::jsonb, 10),
  ('medication', 'lasix', 'Lasix', 'Lasix medication notation where source context is medication.', '{"feature_key":"medication_lasix"}'::jsonb, 10),
  ('entry_status', 'entered', 'Entered', 'Runner is entered and eligible to start.', '{"feature_key":"entry_status_entered","active_entry":true}'::jsonb, 10),
  ('workout_type', 'breezing', 'Breezing', 'Workout under light urging.', '{"feature_key":"workout_type_breezing"}'::jsonb, 10);

insert into public.racing_code_values (
  code_set_id,
  canonical_code,
  canonical_label,
  description,
  normalized_value,
  sort_order
)
select
  code_sets.id,
  values_to_seed.canonical_code,
  values_to_seed.canonical_label,
  values_to_seed.description,
  values_to_seed.normalized_value,
  values_to_seed.sort_order
from race_entry_verification_code_values values_to_seed
join public.racing_code_sets code_sets
  on code_sets.code_set_key = values_to_seed.code_set_key
on conflict (code_set_id, canonical_code) do update
set
  canonical_label = excluded.canonical_label,
  description = excluded.description,
  normalized_value = excluded.normalized_value,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

create temporary table race_entry_verification_aliases (
  code_set_key text not null,
  canonical_code text not null,
  source_system text not null,
  source_code text not null,
  source_label text not null,
  source_description text not null,
  confidence numeric not null default 1,
  source_url text not null,
  notes text not null,
  primary key (code_set_key, source_system, source_code)
) on commit drop;

insert into race_entry_verification_aliases (
  code_set_key,
  canonical_code,
  source_system,
  source_code,
  source_label,
  source_description,
  confidence,
  source_url,
  notes
)
values
  ('race_type', 'maiden_special_weight', 'the_racing_api', 'MSW', 'Maiden Special Weight', 'The Racing API race-entry fixture race.type_code.', 1, 'https://example.provider.local/runtime-verification/race-entry-persistence', 'Dev-only PR #71 verification alias for source path race.type_code.'),
  ('surface', 'dirt', 'the_racing_api', 'D', 'Dirt', 'The Racing API race-entry fixture race.surface_code.', 1, 'https://example.provider.local/runtime-verification/race-entry-persistence', 'Dev-only PR #71 verification alias for source path race.surface_code.'),
  ('track_condition', 'fast', 'the_racing_api', 'FT', 'Fast', 'The Racing API race-entry fixture race.track_condition_code.', 1, 'https://example.provider.local/runtime-verification/race-entry-persistence', 'Dev-only PR #71 verification alias for source path race.track_condition_code.'),
  ('horse_sex', 'gelding', 'the_racing_api', 'g', 'Gelding', 'The Racing API race-entry fixture horse.sex_code.', 1, 'https://example.provider.local/runtime-verification/race-entry-persistence', 'Dev-only PR #71 verification alias for source path horse.sex_code. Lowercase g remains code-set scoped.'),
  ('horse_color', 'bay', 'the_racing_api', 'B', 'Bay', 'The Racing API race-entry fixture horse.color_code.', 1, 'https://example.provider.local/runtime-verification/race-entry-persistence', 'Dev-only PR #71 verification alias for source path horse.color_code. B remains code-set scoped and is not seeded as Bute or blinkers.'),
  ('medication', 'lasix', 'the_racing_api', 'L', 'Lasix', 'The Racing API race-entry fixture entry.medication_code.', 1, 'https://example.provider.local/runtime-verification/race-entry-persistence', 'Dev-only PR #71 verification alias for source path entry.medication_code. First-time Lasix remains deferred.'),
  ('entry_status', 'entered', 'the_racing_api', 'RUN', 'Entered', 'The Racing API race-entry fixture entry.status_code.', 1, 'https://example.provider.local/runtime-verification/race-entry-persistence', 'Dev-only PR #71 verification alias for source path entry.status_code. RUN is mapped conservatively to entered for race-entry state.'),
  ('workout_type', 'breezing', 'the_racing_api', 'B', 'Breezing', 'The Racing API race-entry fixture recent_workout.work_type_code.', 1, 'https://example.provider.local/runtime-verification/race-entry-persistence', 'Dev-only PR #71 verification alias for source path recent_workout.work_type_code. B remains code-set scoped.');

insert into public.racing_code_aliases (
  code_set_id,
  code_value_id,
  source_system,
  source_code,
  source_label,
  source_description,
  confidence,
  source_url,
  notes
)
select
  code_sets.id,
  code_values.id,
  aliases.source_system,
  aliases.source_code,
  aliases.source_label,
  aliases.source_description,
  aliases.confidence,
  aliases.source_url,
  aliases.notes
from race_entry_verification_aliases aliases
join public.racing_code_sets code_sets
  on code_sets.code_set_key = aliases.code_set_key
join public.racing_code_values code_values
  on code_values.code_set_id = code_sets.id
  and code_values.canonical_code = aliases.canonical_code
on conflict (code_set_id, (lower(source_system)), (lower(source_code)))
  where is_active and effective_to is null
do update
set
  code_value_id = excluded.code_value_id,
  source_label = excluded.source_label,
  source_description = excluded.source_description,
  confidence = excluded.confidence,
  source_url = excluded.source_url,
  notes = excluded.notes,
  is_active = true,
  updated_at = now();

commit;

-- Cleanup/reset:
--
-- No cleanup block is included. These aliases are a reviewed Dev verification
-- overlay for The Racing API fixture normalization. Remove or revise seeded
-- glossary rows only through a reviewed forward cleanup plan.
