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
import { inspectRaceEntryWritePlanReadiness } from "./provider-race-entry-persistence-core";

type AliasKey = `${string}:${string}`;

const RACE_ID = "11111111-1111-4111-8111-111111111111";

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

function makeNormalizer(options: { unresolved?: AliasKey[] } = {}) {
  return async (
    input: RacingCodeNormalizationInput,
  ): Promise<RacingCodeNormalizationResult> => {
    const key = `${input.code_set_key}:${input.source_code}` as AliasKey;

    if (options.unresolved?.includes(key) || !ALIASES[key]) {
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
        reason: "no active alias matched the source code",
        raw_source_value: input.source_code ?? "",
      };
    }

    const alias = ALIASES[key];

    return {
      status: "resolved",
      blocked_for_ml: false,
      alias_id: `alias-${input.code_set_key}-${input.source_code}`,
      code_set_id: `set-${input.code_set_key}`,
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

describe("provider race-entry persistence readiness inspection", () => {
  it("reports the approved race_entries upsert without executing a store write", async () => {
    const plan = await readyWritePlan();
    const result = inspectRaceEntryWritePlanReadiness(plan, {
      raceId: RACE_ID,
      raceDate: "2026-06-08",
    });

    assert.equal(result.status, "ready");
    if (result.status !== "ready") {
      throw new Error(`Expected ready readiness result, received ${result.status}.`);
    }
    assert.equal(result.wrote, false);
    assert.equal(result.target_table, "race_entries");
    assert.equal(result.idempotency_key, plan.idempotency_key);
    assert.equal(result.upsert.operation, "upsert");
    assert.equal(result.upsert.on_conflict, "provider,provider_entry_id,race_date");
    assert.equal(result.row.provider, "the_racing_api");
    assert.equal(result.row.race_id, RACE_ID);
    assert.equal(result.row.race_date, "2026-06-08");
    assert.equal(result.row.status, "entered");
    assert.equal(result.row.metadata.adapter_idempotency_key, plan.idempotency_key);
  });

  it("fails closed when normalization does not produce a writable plan", async () => {
    const adapterResult = await planTheRacingApiRaceEntryAdaptation(
      makeTheRacingApiRaceEntryFixture({ race: { type_code: "ZZZ" } }),
      { normalizer: makeNormalizer() },
    );
    const result = inspectRaceEntryWritePlanReadiness(adapterResult.write_plan, {
      raceId: RACE_ID,
      raceDate: "2026-06-08",
    });

    assert.equal(result.status, "skipped");
    if (result.status === "ready") {
      throw new Error("Expected blocked readiness result.");
    }
    assert.equal(result.wrote, false);
    assert.equal(result.reason, "blocked or missing write plan");
  });

  it("rejects forbidden Opportunity or wager lineage in readiness mode", async () => {
    const plan = {
      ...(await readyWritePlan()),
      opportunity_id: "opportunity-1",
      wager_recommendation_id: "wager-1",
    } as unknown as ProviderRaceEntryWritePlan;
    const result = inspectRaceEntryWritePlanReadiness(plan, {
      raceId: RACE_ID,
      raceDate: "2026-06-08",
    });

    assert.equal(result.status, "rejected");
    if (result.status === "ready") {
      throw new Error("Expected rejected readiness result.");
    }
    assert.equal(result.wrote, false);
    assert.match(result.reason, /opportunity_id/);
    assert.match(result.reason, /wager_recommendation_id/);
  });
});
