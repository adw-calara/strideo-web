import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  JsonObject,
  RacingCodeNormalizationInput,
  RacingCodeNormalizationResult,
} from "@/lib/racing-codes/normalization-core";
import { makeTheRacingApiRaceEntryFixture } from "./fixtures/the-racing-api-race-entry.fixture";
import {
  planTheRacingApiRaceEntryAdaptation,
  type ProviderRaceEntryWritePlan,
} from "./provider-race-entry-adapter-core";
import {
  executeRaceEntryWritePlan,
  type RaceEntryFactRow,
  type RaceEntryFactStore,
} from "./provider-race-entry-persistence-core";

type AliasKey = `${string}:${string}`;

const RACE_ID = "11111111-1111-4111-8111-111111111111";
const HORSE_ID = "22222222-2222-4222-8222-222222222222";

const ALIASES: Record<
  AliasKey,
  { canonicalCode: string; canonicalLabel: string; normalizedValue: JsonObject }
> = {
  "race_type:MSW": {
    canonicalCode: "maiden_special_weight",
    canonicalLabel: "Maiden Special Weight",
    normalizedValue: { feature_key: "race_type_maiden_special_weight" },
  },
  "surface:D": {
    canonicalCode: "dirt",
    canonicalLabel: "Dirt",
    normalizedValue: { feature_key: "surface_dirt" },
  },
  "track_condition:FT": {
    canonicalCode: "fast",
    canonicalLabel: "Fast",
    normalizedValue: { feature_key: "track_condition_fast" },
  },
  "horse_sex:g": {
    canonicalCode: "gelding",
    canonicalLabel: "Gelding",
    normalizedValue: { feature_key: "horse_sex_gelding" },
  },
  "horse_color:B": {
    canonicalCode: "bay",
    canonicalLabel: "Bay",
    normalizedValue: { feature_key: "horse_color_bay" },
  },
  "medication:L": {
    canonicalCode: "lasix",
    canonicalLabel: "Lasix",
    normalizedValue: { feature_key: "medication_lasix" },
  },
  "entry_status:RUN": {
    canonicalCode: "entered",
    canonicalLabel: "Entered",
    normalizedValue: { feature_key: "entry_status_entered" },
  },
  "workout_type:B": {
    canonicalCode: "breezing",
    canonicalLabel: "Breezing",
    normalizedValue: { feature_key: "workout_type_breezing" },
  },
};

function resolvedResult(
  input: RacingCodeNormalizationInput,
  alias: (typeof ALIASES)[AliasKey],
): RacingCodeNormalizationResult {
  const codeSetKey = input.code_set_key ?? "unknown";

  return {
    status: "resolved",
    blocked_for_ml: false,
    alias_id: `alias-${codeSetKey}-${input.source_code}`,
    code_set_id: `set-${codeSetKey}`,
    code_value_id: `value-${alias.canonicalCode}`,
    canonical_code: alias.canonicalCode,
    canonical_label: alias.canonicalLabel,
    normalized_value: alias.normalizedValue,
    source_system: input.source_system ?? "the_racing_api",
    source_code: input.source_code ?? "",
    source_label: input.source_label ?? null,
    raw_source_value: input.source_code ?? "",
    effective_date: input.effective_date ?? null,
  };
}

function unresolvedResult(
  input: RacingCodeNormalizationInput,
  reason: string,
): RacingCodeNormalizationResult {
  return {
    status: "unresolved",
    blocked_for_ml: true,
    unresolved_source_code_id: "unresolved-1",
    source_system: input.source_system ?? "the_racing_api",
    code_set_key: input.code_set_key ?? "unknown",
    source_code: input.source_code ?? "",
    source_label: input.source_label ?? null,
    context: {
      source_payload_path: input.source_payload_path,
    },
    reason,
    raw_source_value: input.source_code ?? "",
  };
}

