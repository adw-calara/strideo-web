import type { FeatureSnapshotEnvelope } from "./pre-race-snapshot-materialization-core";
import { PRE_RACE_FEATURE_SNAPSHOT_SET_KEY } from "./pre-race-snapshot-materialization-core";

export const VALUE_CALCULATION_INPUT_LINEAGE_METHOD_KEY =
  "market_input_lineage_readiness_v1" as const;
export const VALUE_CALCULATION_INPUT_LINEAGE_METHOD_VERSION =
  "dev_dry_run_v1" as const;
export const VALUE_CALCULATION_INPUT_LINEAGE_REPLAY_STRATEGY =
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
  "feature_snapshots.features.snapshot.entry.horseId",
] as const;

const PROHIBITED_SIDE_EFFECT_TARGETS = [
  "feature_snapshots",
  "model_versions",
  "prediction_outputs",
  "opportunity_scores",
  "wager_recommendations",
  "daily_bet_sheets",
  "daily_bet_sheet_entries",
  "provider_ingestion",
  "model_training_runs",
] as const;

export type ValueCalculationInputFeatureSnapshotRow = {
  id: string | null;
  race_id: string | null;
  race_date: string | null;
  race_entry_id: string | null;
  feature_set_key: string | null;
  features: FeatureSnapshotEnvelope | null;
};

export type PlannedValueCalculationInputRow = {
  race_id: string;
  race_date: string;
  race_entry_id: string;
  horse_id: string | null;
  opportunity_id: null;
  model_version_id: null;
  feature_snapshot_id: string;
  odds_snapshot_id: string | null;
  prediction_output_id: null;
  result_version_id: null;
  value_method_key: typeof VALUE_CALCULATION_INPUT_LINEAGE_METHOD_KEY;
  value_method_version: typeof VALUE_CALCULATION_INPUT_LINEAGE_METHOD_VERSION;
  model_probability: null;
  market_probability: number;
  fair_odds_decimal: null;
  fair_value: null;
  edge: null;
  expected_value: null;
  value_score: null;
  stake_basis: null;
  output: ValueCalculationInputDryRunOutput;
  source_job_run_id: null;
};

export type ValueCalculationInputDryRunOutput = {
  dryRunOnly: true;
  productionReady: false;
  scoringRuntime: false;
  modelLineageAuthorized: false;
  predictionLineageAuthorized: false;
  marketInput: {
    source: "latest_odds" | "morning_line";
    oddsSnapshotId: string | null;
    marketImpliedProbability: number;
  };
  lineage: {
    featureSnapshotId: string;
    featureContractVersion: string;
    snapshotSchemaVersion: string;
    sourceLineageIds: readonly string[];
  };
  safety: {
    writesPerformed: false;
    writesValueCalculations: false;
    writesPredictions: false;
    writesOpportunityScores: false;
    writesWagers: false;
    writesProviderIngestion: false;
    writesModelTraining: false;
    prohibitedSideEffectTargets: readonly (typeof PROHIBITED_SIDE_EFFECT_TARGETS)[number][];
  };
};

export type ValueCalculationInputLineagePlanItem =
  | {
      status: "planned";
      featureSnapshotId: string;
      calculationIdentity: string;
      row: PlannedValueCalculationInputRow;
      blockingReasons: readonly [];
      sourceReadPaths: readonly string[];
    }
  | {
      status: "skipped_existing";
      featureSnapshotId: string;
      calculationIdentity: string;
      row: PlannedValueCalculationInputRow;
      blockingReasons: readonly [];
      sourceReadPaths: readonly string[];
      skippedReason: "already_materialized";
    }
  | {
      status: "blocked";
      featureSnapshotId: string | null;
      calculationIdentity: null;
      row: null;
      blockingReasons: readonly string[];
      sourceReadPaths: readonly string[];
    };

export type ValueCalculationInputLineagePlanSummary = {
  replayStrategy: typeof VALUE_CALCULATION_INPUT_LINEAGE_REPLAY_STRATEGY;
  featureSnapshotsReviewed: number;
  plannedRows: number;
  blockedRows: number;
  skippedExistingRows: number;
  writesPerformed: false;
};

export type ValueCalculationInputLineagePlan = {
  summary: ValueCalculationInputLineagePlanSummary;
  items: readonly ValueCalculationInputLineagePlanItem[];
};

export type ValueCalculationInputLineagePlanOptions = {
  existingCalculationIdentities?: ReadonlySet<string>;
};

