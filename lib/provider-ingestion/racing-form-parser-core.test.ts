import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  JsonObject,
  RacingCodeNormalizationInput,
  RacingCodeNormalizationResult,
} from "@/lib/racing-codes/normalization-core";
import {
  parseProviderRaceEntryShorthandSegment,
  type ProviderRaceEntryShorthandPayload,
} from "./racing-form-parser-core";

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
  "horse_sex:f": {
    canonicalCode: "filly",
    canonicalLabel: "Filly",
    normalizedValue: { feature_key: "horse_sex_filly" },
  },
  "horse_color:B": {
    canonicalCode: "bay",
    canonicalLabel: "Bay",
    normalizedValue: { feature_key: "horse_color_bay" },
  },
  "horse_color:CH": {
    canonicalCode: "chestnut",
    canonicalLabel: "Chestnut",
    normalizedValue: { feature_key: "horse_color_chestnut" },
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

function basePayload(
  overrides: Partial<ProviderRaceEntryShorthandPayload> = {},
): ProviderRaceEntryShorthandPayload {
  return {
    provider: "equibase",
    race: {
      providerRaceId: "eqb-race-1",
      raceDate: "2026-06-16",
      classCode: "MSW",
      surfaceCode: "D",
      trackConditionCode: "FT",
      ...overrides.race,
    },
    entry: {
      providerEntryId: "eqb-entry-1",
      statusCode: "RUN",
      medicationCode: "L",
      ...overrides.entry,
    },
    horse: {
      providerHorseId: "eqb-horse-1",
      sexCode: "g",
      colorCode: "B",
      ...overrides.horse,
    },
    recentWorkout: {
      workTypeCode: "B",
      ...overrides.recentWorkout,
    },
  };
}

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
    source_system: input.source_system ?? "equibase",
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
    source_system: input.source_system ?? "equibase",
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

describe("provider race-entry shorthand parser", () => {
  it("returns raw and normalized values when all supplied shorthand resolves", async () => {
    const { calls, normalizer } = makeNormalizer();
    const result = await parseProviderRaceEntryShorthandSegment(basePayload(), {
      sourceSystem: "equibase",
      normalizer,
    });

    assert.equal(result.blocked_for_ml, false);
    assert.equal(result.metadata.ml_feature_materialization_status, "ready");
    assert.equal(result.raw.horse_color, "B");
    assert.equal(result.normalized.race_type?.canonical_label, "Maiden Special Weight");
    assert.equal(result.normalized.horse_color?.canonical_label, "Bay");
    assert.equal(result.normalized.workout_type?.canonical_label, "Breezing");
    assert.equal(calls.length, 8);
    assert.ok(
      calls.every((call) => call.source_system === "equibase" && call.source_code),
    );
  });

  it("blocks ML materialization and preserves raw value when shorthand is unknown", async () => {
    const { normalizer } = makeNormalizer();
    const result = await parseProviderRaceEntryShorthandSegment(
      basePayload({ race: { classCode: "ZZZ" } }),
      {
        sourceSystem: "equibase",
        normalizer,
      },
    );

    assert.equal(result.blocked_for_ml, true);
    assert.equal(result.metadata.ml_feature_materialization_status, "blocked");
    assert.equal(result.raw.race_type, "ZZZ");
    assert.equal(result.unresolved_codes.length, 1);
    assert.equal(result.unresolved_codes[0].status, "unresolved");
    assert.ok(result.blocking_reasons.some((reason) => reason.includes("ZZZ")));
  });

  it("blocks ambiguous shorthand", async () => {
    const { normalizer } = makeNormalizer({ ambiguous: ["race_type:MSW"] });
    const result = await parseProviderRaceEntryShorthandSegment(basePayload(), {
      sourceSystem: "equibase",
      normalizer,
    });

    assert.equal(result.blocked_for_ml, true);
    assert.equal(result.normalization_results.race_type?.status, "unresolved");
    assert.ok(
      result.blocking_reasons.some((reason) =>
        reason.includes("multiple active aliases"),
      ),
    );
  });

  it("keeps B scoped as Bay for horse color and Breezing for workout type", async () => {
    const { calls, normalizer } = makeNormalizer();
    const result = await parseProviderRaceEntryShorthandSegment(basePayload(), {
      sourceSystem: "equibase",
      normalizer,
    });

    assert.equal(result.normalized.horse_color?.canonical_label, "Bay");
    assert.equal(result.normalized.workout_type?.canonical_label, "Breezing");
    assert.ok(
      calls.some(
        (call) => call.code_set_key === "horse_color" && call.source_code === "B",
      ),
    );
    assert.ok(
      calls.some(
        (call) => call.code_set_key === "workout_type" && call.source_code === "B",
      ),
    );
  });

  it("keeps g scoped as Gelding for horse sex and Gate for workout type", async () => {
    const { calls, normalizer } = makeNormalizer();
    const result = await parseProviderRaceEntryShorthandSegment(
      basePayload({ recentWorkout: { workTypeCode: "g" } }),
      {
        sourceSystem: "equibase",
        normalizer,
      },
    );

    assert.equal(result.normalized.horse_sex?.canonical_label, "Gelding");
    assert.equal(result.normalized.workout_type?.canonical_label, "Gate");
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

  it("does not block when optional shorthand is missing", async () => {
    const { normalizer } = makeNormalizer();
    const result = await parseProviderRaceEntryShorthandSegment(
      basePayload({
        race: { trackConditionCode: null },
        entry: { medicationCode: null },
        recentWorkout: { workTypeCode: null },
      }),
      {
        sourceSystem: "equibase",
        normalizer,
      },
    );

    assert.equal(result.blocked_for_ml, false);
    assert.ok(result.warnings.includes("track_condition: optional shorthand not supplied"));
    assert.ok(result.warnings.includes("medication: optional shorthand not supplied"));
    assert.ok(result.warnings.includes("workout_type: optional shorthand not supplied"));
  });

  it("blocks when required shorthand is missing", async () => {
    const { calls, normalizer } = makeNormalizer();
    const result = await parseProviderRaceEntryShorthandSegment(
      basePayload({ entry: { statusCode: null } }),
      {
        sourceSystem: "equibase",
        normalizer,
      },
    );

    assert.equal(result.blocked_for_ml, true);
    assert.equal(result.metadata.ml_feature_materialization_status, "blocked");
    assert.ok(result.blocking_reasons.includes("entry_status: missing required shorthand"));
    assert.ok(!calls.some((call) => call.code_set_key === "entry_status"));
  });
});
