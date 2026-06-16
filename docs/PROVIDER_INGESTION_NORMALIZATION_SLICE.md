# Provider Ingestion Normalization Slice

This slice adds the first parser adapter that uses the racing-code
normalization contract. It targets a small provider racing-form race-entry
payload shape and keeps full ingestion, persistence, scheduling, and feature
snapshot materialization deferred.

## Chosen Segment

The chosen segment is race-entry shorthand. It was selected first because it is
close to Strideo's Opportunity workflow and exercises the starter glossary
categories most likely to affect early value features:

- race type / class
- surface
- track condition
- horse sex
- horse color
- medication
- entry status
- optional recent-workout type shorthand when a provider carries it beside the
  entry card

The optional workout shorthand is intentionally narrow. It lets the parser prove
context-sensitive tokens such as `B` and `g` remain scoped by code set without
adding a full workout ingestion path.

## Provider Payload Shape

The adapter expects a normalized provider envelope shaped like:

```ts
{
  provider: "equibase",
  race: {
    providerRaceId,
    raceId,
    raceDate,
    classCode,
    surfaceCode,
    trackConditionCode
  },
  entry: {
    providerEntryId,
    raceEntryId,
    statusCode,
    medicationCode
  },
  horse: {
    providerHorseId,
    horseId,
    sexCode,
    colorCode
  },
  recentWorkout: {
    workTypeCode
  }
}
```

This is a parser contract shape, not a fetcher contract. A future provider job
can adapt a real provider payload into this envelope before calling the parser.

## Normalization Behavior

`parseProviderRaceEntryShorthand` is server-only and calls
`normalizeOrFlagRacingCode` for every supplied shorthand field. The pure core is
tested with an injected normalizer so automated tests do not write to Dev.

The parser returns:

- `source_system`
- `segment_type`
- `raw`
- `normalized`
- `unresolved_codes`
- `blocked_for_ml`
- `blocking_reasons`
- `normalization_results`
- `warnings`
- `metadata`

Raw source values are always preserved in `raw` and passed through the
normalization contract as `raw_source_value`. The parser never replaces unknown
codes with `"unknown"`.

## ML Feature Readiness

Required shorthand for this slice:

- `race_type`
- `surface`
- `entry_status`

Optional shorthand for this slice:

- `track_condition`
- `horse_sex`
- `horse_color`
- `medication`
- `workout_type`

Missing optional shorthand creates a warning but does not block. Missing
required shorthand blocks ML feature materialization. Any supplied shorthand
that returns unresolved, ambiguous, or invalid from the normalization contract
also blocks ML feature materialization, because that source value would otherwise
be able to contaminate a derived feature.

When blocked, the parser sets:

- `blocked_for_ml: true`
- `metadata.ml_feature_materialization_status: "blocked"`

Future feature builders must not create ML-ready feature snapshots from blocked
parser output. They may persist raw source evidence separately once ingestion
persistence is implemented.

## Unresolved Codes

In real server use, unresolved or ambiguous shorthand is recorded only through
the existing racing-code normalization contract. The parser does not write
directly to `racing_unresolved_source_codes`.

The parser passes review context including:

- source system
- code set
- source payload path
- provider race/entry/horse ids
- race id/date when available
- job-run id when available
- optional Opportunity id when available

This keeps unresolved-code reporting useful for weekly glossary review and for
detecting whether unknown shorthand affects Opportunity scoring or value
calculations.

## Deferred Work

This PR does not add:

- real provider fetch jobs
- scheduled imports
- canonical source-fact persistence
- raw payload archival
- feature snapshot writes
- ML training code
- Opportunity creation
- wager recommendations
- UI
- seed aliases

The next parser slice should connect a real provider fetch/adaptation step to
this parser shape, then persist canonical source facts idempotently only after
normalization passes. Full U.S. track-code alias coverage remains separately
reviewed before broad track-code normalization is relied on.