function makeNormalizer(options: { unresolved?: AliasKey[] } = {}) {
  return async (
    input: RacingCodeNormalizationInput,
  ): Promise<RacingCodeNormalizationResult> => {
    const key = `${input.code_set_key}:${input.source_code}` as AliasKey;

    if (options.unresolved?.includes(key)) {
      return unresolvedResult(input, "no active alias matched the source code");
    }

    const alias = ALIASES[key];

    if (!alias) {
      return unresolvedResult(input, "no active alias matched the source code");
    }

    return resolvedResult(input, alias);
  };
}

function makeStore(): RaceEntryFactStore & {
  calls: Array<{
    row: RaceEntryFactRow;
    options: { onConflict: string; idempotencyKey: string };
  }>;
} {
  const rows = new Map<string, RaceEntryFactRow>();
  const calls: Array<{
    row: RaceEntryFactRow;
    options: { onConflict: string; idempotencyKey: string };
  }> = [];

  return {
    calls,
    async upsertRaceEntryFact(row, options) {
      calls.push({ row, options });
      rows.set(`${row.provider}:${row.provider_entry_id}:${row.race_date}`, row);

      return {
        id: "33333333-3333-4333-8333-333333333333",
        race_date: row.race_date,
        provider_entry_id: row.provider_entry_id,
      };
    },
  };
}

async function readyWritePlan() {
  const adapterResult = await planTheRacingApiRaceEntryAdaptation(
    makeTheRacingApiRaceEntryFixture(),
    { normalizer: makeNormalizer() },
  );

  assert.ok(adapterResult.write_plan);
  return adapterResult.write_plan;
}

