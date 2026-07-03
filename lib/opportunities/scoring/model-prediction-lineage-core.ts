import { createHash } from "node:crypto";

import type { FeatureSnapshotEnvelope } from "./pre-race-snapshot-materialization-core";
import { PRE_RACE_FEATURE_SNAPSHOT_SET_KEY } from "./pre-race-snapshot-materialization-core";

export const MODEL_PREDICTION_LINEAGE_MODEL_KEY =
  "market_implied_probability_v1" as const;
export const MODEL_PREDICTION_LINEAGE_MODEL_VERSION =
  "dev_lineage_fixture_not_trained_v1" as const;
export const MODEL_PREDICTION_LINEAGE_PREDICTION_TYPE =
  "market_derived_baseline_lineage" as const;
export const MODEL_PREDICTION_LINEAGE_REPLAY_STRATEGY =
  "deterministic_identity_skip_existing" as const;

const SOURCE_READ_PATHS = [
  "feature_snapshots.id",
  "feature_snapshots.race_id",
  "feature_snapshots.race_date",
  "feature_snapshots.race_entry_id",
  "feature_snapshots.feature_set_key",
  "feature_snapshots.features.snapshot.lineage.featureSnapshotId",
  "feature_snapshots.features.snapshot.market.latestOddsSnapshotId",
  "feature_snapshots.features.snapshot.market.marketImpliedProbability",
  "feature_snapshots.features.snapshot.market.marketProbabilitySource",
  "value_calculations.id",
  "value_calculations.feature_snapshot_id",
  "model_versions.id",
  "model_versions.model_key",
  "model_versions.version",
  "prediction_outputs.model_version_id",
  "prediction_outputs.feature_snapshot_id",
  "prediction_outputs.prediction_type",
] as const;

const PROHIBITED_SIDE_EFFECT_TARGETS = [
  "model_versions",
  "prediction_outputs",
  "value_calculations",
  "opportunity_scores",
  "wager_recommendations",
  "daily_bet_sheets",
  "daily_bet_sheet_entries",
  "provider_ingestion",
  "model_training_runs",
] as const;

export type ModelPredictionFeatureSnapshotRow = {
  id: string | null;
  race_id: string | null;
  race_date: string | null;
  race_entry_id: string | null;
  feature_set_key: string | null;
  features: FeatureSnapshotEnvelope | null;
};

export type ModelPredictionValueCalculationRow = {
  id: string;
  feature_snapshot_id: string;
  model_version_id: string | null;
  prediction_output_id: string | null;
  model_probability: number | null;
  opportunity_id: string | null;
};

export type ExistingModelVersionIdentity = {
  id: string;
  model_key: typeof MODEL_PREDICTION_LINEAGE_MODEL_KEY;
  version: typeof MODEL_PREDICTION_LINEAGE_MODEL_VERSION;
};

export type PlannedModelVersionRow = {
  id: string;
  model_key: typeof MODEL_PREDICTION_LINEAGE_MODEL_KEY;
  version: typeof MODEL_PREDICTION_LINEAGE_MODEL_VERSION;
  status: "draft";
  training_data_window: null;
  artifact_uri: null;
  parameters: {
    devOnly: true;
    notTrained: true;
    notProduction: true;
    scoringAuthorized: false;
    fixtureKind: "baseline/dev lineage fixture";
  };
  metrics: {
    dryRunOnly: true;
    trainedModelMetrics: false;
    calibrationEvidence: false;
  };
  created_by_user_id: null;
  promoted_at: null;
  retired_at: null;
};

export type PlannedPredictionOutputRow = {
  id: string;
  model_version_id: string;
  feature_snapshot_id: string;
  race_id: string;
  race_date: string;
  race_entry_id: string;
  prediction_type: typeof MODEL_PREDICTION_LINEAGE_PREDICTION_TYPE;
  probability: number;
  score: null;
  output: ModelPredictionDryRunOutput;
  source_job_run_id: null;
};

export type ModelPredictionDryRunOutput = {
  dryRunOnly: true;
  productionReady: false;
  trainedMl: false;
  calibratedModelProbability: false;
  scoringAuthorized: false;
  probabilityMeaning: "market-derived baseline lineage only";
  marketInput: {
    source: "latest_odds" | "morning_line";
    oddsSnapshotId: string | null;
    marketImpliedProbability: number;
  };
  lineage: {
    modelKey: typeof MODEL_PREDICTION_LINEAGE_MODEL_KEY;
    modelVersion: typeof MODEL_PREDICTION_LINEAGE_MODEL_VERSION;
    featureSnapshotId: string;
    featureContractVersion: string;
    snapshotSchemaVersion: string;
    valueCalculationIds: readonly string[];
  };
  safety: {
    writesPerformed: false;
    writesModelVersions: false;
    writesPredictionOutputs: false;
    writesValueCalculations: false;
    writesOpportunityScores: false;
    writesWagers: false;
    writesProviderIngestion: false;
    writesModelTraining: false;
    prohibitedSideEffectTargets: readonly (typeof PROHIBITED_SIDE_EFFECT_TARGETS)[number][];
  };
};

