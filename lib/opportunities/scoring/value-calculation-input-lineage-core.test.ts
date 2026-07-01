import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PRE_RACE_FEATURE_SNAPSHOT_SET_KEY,
  buildPreRaceFeatureSnapshotMaterializationPlan,
  type FeatureSnapshotInsertRow,
  type FeatureSnapshotMaterializationEntry,
  type FeatureSnapshotMaterializationRace,
} from "./pre-race-snapshot-materialization-core";
import type { PreRaceOddsSnapshotInput } from "./pre-race-snapshot";
import {
  VALUE_CALCULATION_INPUT_LINEAGE_METHOD_KEY,
  VALUE_CALCULATION_INPUT_LINEAGE_METHOD_VERSION,
  buildValueCalculationInputLineagePlan,
  type ValueCalculationInputFeatureSnapshotRow,
} from "./value-calculation-input-lineage-core";

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
    horseName: "Lineage Runner",
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

function materializedRow(options: {
  entry?: FeatureSnapshotMaterializationEntry;
  oddsSnapshots?: readonly PreRaceOddsSnapshotInput[];
} = {}): FeatureSnapshotInsertRow {
  const plan = buildPreRaceFeatureSnapshotMaterializationPlan({
    races: [race()],
    entries: [options.entry ?? entry()],
    oddsSnapshots: options.oddsSnapshots ?? [odds()],
  });
  const item = plan.items[0];

  assert.equal(item.status, "planned");
  return item.row;
}

function inputRow(
  row: FeatureSnapshotInsertRow = materializedRow(),
): ValueCalculationInputFeatureSnapshotRow {
  return {
    id: row.id,
    race_id: row.race_id,
    race_date: row.race_date,
    race_entry_id: row.race_entry_id,
    feature_set_key: row.feature_set_key,
    features: row.features,
  };
}