function isProbability(value: number | null | undefined) {
  return (
    value !== null &&
    value !== undefined &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}

export function getValueCalculationInputLineageIdentity(parts: {
  featureSnapshotId: string;
  oddsSnapshotId: string | null;
  predictionOutputId: null;
}) {
  return calculationIdentity([
    parts.featureSnapshotId,
    parts.oddsSnapshotId,
    parts.predictionOutputId,
    VALUE_CALCULATION_INPUT_LINEAGE_METHOD_KEY,
    VALUE_CALCULATION_INPUT_LINEAGE_METHOD_VERSION,
  ]);
}

function calculationIdentity(parts: readonly unknown[]) {
  return JSON.stringify(parts);
}

function validateLineage(
  row: ValueCalculationInputFeatureSnapshotRow,
): string[] {
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

function validateMarketInput(row: ValueCalculationInputFeatureSnapshotRow) {
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
  row: ValueCalculationInputFeatureSnapshotRow,
  marketInput: {
    marketProbability: number;
    oddsSnapshotId: string | null;
    marketSource: "latest_odds" | "morning_line";
  },
): ValueCalculationInputDryRunOutput {
  const snapshot = row.features!.snapshot;

  return {
    dryRunOnly: true,
    productionReady: false,
    scoringRuntime: false,
    modelLineageAuthorized: false,
    predictionLineageAuthorized: false,
    marketInput: {
      source: marketInput.marketSource,
      oddsSnapshotId: marketInput.oddsSnapshotId,
      marketImpliedProbability: marketInput.marketProbability,
    },
    lineage: {
      featureSnapshotId: row.id!,
      featureContractVersion: snapshot.featureContractVersion,
      snapshotSchemaVersion: snapshot.snapshotSchemaVersion,
      sourceLineageIds: snapshot.lineage.sourceLineageIds,
    },
    safety: {
      writesPerformed: false,
      writesValueCalculations: false,
      writesPredictions: false,
      writesOpportunityScores: false,
      writesWagers: false,
      writesProviderIngestion: false,
      writesModelTraining: false,
      prohibitedSideEffectTargets: PROHIBITED_SIDE_EFFECT_TARGETS,
    },
  };
}

function buildItem(
  row: ValueCalculationInputFeatureSnapshotRow,
  options: ValueCalculationInputLineagePlanOptions,
): ValueCalculationInputLineagePlanItem {
  const lineageReasons = validateLineage(row);
  const marketInput = validateMarketInput(row);
  const blockingReasons = [...lineageReasons, ...marketInput.reasons];

  if (blockingReasons.length > 0) {
    return {
      status: "blocked",
      featureSnapshotId: row.id,
      calculationIdentity: null,
      row: null,
      blockingReasons,
      sourceReadPaths: SOURCE_READ_PATHS,
    };
  }

  const marketSource = marketInput.marketSource!;
  const marketProbability = marketInput.marketProbability!;
  const identity = getValueCalculationInputLineageIdentity({
    featureSnapshotId: row.id!,
    oddsSnapshotId: marketInput.oddsSnapshotId,
    predictionOutputId: null,
  });
  const plannedRow: PlannedValueCalculationInputRow = {
    race_id: row.race_id!,
    race_date: row.race_date!,
    race_entry_id: row.race_entry_id!,
    horse_id: row.features!.snapshot.entry.horseId,
    opportunity_id: null,
    model_version_id: null,
    feature_snapshot_id: row.id!,
    odds_snapshot_id: marketInput.oddsSnapshotId,
    prediction_output_id: null,
    result_version_id: null,
    value_method_key: VALUE_CALCULATION_INPUT_LINEAGE_METHOD_KEY,
    value_method_version: VALUE_CALCULATION_INPUT_LINEAGE_METHOD_VERSION,
    model_probability: null,
    market_probability: marketProbability,
    fair_odds_decimal: null,
    fair_value: null,
    edge: null,
    expected_value: null,
    value_score: null,
    stake_basis: null,
    output: buildDryRunOutput(row, {
      marketProbability,
      oddsSnapshotId: marketInput.oddsSnapshotId,
      marketSource,
    }),
    source_job_run_id: null,
  };

  if (options.existingCalculationIdentities?.has(identity)) {
    return {
      status: "skipped_existing",
      featureSnapshotId: row.id!,
      calculationIdentity: identity,
      row: plannedRow,
      blockingReasons: [],
      sourceReadPaths: SOURCE_READ_PATHS,
      skippedReason: "already_materialized",
    };
  }

  return {
    status: "planned",
    featureSnapshotId: row.id!,
    calculationIdentity: identity,
    row: plannedRow,
    blockingReasons: [],
    sourceReadPaths: SOURCE_READ_PATHS,
  };
}

function summarize(
  featureSnapshotsReviewed: number,
  items: readonly ValueCalculationInputLineagePlanItem[],
): ValueCalculationInputLineagePlanSummary {
  return {
    replayStrategy: VALUE_CALCULATION_INPUT_LINEAGE_REPLAY_STRATEGY,
    featureSnapshotsReviewed,
    plannedRows: items.filter((item) => item.status === "planned").length,
    blockedRows: items.filter((item) => item.status === "blocked").length,
    skippedExistingRows: items.filter(
      (item) => item.status === "skipped_existing",
    ).length,
    writesPerformed: false,
  };
}

export function buildValueCalculationInputLineagePlan(
  featureSnapshots: readonly ValueCalculationInputFeatureSnapshotRow[],
  options: ValueCalculationInputLineagePlanOptions = {},
): ValueCalculationInputLineagePlan {
  const items = featureSnapshots.map((row) => buildItem(row, options));

  return {
    summary: summarize(featureSnapshots.length, items),
    items,
  };
}
