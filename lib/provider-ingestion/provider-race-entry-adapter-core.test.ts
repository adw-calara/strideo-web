import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  JsonObject,
  RacingCodeNormalizationInput,
  RacingCodeNormalizationResult,
} from "@/lib/racing-codes/normalization-core";
import { makeTheRacingApiRaceEntryFixture } from "./fixtures/the-racing-api-race-entry.fixture";
import {
  THE_RACING_API_RACE_ENTRY_PAYLOAD_SHAPE,
  adaptTheRacingApiRaceEntryPayload,
  planTheRacingApiRaceEntryAdaptation,
} from "./provider-race-entry-adapter-core";

type AliasKey = `${string}:${string}`;

const CODE_SET_IDS: Record<string, string> = {
  race_type: "set-race-type",
  surface: "set-surface",
  track_condition: "set-track-condition",
  horse_sex: "set-horse-sex",
  horse_color: "set-horse-color",
  medication: "set-medication",
  entry_status: "set-entry-status",
  workout_type: "set-workout-type",
};

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
  "workout_type:g": {
    canonicalCode: "gate",
    canonicalLabel: "Gate",
    normalizedValue: { feature_key: "workout_type_gate" },
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
    code_set_id: CODE_SET_IDS[codeSetKey] ?? `set-${codeSetKey}`,
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
      raw_source_value: input.source_code,
    },
    reason,
    raw_source_value: input.source_code ?? "",
  };
}

function makeNormalizer(options: { ambiguous?: AliasKey[] } = {}) {
  const calls: RacingCodeNormalizationInput[] = [];
  const normalizer = async (
    input: RacingCodeNormalizationInput,
  ): Promise<RacingCodeNormalizationResult> => {
    calls.push(input);
    const key = `${input.code_set_key}:${input.source_code}` as AliasKey;

    if (options.ambiguous?.includes(key)) {
      return unresolvedResult(input, "multiple active aliases matched the source code");
    }

    const alias = ALIASES[key];

    if (!alias) {
      return unresolvedResult(input, "no active alias matched the source code");
    }

    return resolvedResult(input, alias);
  };

  return { calls, normalizer };
}

