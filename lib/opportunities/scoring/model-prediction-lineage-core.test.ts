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
  MODEL_PREDICTION_LINEAGE_MODEL_KEY,
  MODEL_PREDICTION_LINEAGE_MODEL_VERSION,
  MODEL_PREDICTION_LINEAGE_PREDICTION_TYPE,
  buildModelPredictionLineagePlan,
  getModelPredictionLineageModelVersionId,
  getModelPredictionLineagePredictionIdentity,
  type ModelPredictionFeatureSnapshotRow,
  type ModelPredictionValueCalculationRow,
} from "./model-prediction-lineage-core";

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
): ModelPredictionFeatureSnapshotRow {
  return {
    id: row.id,
    race_id: row.race_id,
    race_date: row.race_date,
    race_entry_id: row.race_entry_id,
    feature_set_key: row.feature_set_key,
    features: row.features,
  };
}

function valueCalculation(
  row: ModelPredictionFeatureSnapshotRow = inputRow(),
): ModelPredictionValueCalculationRow {
  return {
    id: "55555555-5555-4555-8555-555555555555",
    feature_snapshot_id: row.id!,
    model_version_id: null,
    prediction_output_id: null,
    model_probability: null,
    opportunity_id: null,
  };
}

describe("model/prediction lineage dry-run planner", () => {
  it("builds deterministic non-production model and prediction row shapes", () => {
    const featureSnapshot = inputRow();
    const valueCalculationRow = valueCalculation(featureSnapshot);
    const first = buildModelPredictionLineagePlan({
      featureSnapshots: [featureSnapshot],
      valueCalculations: [valueCalculationRow],
    });
    const second = buildModelPredictionLineagePlan({
      featureSnapshots: [featureSnapshot],
      valueCalculations: [valueCalculationRow],
    });
    const item = first.items[0];

    assert.deepEqual(first, second);
    assert.equal(first.modelVersion.status, "planned");
    assert.equal(first.modelVersion.row.model_key, MODEL_PREDICTION_LINEAGE_MODEL_KEY);
    assert.equal(
      first.modelVersion.row.version,
      MODEL_PREDICTION_LINEAGE_MODEL_VERSION,
    );
    assert.equal(first.modelVersion.row.status, "draft");
    assert.equal(first.modelVersion.row.artifact_uri, null);
    assert.equal(first.modelVersion.row.training_data_window, null);
    assert.equal(first.modelVersion.row.parameters.devOnly, true);
    assert.equal(first.modelVersion.row.parameters.notTrained, true);
    assert.equal(first.modelVersion.row.parameters.notProduction, true);
    assert.equal(first.modelVersion.row.parameters.scoringAuthorized, false);
    assert.equal(first.summary.featureSnapshotsReviewed, 1);
    assert.equal(first.summary.linkedValueCalculations, 1);
    assert.equal(first.summary.plannedPredictionRows, 1);
    assert.equal(first.summary.blockedRows, 0);
    assert.equal(first.summary.writesPerformed, false);
    assert.equal(item.status, "planned");
    assert.equal(item.linkedValueCalculationIds[0], valueCalculationRow.id);
    assert.equal(item.row.model_version_id, first.modelVersion.row.id);
    assert.equal(item.row.feature_snapshot_id, featureSnapshot.id);
    assert.equal(item.row.prediction_type, MODEL_PREDICTION_LINEAGE_PREDICTION_TYPE);
    assert.equal(item.row.probability, 0.2);
    assert.equal(item.row.score, null);
  });

  it("labels planned probability as market-derived baseline lineage only", () => {
    const featureSnapshot = inputRow();
    const plan = buildModelPredictionLineagePlan({
      featureSnapshots: [featureSnapshot],
      valueCalculations: [valueCalculation(featureSnapshot)],
    });
    const item = plan.items[0];

    assert.equal(item.status, "planned");
    assert.equal(item.row.output.dryRunOnly, true);
    assert.equal(item.row.output.productionReady, false);
    assert.equal(item.row.output.trainedMl, false);
    assert.equal(item.row.output.calibratedModelProbability, false);
    assert.equal(item.row.output.scoringAuthorized, false);
    assert.equal(
      item.row.output.probabilityMeaning,
      "market-derived baseline lineage only",
    );
    assert.equal(item.row.output.marketInput.source, "latest_odds");
    assert.deepEqual(item.row.output.safety, {
      writesPerformed: false,
      writesModelVersions: false,
      writesPredictionOutputs: false,
      writesValueCalculations: false,
      writesOpportunityScores: false,
      writesWagers: false,
      writesProviderIngestion: false,
      writesModelTraining: false,
      prohibitedSideEffectTargets: [
        "model_versions",
        "prediction_outputs",
        "value_calculations",
        "opportunity_scores",
        "wager_recommendations",
        "daily_bet_sheets",
        "daily_bet_sheet_entries",
        "provider_ingestion",
        "model_training_runs",
      ],
    });
  });

  it("skips existing deterministic prediction identities instead of duplicating rows", () => {
    const featureSnapshot = inputRow();
    const existingModelVersion = {
      id: getModelPredictionLineageModelVersionId(),
      model_key: MODEL_PREDICTION_LINEAGE_MODEL_KEY,
      version: MODEL_PREDICTION_LINEAGE_MODEL_VERSION,
    };
    const predictionIdentity = getModelPredictionLineagePredictionIdentity({
      modelVersionId: existingModelVersion.id,
      featureSnapshotId: featureSnapshot.id!,
    });
    const plan = buildModelPredictionLineagePlan({
      featureSnapshots: [featureSnapshot],
      valueCalculations: [valueCalculation(featureSnapshot)],
      options: {
        existingModelVersion,
        existingPredictionOutputIdentities: new Set([predictionIdentity]),
      },
    });
    const item = plan.items[0];

    assert.equal(plan.modelVersion.status, "skipped_existing");
    assert.equal(plan.modelVersion.skippedReason, "already_materialized");
    assert.equal(plan.summary.plannedPredictionRows, 0);
    assert.equal(plan.summary.skippedExistingPredictionRows, 1);
    assert.equal(plan.summary.blockedRows, 0);
    assert.equal(item.status, "skipped_existing");
    assert.equal(item.predictionIdentity, predictionIdentity);
    assert.equal(item.skippedReason, "already_materialized");
  });

  it("blocks prediction planning when no value_calculations link to the feature snapshot", () => {
    const featureSnapshot = inputRow();
    const plan = buildModelPredictionLineagePlan({
      featureSnapshots: [featureSnapshot],
      valueCalculations: [],
    });
    const item = plan.items[0];

    assert.equal(plan.summary.plannedPredictionRows, 0);
    assert.equal(plan.summary.blockedRows, 1);
    assert.equal(item.status, "blocked");
    assert.ok(
      item.blockingReasons.includes(
        "No existing value_calculations row links to this feature snapshot.",
      ),
    );
  });

  it("blocks output when market input is missing or unavailable", () => {
    const row = inputRow();
    const snapshot = row.features!.snapshot;
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
    const plan = buildModelPredictionLineagePlan({
      featureSnapshots: [row],
      valueCalculations: [valueCalculation(row)],
    });
    const item = plan.items[0];

    assert.equal(item.status, "blocked");
    assert.equal(item.row, null);
    assert.ok(
      item.blockingReasons.some((reason) =>
        reason.includes("market implied probability"),
      ),
    );
  });

  it("blocks non pre-race feature snapshots", () => {
    const featureSnapshot = {
      ...inputRow(),
      feature_set_key: "post_race_snapshot",
    };
    const plan = buildModelPredictionLineagePlan({
      featureSnapshots: [featureSnapshot],
      valueCalculations: [valueCalculation(featureSnapshot)],
    });
    const item = plan.items[0];

    assert.equal(item.status, "blocked");
    assert.ok(
      item.blockingReasons.includes(
        `Feature snapshot is not an ${PRE_RACE_FEATURE_SNAPSHOT_SET_KEY} snapshot.`,
      ),
    );
  });
});
