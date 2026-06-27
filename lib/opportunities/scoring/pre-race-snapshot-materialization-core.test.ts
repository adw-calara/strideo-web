import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  FEATURE_SNAPSHOT_REPLAY_STRATEGY,
  PRE_RACE_FEATURE_SNAPSHOT_SET_KEY,
  PRE_RACE_FEATURE_SNAPSHOT_SET_VERSION,
  buildPreRaceFeatureSnapshotMaterializationPlan,
  type FeatureSnapshotMaterializationEntry,
  type FeatureSnapshotMaterializationRace,
} from "./pre-race-snapshot-materialization-core";
import type { PreRaceOddsSnapshotInput } from "./pre-race-snapshot";

function race(
  overrides: Partial<FeatureSnapshotMaterializationRace> = {},
): FeatureSnapshotMaterializationRace {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    raceDate: "2026-06-22",
    provider: "test-provider",
    providerRaceId: "provider-race-1",
    raceNumber: 7,
    status: "scheduled",
    scheduledAt: "2026-06-22T18:00:00.000Z",
    trackId: "track-1",
    trackCode: "SAR",
    trackName: "Saratoga",
    surfaceId: "surface-1",
    surfaceCode: "DIRT",
    surfaceName: "Dirt",
    distanceText: "6f",
    distanceYards: 1320,
    raceType: "Allowance",
    classRating: "AOC",
    conditions: "Fillies and mares",
    ...overrides,
  };
}

function entry(
  overrides: Partial<FeatureSnapshotMaterializationEntry> = {},
): FeatureSnapshotMaterializationEntry {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    raceId: "11111111-1111-4111-8111-111111111111",
    raceDate: "2026-06-22",
    providerEntryId: "provider-entry-1",
    status: "entered",
    horseId: "33333333-3333-4333-8333-333333333333",
    horseProviderId: "provider-horse-1",
    horseName: "Snapshot Runner",
    programNumber: "4",
    postPosition: 4,
    morningLineOdds: "5/1",
    ...overrides,
  };
}

function odds(
  overrides: Partial<PreRaceOddsSnapshotInput> = {},
): PreRaceOddsSnapshotInput {
  return {
    id: "44444444-4444-4444-8444-444444444444",
    raceId: "11111111-1111-4111-8111-111111111111",
    raceDate: "2026-06-22",
    raceEntryId: "22222222-2222-4222-8222-222222222222",
    poolType: "win",
    oddsFractional: null,
    oddsDecimal: null,
    impliedProbability: 0.2,
    snapshotAt: "2026-06-22T17:30:00.000Z",
    sequenceNumber: 1,
    ...overrides,
  };
}

function buildPlan(options: {
  race?: FeatureSnapshotMaterializationRace;
  entry?: FeatureSnapshotMaterializationEntry;
  oddsSnapshots?: readonly PreRaceOddsSnapshotInput[];
  existingIds?: ReadonlySet<string>;
} = {}) {
  return buildPreRaceFeatureSnapshotMaterializationPlan({
    races: [options.race ?? race()],
    entries: [options.entry ?? entry()],
    oddsSnapshots: options.oddsSnapshots ?? [odds()],
    existingFeatureSnapshotIds: options.existingIds,
  });
}

describe("pre-race feature snapshot materialization planner", () => {
  it("builds deterministic insert rows against the existing feature_snapshots schema", () => {
    const first = buildPlan();
    const second = buildPlan();
    const item = first.items[0];

    assert.equal(item.status, "planned");
    assert.deepEqual(first, second);
    assert.equal(first.summary.replayStrategy, FEATURE_SNAPSHOT_REPLAY_STRATEGY);
    assert.equal(first.summary.plannedSnapshots, 1);
    assert.equal(first.summary.blockedSnapshots, 0);
    assert.equal(item.row.feature_set_key, PRE_RACE_FEATURE_SNAPSHOT_SET_KEY);
    assert.equal(
      item.row.feature_set_version,
      PRE_RACE_FEATURE_SNAPSHOT_SET_VERSION,
    );
    assert.equal(item.row.race_id, race().id);
    assert.equal(item.row.race_entry_id, entry().id);
    assert.equal(item.row.captured_at, "2026-06-22T17:30:00.000Z");
    assert.equal(item.row.source_job_run_id, null);
    assert.equal(item.row.features.snapshot.lineage.featureSnapshotId, item.id);
    assert.equal(item.row.features.snapshot.readiness.status, "ready");
    assert.equal(
      item.row.features.replaySafety.strategy,
      "deterministic_id_skip_existing",
    );
    assert.equal(item.row.features.replaySafety.schemaUniqueSourceHash, false);
  });

  it("marks deterministic rows as skipped when they already exist", () => {
    const initial = buildPlan();
    const id = initial.items[0].id;
    const replay = buildPlan({ existingIds: new Set([id]) });
    const item = replay.items[0];

    assert.equal(item.status, "skipped_existing");
    assert.equal(item.id, id);
    assert.equal(item.skippedReason, "already_materialized");
    assert.equal(replay.summary.plannedSnapshots, 0);
    assert.equal(replay.summary.skippedExistingSnapshots, 1);
  });

  it("blocks rows that lack required market evidence instead of writing weak snapshots", () => {
    const plan = buildPlan({
      entry: entry({ morningLineOdds: null }),
      oddsSnapshots: [
        odds({
          snapshotAt: "2026-06-22T18:01:00.000Z",
          impliedProbability: 0.3,
        }),
      ],
    });
    const item = plan.items[0];

    assert.equal(item.status, "blocked");
    assert.equal(item.row, null);
    assert.equal(item.skippedReason, "readiness_blocked");
    assert.equal(plan.summary.plannedSnapshots, 0);
    assert.equal(plan.summary.blockedSnapshots, 1);
    assert.ok(
      item.blockingReasons.some((reason) =>
        reason.includes("measured market input"),
      ),
    );
  });

  it("keeps materialization metadata away from prediction, score, wager, and provider writes", () => {
    const plan = buildPlan();
    const item = plan.items[0];

    assert.equal(item.status, "planned");
    assert.deepEqual(item.row.features.materialization, {
      generatedBy: "dev_feature_snapshots_materialization",
      writeScope: "dev_only_feature_snapshots",
      allowedWriteTarget: "feature_snapshots",
      prohibitedSideEffectTargets: [
        "prediction_outputs",
        "opportunity_scores",
        "wager_recommendations",
        "daily_bet_sheets",
        "daily_bet_sheet_entries",
        "provider_ingestion",
        "model_training_runs",
        "value_calculations",
      ],
      writesPredictions: false,
      writesOpportunityScores: false,
      writesWagers: false,
      writesProviderIngestion: false,
      writesModelTraining: false,
      productionReady: false,
    });
  });
});
