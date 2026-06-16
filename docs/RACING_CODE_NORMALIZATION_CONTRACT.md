# Racing-Code Normalization Contract

Racing-form shorthand must resolve through the glossary before it can become an
ML feature, value-calculation input, prediction explanation, or Opportunity
score signal. Unknown shorthand must never silently become a generic "unknown"
feature category.

The server-side contract lives in `lib/racing-codes/normalization.ts`. Future
provider ingestion should call it for each shorthand field it intends to
normalize.

## Flow

1. Preserve the raw source value on the source fact or source payload record.
2. Call `normalizeOrFlagRacingCode` with source system, code-set key, source
   code, source label/description, source payload path, entity context, job-run
   lineage, effective date, and optional Opportunity linkage.
3. Look up active aliases in `racing_code_aliases` by source system, code set,
   source code, and effective date.
4. If exactly one active alias matches, return a resolved result with canonical
   code/value ids, labels, and normalized payload.
5. If no alias matches, or more than one active alias matches, write or update
   an unresolved-code queue row and return `blocked_for_ml: true`.
6. Feature builders and value jobs must block or mark the feature snapshot
   incomplete whenever the result is unresolved or invalid.

## Resolved Behavior

A resolved result includes:

- `status: "resolved"`
- `blocked_for_ml: false`
- `code_set_id`
- `code_value_id`
- `canonical_code`
- `canonical_label`
- `normalized_value`
- source-system/source-code/source-label echoes
- `raw_source_value`
- `effective_date`

Resolved codes may flow into `feature_snapshots`, derived value calculations,
Opportunity evidence, and explanations. The consuming job must still preserve
the raw source value and the canonical value actually used at prediction time.
Later alias changes must not rewrite historical model inputs.

## Unresolved Behavior

An unresolved result includes:

- `status: "unresolved"`
- `blocked_for_ml: true`
- `unresolved_source_code_id`
- source system, code set, source code, and source label
- review context
- reason
- `raw_source_value`

The unresolved row is service-role/server-managed only. It is not exposed to
users and does not grant `anon` or `authenticated` access. The row should
include job-run lineage and optional race/Opportunity links when available so
reviewers can see whether an unknown code affected Opportunity generation,
value calculations, or scoring.

## Idempotency

`racing_unresolved_source_codes` already has an active-queue unique index over:

- source system
- code set
- source field
- source code
- effective date
- active review statuses: `open`, `reviewing`, `deferred`

The contract first looks for an active queue row and increments
`occurrence_count` when one exists. If a concurrent insert hits the unique
constraint, it retries the active-row update. This keeps normal ingestion
replays from creating duplicate review rows for the same unresolved concept.

PostgREST cannot directly upsert against the current expression/partial unique
index, so high-volume provider jobs should still verify idempotency under batch
load. A future additive migration may introduce a named generated-key column or
RPC if ingestion concurrency needs stronger single-statement upsert semantics.

## Effective Dates

When `effective_date` is supplied, alias lookup accepts active aliases whose
effective window contains that date. When it is omitted, lookup is limited to
current aliases where `effective_to` is null.

This matters for medication rules, track-code changes, historical source
semantics, and any provider shorthand whose meaning shifts over time.

## Ambiguity Handling

The same token can mean different things in different contexts. Examples:

- `B` can mean Bay under `horse_color` or Breezing under `workout_type`.
- `g` can mean Gelding under `horse_sex` or Gate under `workout_type`.

The contract scopes lookup by `code_set_key`. If multiple active aliases still
match the same source system, code set, and source code, the value is treated as
ambiguous, logged to the unresolved-code queue, and blocked for ML use.

## Source Attribution

Aliases promoted from unresolved rows must be reviewed before insertion into
`racing_code_aliases` or `track_code_aliases`. A reviewed alias should include
source attribution, confidence, notes, and effective dates when relevant. Broad
track-code alias sets remain a separate reviewed seed/update.

## Reporting Connection

`npm run racing-codes:unresolved:report` summarizes unresolved rows by status,
source system, code set, context, frequency, recency, Opportunity linkage, and
model/value contexts. Run the report after provider parser changes and during
weekly glossary review.

## Deferred Work

This contract does not add provider ingestion, UI, ML training, seed data,
automatic alias promotion, or feature-snapshot writes. Future work should wire
provider ingestion to this module for every shorthand field, then add tests that
prove unresolved or ambiguous codes block or flag ML feature generation before
the feature snapshot is materialized.
