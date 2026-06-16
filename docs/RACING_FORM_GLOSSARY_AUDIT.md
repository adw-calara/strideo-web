# Racing Form Glossary Audit

## Executive Summary

Strideo needs a controlled racing-form glossary before more ingestion, racing-form, or ML work lands. The current schema has strong provider-aware race, entry, track, surface, source-fact, value-calculation, and Opportunity lineage tables, but it does not yet have a reusable way to normalize shorthand such as `Mcl`, `AOC`, `FM`, `sly`, `B`, `L`, `hd`, `AE`, or vendor-specific track codes.

This audit adds a small reference-table migration only. It does not add UI, ingestion jobs, ML training, seed data, or production migration execution. The migration creates a server-managed alias layer so ingestion can preserve raw provider values while resolving them to canonical categories for feature engineering, backtesting, value calculations, and Opportunity explanations.

PR #60 should not be blocked by this glossary work. The glossary should block future provider ingestion normalization, ML feature materialization, and production-quality value explanations that depend on decoded racing-form shorthand.

## Why Normalization Matters

Opportunity is still the product center. Racing-form shorthand is support evidence for Opportunity value analysis, not a standalone racing-form viewer.

Normalization matters because equivalent source values should not become separate model categories. `Mcl`, `MCL`, and `MdClm` should resolve to one maiden-claiming meaning; `fm`, `FM`, and `FRM` should resolve to firm turf where the source uses those codes; `BAQ`, `BEL`, and vendor-specific aliases must not accidentally collapse unless the source and effective dates prove they refer to the same canonical track context.

For Strideo value calculations, the glossary should support:

- preserving the original source value on source-fact rows
- resolving aliases to stable canonical values
- carrying source attribution and confidence
- handling effective dates when codes or venues change
- producing human-readable explanations for Opportunity scores
- preventing feature drift across DRF, Equibase, BRISnet, TrackMaster, and future API-provider payloads
- backtesting historical races with the interpretation that was valid at the time

## Source List

