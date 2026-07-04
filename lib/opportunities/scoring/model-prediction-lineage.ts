import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  MODEL_PREDICTION_LINEAGE_MODEL_KEY,
  MODEL_PREDICTION_LINEAGE_MODEL_VERSION,
  MODEL_PREDICTION_LINEAGE_PREDICTION_TYPE,
  buildModelPredictionLineagePlan,
  getModelPredictionLineagePredictionIdentity,
  type ExistingModelVersionIdentity,
  type ModelPredictionFeatureSnapshotRow,
  type ModelPredictionLineagePlan,
  type ModelPredictionValueCalculationRow,
} from "./model-prediction-lineage-core";
import { PRE_RACE_FEATURE_SNAPSHOT_SET_KEY } from "./pre-race-snapshot-materialization-core";

export const DEV_MODEL_PREDICTION_LINEAGE_EXPECTED_SNAPSHOTS = 7;
export const DEV_MODEL_PREDICTION_LINEAGE_EXPECTED_VALUE_CALCULATIONS = 7;

type ExistingPredictionOutputRow = {
  model_version_id: string;
  feature_snapshot_id: string;
  prediction_type: string;
};

export type ModelPredictionLineageOptions = {
  expectedFeatureSnapshotCount?: number;
  expectedValueCalculationCount?: number;
};

export type ModelPredictionLineageReport = {
  status: "completed" | "blocked";
  mode: "dry_run";
  expectedFeatureSnapshotCount: number;
  expectedValueCalculationCount: number;
  writesPerformed: false;
  plan: ModelPredictionLineagePlan;
  safety: {
    writesModelVersions: false;
    writesPredictionOutputs: false;
    writesValueCalculations: false;
    writesOpportunityScores: false;
    writesWagers: false;
    providerIngestionRun: false;
    productionReady: false;
  };
  blockingReasons: readonly string[];
};

function raiseModelPredictionLineageError(
  scope: string,
  message: string,
): never {
  throw new Error(`Model prediction lineage ${scope} failed: ${message}`);
}

async function loadDevPreRaceFeatureSnapshots(client: SupabaseClient) {
  const { data, error } = await client
    .from("feature_snapshots")
    .select("id,race_id,race_date,race_entry_id,feature_set_key,features")
    .eq("feature_set_key", PRE_RACE_FEATURE_SNAPSHOT_SET_KEY)
    .order("race_date", { ascending: true })
    .order("race_id", { ascending: true })
    .order("race_entry_id", { ascending: true })
    .returns<ModelPredictionFeatureSnapshotRow[]>();

  if (error) {
    raiseModelPredictionLineageError("feature snapshot load", error.message);
  }

  return data ?? [];
}

async function loadExistingValueCalculations(
  client: SupabaseClient,
  featureSnapshotIds: readonly string[],
) {
  if (featureSnapshotIds.length === 0) {
    return [];
  }

  const { data, error } = await client
    .from("value_calculations")
    .select(
      "id,feature_snapshot_id,model_version_id,prediction_output_id,model_probability,opportunity_id",
    )
    .in("feature_snapshot_id", [...featureSnapshotIds])
    .returns<ModelPredictionValueCalculationRow[]>();

  if (error) {
    raiseModelPredictionLineageError(
      "value calculation lineage load",
      error.message,
    );
  }

  return data ?? [];
}

async function loadExistingModelVersion(client: SupabaseClient) {
  const { data, error } = await client
    .from("model_versions")
    .select("id,model_key,version")
    .eq("model_key", MODEL_PREDICTION_LINEAGE_MODEL_KEY)
    .eq("version", MODEL_PREDICTION_LINEAGE_MODEL_VERSION)
    .maybeSingle()
    .returns<ExistingModelVersionIdentity | null>();

  if (error) {
    raiseModelPredictionLineageError("model version lookup", error.message);
  }

  return data ?? null;
}

