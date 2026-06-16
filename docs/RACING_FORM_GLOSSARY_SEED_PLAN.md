# Racing Form Glossary Seed Plan

## Summary

This plan introduces a small, reviewed starter seed fixture for Strideo's
racing-form shorthand normalization layer:

- `supabase/fixtures/dev/starter_racing_glossary.sql`

The fixture is intentionally Dev-only and review-only. It does not run through
the migration flow, and this PR does not apply it to Dev.

## Product Rationale

Strideo's Opportunity and value engines need canonical shorthand normalization
before racing-form source values become ML features. Equivalent codes should not
split into separate feature categories, and ambiguous source tokens should not
silently contaminate model inputs.

The starter fixture supports:

- canonical code sets for common racing-form categories
- canonical normalized values with feature-oriented payloads
- source-attributed aliases for high-confidence shorthand
- preservation of raw source values by future ingestion
- review discipline before ambiguous mappings become canonical

## Starter Scope

The fixture covers only high-confidence starter mappings in these categories:

- race types and classes
- race grades
- surfaces
- track conditions
- workout shorthand
- horse sex
- horse color
- Lasix where the source context is medication
- finish-margin shorthand
- running-line status shorthand
- entry status shorthand
- wager/result status shorthand

The fixture does not seed:

- all U.S. track codes
- track-code aliases
- unresolved-code rows
- equipment mappings
- first-time Lasix or Bute mappings
- ambiguous single-letter meanings outside a source-specific code-set context
- Opportunities, predictions, wagers, feature snapshots, or model-training data

## Source Discipline

This seed set uses sources already documented in
`docs/RACING_FORM_GLOSSARY_AUDIT.md`, including:

- Daily Racing Form Symbols and Abbreviations
- Daily Racing Form past-performance workout explanations
- Equibase Codes and Definitions
- BRISnet Track Condition Terms
- BRISnet Ultimate PPs explanations

Each alias stores source system, source code, source label, source description,
source URL, confidence, and notes.

## Ambiguity Policy

Some racing-form tokens have different meanings by source field, category, or
vendor. For example, `B` can mean breezing, bay, Bute, or blinkers depending on
context. This fixture seeds such tokens only when the code-set context is
unambiguous, such as `B` under `workout_type` and `horse_color`.

Deferred mappings include:

- `B` as Bute
- `B` as blinkers
- first-time Lasix indicators
- equipment-change shorthand
- broad trouble-note phrases
- all active and historical track-code aliases

Future ingestion should write unknown or ambiguous values to
`racing_unresolved_source_codes` instead of guessing.

## Safety

The fixture is idempotent and reviewable:

- code sets upsert by `code_set_key`
- canonical values upsert by `(code_set_id, canonical_code)`
- aliases upsert by active/current `(code_set_id, source_system, source_code)`
- no seed data is applied automatically
- no schema migration is added
- no production operation is required

Apply only after explicit Dev-only authorization.

## Future Work

After review, future PRs should add:

- a full, separately reviewed U.S. track-code alias seed set
- unresolved-code review/reporting
- ingestion lookup helpers that preserve raw source values
- tests that block feature materialization when source shorthand is unresolved
- documentation for updating aliases without breaking historical model lineage
