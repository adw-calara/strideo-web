# Provider Adapter Race-Entry Slice

This slice adds a narrow provider adapter for one documented first-provider
payload shape. It does not fetch provider data, schedule ingestion, write source
facts, create Opportunities, create wager recommendations, or train ML models.

## Provider Shape

The selected provider shape is a small The Racing API race-entry payload,
matching Strideo's current provider direction of The Racing API first and
Equibase future. The fixture is intentionally a provider-shape fixture, not live
provider data and not a full provider contract.

Race-entry shorthand was chosen first because it sits close to Strideo's
Opportunity workflow without creating Opportunities. Race type, surface, entry
status, medication, and horse attributes are common inputs to value explanations
and future feature engineering, so this segment can prove raw-to-canonical
lineage before any scoring or wager recommendation code depends on it.

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

The field mapping is intentionally direct:

- `race.type_code` maps to `race_type`
- `race.surface_code` maps to `surface`
- `race.track_condition_code` maps to `track_condition`
- `entry.status_code` maps to `entry_status`
- `entry.medication_code` maps to `medication`
- `horse.sex_code` maps to `horse_sex`
- `horse.color_code` maps to `horse_color`
- `recent_workout.work_type_code` maps to `workout_type`

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

Future persistence may write canonical source facts only after the adapter
returns an unblocked write plan and the persistence slice re-checks idempotency,
target table boundaries, and raw-source lineage. Blocked output must not feed
ML-ready feature snapshots, Opportunity scoring, value calculations, prediction
outputs, or wager recommendations.

## Persistence Boundary

The follow-up persistence slice keeps the adapter core isolated from database
writes. It consumes only the adapter write plan and fails closed unless the plan
is ready, allowlisted, and fully lineaged.

The approved first persistence target is:

- logical target: `race_entry_source_fact`
- physical table: `race_entries`
- operation: deterministic upsert
- conflict identity: `provider,provider_entry_id,race_date`

The executor persists canonical entry status and medication plus metadata
containing raw values, source paths, canonical labels, normalization results,
provider identifiers, and the raw provider payload. It does not create
Opportunities, predictions, value calculations, wagers, feature snapshots, model
training rows, or full ingestion batches.

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
