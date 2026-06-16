import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  classifyRacingCodeAliases,
  shouldBlockMlFeature,
  type RacingCodeNormalizationInput,
  type ResolvedRacingCodeAlias,
} from "./normalization-core";

function alias(
  overrides: Partial<ResolvedRacingCodeAlias> = {},
): ResolvedRacingCodeAlias {
  return {
    alias_id: "alias-1",
    code_set_id: "set-1",
    code_value_id: "value-1",
    canonical_code: "maiden_special_weight",
    canonical_label: "Maiden Special Weight",
    normalized_value: { feature_key: "race_type_maiden_special_weight" },
    source_system: "equibase",
    source_code: "MSW",
    source_label: "MSW",
    effective_from: null,
    effective_to: null,
    ...overrides,
  };
}

function input(
  overrides: Partial<RacingCodeNormalizationInput> = {},
): RacingCodeNormalizationInput {
  return {
    source_system: "equibase",
    code_set_key: "race_type",
    source_code: "MSW",
    source_label: "MSW",
    entity_type: "race",
    source_payload_path: "race.type",
    ...overrides,
  };
}

describe("racing-code normalization core", () => {
  it("returns canonical values for a resolved alias", () => {
    const result = classifyRacingCodeAliases(input(), [alias()]);

    assert.equal(result.status, "valid");
    assert.equal(result.result.status, "resolved");
    assert.equal(result.result.blocked_for_ml, false);
    assert.equal(result.result.canonical_code, "maiden_special_weight");
    assert.equal(result.result.raw_source_value, "MSW");
    assert.deepEqual(result.result.normalized_value, {
      feature_key: "race_type_maiden_special_weight",
    });
  });

  it("blocks ML feature use when an alias is unresolved", () => {
    const result = classifyRacingCodeAliases(input({ source_code: "XYZ" }), []);

    assert.equal(result.status, "valid");
    assert.equal(result.result.status, "unresolved");
    assert.equal(result.result.blocked_for_ml, true);
    assert.equal(shouldBlockMlFeature(result.result), true);
    assert.equal(result.result.raw_source_value, "XYZ");
  });

  it("blocks ambiguous alias matches", () => {
    const result = classifyRacingCodeAliases(input(), [
      alias({ alias_id: "alias-1", code_value_id: "value-1" }),
      alias({ alias_id: "alias-2", code_value_id: "value-2" }),
    ]);

    assert.equal(result.status, "valid");
    assert.equal(result.result.status, "unresolved");
    assert.equal(result.result.blocked_for_ml, true);
    assert.equal(result.result.reason, "multiple active aliases matched the source code");
    assert.deepEqual(result.result.context.ambiguous_alias_ids, [
      "alias-1",
      "alias-2",
    ]);
  });

  it("handles missing source code as a safe blocked result", () => {
    const result = classifyRacingCodeAliases(input({ source_code: "   " }), []);

    assert.equal(result.status, "invalid");
    assert.equal(result.result.status, "invalid");
    assert.equal(result.result.blocked_for_ml, true);
    assert.equal(result.result.reason, "source_code is required");
  });

  it("keeps B scoped separately for horse color and workout type", () => {
    const horseColor = classifyRacingCodeAliases(
      input({ code_set_key: "horse_color", source_code: "B" }),
      [
        alias({
          code_set_id: "horse-color-set",
          code_value_id: "bay-value",
          canonical_code: "bay",
          canonical_label: "Bay",
          source_code: "B",
          normalized_value: { feature_key: "horse_color_bay" },
        }),
      ],
    );
    const workoutType = classifyRacingCodeAliases(
      input({ code_set_key: "workout_type", source_code: "B" }),
      [
        alias({
          code_set_id: "workout-type-set",
          code_value_id: "breezing-value",
          canonical_code: "breezing",
          canonical_label: "Breezing",
          source_code: "B",
          normalized_value: { feature_key: "workout_type_breezing" },
        }),
      ],
    );

    assert.equal(horseColor.status, "valid");
    assert.equal(horseColor.result.status, "resolved");
    assert.equal(horseColor.result.canonical_label, "Bay");
    assert.equal(workoutType.status, "valid");
    assert.equal(workoutType.result.status, "resolved");
    assert.equal(workoutType.result.canonical_label, "Breezing");
  });

  it("keeps g scoped separately for horse sex and workout type", () => {
    const horseSex = classifyRacingCodeAliases(
      input({ code_set_key: "horse_sex", source_code: "g" }),
      [
        alias({
          code_set_id: "horse-sex-set",
          code_value_id: "gelding-value",
          canonical_code: "gelding",
          canonical_label: "Gelding",
          source_code: "g",
          normalized_value: { feature_key: "horse_sex_gelding" },
        }),
      ],
    );
    const workoutType = classifyRacingCodeAliases(
      input({ code_set_key: "workout_type", source_code: "g" }),
      [
        alias({
          code_set_id: "workout-type-set",
          code_value_id: "gate-value",
          canonical_code: "gate",
          canonical_label: "Gate",
          source_code: "g",
          normalized_value: { feature_key: "workout_type_gate" },
        }),
      ],
    );

    assert.equal(horseSex.status, "valid");
    assert.equal(horseSex.result.status, "resolved");
    assert.equal(horseSex.result.canonical_label, "Gelding");
    assert.equal(workoutType.status, "valid");
    assert.equal(workoutType.result.status, "resolved");
    assert.equal(workoutType.result.canonical_label, "Gate");
  });
});
