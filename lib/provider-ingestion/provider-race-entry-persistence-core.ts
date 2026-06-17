import type { JsonObject } from "@/lib/racing-codes/normalization-core";
import type {
  ProviderRaceEntryWritePlan,
  ProviderRaceEntrySourcePaths,
} from "./provider-race-entry-adapter-core";

export type RaceEntryFactRow = {
  race_id: string;
  race_date: string;
  provider: string;
  provider_entry_id: string;
  horse_id: string | null;
  status: "entered" | "scratched" | "reinstated" | "started" | "finished";
  medication: string | null;
  metadata: JsonObject;
};

export type RaceEntryFactStore = {
  upsertRaceEntryFact: (
    row: RaceEntryFactRow,
    options: {
      onConflict: "provider,provider_entry_id,race_date";
      idempotencyKey: string;
    },
  ) => Promise<{ id: string; race_date: string; provider_entry_id: string }>;
};

export type RaceEntryPersistenceBindings = {
  raceId: string;
  raceDate?: string | null;
  horseId?: string | null;
};

export type RaceEntryPersistenceContext = {
  bindings: RaceEntryPersistenceBindings;
  store: RaceEntryFactStore;
};

export type RaceEntryPersistenceResult =
  | {
      status: "persisted";
      wrote: true;
      target_table: "race_entries";
      idempotency_key: string;
      row: RaceEntryFactRow;
      persisted: { id: string; race_date: string; provider_entry_id: string };
    }
  | {
      status: "skipped" | "rejected";
      wrote: false;
      reason: string;
      idempotency_key: string | null;
    };

const LOGICAL_TARGET = "race_entry_source_fact";
const PHYSICAL_TARGET_TABLE = "race_entries";
const UPSERT_CONFLICT_TARGET = "provider,provider_entry_id,race_date";
const REQUIRED_SOURCE_PATH_KEYS: readonly (keyof ProviderRaceEntrySourcePaths)[] = [
  "race_type",
  "surface",
  "entry_status",
];
const REQUIRED_CANONICAL_KEYS: readonly (keyof ProviderRaceEntryWritePlan["canonical_values"])[] =
  ["race_type", "surface", "entry_status"];
const FORBIDDEN_PLAN_KEYS = [
  "opportunity_id",
  "opportunityId",
  "prediction_output_id",
  "predictionOutputId",
  "value_calculation_id",
  "valueCalculationId",
  "wager_recommendation_id",
  "wagerRecommendationId",
  "model_training_run_id",
  "modelTrainingRunId",
  "feature_snapshot_id",
  "featureSnapshotId",
  "strategy_id",
  "strategyId",
  "strategy_version_id",
  "strategyVersionId",
  "strategy_marketplace_listing_id",
  "strategyMarketplaceListingId",
  "bankroll_id",
  "bankrollId",
  "bet_sheet_id",
  "betSheetId",
  "bet_sheet_entry_id",
  "betSheetEntryId",
] as const;

