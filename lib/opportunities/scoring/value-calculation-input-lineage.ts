import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildValueCalculationInputLineagePlan,
  getValueCalculationInputLineageIdentity,
  VALUE_CALCULATION_INPUT_LINEAGE_METHOD_KEY,
  VALUE_CALCULATION_INPUT_LINEAGE_METHOD_VERSION,
  type PlannedValueCalculationInputRow,
  type ValueCalculationInputFeatureSnapshotRow,
  type ValueCalculationInputLineagePlan,
} from "./value-calculation-input-lineage-core";
import { PRE_RACE_FEATURE_SNAPSHOT_SET_KEY } from "./pre-race-snapshot-materialization-core";

export const DEV_VALUE_CALCULATION_INPUT_LINEAGE_EXPECTED_SNAPSHOTS = 7;

type ExistingValueCalculationRow = {
  feature_snapshot_id: string;
  odds_snapshot_id: string | null;
  prediction_output_id: string | null;
  value_method_key: string;
  value_method_version: string;
};

type InsertedValueCalculationRow = {
  id: string;
  feature_snapshot_id: string;
  model_version_id: string | null;
  prediction_output_id: string | null;
  model_probability: number | null;
  opportunity_id: string | null;
};

export type ValueCalculationInputLineageOptions = {
  expectedFeatureSnapshotCount?: number;
};

export type ValueCalculationInputLineageReport = {
  status: "completed" | "blocked";
  mode: "dry_run" | "apply";
  expectedFeatureSnapshotCount: number;
  writesPerformed: boolean;
  plan: ValueCalculationInputLineagePlan;
  insertedValueCalculationIds: readonly string[];
  safety: {
    allowedWriteTarget: "value_calculations";
    writesValueCalculations: boolean;
    writesModelVersions: false;
    writesPredictionOutputs: false;
    writesOpportunityScores: false;
    writesWagers: false;
    productionReady: false;
  };
  blockingReasons: readonly string[];
};

function raiseValueCalculationLineageError(
  scope: string,
  message: string,
): never {
  throw new Error(`Value calculation input lineage ${scope} failed: ${message}`);
}

function reportBlockingReasons(
  featureSnapshotCount: number,
  expectedFeatureSnapshotCount: number,
  plan: ValueCalculationInputLineagePlan,
) {
  return [
    ...(featureSnapshotCount === expectedFeatureSnapshotCount
      ? []
      : [
          `Expected ${expectedFeatureSnapshotCount} Dev pre-race feature snapshots, found ${featureSnapshotCount}.`,
        ]),
    ...plan.items.flatMap((item) =>
      item.status === "blocked"
        ? item.blockingReasons.map(
            (reason) => `${item.featureSnapshotId ?? "unknown"}: ${reason}`,
          )
        : [],
    ),
  ];
}

async function loadDevPreRaceFeatureSnapshots(client: SupabaseClient) {
  const { data, error } = await client
    .from("feature_snapshots")
    .select("id,race_id,race_date,race_entry_id,feature_set_key,features")
    .eq("feature_set_key", PRE_RACE_FEATURE_SNAPSHOT_SET_KEY)
    .order("race_date", { ascending: true })
    .order("race_id", { ascending: true })
    .order("race_entry_id", { ascending: true })
    .returns<ValueCalculationInputFeatureSnapshotRow[]>();

  if (error) {
    raiseValueCalculationLineageError("feature snapshot load", error.message);
  }

  return data ?? [];
}

async function loadExistingValueCalculationIdentities(
  client: SupabaseClient,
  featureSnapshotIds: readonly string[],
) {
  if (featureSnapshotIds.length === 0) {
    return new Set<string>();
  }

  const { data, error } = await client
    .from("value_calculations")
    .select(
      "feature_snapshot_id,odds_snapshot_id,prediction_output_id,value_method_key,value_method_version",
    )
    .in("feature_snapshot_id", [...featureSnapshotIds])
    .eq("value_method_key", VALUE_CALCULATION_INPUT_LINEAGE_METHOD_KEY)
    .eq("value_method_version", VALUE_CALCULATION_INPUT_LINEAGE_METHOD_VERSION)
    .is("prediction_output_id", null)
    .returns<ExistingValueCalculationRow[]>();

  if (error) {
    raiseValueCalculationLineageError(
      "existing value calculation lookup",
      error.message,
    );
  }

  return new Set(
    (data ?? []).map((row) =>
      getValueCalculationInputLineageIdentity({
        featureSnapshotId: row.feature_snapshot_id,
        oddsSnapshotId: row.odds_snapshot_id,
        predictionOutputId: null,
      }),
    ),
  );
}