export type ModelPredictionLineagePlanItem =
  | {
      status: "planned";
      featureSnapshotId: string;
      predictionIdentity: string;
      row: PlannedPredictionOutputRow;
      linkedValueCalculationIds: readonly string[];
      blockingReasons: readonly [];
      sourceReadPaths: readonly string[];
    }
  | {
      status: "skipped_existing";
      featureSnapshotId: string;
      predictionIdentity: string;
      row: PlannedPredictionOutputRow;
      linkedValueCalculationIds: readonly string[];
      blockingReasons: readonly [];
      sourceReadPaths: readonly string[];
      skippedReason: "already_materialized";
    }
  | {
      status: "blocked";
      featureSnapshotId: string | null;
      predictionIdentity: null;
      row: null;
      linkedValueCalculationIds: readonly string[];
      blockingReasons: readonly string[];
      sourceReadPaths: readonly string[];
    };

export type ModelPredictionLineagePlanSummary = {
  replayStrategy: typeof MODEL_PREDICTION_LINEAGE_REPLAY_STRATEGY;
  featureSnapshotsReviewed: number;
  linkedValueCalculations: number;
  plannedPredictionRows: number;
  blockedRows: number;
  skippedExistingPredictionRows: number;
  writesPerformed: false;
};

export type ModelPredictionLineagePlan = {
  modelVersion: {
    status: "planned" | "skipped_existing";
    identity: string;
    row: PlannedModelVersionRow;
    skippedReason?: "already_materialized";
  };
  summary: ModelPredictionLineagePlanSummary;
  items: readonly ModelPredictionLineagePlanItem[];
};

export type ModelPredictionLineagePlanOptions = {
  existingModelVersion?: ExistingModelVersionIdentity | null;
  existingPredictionOutputIdentities?: ReadonlySet<string>;
};