async function loadExistingPredictionOutputIdentities(
  client: SupabaseClient,
  modelVersionId: string | null,
  featureSnapshotIds: readonly string[],
) {
  if (!modelVersionId || featureSnapshotIds.length === 0) {
    return new Set<string>();
  }

  const { data, error } = await client
    .from("prediction_outputs")
    .select("model_version_id,feature_snapshot_id,prediction_type")
    .eq("model_version_id", modelVersionId)
    .eq("prediction_type", MODEL_PREDICTION_LINEAGE_PREDICTION_TYPE)
    .in("feature_snapshot_id", [...featureSnapshotIds])
    .returns<ExistingPredictionOutputRow[]>();

  if (error) {
    raiseModelPredictionLineageError(
      "existing prediction output lookup",
      error.message,
    );
  }

  return new Set(
    (data ?? []).map((row) =>
      getModelPredictionLineagePredictionIdentity({
        modelVersionId: row.model_version_id,
        featureSnapshotId: row.feature_snapshot_id,
        predictionType: MODEL_PREDICTION_LINEAGE_PREDICTION_TYPE,
      }),
    ),
  );
}

function reportBlockingReasons(input: {
  featureSnapshotCount: number;
  expectedFeatureSnapshotCount: number;
  valueCalculationCount: number;
  expectedValueCalculationCount: number;
  plan: ModelPredictionLineagePlan;
}) {
  return [
    ...(input.featureSnapshotCount === input.expectedFeatureSnapshotCount
      ? []
      : [
          `Expected ${input.expectedFeatureSnapshotCount} Dev pre-race feature snapshots, found ${input.featureSnapshotCount}.`,
        ]),
    ...(input.valueCalculationCount === input.expectedValueCalculationCount
      ? []
      : [
          `Expected ${input.expectedValueCalculationCount} Dev value_calculations, found ${input.valueCalculationCount}.`,
        ]),
    ...input.plan.items.flatMap((item) =>
      item.status === "blocked"
        ? item.blockingReasons.map(
            (reason) => `${item.featureSnapshotId ?? "unknown"}: ${reason}`,
          )
        : [],
    ),
  ];
}

export async function buildModelPredictionLineageReport(
  client: SupabaseClient,
  options: ModelPredictionLineageOptions = {},
): Promise<ModelPredictionLineageReport> {
  const expectedFeatureSnapshotCount =
    options.expectedFeatureSnapshotCount ??
    DEV_MODEL_PREDICTION_LINEAGE_EXPECTED_SNAPSHOTS;
  const expectedValueCalculationCount =
    options.expectedValueCalculationCount ??
    DEV_MODEL_PREDICTION_LINEAGE_EXPECTED_VALUE_CALCULATIONS;
  const featureSnapshots = await loadDevPreRaceFeatureSnapshots(client);
  const featureSnapshotIds = featureSnapshots
    .map((row) => row.id)
    .filter((id): id is string => Boolean(id));
  const [valueCalculations, existingModelVersion] = await Promise.all([
    loadExistingValueCalculations(client, featureSnapshotIds),
    loadExistingModelVersion(client),
  ]);
  const existingPredictionOutputIdentities =
    await loadExistingPredictionOutputIdentities(
      client,
      existingModelVersion?.id ?? null,
      featureSnapshotIds,
    );
  const plan = buildModelPredictionLineagePlan({
    featureSnapshots,
    valueCalculations,
    options: {
      existingModelVersion,
      existingPredictionOutputIdentities,
    },
  });
  const blockingReasons = reportBlockingReasons({
    featureSnapshotCount: featureSnapshots.length,
    expectedFeatureSnapshotCount,
    valueCalculationCount: valueCalculations.length,
    expectedValueCalculationCount,
    plan,
  });

  return {
    status: blockingReasons.length > 0 ? "blocked" : "completed",
    mode: "dry_run",
    expectedFeatureSnapshotCount,
    expectedValueCalculationCount,
    writesPerformed: false,
    plan,
    safety: {
      writesModelVersions: false,
      writesPredictionOutputs: false,
      writesValueCalculations: false,
      writesOpportunityScores: false,
      writesWagers: false,
      providerIngestionRun: false,
      productionReady: false,
    },
    blockingReasons,
  };
}
