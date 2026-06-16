-- Strideo Dev-only starter racing-form glossary fixture.
--
-- Purpose:
--   Populate the racing-form glossary reference tables with a small reviewed
--   starter set of canonical values and source-attributed aliases for
--   shorthand normalization. This supports ingestion and ML feature hygiene;
--   it is not a display-only glossary and is not a complete racing dictionary.
--
-- Safety:
--   - Dev only. Do not run against production.
--   - Does not create or alter tables.
--   - Does not insert seed data automatically through migration flow.
--   - Does not insert track-code aliases.
--   - Does not insert unresolved-code rows.
--   - Does not create Opportunities, predictions, wagers, or feature rows.
--   - Uses only high-confidence mappings from reviewed sources documented in
--     docs/RACING_FORM_GLOSSARY_AUDIT.md.
--
-- Apply manually after review and explicit authorization, for example:
--   psql "$STRIDEO_DEV_SUPABASE_DB_URL" -v ON_ERROR_STOP=1 \
--     -f supabase/fixtures/dev/starter_racing_glossary.sql

begin;

create temporary table starter_racing_code_sets (
  code_set_key text primary key,
  display_name text not null,
  description text not null
) on commit drop;

insert into starter_racing_code_sets (code_set_key, display_name, description)
values
  ('race_type', 'Race Type', 'Starter reviewed canonical race-type and class shorthand used for racing-form normalization.'),
  ('race_grade', 'Race Grade', 'Starter reviewed graded-stakes shorthand used for racing-form normalization.'),
  ('surface', 'Surface', 'Starter reviewed canonical surface terms used for source normalization and feature engineering.'),
  ('track_condition', 'Track Condition', 'Starter reviewed track-condition shorthand for dirt and turf racing forms.'),
  ('workout_type', 'Workout Type', 'Starter reviewed workout shorthand used in published workout lines.'),
  ('horse_sex', 'Horse Sex', 'Starter reviewed horse sex shorthand used in past performances and horse records.'),
  ('horse_color', 'Horse Color', 'Starter reviewed horse color shorthand used in past performances and horse records.'),
  ('medication', 'Medication', 'Starter reviewed medication shorthand where the source context is unambiguous.'),
  ('finish_margin', 'Finish Margin', 'Starter reviewed finish-margin shorthand used in running lines and charts.'),
  ('running_line_status', 'Running Line Status', 'Starter reviewed running-line status shorthand used in charts and past performances.'),
  ('entry_status', 'Entry Status', 'Starter reviewed entry-status shorthand for entry eligibility and scratches.'),
  ('wager_result_status', 'Wager/Result Status', 'Starter reviewed result-status shorthand relevant to wager settlement and result review.');

insert into public.racing_code_sets (
  code_set_key,
  display_name,
  description
)
select
  code_set_key,
  display_name,
  description
from starter_racing_code_sets
on conflict (code_set_key) do update
set
  display_name = excluded.display_name,
  description = excluded.description;

create temporary table starter_racing_code_values (
  code_set_key text not null,
  canonical_code text not null,
  canonical_label text not null,
  description text,
  normalized_value jsonb not null,
  sort_order integer not null,
  primary key (code_set_key, canonical_code)
) on commit drop;