describe("value calculation input lineage dry-run planner", () => {
  it("builds deterministic planned value_calculations row shapes", () => {
    const row = inputRow();
    const first = buildValueCalculationInputLineagePlan([row]);
    const second = buildValueCalculationInputLineagePlan([row]);
    const item = first.items[0];

    assert.deepEqual(first, second);
    assert.equal(first.summary.featureSnapshotsReviewed, 1);
    assert.equal(first.summary.plannedRows, 1);
    assert.equal(first.summary.blockedRows, 0);
    assert.equal(first.summary.writesPerformed, false);
    assert.equal(item.status, "planned");
    assert.equal(item.row.feature_snapshot_id, row.id);
    assert.equal(item.row.race_id, row.race_id);
    assert.equal(item.row.race_date, row.race_date);
    assert.equal(item.row.race_entry_id, row.race_entry_id);
    assert.equal(item.row.horse_id, entry().horseId);
    assert.equal(item.row.odds_snapshot_id, odds().id);
    assert.equal(item.row.market_probability, 0.2);
    assert.equal(
      item.row.value_method_key,
      VALUE_CALCULATION_INPUT_LINEAGE_METHOD_KEY,
    );
    assert.equal(
      item.row.value_method_version,
      VALUE_CALCULATION_INPUT_LINEAGE_METHOD_VERSION,
    );
    assert.ok(item.sourceReadPaths.includes("feature_snapshots.id"));
  });

  it("blocks output when market odds input is missing", () => {
    const row = inputRow();
    const snapshot = row.features!.snapshot;
    const plan = buildValueCalculationInputLineagePlan([row]);
    row.features = {
      ...row.features!,
      snapshot: {
        ...snapshot,
        market: {
          ...snapshot.market,
          latestOddsSnapshotId: null,
          latestOddsImpliedProbability: null,
          marketImpliedProbability: null,
          marketProbabilitySource: "unavailable",
        },
      },
    };
    const blockedPlan = buildValueCalculationInputLineagePlan([row]);
    const item = blockedPlan.items[0];

    assert.equal(item.status, "blocked");
    assert.equal(item.row, null);
    assert.equal(plan.summary.plannedRows, 1);
    assert.equal(blockedPlan.summary.plannedRows, 0);
    assert.equal(blockedPlan.summary.blockedRows, 1);
    assert.ok(
      item.blockingReasons.some((reason) =>
        reason.includes("market implied probability"),
      ),
    );
  });

  it("blocks output when market odds input is invalid", () => {
    const row = inputRow();
    const snapshot = row.features!.snapshot;
    row.features = {
      ...row.features!,
      snapshot: {
        ...snapshot,
        market: {
          ...snapshot.market,
          marketImpliedProbability: 1.2,
        },
      },
    };
    const plan = buildValueCalculationInputLineagePlan([row]);
    const item = plan.items[0];

    assert.equal(item.status, "blocked");
    assert.equal(item.row, null);
    assert.equal(plan.summary.plannedRows, 0);
    assert.equal(plan.summary.blockedRows, 1);
    assert.ok(
      item.blockingReasons.includes(
        "Feature snapshot market implied probability is missing or invalid.",
      ),
    );
  });

  it("blocks output when feature snapshot lineage is missing", () => {
    const row = inputRow();
    const plan = buildValueCalculationInputLineagePlan([
      {
        ...row,
        id: null,
      },
    ]);
    const item = plan.items[0];

    assert.equal(item.status, "blocked");
    assert.equal(item.row, null);
    assert.ok(
      item.blockingReasons.includes("Feature snapshot row is missing id."),
    );
  });

  it("blocks output when feature snapshot lineage does not match the row", () => {
    const row = inputRow();
    const snapshot = row.features!.snapshot;
    row.features = {
      ...row.features!,
      snapshot: {
        ...snapshot,
        lineage: {
          ...snapshot.lineage,
          featureSnapshotId: "55555555-5555-4555-8555-555555555555",
        },
      },
    };
    const plan = buildValueCalculationInputLineagePlan([row]);
    const item = plan.items[0];

    assert.equal(item.status, "blocked");
    assert.equal(item.row, null);
    assert.ok(
      item.blockingReasons.includes(
        "Feature snapshot row id does not match snapshot lineage featureSnapshotId.",
      ),
    );
  });

  it("keeps model and prediction lineage explicitly null", () => {
    const plan = buildValueCalculationInputLineagePlan([inputRow()]);
    const item = plan.items[0];

    assert.equal(item.status, "planned");
    assert.equal(item.row.model_version_id, null);
    assert.equal(item.row.prediction_output_id, null);
    assert.equal(item.row.model_probability, null);
    assert.equal(item.row.output.modelLineageAuthorized, false);
    assert.equal(item.row.output.predictionLineageAuthorized, false);
  });

  it("preserves morning-line market provenance without an odds snapshot id", () => {
    const row = inputRow(
      materializedRow({
        oddsSnapshots: [],
      }),
    );
    const plan = buildValueCalculationInputLineagePlan([row]);
    const item = plan.items[0];

    assert.equal(item.status, "planned");
    assert.equal(item.row.odds_snapshot_id, null);
    assert.equal(item.row.market_probability, 1 / 6);
    assert.equal(item.row.output.marketInput.source, "morning_line");
    assert.equal(item.row.output.marketInput.oddsSnapshotId, null);
  });

  it("is no-write by construction and stays compatible with value calculation fields", () => {
    const plan = buildValueCalculationInputLineagePlan([inputRow()]);
    const item = plan.items[0];

    assert.equal(item.status, "planned");
    assert.equal(item.row.opportunity_id, null);
    assert.equal(item.row.result_version_id, null);
    assert.equal(item.row.fair_odds_decimal, null);
    assert.equal(item.row.fair_value, null);
    assert.equal(item.row.edge, null);
    assert.equal(item.row.expected_value, null);
    assert.equal(item.row.value_score, null);
    assert.equal(item.row.stake_basis, null);
    assert.equal(item.row.source_job_run_id, null);
    assert.deepEqual(item.row.output.safety, {
      writesPerformed: false,
      writesValueCalculations: false,
      writesPredictions: false,
      writesOpportunityScores: false,
      writesWagers: false,
      writesProviderIngestion: false,
      writesModelTraining: false,
      prohibitedSideEffectTargets: [
        "feature_snapshots",
        "model_versions",
        "prediction_outputs",
        "opportunity_scores",
        "wager_recommendations",
        "daily_bet_sheets",
        "daily_bet_sheet_entries",
        "provider_ingestion",
        "model_training_runs",
      ],
    });
  });

  it("blocks non pre-race feature snapshots", () => {
    const plan = buildValueCalculationInputLineagePlan([
      {
        ...inputRow(),
        feature_set_key: "post_race_snapshot",
      },
    ]);
    const item = plan.items[0];

    assert.equal(item.status, "blocked");
    assert.ok(
      item.blockingReasons.includes(
        `Feature snapshot is not an ${PRE_RACE_FEATURE_SNAPSHOT_SET_KEY} snapshot.`,
      ),
    );
  });
});