describe("The Racing API race-entry provider adapter", () => {
  it("adapts the provider payload into the existing race-entry parser shape", () => {
    const payload = makeTheRacingApiRaceEntryFixture();
    const parserInput = adaptTheRacingApiRaceEntryPayload(payload);

    assert.equal(parserInput.provider, "the_racing_api");
    assert.equal(parserInput.race?.providerRaceId, payload.race.id);
    assert.equal(parserInput.race?.classCode, payload.race.type_code);
    assert.equal(parserInput.race?.surfaceCode, payload.race.surface_code);
    assert.equal(parserInput.entry?.providerEntryId, payload.entry.id);
    assert.equal(parserInput.entry?.statusCode, payload.entry.status_code);
    assert.equal(parserInput.horse?.providerHorseId, payload.horse.id);
    assert.equal(parserInput.horse?.sexCode, payload.horse.sex_code);
    assert.equal(parserInput.recentWorkout?.workTypeCode, "B");
  });

  it("returns a deterministic write plan only when required normalization passes", async () => {
    const { calls, normalizer } = makeNormalizer();
    const payload = makeTheRacingApiRaceEntryFixture();
    const result = await planTheRacingApiRaceEntryAdaptation(payload, {
      normalizer,
    });

    assert.equal(result.blocked_for_ml, false);
    assert.equal(result.metadata.persistence_status, "planned");
    assert.equal(result.metadata.writes_executed, false);
    assert.equal(result.write_plan?.operation, "upsert_plan");
    assert.equal(
      result.write_plan?.idempotency_key,
      "the_racing_api:tra-race-20260616-bel-7:tra-entry-20260616-bel-7-3:the_racing_api_race_entry_v1",
    );
    assert.equal(result.write_plan?.canonical_values.race_type, "maiden_special_weight");
    assert.equal(result.write_plan?.canonical_labels.surface, "Dirt");
    assert.equal(calls.length, 8);
  });

  it("blocks the write plan when a required shorthand value is unknown", async () => {
    const { normalizer } = makeNormalizer();
    const result = await planTheRacingApiRaceEntryAdaptation(
      makeTheRacingApiRaceEntryFixture({
        race: { type_code: "ZZZ" },
      }),
      { normalizer },
    );

    assert.equal(result.blocked_for_ml, true);
    assert.equal(result.metadata.persistence_status, "blocked");
    assert.equal(result.write_plan, null);
    assert.ok(result.blocking_reasons.some((reason) => reason.includes("ZZZ")));
  });

  it("blocks the write plan when a required shorthand value is ambiguous", async () => {
    const { normalizer } = makeNormalizer({ ambiguous: ["race_type:MSW"] });
    const result = await planTheRacingApiRaceEntryAdaptation(
      makeTheRacingApiRaceEntryFixture(),
      { normalizer },
    );

    assert.equal(result.blocked_for_ml, true);
    assert.equal(result.write_plan, null);
    assert.ok(
      result.blocking_reasons.some((reason) =>
        reason.includes("multiple active aliases"),
      ),
    );
  });

  it("warns without blocking when optional provider fields are absent", async () => {
    const { normalizer } = makeNormalizer();
    const result = await planTheRacingApiRaceEntryAdaptation(
      makeTheRacingApiRaceEntryFixture({
        race: { track_condition_code: null },
        entry: { medication_code: null },
        recent_workout: null,
      }),
      { normalizer },
    );

    assert.equal(result.blocked_for_ml, false);
    assert.ok(result.write_plan);
    assert.ok(result.warnings.includes("track_condition: optional shorthand not supplied"));
    assert.ok(result.warnings.includes("medication: optional shorthand not supplied"));
    assert.ok(result.warnings.includes("workout_type: optional shorthand not supplied"));
  });

  it("blocks the write plan when required provider fields are missing", async () => {
    const { calls, normalizer } = makeNormalizer();
    const result = await planTheRacingApiRaceEntryAdaptation(
      makeTheRacingApiRaceEntryFixture({
        entry: { status_code: null },
      }),
      { normalizer },
    );

    assert.equal(result.blocked_for_ml, true);
    assert.equal(result.write_plan, null);
    assert.ok(result.blocking_reasons.includes("entry_status: missing required shorthand"));
    assert.ok(!calls.some((call) => call.code_set_key === "entry_status"));
  });

  it("preserves raw provider payload, raw shorthand values, and source paths", async () => {
    const { normalizer } = makeNormalizer();
    const payload = makeTheRacingApiRaceEntryFixture();
    const result = await planTheRacingApiRaceEntryAdaptation(payload, {
      normalizer,
    });

    assert.equal(result.raw_provider_payload, payload);
    assert.equal(result.write_plan?.raw_provider_payload, payload);
    assert.equal(result.write_plan?.raw_values.horse_color, "B");
    assert.equal(result.source_paths.race_type, "race.type_code");
    assert.equal(result.source_paths.entry_status, "entry.status_code");
    assert.equal(result.write_plan?.source_paths.workout_type, "recent_workout.work_type_code");
    assert.equal(result.provider_payload_shape, THE_RACING_API_RACE_ENTRY_PAYLOAD_SHAPE);
  });

  it("does not create an ML-ready write plan while blocked", async () => {
    const { normalizer } = makeNormalizer();
    const result = await planTheRacingApiRaceEntryAdaptation(
      makeTheRacingApiRaceEntryFixture({
        race: { surface_code: "??" },
      }),
      { normalizer },
    );

    assert.equal(result.parser_result.metadata.ml_feature_materialization_status, "blocked");
    assert.equal(result.write_plan, null);
  });

  it("keeps Opportunities, predictions, and wagers out of the write plan", async () => {
    const { normalizer } = makeNormalizer();
    const result = await planTheRacingApiRaceEntryAdaptation(
      makeTheRacingApiRaceEntryFixture(),
      { normalizer },
    );
    const plan = result.write_plan;

    assert.ok(plan);
    assert.equal(plan.target, "race_entry_source_fact");
    assert.deepEqual(plan.prohibited_side_effects, [
      "value_calculations",
      "opportunities",
      "prediction_outputs",
      "wager_recommendations",
      "feature_snapshots",
      "model_training_runs",
      "strategy_marketplace",
      "bankroll",
      "bet_sheets",
    ]);
    assert.equal(plan.normalization_results.entry_status?.status, "resolved");
    assert.equal("opportunity_id" in plan, false);
    assert.equal("prediction_output_id" in plan, false);
    assert.equal("value_calculation_id" in plan, false);
    assert.equal("wager_recommendation_id" in plan, false);
  });

  it("keeps context-sensitive shorthand scoped by code set", async () => {
    const { calls, normalizer } = makeNormalizer();
    const result = await planTheRacingApiRaceEntryAdaptation(
      makeTheRacingApiRaceEntryFixture({
        recent_workout: { work_type_code: "g" },
      }),
      { normalizer },
    );

    assert.equal(result.write_plan?.canonical_values.horse_sex, "gelding");
    assert.equal(result.write_plan?.canonical_values.workout_type, "gate");
    assert.ok(
      calls.some(
        (call) => call.code_set_key === "horse_sex" && call.source_code === "g",
      ),
    );
    assert.ok(
      calls.some(
        (call) => call.code_set_key === "workout_type" && call.source_code === "g",
      ),
    );
  });
});