insert into starter_racing_code_values (
  code_set_key,
  canonical_code,
  canonical_label,
  description,
  normalized_value,
  sort_order
)
values
  ('race_type', 'maiden_special_weight', 'Maiden Special Weight', 'Maiden race without claiming conditions.', '{"feature_key":"race_type_maiden_special_weight","race_type_family":"maiden","claiming":false}'::jsonb, 10),
  ('race_type', 'maiden_claiming', 'Maiden Claiming', 'Maiden race with claiming conditions.', '{"feature_key":"race_type_maiden_claiming","race_type_family":"maiden","claiming":true}'::jsonb, 20),
  ('race_type', 'claiming', 'Claiming', 'Claiming race.', '{"feature_key":"race_type_claiming","race_type_family":"claiming","claiming":true}'::jsonb, 30),
  ('race_type', 'allowance', 'Allowance', 'Allowance race.', '{"feature_key":"race_type_allowance","race_type_family":"allowance","claiming":false}'::jsonb, 40),
  ('race_type', 'allowance_optional_claiming', 'Allowance Optional Claiming', 'Allowance optional claiming or optional claiming race.', '{"feature_key":"race_type_allowance_optional_claiming","race_type_family":"allowance","claiming":"optional"}'::jsonb, 50),
  ('race_type', 'stakes', 'Stakes', 'Stakes race.', '{"feature_key":"race_type_stakes","race_type_family":"stakes"}'::jsonb, 60),
  ('race_type', 'handicap', 'Handicap', 'Handicap race.', '{"feature_key":"race_type_handicap","race_type_family":"handicap"}'::jsonb, 70),
  ('race_type', 'starter', 'Starter', 'Starter race.', '{"feature_key":"race_type_starter","race_type_family":"starter"}'::jsonb, 80),

  ('race_grade', 'grade_1', 'Grade 1', 'Grade 1 stakes race.', '{"feature_key":"race_grade_1","grade":1}'::jsonb, 10),
  ('race_grade', 'grade_2', 'Grade 2', 'Grade 2 stakes race.', '{"feature_key":"race_grade_2","grade":2}'::jsonb, 20),
  ('race_grade', 'grade_3', 'Grade 3', 'Grade 3 stakes race.', '{"feature_key":"race_grade_3","grade":3}'::jsonb, 30),

  ('surface', 'dirt', 'Dirt', 'Dirt racing surface.', '{"feature_key":"surface_dirt","surface_family":"dirt"}'::jsonb, 10),
  ('surface', 'turf', 'Turf', 'Turf racing surface.', '{"feature_key":"surface_turf","surface_family":"turf"}'::jsonb, 20),
  ('surface', 'synthetic', 'Synthetic / All Weather', 'Synthetic or all-weather racing surface.', '{"feature_key":"surface_synthetic","surface_family":"synthetic"}'::jsonb, 30),

  ('track_condition', 'fast', 'Fast', 'Fast dirt track condition.', '{"feature_key":"track_condition_fast","surface_family":"dirt"}'::jsonb, 10),
  ('track_condition', 'good', 'Good', 'Good track condition.', '{"feature_key":"track_condition_good"}'::jsonb, 20),
  ('track_condition', 'muddy', 'Muddy', 'Muddy dirt track condition.', '{"feature_key":"track_condition_muddy","surface_family":"dirt"}'::jsonb, 30),
  ('track_condition', 'sloppy', 'Sloppy', 'Sloppy dirt track condition.', '{"feature_key":"track_condition_sloppy","surface_family":"dirt"}'::jsonb, 40),
  ('track_condition', 'wet_fast', 'Wet Fast', 'Wet-fast dirt track condition.', '{"feature_key":"track_condition_wet_fast","surface_family":"dirt"}'::jsonb, 50),
  ('track_condition', 'firm', 'Firm', 'Firm turf condition.', '{"feature_key":"track_condition_firm","surface_family":"turf"}'::jsonb, 60),
  ('track_condition', 'yielding', 'Yielding', 'Yielding turf condition.', '{"feature_key":"track_condition_yielding","surface_family":"turf"}'::jsonb, 70),
  ('track_condition', 'soft', 'Soft', 'Soft turf condition.', '{"feature_key":"track_condition_soft","surface_family":"turf"}'::jsonb, 80),
  ('track_condition', 'heavy', 'Heavy', 'Heavy track condition.', '{"feature_key":"track_condition_heavy"}'::jsonb, 90),
  ('track_condition', 'sealed', 'Sealed', 'Sealed track notation.', '{"feature_key":"track_condition_sealed"}'::jsonb, 100),
  ('track_condition', 'off_turf', 'Off Turf', 'Race moved off the turf.', '{"feature_key":"track_condition_off_turf","surface_change":true}'::jsonb, 110),

  ('workout_type', 'breezing', 'Breezing', 'Workout under light urging.', '{"feature_key":"workout_type_breezing"}'::jsonb, 10),
  ('workout_type', 'handily', 'Handily', 'Workout under stronger urging.', '{"feature_key":"workout_type_handily"}'::jsonb, 20),
  ('workout_type', 'gate', 'Gate', 'Workout from the gate.', '{"feature_key":"workout_type_gate"}'::jsonb, 30),
  ('workout_type', 'bullet', 'Bullet Work', 'Fastest workout at the distance for the day/source context.', '{"feature_key":"workout_type_bullet","rank_signal":"best_at_distance"}'::jsonb, 40),

  ('horse_sex', 'colt', 'Colt', 'Male horse under five years old.', '{"feature_key":"horse_sex_colt","sex":"male"}'::jsonb, 10),
  ('horse_sex', 'filly', 'Filly', 'Female horse under five years old.', '{"feature_key":"horse_sex_filly","sex":"female"}'::jsonb, 20),
  ('horse_sex', 'gelding', 'Gelding', 'Castrated male horse.', '{"feature_key":"horse_sex_gelding","sex":"male"}'::jsonb, 30),
  ('horse_sex', 'horse', 'Horse', 'Male horse five years old or older.', '{"feature_key":"horse_sex_horse","sex":"male"}'::jsonb, 40),
  ('horse_sex', 'mare', 'Mare', 'Female horse five years old or older.', '{"feature_key":"horse_sex_mare","sex":"female"}'::jsonb, 50),
  ('horse_sex', 'ridgling', 'Ridgling', 'Male horse with retained testicle.', '{"feature_key":"horse_sex_ridgling","sex":"male"}'::jsonb, 60),

  ('horse_color', 'bay', 'Bay', 'Bay horse color.', '{"feature_key":"horse_color_bay"}'::jsonb, 10),
  ('horse_color', 'black', 'Black', 'Black horse color.', '{"feature_key":"horse_color_black"}'::jsonb, 20),
  ('horse_color', 'chestnut', 'Chestnut', 'Chestnut horse color.', '{"feature_key":"horse_color_chestnut"}'::jsonb, 30),
  ('horse_color', 'dark_bay_or_brown', 'Dark Bay or Brown', 'Dark bay or brown horse color.', '{"feature_key":"horse_color_dark_bay_or_brown"}'::jsonb, 40),
  ('horse_color', 'gray', 'Gray', 'Gray horse color.', '{"feature_key":"horse_color_gray"}'::jsonb, 50),
  ('horse_color', 'roan', 'Roan', 'Roan horse color.', '{"feature_key":"horse_color_roan"}'::jsonb, 60),

  ('medication', 'lasix', 'Lasix', 'Lasix medication notation where source context is medication.', '{"feature_key":"medication_lasix"}'::jsonb, 10),

  ('finish_margin', 'head', 'Head', 'Head finish margin.', '{"feature_key":"finish_margin_head"}'::jsonb, 10),
  ('finish_margin', 'neck', 'Neck', 'Neck finish margin.', '{"feature_key":"finish_margin_neck"}'::jsonb, 20),
  ('finish_margin', 'nose', 'Nose', 'Nose finish margin.', '{"feature_key":"finish_margin_nose"}'::jsonb, 30),
  ('finish_margin', 'dead_heat', 'Dead Heat', 'Dead heat finish notation.', '{"feature_key":"finish_margin_dead_heat","dead_heat":true}'::jsonb, 40),

  ('running_line_status', 'did_not_finish', 'Did Not Finish', 'Runner did not finish.', '{"feature_key":"running_line_status_did_not_finish","finished":false}'::jsonb, 10),
  ('running_line_status', 'pulled_up', 'Pulled Up', 'Runner was pulled up.', '{"feature_key":"running_line_status_pulled_up","finished":false}'::jsonb, 20),
  ('running_line_status', 'eased', 'Eased', 'Runner was eased.', '{"feature_key":"running_line_status_eased","finished":false}'::jsonb, 30),
  ('running_line_status', 'vanned_off', 'Vanned Off', 'Runner was vanned off.', '{"feature_key":"running_line_status_vanned_off","finished":false}'::jsonb, 40),

  ('entry_status', 'scratched', 'Scratched', 'Entry scratched from the race.', '{"feature_key":"entry_status_scratched","active_entry":false}'::jsonb, 10),
  ('entry_status', 'also_eligible', 'Also Eligible', 'Entry is on the also-eligible list.', '{"feature_key":"entry_status_also_eligible","active_entry":"conditional"}'::jsonb, 20),
  ('entry_status', 'main_track_only', 'Main Track Only', 'Entry is main-track-only.', '{"feature_key":"entry_status_main_track_only","active_entry":"conditional"}'::jsonb, 30),

  ('wager_result_status', 'disqualified', 'Disqualified', 'Disqualification result status.', '{"feature_key":"result_status_disqualified","official_result_adjustment":true}'::jsonb, 10),
  ('wager_result_status', 'inquiry', 'Inquiry', 'Inquiry result status.', '{"feature_key":"result_status_inquiry","official_result_pending":true}'::jsonb, 20),
  ('wager_result_status', 'objection', 'Objection', 'Objection result status.', '{"feature_key":"result_status_objection","official_result_pending":true}'::jsonb, 30),
  ('wager_result_status', 'official', 'Official', 'Official result status.', '{"feature_key":"result_status_official","official":true}'::jsonb, 40);

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
from starter_racing_code_values values_to_seed
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