async function buildPlan(
  client: SupabaseClient,
  options: Required<ValueCalculationInputLineageOptions>,
) {
  const featureSnapshots = await loadDevPreRaceFeatureSnapshots(client);
  const existingCalculationIdentities =
    await loadExistingValueCalculationIdentities(
      client,
      featureSnapshots
        .map((row) => row.id)
        .filter((id): id is string => Boolean(id)),
    );
  const plan = buildValueCalculationInputLineagePlan(featureSnapshots, {
    existingCalculationIdentities,
  });
  const blockingReasons = reportBlockingReasons(
    featureSnapshots.length,
    options.expectedFeatureSnapshotCount,
    plan,
  );

  return {
    featureSnapshots,
    plan,
    blockingReasons,
  };
}

function baseReport(input: {
  mode: "dry_run" | "apply";
  expectedFeatureSnapshotCount: number;
  plan: ValueCalculationInputLineagePlan;
  insertedValueCalculationIds?: readonly string[];
  blockingReasons: readonly string[];
}): ValueCalculationInputLineageReport {
  const insertedValueCalculationIds = input.insertedValueCalculationIds ?? [];

  return {
    status: input.blockingReasons.length > 0 ? "blocked" : "completed",
    mode: input.mode,
    expectedFeatureSnapshotCount: input.expectedFeatureSnapshotCount,
    writesPerformed: insertedValueCalculationIds.length > 0,
    plan: input.plan,
    insertedValueCalculationIds,
    safety: {
      allowedWriteTarget: "value_calculations",
      writesValueCalculations: insertedValueCalculationIds.length > 0,
      writesModelVersions: false,
      writesPredictionOutputs: false,
      writesOpportunityScores: false,
      writesWagers: false,
      productionReady: false,
    },
    blockingReasons: input.blockingReasons,
  };
}

export async function buildValueCalculationInputLineageReport(
  client: SupabaseClient,
  options: ValueCalculationInputLineageOptions = {},
): Promise<ValueCalculationInputLineageReport> {
  const expectedFeatureSnapshotCount =
    options.expectedFeatureSnapshotCount ??
    DEV_VALUE_CALCULATION_INPUT_LINEAGE_EXPECTED_SNAPSHOTS;
  const { plan, blockingReasons } = await buildPlan(client, {
    expectedFeatureSnapshotCount,
  });

  return baseReport({
    mode: "dry_run",
    expectedFeatureSnapshotCount,
    plan,
    blockingReasons,
  });
}

async function insertValueCalculationRows(
  client: SupabaseClient,
  rows: readonly PlannedValueCalculationInputRow[],
) {
  if (rows.length === 0) {
    return [];
  }

  const { data, error } = await client
    .from("value_calculations")
    .insert([...rows])
    .select(
      "id,feature_snapshot_id,model_version_id,prediction_output_id,model_probability,opportunity_id",
    )
    .returns<InsertedValueCalculationRow[]>();

  if (error) {
    raiseValueCalculationLineageError("insert", error.message);
  }

  const insertedRows = data ?? [];
  const forbiddenLineageRows = insertedRows.filter(
    (row) =>
      row.model_version_id !== null ||
      row.prediction_output_id !== null ||
      row.model_probability !== null ||
      row.opportunity_id !== null,
  );

  if (forbiddenLineageRows.length > 0) {
    raiseValueCalculationLineageError(
      "readback",
      "Inserted value_calculations unexpectedly populated model, prediction, model_probability, or opportunity lineage.",
    );
  }

  return insertedRows.map((row) => row.id);
}

export async function applyValueCalculationInputLineage(
  client: SupabaseClient,
  options: ValueCalculationInputLineageOptions = {},
): Promise<ValueCalculationInputLineageReport> {
  const expectedFeatureSnapshotCount =
    options.expectedFeatureSnapshotCount ??
    DEV_VALUE_CALCULATION_INPUT_LINEAGE_EXPECTED_SNAPSHOTS;
  const { plan, blockingReasons } = await buildPlan(client, {
    expectedFeatureSnapshotCount,
  });

  if (blockingReasons.length > 0) {
    return baseReport({
      mode: "apply",
      expectedFeatureSnapshotCount,
      plan,
      blockingReasons,
    });
  }

  const rowsToInsert = plan.items
    .filter((item) => item.status === "planned")
    .map((item) => item.row);
  const insertedValueCalculationIds = await insertValueCalculationRows(
    client,
    rowsToInsert,
  );

  return baseReport({
    mode: "apply",
    expectedFeatureSnapshotCount,
    plan,
    insertedValueCalculationIds,
    blockingReasons: [],
  });
}