function deterministicUuid(input: string) {
  const hex = createHash("sha256").update(input).digest("hex").slice(0, 32);

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `8${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join("-");
}

function calculationIdentity(parts: readonly unknown[]) {
  return JSON.stringify(parts);
}

function isProbability(value: number | null | undefined) {
  return (
    value !== null &&
    value !== undefined &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}

export function getModelPredictionLineageModelVersionIdentity() {
  return calculationIdentity([
    MODEL_PREDICTION_LINEAGE_MODEL_KEY,
    MODEL_PREDICTION_LINEAGE_MODEL_VERSION,
  ]);
}

export function getModelPredictionLineageModelVersionId() {
  return deterministicUuid(getModelPredictionLineageModelVersionIdentity());
}

export function getModelPredictionLineagePredictionIdentity(parts: {
  modelVersionId: string;
  featureSnapshotId: string;
  predictionType?: typeof MODEL_PREDICTION_LINEAGE_PREDICTION_TYPE;
}) {
  return calculationIdentity([
    parts.modelVersionId,
    parts.featureSnapshotId,
    parts.predictionType ?? MODEL_PREDICTION_LINEAGE_PREDICTION_TYPE,
  ]);
}

function buildModelVersion(
  existingModelVersion: ExistingModelVersionIdentity | null | undefined,
): ModelPredictionLineagePlan["modelVersion"] {
  const identity = getModelPredictionLineageModelVersionIdentity();
  const id =
    existingModelVersion?.id ?? getModelPredictionLineageModelVersionId();
  const row: PlannedModelVersionRow = {
    id,
    model_key: MODEL_PREDICTION_LINEAGE_MODEL_KEY,
    version: MODEL_PREDICTION_LINEAGE_MODEL_VERSION,
    status: "draft",
    training_data_window: null,
    artifact_uri: null,
    parameters: {
      devOnly: true,
      notTrained: true,
      notProduction: true,
      scoringAuthorized: false,
      fixtureKind: "baseline/dev lineage fixture",
    },
    metrics: {
      dryRunOnly: true,
      trainedModelMetrics: false,
      calibrationEvidence: false,
    },
    created_by_user_id: null,
    promoted_at: null,
    retired_at: null,
  };

  return {
    status: existingModelVersion ? "skipped_existing" : "planned",
    identity,
    row,
    ...(existingModelVersion
      ? { skippedReason: "already_materialized" as const }
      : {}),
  };
}

function validateLineage(row: ModelPredictionFeatureSnapshotRow): string[] {
  const reasons: string[] = [];
  const snapshot = row.features?.snapshot;

  if (!row.id) {
    reasons.push("Feature snapshot row is missing id.");
  }

  if (row.feature_set_key !== PRE_RACE_FEATURE_SNAPSHOT_SET_KEY) {
    reasons.push("Feature snapshot is not an opportunity_pre_race snapshot.");
  }

  if (!snapshot) {
    reasons.push("Feature snapshot envelope is missing snapshot payload.");
    return reasons;
  }

  if (!snapshot.lineage.featureSnapshotId) {
    reasons.push("Feature snapshot lineage is missing featureSnapshotId.");
  }

  if (
    row.id &&
    snapshot.lineage.featureSnapshotId &&
    snapshot.lineage.featureSnapshotId !== row.id
  ) {
    reasons.push(
      "Feature snapshot row id does not match snapshot lineage featureSnapshotId.",
    );
  }

  if (!row.race_id || row.race_id !== snapshot.race.raceId) {
    reasons.push("Feature snapshot race_id does not match snapshot race identity.");
  }

  if (!row.race_date || row.race_date !== snapshot.race.raceDate) {
    reasons.push("Feature snapshot race_date does not match snapshot race identity.");
  }

  if (!row.race_entry_id || row.race_entry_id !== snapshot.entry.raceEntryId) {
    reasons.push("Feature snapshot race_entry_id does not match snapshot entry identity.");
  }

  return reasons;
}

function validateMarketInput(row: ModelPredictionFeatureSnapshotRow) {
  const market = row.features?.snapshot.market;
  const reasons: string[] = [];

  if (!market) {
    return {
      marketProbability: null,
      oddsSnapshotId: null,
      marketSource: null,
      reasons: ["Feature snapshot envelope is missing market input."],
    };
  }

  if (!isProbability(market.marketImpliedProbability)) {
    reasons.push(
      "Feature snapshot market implied probability is missing or invalid.",
    );
  }

  if (market.marketProbabilitySource === "unavailable") {
    reasons.push("Feature snapshot market input is unavailable.");
  }

  if (
    market.marketProbabilitySource === "latest_odds" &&
    !market.latestOddsSnapshotId
  ) {
    reasons.push("Latest-odds market input is missing latestOddsSnapshotId.");
  }

  if (
    market.marketProbabilitySource !== "latest_odds" &&
    market.marketProbabilitySource !== "morning_line" &&
    market.marketProbabilitySource !== "unavailable"
  ) {
    reasons.push("Feature snapshot market probability source is not recognized.");
  }

  return {
    marketProbability: isProbability(market.marketImpliedProbability)
      ? market.marketImpliedProbability
      : null,
    oddsSnapshotId:
      market.marketProbabilitySource === "latest_odds"
        ? market.latestOddsSnapshotId
        : null,
    marketSource:
      market.marketProbabilitySource === "latest_odds" ||
      market.marketProbabilitySource === "morning_line"
        ? market.marketProbabilitySource
        : null,
    reasons,
  };
}

function buildDryRunOutput(
  row: ModelPredictionFeatureSnapshotRow,
  input: {
    marketProbability: number;
    oddsSnapshotId: string | null;
    marketSource: "latest_odds" | "morning_line";
    linkedValueCalculationIds: readonly string[];
  },
): ModelPredictionDryRunOutput {
  const snapshot = row.features!.snapshot;

  return {
    dryRunOnly: true,
    productionReady: false,
    trainedMl: false,
    calibratedModelProbability: false,
    scoringAuthorized: false,
    probabilityMeaning: "market-derived baseline lineage only",
    marketInput: {
      source: input.marketSource,
      oddsSnapshotId: input.oddsSnapshotId,
      marketImpliedProbability: input.marketProbability,
    },
    lineage: {
      modelKey: MODEL_PREDICTION_LINEAGE_MODEL_KEY,
      modelVersion: MODEL_PREDICTION_LINEAGE_MODEL_VERSION,
      featureSnapshotId: row.id!,
      featureContractVersion: snapshot.featureContractVersion,
      snapshotSchemaVersion: snapshot.snapshotSchemaVersion,
      valueCalculationIds: input.linkedValueCalculationIds,
    },
    safety: {
      writesPerformed: false,
      writesModelVersions: false,
      writesPredictionOutputs: false,
      writesValueCalculations: false,
      writesOpportunityScores: false,
      writesWagers: false,
      writesProviderIngestion: false,
      writesModelTraining: false,
      prohibitedSideEffectTargets: PROHIBITED_SIDE_EFFECT_TARGETS,
    },
  };
}

function buildItem(
  row: ModelPredictionFeatureSnapshotRow,
  modelVersionId: string,
  valueCalculationsByFeatureSnapshot: ReadonlyMap<string, readonly string[]>,
  options: ModelPredictionLineagePlanOptions,
): ModelPredictionLineagePlanItem {
  const lineageReasons = validateLineage(row);
  const marketInput = validateMarketInput(row);
  const blockingReasons = [...lineageReasons, ...marketInput.reasons];
  const linkedValueCalculationIds = row.id
    ? (valueCalculationsByFeatureSnapshot.get(row.id) ?? [])
    : [];

  if (linkedValueCalculationIds.length === 0) {
    blockingReasons.push(
      "No existing value_calculations row links to this feature snapshot.",
    );
  }

  if (blockingReasons.length > 0) {
    return {
      status: "blocked",
      featureSnapshotId: row.id,
      predictionIdentity: null,
      row: null,
      linkedValueCalculationIds,
      blockingReasons,
      sourceReadPaths: SOURCE_READ_PATHS,
    };
  }

  const identity = getModelPredictionLineagePredictionIdentity({
    modelVersionId,
    featureSnapshotId: row.id!,
  });
  const predictionRow: PlannedPredictionOutputRow = {
    id: deterministicUuid(identity),
    model_version_id: modelVersionId,
    feature_snapshot_id: row.id!,
    race_id: row.race_id!,
    race_date: row.race_date!,
    race_entry_id: row.race_entry_id!,
    prediction_type: MODEL_PREDICTION_LINEAGE_PREDICTION_TYPE,
    probability: marketInput.marketProbability!,
    score: null,
    output: buildDryRunOutput(row, {
      marketProbability: marketInput.marketProbability!,
      oddsSnapshotId: marketInput.oddsSnapshotId,
      marketSource: marketInput.marketSource!,
      linkedValueCalculationIds,
    }),
    source_job_run_id: null,
  };

  if (options.existingPredictionOutputIdentities?.has(identity)) {
    return {
      status: "skipped_existing",
      featureSnapshotId: row.id!,
      predictionIdentity: identity,
      row: predictionRow,
      linkedValueCalculationIds,
      blockingReasons: [],
      sourceReadPaths: SOURCE_READ_PATHS,
      skippedReason: "already_materialized",
    };
  }

  return {
    status: "planned",
    featureSnapshotId: row.id!,
    predictionIdentity: identity,
    row: predictionRow,
    linkedValueCalculationIds,
    blockingReasons: [],
    sourceReadPaths: SOURCE_READ_PATHS,
  };
}

function mapValueCalculations(
  valueCalculations: readonly ModelPredictionValueCalculationRow[],
) {
  const byFeatureSnapshot = new Map<string, string[]>();

  for (const row of valueCalculations) {
    const current = byFeatureSnapshot.get(row.feature_snapshot_id) ?? [];
    current.push(row.id);
    byFeatureSnapshot.set(row.feature_snapshot_id, current);
  }

  return new Map(
    [...byFeatureSnapshot.entries()].map(([key, value]) => [
      key,
      [...value].sort(),
    ]),
  );
}

function summarize(
  featureSnapshotsReviewed: number,
  valueCalculationsByFeatureSnapshot: ReadonlyMap<string, readonly string[]>,
  items: readonly ModelPredictionLineagePlanItem[],
): ModelPredictionLineagePlanSummary {
  return {
    replayStrategy: MODEL_PREDICTION_LINEAGE_REPLAY_STRATEGY,
    featureSnapshotsReviewed,
    linkedValueCalculations: [...valueCalculationsByFeatureSnapshot.values()]
      .reduce((total, ids) => total + ids.length, 0),
    plannedPredictionRows: items.filter((item) => item.status === "planned").length,
    blockedRows: items.filter((item) => item.status === "blocked").length,
    skippedExistingPredictionRows: items.filter(
      (item) => item.status === "skipped_existing",
    ).length,
    writesPerformed: false,
  };
}

export function buildModelPredictionLineagePlan(input: {
  featureSnapshots: readonly ModelPredictionFeatureSnapshotRow[];
  valueCalculations: readonly ModelPredictionValueCalculationRow[];
  options?: ModelPredictionLineagePlanOptions;
}): ModelPredictionLineagePlan {
  const options = input.options ?? {};
  const modelVersion = buildModelVersion(options.existingModelVersion);
  const valueCalculationsByFeatureSnapshot = mapValueCalculations(
    input.valueCalculations,
  );
  const items = input.featureSnapshots.map((row) =>
    buildItem(row, modelVersion.row.id, valueCalculationsByFeatureSnapshot, options),
  );

  return {
    modelVersion,
    summary: summarize(
      input.featureSnapshots.length,
      valueCalculationsByFeatureSnapshot,
      items,
    ),
    items,
  };
}