create temporary table starter_racing_code_aliases (
  code_set_key text not null,
  canonical_code text not null,
  source_system text not null,
  source_code text not null,
  source_label text,
  source_description text,
  confidence numeric not null default 1,
  source_url text not null,
  notes text not null,
  primary key (code_set_key, source_system, source_code)
) on commit drop;

insert into starter_racing_code_aliases (
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
  ('race_type', 'maiden_special_weight', 'equibase_codes', 'MSW', 'Maiden Special Weight', 'Equibase race-type/class shorthand reviewed from Codes and Definitions.', 1, 'https://www.equibase.com/newfan/codes.cfm', 'High-confidence starter race-type alias.'),
  ('race_type', 'maiden_special_weight', 'drf_symbols', 'MdSpWt', 'Maiden Special Weight', 'DRF-style past-performance race-type shorthand reviewed from the glossary audit source list.', 1, 'https://help.drf.com/hc/en-us/articles/225544487-Symbols-and-Abbreviations', 'High-confidence starter race-type alias.'),
  ('race_type', 'maiden_claiming', 'equibase_codes', 'MCL', 'Maiden Claiming', 'Equibase race-type/class shorthand reviewed from Codes and Definitions.', 1, 'https://www.equibase.com/newfan/codes.cfm', 'High-confidence starter race-type alias.'),
  ('race_type', 'maiden_claiming', 'drf_symbols', 'MdClm', 'Maiden Claiming', 'DRF-style past-performance race-type shorthand reviewed from the glossary audit source list.', 1, 'https://help.drf.com/hc/en-us/articles/225544487-Symbols-and-Abbreviations', 'High-confidence starter race-type alias.'),
  ('race_type', 'claiming', 'equibase_codes', 'CLM', 'Claiming', 'Equibase race-type/class shorthand reviewed from Codes and Definitions.', 1, 'https://www.equibase.com/newfan/codes.cfm', 'High-confidence starter race-type alias.'),
  ('race_type', 'claiming', 'drf_symbols', 'Clm', 'Claiming', 'DRF-style past-performance race-type shorthand reviewed from the glossary audit source list.', 1, 'https://help.drf.com/hc/en-us/articles/225544487-Symbols-and-Abbreviations', 'High-confidence starter race-type alias.'),
  ('race_type', 'allowance', 'equibase_codes', 'ALW', 'Allowance', 'Equibase race-type/class shorthand reviewed from Codes and Definitions.', 1, 'https://www.equibase.com/newfan/codes.cfm', 'High-confidence starter race-type alias.'),
  ('race_type', 'allowance', 'drf_symbols', 'Alw', 'Allowance', 'DRF-style past-performance race-type shorthand reviewed from the glossary audit source list.', 1, 'https://help.drf.com/hc/en-us/articles/225544487-Symbols-and-Abbreviations', 'High-confidence starter race-type alias.'),
  ('race_type', 'allowance_optional_claiming', 'equibase_codes', 'AOC', 'Allowance Optional Claiming', 'Equibase race-type/class shorthand reviewed from Codes and Definitions.', 1, 'https://www.equibase.com/newfan/codes.cfm', 'High-confidence starter race-type alias.'),
  ('race_type', 'allowance_optional_claiming', 'drf_symbols', 'OC', 'Optional Claiming', 'DRF-style past-performance race-type shorthand reviewed from the glossary audit source list.', 1, 'https://help.drf.com/hc/en-us/articles/225544487-Symbols-and-Abbreviations', 'High-confidence starter race-type alias.'),
  ('race_type', 'allowance_optional_claiming', 'drf_symbols', 'OClm', 'Optional Claiming', 'DRF-style past-performance race-type shorthand reviewed from the glossary audit source list.', 1, 'https://help.drf.com/hc/en-us/articles/225544487-Symbols-and-Abbreviations', 'High-confidence starter race-type alias.'),
  ('race_type', 'stakes', 'equibase_codes', 'STK', 'Stakes', 'Equibase race-type/class shorthand reviewed from Codes and Definitions.', 1, 'https://www.equibase.com/newfan/codes.cfm', 'High-confidence starter race-type alias.'),
  ('race_type', 'stakes', 'drf_symbols', 'Stk', 'Stakes', 'DRF-style past-performance race-type shorthand reviewed from the glossary audit source list.', 1, 'https://help.drf.com/hc/en-us/articles/225544487-Symbols-and-Abbreviations', 'High-confidence starter race-type alias.'),
  ('race_type', 'handicap', 'equibase_codes', 'HCP', 'Handicap', 'Equibase race-type/class shorthand reviewed from Codes and Definitions.', 1, 'https://www.equibase.com/newfan/codes.cfm', 'High-confidence starter race-type alias.'),
  ('race_type', 'handicap', 'drf_symbols', 'Hcp', 'Handicap', 'DRF-style past-performance race-type shorthand reviewed from the glossary audit source list.', 1, 'https://help.drf.com/hc/en-us/articles/225544487-Symbols-and-Abbreviations', 'High-confidence starter race-type alias.'),
  ('race_type', 'starter', 'equibase_codes', 'STR', 'Starter', 'Equibase race-type/class shorthand reviewed from Codes and Definitions.', 1, 'https://www.equibase.com/newfan/codes.cfm', 'High-confidence starter race-type alias.'),
  ('race_type', 'starter', 'drf_symbols', 'Str', 'Starter', 'DRF-style past-performance race-type shorthand reviewed from the glossary audit source list.', 1, 'https://help.drf.com/hc/en-us/articles/225544487-Symbols-and-Abbreviations', 'High-confidence starter race-type alias.'),

  ('race_grade', 'grade_1', 'equibase_codes', 'G1', 'Grade 1', 'Equibase grade shorthand reviewed from Codes and Definitions.', 1, 'https://www.equibase.com/newfan/codes.cfm', 'High-confidence graded-stakes alias.'),
  ('race_grade', 'grade_1', 'equibase_codes', 'GI', 'Grade 1', 'Roman numeral grade shorthand reviewed from Codes and Definitions.', 1, 'https://www.equibase.com/newfan/codes.cfm', 'High-confidence graded-stakes alias.'),
  ('race_grade', 'grade_2', 'equibase_codes', 'G2', 'Grade 2', 'Equibase grade shorthand reviewed from Codes and Definitions.', 1, 'https://www.equibase.com/newfan/codes.cfm', 'High-confidence graded-stakes alias.'),
  ('race_grade', 'grade_2', 'equibase_codes', 'GII', 'Grade 2', 'Roman numeral grade shorthand reviewed from Codes and Definitions.', 1, 'https://www.equibase.com/newfan/codes.cfm', 'High-confidence graded-stakes alias.'),
  ('race_grade', 'grade_3', 'equibase_codes', 'G3', 'Grade 3', 'Equibase grade shorthand reviewed from Codes and Definitions.', 1, 'https://www.equibase.com/newfan/codes.cfm', 'High-confidence graded-stakes alias.'),
  ('race_grade', 'grade_3', 'equibase_codes', 'GIII', 'Grade 3', 'Roman numeral grade shorthand reviewed from Codes and Definitions.', 1, 'https://www.equibase.com/newfan/codes.cfm', 'High-confidence graded-stakes alias.'),

  ('surface', 'dirt', 'equibase_codes', 'Dirt', 'Dirt', 'Equibase surface term reviewed from Codes and Definitions.', 1, 'https://www.equibase.com/newfan/codes.cfm', 'Canonical surface alias using reviewed source terminology.'),
  ('surface', 'turf', 'equibase_codes', 'Turf', 'Turf', 'Equibase surface term reviewed from Codes and Definitions.', 1, 'https://www.equibase.com/newfan/codes.cfm', 'Canonical surface alias using reviewed source terminology.'),
  ('surface', 'synthetic', 'equibase_codes', 'Synthetic', 'Synthetic', 'Equibase surface term reviewed from Codes and Definitions.', 1, 'https://www.equibase.com/newfan/codes.cfm', 'Canonical surface alias using reviewed source terminology.'),
  ('surface', 'synthetic', 'equibase_codes', 'All Weather', 'All Weather', 'All-weather surface term reviewed as synthetic/all-weather family.', 0.95, 'https://www.equibase.com/newfan/codes.cfm', 'Kept in the synthetic surface family for starter feature normalization.'),

  ('track_condition', 'fast', 'brisnet_track_conditions', 'FST', 'Fast', 'BRISnet track-condition code.', 1, 'https://support.brisnet.com/hc/en-us/articles/360056090432-Track-Condition-Terms', 'High-confidence dirt track-condition alias.'),
  ('track_condition', 'fast', 'brisnet_track_conditions', 'FT', 'Fast', 'BRISnet track-condition code.', 1, 'https://support.brisnet.com/hc/en-us/articles/360056090432-Track-Condition-Terms', 'High-confidence dirt track-condition alias.'),
  ('track_condition', 'good', 'brisnet_track_conditions', 'GD', 'Good', 'BRISnet track-condition code.', 1, 'https://support.brisnet.com/hc/en-us/articles/360056090432-Track-Condition-Terms', 'Good can apply across source surface contexts; preserve raw surface separately.'),
  ('track_condition', 'muddy', 'brisnet_track_conditions', 'MUD', 'Muddy', 'BRISnet track-condition code.', 1, 'https://support.brisnet.com/hc/en-us/articles/360056090432-Track-Condition-Terms', 'High-confidence dirt track-condition alias.'),
  ('track_condition', 'muddy', 'brisnet_track_conditions', 'MY', 'Muddy', 'BRISnet track-condition code.', 1, 'https://support.brisnet.com/hc/en-us/articles/360056090432-Track-Condition-Terms', 'High-confidence dirt track-condition alias.'),
  ('track_condition', 'sloppy', 'brisnet_track_conditions', 'SLY', 'Sloppy', 'BRISnet track-condition code.', 1, 'https://support.brisnet.com/hc/en-us/articles/360056090432-Track-Condition-Terms', 'High-confidence dirt track-condition alias.'),
  ('track_condition', 'sloppy', 'brisnet_track_conditions', 'SY', 'Sloppy', 'BRISnet track-condition code.', 1, 'https://support.brisnet.com/hc/en-us/articles/360056090432-Track-Condition-Terms', 'High-confidence dirt track-condition alias.'),
  ('track_condition', 'wet_fast', 'brisnet_track_conditions', 'WF', 'Wet Fast', 'BRISnet track-condition code.', 1, 'https://support.brisnet.com/hc/en-us/articles/360056090432-Track-Condition-Terms', 'High-confidence dirt track-condition alias.'),
  ('track_condition', 'firm', 'brisnet_track_conditions', 'FM', 'Firm', 'BRISnet turf condition code.', 1, 'https://support.brisnet.com/hc/en-us/articles/360056090432-Track-Condition-Terms', 'High-confidence turf track-condition alias.'),
  ('track_condition', 'firm', 'brisnet_track_conditions', 'FRM', 'Firm', 'BRISnet turf condition code.', 1, 'https://support.brisnet.com/hc/en-us/articles/360056090432-Track-Condition-Terms', 'High-confidence turf track-condition alias.'),
  ('track_condition', 'yielding', 'brisnet_track_conditions', 'YLD', 'Yielding', 'BRISnet turf condition code.', 1, 'https://support.brisnet.com/hc/en-us/articles/360056090432-Track-Condition-Terms', 'High-confidence turf track-condition alias.'),
  ('track_condition', 'soft', 'brisnet_track_conditions', 'SFT', 'Soft', 'BRISnet turf condition code.', 1, 'https://support.brisnet.com/hc/en-us/articles/360056090432-Track-Condition-Terms', 'High-confidence turf track-condition alias.'),
  ('track_condition', 'soft', 'brisnet_track_conditions', 'SF', 'Soft', 'BRISnet turf condition code.', 1, 'https://support.brisnet.com/hc/en-us/articles/360056090432-Track-Condition-Terms', 'High-confidence turf track-condition alias.'),
  ('track_condition', 'heavy', 'brisnet_track_conditions', 'HVY', 'Heavy', 'BRISnet track-condition code.', 1, 'https://support.brisnet.com/hc/en-us/articles/360056090432-Track-Condition-Terms', 'Heavy can appear in dirt/turf contexts; preserve raw surface separately.'),
  ('track_condition', 'sealed', 'equibase_codes', 'Sealed', 'Sealed', 'Equibase track-condition terminology.', 1, 'https://www.equibase.com/newfan/codes.cfm', 'High-confidence source term, not a broad shorthand expansion.'),
  ('track_condition', 'off_turf', 'equibase_codes', 'Off Turf', 'Off Turf', 'Equibase surface/condition terminology for races moved off turf.', 1, 'https://www.equibase.com/newfan/codes.cfm', 'High-confidence source term, not a broad track-code seed.'),

  ('workout_type', 'breezing', 'drf_workout', 'B', 'Breezing', 'DRF workout shorthand from Symbols and Abbreviations.', 1, 'https://help.drf.com/hc/en-us/articles/225544487-Symbols-and-Abbreviations', 'Code B is seeded only in workout_type context; it is ambiguous in other categories.'),
  ('workout_type', 'handily', 'drf_workout', 'H', 'Handily', 'DRF workout shorthand from Symbols and Abbreviations.', 1, 'https://help.drf.com/hc/en-us/articles/225544487-Symbols-and-Abbreviations', 'High-confidence workout alias.'),
  ('workout_type', 'gate', 'drf_workout', 'g', 'Gate', 'DRF workout gate marker from Symbols and Abbreviations.', 1, 'https://help.drf.com/hc/en-us/articles/225544487-Symbols-and-Abbreviations', 'Lowercase g is seeded only in workout_type context.'),
  ('workout_type', 'bullet', 'drf_past_performances', 'bullet', 'Bullet Work', 'DRF past-performance workout ranking explanation.', 0.95, 'https://www1.drf.com/help/help_drf_pp.html', 'Represents source-supported bullet-work indicator; ingestion must preserve exact raw marker.'),

  ('horse_sex', 'colt', 'drf_symbols', 'c', 'Colt', 'DRF horse sex shorthand from Symbols and Abbreviations.', 1, 'https://help.drf.com/hc/en-us/articles/225544487-Symbols-and-Abbreviations', 'High-confidence horse sex alias.'),
  ('horse_sex', 'filly', 'drf_symbols', 'f', 'Filly', 'DRF horse sex shorthand from Symbols and Abbreviations.', 1, 'https://help.drf.com/hc/en-us/articles/225544487-Symbols-and-Abbreviations', 'High-confidence horse sex alias.'),
  ('horse_sex', 'gelding', 'drf_symbols', 'g', 'Gelding', 'DRF horse sex shorthand from Symbols and Abbreviations.', 1, 'https://help.drf.com/hc/en-us/articles/225544487-Symbols-and-Abbreviations', 'High-confidence horse sex alias.'),
  ('horse_sex', 'horse', 'drf_symbols', 'h', 'Horse', 'DRF horse sex shorthand from Symbols and Abbreviations.', 1, 'https://help.drf.com/hc/en-us/articles/225544487-Symbols-and-Abbreviations', 'High-confidence horse sex alias.'),
  ('horse_sex', 'mare', 'drf_symbols', 'm', 'Mare', 'DRF horse sex shorthand from Symbols and Abbreviations.', 1, 'https://help.drf.com/hc/en-us/articles/225544487-Symbols-and-Abbreviations', 'High-confidence horse sex alias.'),
  ('horse_sex', 'ridgling', 'drf_symbols', 'r', 'Ridgling', 'DRF horse sex shorthand from Symbols and Abbreviations.', 1, 'https://help.drf.com/hc/en-us/articles/225544487-Symbols-and-Abbreviations', 'High-confidence horse sex alias.'),

  ('horse_color', 'bay', 'drf_symbols', 'B', 'Bay', 'DRF horse color shorthand from Symbols and Abbreviations.', 1, 'https://help.drf.com/hc/en-us/articles/225544487-Symbols-and-Abbreviations', 'Code B is seeded only in horse_color context; it is ambiguous in other categories.'),
  ('horse_color', 'black', 'drf_symbols', 'Blk', 'Black', 'DRF horse color shorthand from Symbols and Abbreviations.', 1, 'https://help.drf.com/hc/en-us/articles/225544487-Symbols-and-Abbreviations', 'High-confidence horse color alias.'),
  ('horse_color', 'chestnut', 'drf_symbols', 'Ch', 'Chestnut', 'DRF horse color shorthand from Symbols and Abbreviations.', 1, 'https://help.drf.com/hc/en-us/articles/225544487-Symbols-and-Abbreviations', 'High-confidence horse color alias.'),
  ('horse_color', 'dark_bay_or_brown', 'drf_symbols', 'Dkb/br', 'Dark Bay or Brown', 'DRF horse color shorthand from Symbols and Abbreviations.', 1, 'https://help.drf.com/hc/en-us/articles/225544487-Symbols-and-Abbreviations', 'High-confidence horse color alias.'),
  ('horse_color', 'gray', 'drf_symbols', 'Gr', 'Gray', 'DRF horse color shorthand from Symbols and Abbreviations.', 1, 'https://help.drf.com/hc/en-us/articles/225544487-Symbols-and-Abbreviations', 'High-confidence horse color alias.'),
  ('horse_color', 'roan', 'drf_symbols', 'Ro', 'Roan', 'DRF horse color shorthand from Symbols and Abbreviations.', 1, 'https://help.drf.com/hc/en-us/articles/225544487-Symbols-and-Abbreviations', 'High-confidence horse color alias.'),

  ('medication', 'lasix', 'drf_symbols', 'L', 'Lasix', 'DRF medication shorthand from Symbols and Abbreviations.', 1, 'https://help.drf.com/hc/en-us/articles/225544487-Symbols-and-Abbreviations', 'Code L is seeded only in medication context. First-time Lasix and Bute are deferred for source-specific review.'),

  ('finish_margin', 'head', 'drf_symbols', 'hd', 'Head', 'DRF finish-margin shorthand from Symbols and Abbreviations.', 1, 'https://help.drf.com/hc/en-us/articles/225544487-Symbols-and-Abbreviations', 'High-confidence finish-margin alias.'),
  ('finish_margin', 'neck', 'drf_symbols', 'nk', 'Neck', 'DRF finish-margin shorthand from Symbols and Abbreviations.', 1, 'https://help.drf.com/hc/en-us/articles/225544487-Symbols-and-Abbreviations', 'High-confidence finish-margin alias.'),
  ('finish_margin', 'nose', 'drf_symbols', 'no', 'Nose', 'DRF finish-margin shorthand from Symbols and Abbreviations.', 1, 'https://help.drf.com/hc/en-us/articles/225544487-Symbols-and-Abbreviations', 'High-confidence finish-margin alias.'),
  ('finish_margin', 'nose', 'drf_symbols', 'ns', 'Nose', 'Common nose finish-margin shorthand reviewed as part of DRF/BRIS running-line notation.', 0.95, 'https://help.drf.com/hc/en-us/articles/225544487-Symbols-and-Abbreviations', 'Kept source-scoped; ingestion should preserve exact raw source value.'),
  ('finish_margin', 'dead_heat', 'equibase_codes', 'dh', 'Dead Heat', 'Result/running-line shorthand reviewed from Equibase Codes and Definitions.', 1, 'https://www.equibase.com/newfan/codes.cfm', 'High-confidence result alias.'),

  ('running_line_status', 'did_not_finish', 'equibase_codes', 'DNF', 'Did Not Finish', 'Chart/result status shorthand reviewed from Equibase Codes and Definitions.', 1, 'https://www.equibase.com/newfan/codes.cfm', 'High-confidence running-line status alias.'),
  ('running_line_status', 'pulled_up', 'equibase_codes', 'PU', 'Pulled Up', 'Chart/result status shorthand reviewed from Equibase Codes and Definitions.', 1, 'https://www.equibase.com/newfan/codes.cfm', 'High-confidence running-line status alias.'),
  ('running_line_status', 'eased', 'equibase_codes', 'Eased', 'Eased', 'Chart/result status term reviewed from Equibase Codes and Definitions.', 1, 'https://www.equibase.com/newfan/codes.cfm', 'High-confidence running-line status alias.'),
  ('running_line_status', 'vanned_off', 'equibase_codes', 'Vanned off', 'Vanned Off', 'Chart/result status term reviewed from Equibase Codes and Definitions.', 1, 'https://www.equibase.com/newfan/codes.cfm', 'High-confidence running-line status alias.'),

  ('entry_status', 'scratched', 'equibase_codes', 'SCR', 'Scratched', 'Entry status shorthand reviewed from Equibase Codes and Definitions.', 1, 'https://www.equibase.com/newfan/codes.cfm', 'High-confidence entry status alias.'),
  ('entry_status', 'also_eligible', 'brisnet_ultimate_pps', 'AE', 'Also Eligible', 'BRIS/PP entry notation reviewed from glossary audit source list.', 1, 'https://www.brisnet.com/library/uwc.pdf', 'High-confidence entry status alias.'),
  ('entry_status', 'main_track_only', 'brisnet_ultimate_pps', 'MTO', 'Main Track Only', 'BRIS/PP entry notation reviewed from glossary audit source list.', 1, 'https://www.brisnet.com/library/uwc.pdf', 'High-confidence entry status alias.'),

  ('wager_result_status', 'disqualified', 'equibase_codes', 'DQ', 'Disqualified', 'Result status shorthand reviewed from Equibase Codes and Definitions.', 1, 'https://www.equibase.com/newfan/codes.cfm', 'High-confidence result status alias.'),
  ('wager_result_status', 'inquiry', 'equibase_codes', 'INQ', 'Inquiry', 'Result status shorthand reviewed from Equibase Codes and Definitions.', 1, 'https://www.equibase.com/newfan/codes.cfm', 'High-confidence result status alias.'),
  ('wager_result_status', 'objection', 'equibase_codes', 'OBJ', 'Objection', 'Result status shorthand reviewed from Equibase Codes and Definitions.', 1, 'https://www.equibase.com/newfan/codes.cfm', 'High-confidence result status alias.'),
  ('wager_result_status', 'official', 'equibase_codes', 'OFF', 'Official', 'Official result notation reviewed from Equibase Codes and Definitions.', 1, 'https://www.equibase.com/newfan/codes.cfm', 'Seeded only in wager_result_status context; ingestion must preserve raw status timing.');

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
from starter_racing_code_aliases aliases
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
-- No cleanup block is included. Once applied, these canonical ids may become
-- referenced by ingestion, feature snapshots, value calculations, or review
-- notes. Remove or revise seeded glossary rows only through a reviewed
-- forward cleanup plan.