- Daily Racing Form, [Symbols and Abbreviations](https://help.drf.com/hc/en-us/articles/225544487-Symbols-and-Abbreviations): workout, finish-margin, equipment, medication, color, sex, and track-condition shorthand.
- Daily Racing Form, [How To Use DRF Past Performances](https://www1.drf.com/help/help_drf_pp.html): workout ranking and bullet-work explanations.
- Equibase, [Codes and Definitions](https://www.equibase.com/newfan/codes.cfm): official-style definitions for equipment, race types, and related racing terms.
- Equibase, [2026 Racing Dates](https://www.equibase.com/products/racedates.cfm?SAP=TN): active track codes and date windows. The page includes `All Tracks` and `Track Code` columns and currently lists examples such as AIK, AQU, BAQ, BEL, CD, KEE, and SAR.
- Equibase, [Training Track List](https://www.equibase.com/tracks/training.cfm): training-track/workout location reference.
- BRISnet, [Ultimate PPs with Comments Explanation](https://www.brisnet.com/library/uwc.pdf): BRIS race type, surface, medication/equipment, workout, running-line, AE, and MTO notation.
- BRISnet, [Track Condition Terms](https://support.brisnet.com/hc/en-us/articles/360056090432-Track-Condition-Terms): dirt and turf condition codes including FST/FT, FRZ/FZ, GD, HVY, MUD/MY, SY, WF, FM/FRM, G/F, HRD/HD, SFT/SF, and YLD.
- TwinSpires, [How to Read a Brisnet Racing Program](https://www.twinspires.com/edge/racing/how-to-read-a-brisnet-racing-program/): BRIS program structure and consumer-facing PP interpretation.
- TwinSpires, [How to Read Horse Racing Workout Lines](https://www.twinspires.com/edge/racing/how-to-read-horse-racing-workout-lines/): workout-line interpretation for BRIS-style PPs.
- TrackMaster, [Thoroughbred/Quarter Horse Track Listing](https://info.trackmaster.com/thoroughbred/thr_tracks.htm): broad active and historical track-code list, including codes such as AQU, BAQ, BEL, CD, CBY, CMR, and many historical venues.
- Equineline, [Directory of Reference](https://www.equineline.com/dirreffr.cfm?topic=rfnatrck.htm): North American reference topics for track codes and chart/past-performance codes.
- Strideo repo, [ARCHITECTURE.md](ARCHITECTURE.md): first provider direction is "The Racing API first, Equibase future."
- Strideo repo, [WAVE3_RACE_DATA_IMPORT_PLAN.md](WAVE3_RACE_DATA_IMPORT_PLAN.md): first provider contract is not yet approved, so this task should prepare alias design without implementing provider ingestion.

## Current Schema Audit

Existing support:

- `tracks` stores provider-aware track records with `provider`, `provider_track_id`, `code`, `name`, region/country, timezone, and metadata.
- `surfaces` stores canonical surface reference rows.
- `races`, `race_entries`, `entry_events`, `odds_snapshots`, `result_versions`, and `result_entries` preserve race-card and result facts.
- PR #60-style source-fact tables preserve racing-form facts in `horse_past_performances`, `horse_workouts`, `trainer_performance_stats`, and `value_calculations`.
- `value_calculations` can link value evidence to `opportunities`, and `opportunity_scores.value_calculation_id` can point back to the exact value fact.

Gap:

- No shared reference/code table exists for source shorthand.
- No source-specific alias table exists for race type, track condition, workout, equipment, medication, horse color/sex, finish margin, trouble note, wager type, or similar categories.
- No dedicated track-code alias table exists to map vendor/source track codes to canonical `tracks.id`.

## Glossary Categories

### Track Codes

Source-of-truth recommendation:

- Use Equibase racing dates as the active-track check for the target season.
- Use TrackMaster's Thoroughbred/Quarter Horse list as the broad active/historical source-code inventory.
- Use Equibase training-track references for workout locations.
- Store all source codes as aliases to canonical `tracks.id`; do not make a vendor code itself the canonical identity.

Initial U.S. thoroughbred coverage should include active and commonly encountered codes such as `AQU`, `BAQ`, `BEL`, `SAR`, `CD`, `KEE`, `DMR`, `SA`, `GP`, `OP`, `FG`, `PRX`, `PEN`, `PID`, `MTH`, `LRL`, `PIM`, `TAM`, `TP`, `ELP`, `IND`, `HAW`, `CBY`, `LS`, `RP`, `WRD`, plus additional active, fair, historical, and training locations from Equibase and TrackMaster before production ingestion. Examples that need explicit alias handling include `BAQ` for Belmont at the Big A, historical `BEL` context, and historical venues such as Arlington or Golden Gate when they appear in past-performance data.

Required fields for each alias: canonical track, source system, source code, source name, state, country, active flag, effective dates, source URL, and notes.

### Race Type And Class

Canonical categories should cover at least:

- Maiden: `Mdn`, `MSW`, `MdSpWt`, `MCL`, `Mcl`, `MdClm`, `MOC`
- Claiming: `Clm`, claiming price, claiming stakes where source supports it
- Allowance: `Alw`, `AOC`, `OClm`, `OC`, `OCH`
- Stakes and graded stakes: `Stk`, `G1`, `GI`, `G2`, `GII`, `G3`, `GIII`
- Handicap/starter/special forms: `Hcp`, `Str`, `Sta`, `Shp`, `Soc`
- Named condition types: Trial, Futurity, Derby, Oaks, Invitational
- Restrictions: state-bred, age, sex, non-winners (`NW1`, `N1X`, `N2L`, `N3L`), starter conditions, and source-specific condition strings

Class aliases should normalize to canonical values while preserving full condition text on `races.conditions` and `races.condition_payload`.

### Surface And Track Condition

Canonical surface values should remain tied to `surfaces` where possible: dirt, turf, synthetic/all-weather, inner turf, outer turf, inner dirt, and off-turf/moved-to-main-track state when supplied by the source.

Track-condition aliases should cover dirt and turf forms from DRF/BRIS:

- Dirt: fast, good, muddy, sloppy, wet fast, frozen, heavy, slow, sealed
- Turf: firm, good, good-to-firm, yielding, soft, heavy, hard
- Common aliases: `fst`, `ft`, `gd`, `my`, `mud`, `sly`, `sy`, `wf`, `fr`, `frz`, `fm`, `frm`, `g/f`, `yl`, `yld`, `sf`, `sft`, `hy`, `hvy`, `hd`, `hrd`

### Workout And Training

DRF and BRIS-style workout shorthand should normalize at least:

- `B` = breezing
- `H` = handily
- `D` = driving
- `E` = easily
- `g` = worked from gate
- `tr.t` = training track
- `(d)` or dogs notation = worked around dogs
- bullet indicators
- workout rank such as `1/25`
- distance abbreviations and timing formats
- workout surface notation, including turf/all-weather variants when supplied

Store raw workout lines in source facts and resolve individual components into canonical fields for model features.

### Equipment

DRF/BRIS baseline aliases include blinkers and front bandages/wraps. Equibase-supported equipment should be added during seeding, including bar shoes, mud caulks, racing plates, and any first-time or equipment-change indicators supported by the source.

Design note: equipment can be multi-valued on one entry. The glossary should decode individual tokens; future ingestion can decide whether to store a normalized array or preserve the source line plus decoded payload.

### Medication

Baseline aliases:

- `L` = Lasix
- first-time Lasix indicator where supported
- Lasix-off/medication-off indicator where supported
- `B` = Butazolidin/Bute where applicable
- BRIS-style first-time Bute aliases where supported

Jurisdictional changes should be stored as effective-dated policy/notes, not guessed during ingestion. Medication fields can affect value calculations materially, so source attribution and effective dates are important.

### Horse Color And Sex

Color aliases:

- `B` = bay
- `Blk` = black
- `Ch` = chestnut
- `Dkb`, `br`, `Dkb or br` = dark bay or brown
- `Gr` = gray
- `Ro` = roan

Sex aliases:

- `c` = colt
- `f` = filly
- `g` = gelding
- `h` = horse
- `m` = mare
- `r` = ridgling

These should normalize to stable horse reference values while preserving source casing.

### Finish Margins And Running Lines

Baseline finish-margin aliases:

- `hd` = head
- `nk` = neck
- `no` = nose
- numeric beaten lengths
- dead heat

Running-line and result aliases should include disqualified, eased, pulled up, vanned off, distanced, did not finish, lost rider, broke through gate, and common chart/trouble-note language where the source provides defined codes. Trouble notes are high-risk for over-normalization; preserve raw comments and add aliases only when source definitions are clear.

### Odds, Wagering, And Results

Canonical code sets should prepare for:

- morning line and final odds semantics
- favorite indicators
- coupled entries and field entries
- scratched, also eligible (`AE`), main track only (`MTO`)
- dead heat, inquiry, objection, disqualification, official result
- payout/wager type aliases for win, place, show, exacta, trifecta, superfecta, daily double, pick sequences, and future bet-sheet/value tracking

Final/closing odds semantics remain a separate modeling decision. This glossary only names source values.

### Vendor-Specific Differences

The same code can mean different things depending on category and source. Examples:

- `B` can mean breezing in workout lines, bay in color lines, Bute in medication lines, or blinkers in equipment contexts depending on source/case.
- `O` can appear in BRIS surface notation in multiple visual contexts; ingestion should use source field position and source metadata, not just the character.
- DRF lowercase `b` for blinkers differs from medication `B`.
- Track codes may be current, historical, fair-meet, training-only, or vendor-specific pseudo-events.

The database therefore needs source system, code set, source code, confidence, active flag, and effective dates on aliases.

## Proposed Canonical Code Sets

Initial code sets:

- `track_condition`
- `surface`
- `race_type`
- `race_class`
- `race_restriction`
- `workout_type`
- `workout_modifier`
- `equipment`
- `equipment_change`
- `medication`
- `medication_change`
- `horse_color`
- `horse_sex`
- `finish_margin`
- `running_line`
- `trouble_note`
- `entry_status`
- `odds_type`
- `wager_type`
- `result_status`
- `provider_track_role`

These should be seeded in a later reference-data task after source-by-source review. This audit intentionally does not seed the full track-code universe.

## Proposed Database Design

Migration added: `supabase/migrations/20260616104649_racing_form_glossary_reference_tables.sql`.

Tables:

- `racing_code_sets`: defines glossary categories.
- `racing_code_values`: stores canonical values within each category.
- `racing_code_aliases`: maps source-specific codes to canonical values with source attribution, confidence, effective dates, and notes.
- `track_code_aliases`: maps source-specific track codes to canonical `tracks.id`.

Design decisions:

- Additive only; no existing tables are modified.
- RLS enabled on every new public table.
- No `anon` grants.
- No `authenticated` grants or browser-facing policies.
- Service role receives select/insert/update only.
- Alias uniqueness is scoped to current active source/category/code mappings while allowing historical effective-dated rows.
- `racing_code_aliases` includes `code_set_id` in addition to `code_value_id` so lookup can be unambiguous and enforced by a composite foreign key.
- `track_code_aliases` is separate because canonical track identity already lives in `tracks`.

Supabase note: the June 2026 changelog scan showed the April 2026 change that tables are not automatically exposed to Data and GraphQL APIs. The migration still enables RLS and avoids `anon`/`authenticated` grants as defense in depth.

## ML Feature-Engineering Implications

Feature pipelines should preserve three layers:

- raw source value, exactly as received
- canonical code/value resolved through the glossary
- normalized feature payload used by the model

This lets Strideo explain that an Opportunity used "firm turf" or "maiden claiming" instead of opaque source tokens, while still auditing the raw values that produced the feature. It also prevents vendors from splitting equivalent categories into unrelated model levels.

Historical backtests should resolve aliases by `effective_from` and `effective_to`, especially for track codes, medication rules, track names, and vendor changes.

## PR #60 Impact

This task does not merge or modify PR #60.

This should not block PR #60 because PR #60 adds source-fact and value-lineage storage. The glossary is a follow-up normalization layer. It should block any future claim that racing-form source facts are fully normalized or model-ready across providers.

## What Can Safely Follow PR #60

- Seed canonical code sets and a small reviewed alias subset.
- Build a source-by-source track-code import/verification script.
- Add provider-contract tests that assert every incoming shorthand value is preserved raw and either resolved or quarantined.
- Add quality reports for unresolved aliases by provider, date, track, and field.

## High-Risk Watchlist

- Treating `tracks.code` as canonical across all vendors without `track_code_aliases`.
- Decoding shorthand from the token alone without source field context.
- Seeding track codes from a single vendor and assuming active/historical completeness.
- Exposing glossary tables to browser clients before policy and field-scope review.
- Training models on raw shorthand categories before alias coverage and unresolved-code reporting exist.
- Flattening full race-condition text into a single class code and losing non-winners, state-bred, age, sex, claiming, starter, or optional-claiming semantics.
- Guessing medication meaning across jurisdictions or eras without effective dates.

## Validation Results

Completed on June 16, 2026:

- `npm run verify`: passed. This included `db:migrations:check`, lint, ML data-contract tests, Next.js build, and `npm audit --audit-level=moderate`.
- `npm run db:migrations:check`: passed inside `npm run verify` for 26 migration files.
- `npm run db:migrations:dry-run`: passed. No migrations were pushed. The linked dry run reported it would push `20260615183948_racing_form_data_foundation.sql` and `20260616104649_racing_form_glossary_reference_tables.sql`.
- `git diff --check`: passed.

Supabase target documented by the repo: Dev project `strideo-dev`, ref `ntxtakbggtljjbalgris`. No Supabase production work was performed. No migrations were applied.