function hasValidUuidShape(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function hasValidDateShape(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function reject(reason: string, plan: ProviderRaceEntryWritePlan | null) {
  return {
    status: "rejected",
    wrote: false,
    reason,
    idempotency_key: plan?.idempotency_key ?? null,
  } satisfies RaceEntryPersistenceResult;
}

function skipped(reason: string) {
  return {
    status: "skipped",
    wrote: false,
    reason,
    idempotency_key: null,
  } satisfies RaceEntryPersistenceResult;
}

function planHasForbiddenKeys(plan: ProviderRaceEntryWritePlan) {
  return FORBIDDEN_PLAN_KEYS.filter((key) =>
    Object.prototype.hasOwnProperty.call(plan, key),
  );
}

function validatePlan(plan: ProviderRaceEntryWritePlan | null) {
  if (!plan) {
    return "blocked or missing write plan";
  }

  if (plan.target !== LOGICAL_TARGET) {
    return `target is not allowlisted: ${plan.target}`;
  }

  if (plan.operation !== "upsert_plan") {
    return `operation is not allowlisted: ${plan.operation}`;
  }

  if (plan.ml_feature_materialization_status !== "ready") {
    return "normalization did not produce an ML-ready plan";
  }

  if (!plan.idempotency_key) {
    return "idempotency key is required";
  }

  if (!plan.source_system) {
    return "source system is required";
  }

  if (plan.provider_payload_shape !== "the_racing_api_race_entry_v1") {
    return `provider payload shape is not allowlisted: ${plan.provider_payload_shape}`;
  }

  if (!plan.provider_identifiers.provider_race_id) {
    return "provider race id is required";
  }

  if (!plan.provider_identifiers.provider_entry_id) {
    return "provider entry id is required";
  }

  if (!plan.provider_identifiers.provider_horse_id) {
    return "provider horse id is required";
  }

  for (const key of REQUIRED_SOURCE_PATH_KEYS) {
    if (!plan.source_paths[key]) {
      return `source path missing for ${key}`;
    }
  }

  for (const key of REQUIRED_CANONICAL_KEYS) {
    if (!plan.canonical_values[key]) {
      return `canonical value missing for ${key}`;
    }

    if (!plan.normalization_results[key]) {
      return `normalization result missing for ${key}`;
    }
  }

  const forbiddenKeys = planHasForbiddenKeys(plan);
  if (forbiddenKeys.length > 0) {
    return `forbidden write lineage present: ${forbiddenKeys.join(", ")}`;
  }

  return null;
}

function validateBindings(bindings: RaceEntryPersistenceBindings) {
  if (!hasValidUuidShape(bindings.raceId)) {
    return "raceId binding must be a UUID";
  }

  if (bindings.horseId && !hasValidUuidShape(bindings.horseId)) {
    return "horseId binding must be a UUID when supplied";
  }

  if (bindings.raceDate && !hasValidDateShape(bindings.raceDate)) {
    return "raceDate binding must use YYYY-MM-DD when supplied";
  }

  return null;
}

function toEntryStatus(value: string | null) {
  if (
    value === "entered" ||
    value === "scratched" ||
    value === "reinstated" ||
    value === "started" ||
    value === "finished"
  ) {
    return value;
  }

  return null;
}

function buildRaceEntryMetadata(plan: ProviderRaceEntryWritePlan): JsonObject {
  return {
    provider_payload_shape: plan.provider_payload_shape,
    adapter_idempotency_key: plan.idempotency_key,
    provider_identifiers: plan.provider_identifiers,
    source_paths: plan.source_paths,
    raw_values: plan.raw_values,
    canonical_values: plan.canonical_values,
    canonical_labels: plan.canonical_labels,
    normalization_results: plan.normalization_results,
    warnings: plan.warnings,
    blocking_reasons: plan.blocking_reasons,
    raw_provider_payload: plan.raw_provider_payload,
    persistence_boundary: {
      logical_target: plan.target,
      physical_target_table: PHYSICAL_TARGET_TABLE,
      operation: plan.operation,
      prohibited_side_effects: plan.prohibited_side_effects,
    },
  };
}

export function buildRaceEntryFactRow(
  plan: ProviderRaceEntryWritePlan,
  bindings: RaceEntryPersistenceBindings,
): RaceEntryFactRow | RaceEntryPersistenceResult {
  const bindingError = validateBindings(bindings);
  if (bindingError) {
    return reject(bindingError, plan);
  }

  const status = toEntryStatus(plan.canonical_values.entry_status);
  if (!status) {
    return reject("entry_status canonical value is not a valid race_entries status", plan);
  }

  const raceDate = bindings.raceDate ?? plan.raw_provider_payload.race.date;
  if (!hasValidDateShape(raceDate)) {
    return reject("race date must use YYYY-MM-DD", plan);
  }

  return {
    race_id: bindings.raceId,
    race_date: raceDate,
    provider: plan.source_system,
    provider_entry_id: plan.provider_identifiers.provider_entry_id,
    horse_id: bindings.horseId ?? null,
    status,
    medication: plan.canonical_values.medication,
    metadata: buildRaceEntryMetadata(plan),
  };
}

export async function executeRaceEntryWritePlan(
  plan: ProviderRaceEntryWritePlan | null,
  context: RaceEntryPersistenceContext,
): Promise<RaceEntryPersistenceResult> {
  if (!plan) {
    return skipped("blocked or missing write plan");
  }

  const planError = validatePlan(plan);
  if (planError) {
    return reject(planError, plan);
  }

  const row = buildRaceEntryFactRow(plan, context.bindings);
  if ("wrote" in row) {
    return row;
  }

  const persisted = await context.store.upsertRaceEntryFact(row, {
    onConflict: UPSERT_CONFLICT_TARGET,
    idempotencyKey: plan.idempotency_key,
  });

  return {
    status: "persisted",
    wrote: true,
    target_table: PHYSICAL_TARGET_TABLE,
    idempotency_key: plan.idempotency_key,
    row,
    persisted,
  };
}