describe("provider race-entry persistence executor", () => {
  it("executes successful normalized write plans against the approved target", async () => {
    const store = makeStore();
    const plan = await readyWritePlan();
    const result = await executeRaceEntryWritePlan(plan, {
      bindings: { raceId: RACE_ID, horseId: HORSE_ID },
      store,
    });

    assert.equal(result.status, "persisted");
    assert.equal(result.wrote, true);
    assert.equal(result.target_table, "race_entries");
    assert.equal(store.calls.length, 1);
    assert.equal(store.calls[0].options.onConflict, "provider,provider_entry_id,race_date");
    assert.equal(store.calls[0].options.idempotencyKey, plan.idempotency_key);
    assert.equal(store.calls[0].row.provider, "the_racing_api");
    assert.equal(store.calls[0].row.status, "entered");
    assert.equal(store.calls[0].row.medication, "lasix");
  });

  it("does not execute blocked normalization plans", async () => {
    const store = makeStore();
    const adapterResult = await planTheRacingApiRaceEntryAdaptation(
      makeTheRacingApiRaceEntryFixture({ race: { type_code: "ZZZ" } }),
      { normalizer: makeNormalizer() },
    );

    const result = await executeRaceEntryWritePlan(adapterResult.write_plan, {
      bindings: { raceId: RACE_ID },
      store,
    });

    assert.equal(result.status, "skipped");
    assert.equal(result.wrote, false);
    assert.equal(store.calls.length, 0);
  });

  it("rejects unknown targets and operations before writing", async () => {
    const store = makeStore();
    const plan = {
      ...(await readyWritePlan()),
      target: "value_calculations",
      operation: "insert",
    } as unknown as ProviderRaceEntryWritePlan;

    const result = await executeRaceEntryWritePlan(plan, {
      bindings: { raceId: RACE_ID },
      store,
    });

    assert.equal(result.status, "rejected");
    assert.equal(result.wrote, false);
    assert.equal(store.calls.length, 0);
    assert.match(result.reason, /target is not allowlisted/);
  });

  it("does not produce or execute value, Opportunity, prediction, wager, or training writes", async () => {
    const store = makeStore();
    const plan = await readyWritePlan();
    const result = await executeRaceEntryWritePlan(plan, {
      bindings: { raceId: RACE_ID },
      store,
    });

    assert.equal(result.status, "persisted");
    assert.deepEqual(plan.prohibited_side_effects, [
      "value_calculations",
      "opportunities",
      "prediction_outputs",
      "wager_recommendations",
      "feature_snapshots",
      "model_training_runs",
    ]);
    assert.equal(store.calls.length, 1);
    assert.equal(
      ["value_calculations", "opportunities", "prediction_outputs"].includes(
        result.target_table,
      ),
      false,
    );
    assert.equal("opportunity_id" in store.calls[0].row, false);
    assert.equal("prediction_output_id" in store.calls[0].row, false);
    assert.equal("value_calculation_id" in store.calls[0].row, false);
    assert.equal("wager_recommendation_id" in store.calls[0].row, false);
    assert.equal("model_training_run_id" in store.calls[0].row, false);
  });

  it("is safe to repeat because it uses deterministic upsert identity", async () => {
    const store = makeStore();
    const plan = await readyWritePlan();
    const context = {
      bindings: { raceId: RACE_ID, horseId: HORSE_ID },
      store,
    };

    const first = await executeRaceEntryWritePlan(plan, context);
    const second = await executeRaceEntryWritePlan(plan, context);

    assert.equal(first.status, "persisted");
    assert.equal(second.status, "persisted");
    assert.equal(store.calls.length, 2);
    assert.equal(store.calls[0].row.provider_entry_id, store.calls[1].row.provider_entry_id);
    assert.equal(store.calls[0].row.race_date, store.calls[1].row.race_date);
    assert.equal(store.calls[0].options.idempotencyKey, store.calls[1].options.idempotencyKey);
  });

  it("rejects plans with missing lineage or canonical bindings", async () => {
    const store = makeStore();
    const plan = {
      ...(await readyWritePlan()),
      source_paths: {
        race_type: "",
        surface: "race.surface_code",
        track_condition: "race.track_condition_code",
        horse_sex: "horse.sex_code",
        horse_color: "horse.color_code",
        medication: "entry.medication_code",
        entry_status: "entry.status_code",
        workout_type: "recent_workout.work_type_code",
      },
    };

    const result = await executeRaceEntryWritePlan(plan, {
      bindings: { raceId: "not-a-uuid" },
      store,
    });

    assert.equal(result.status, "rejected");
    assert.equal(result.wrote, false);
    assert.equal(store.calls.length, 0);
    assert.match(result.reason, /source path missing/);
  });

  it("rejects forbidden write identifiers even if they are attached at runtime", async () => {
    const store = makeStore();
    const plan = {
      ...(await readyWritePlan()),
      value_calculation_id: "44444444-4444-4444-8444-444444444444",
    } as unknown as ProviderRaceEntryWritePlan;

    const result = await executeRaceEntryWritePlan(plan, {
      bindings: { raceId: RACE_ID },
      store,
    });

    assert.equal(result.status, "rejected");
    assert.equal(result.wrote, false);
    assert.equal(store.calls.length, 0);
    assert.match(result.reason, /forbidden write lineage/);
  });

  it("preserves raw and canonical lineage in race-entry metadata", async () => {
    const store = makeStore();
    const plan = await readyWritePlan();
    const result = await executeRaceEntryWritePlan(plan, {
      bindings: { raceId: RACE_ID, horseId: HORSE_ID },
      store,
    });

    assert.equal(result.status, "persisted");
    const metadata = store.calls[0].row.metadata;
    assert.equal(metadata.provider_payload_shape, "the_racing_api_race_entry_v1");
    assert.deepEqual(metadata.provider_identifiers, plan.provider_identifiers);
    assert.deepEqual(metadata.raw_values, plan.raw_values);
    assert.deepEqual(metadata.canonical_values, plan.canonical_values);
    assert.ok(metadata.normalization_results);
    assert.deepEqual(metadata.warnings, plan.warnings);
  });
});
