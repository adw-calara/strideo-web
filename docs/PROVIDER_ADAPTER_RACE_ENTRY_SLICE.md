# Provider Adapter Race-Entry Slice

This slice adds a narrow provider adapter for one documented first-provider
payload shape. It does not fetch provider data, schedule ingestion, write source
facts, create Opportunities, create wager recommendations, or train ML models.

## Provider Shape

The selected provider shape is a small The Racing API race-entry payload,
matching Strideo's current provider direction of The Racing API first and
Equibase future. The fixture is intentionally a provider-shape fixture, not live
provider data and not a full provider contract.

```ts
{
  provider: "the_racing_api",
  race: {
    id,
    date,
    type_code,
    surface_code,
    track_condition_code
  },
  entry: {
    id,
    status_code,
    medication_code
  },
  horse: {
    id,
    sex_code,
    color_code
  },
  recent_workout: {
    work_type_code
  }
}
```

The adapter maps this shape into the existing race-entry shorthand parser shape
from `lib/provider-ingestion/racing-form-parser-core.ts`.

## Normalization Gate

The adapter calls the existing racing-code normalization contract through the
race-entry shorthand parser. Required fields for an ML-ready plan remain:

- `race_type`
- `surface`
- `entry_status`

Optional fields remain:

- `track_condition`
- `horse_sex`
- `horse_color`
- `medication`
- `workout_type`

Missing optional fields warn but do not block. Missing, unknown, ambiguous, or
invalid required shorthand blocks ML materialization and returns no write plan.

## Raw Preservation

The result preserves:

- the raw provider payload
- the adapted parser input
- raw shorthand values by normalized field
- provider race, entry, and horse identifiers
- source payload paths such as `race.type_code` and `entry.status_code`

The adapter never collapses unknown values to `"unknown"`.

## Write Plan

When normalization passes, the adapter returns an in-memory write plan only. The
plan is deterministic and idempotency-keyed by source system, provider race id,
provider entry id, and adapter payload shape.

When normalization blocks, the write plan is `null`.

This slice does not execute writes. It does not insert unresolved-code rows
directly; unresolved handling remains inside the normalization contract when the
server-only wrapper is used.

## Out of Scope

This slice does not add:

- schema changes
- migrations
- seed data
- Dev fixture application
- Production changes
- provider credentials
- full provider ingestion
- raw archive storage
- scheduled jobs
- UI
- ML training
- Opportunity creation
- prediction output creation
- wager recommendation creation

## Next Step

After review, add a small controlled persistence slice that can execute this
write plan against the approved source-fact table only after normalization
passes, then keep unresolved-code reporting in front of any provider ingestion
dependency on normalized shorthand.
