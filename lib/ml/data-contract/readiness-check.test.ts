import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DATA_REQUIREMENT_KEYS, type DataCapabilityInput } from "./types";
import { checkAllModelReadiness, checkModelReadiness } from "./readiness-check";

function allPresent(): DataCapabilityInput {
  return {
    fields: Object.fromEntries(
      DATA_REQUIREMENT_KEYS.map((key) => [key, "present"]),
    ) as DataCapabilityInput["fields"],
    dependencyReadiness: {
      fundamental_win_probability_v1: "ready",
      market_implied_probability_v1: "ready",
      benter_blended_probability_v1: "ready",
      value_overlay_v1: "ready",
      harville_finish_order_v1: "ready",
    },
  };
}

describe("ML data readiness checker", () => {
  it("blocks a model when required-now fields are missing", () => {
    const result = checkModelReadiness("fundamental_win_probability_v1", {
      fields: {
        race_identity: "present",
      },
    });

    assert.equal(result.status, "blocked");
    assert.ok(result.requiredFieldsMissing.includes("race_entries"));
    assert.ok(result.blockingReasons.length > 0);
  });

  it("returns partial when required-now fields exist but training and production fields are missing", () => {
    const result = checkModelReadiness("market_implied_probability_v1", {
      fields: {
        race_identity: "present",
        race_entries: "present",
        horse_identity: "present",
        morning_line_odds: "present",
        live_odds_snapshots: "present",
        feature_snapshots: "present",
        model_versions: "present",
        prediction_outputs: "present",
      },
    });

    assert.equal(result.status, "partial");
    assert.equal(result.blockingReasons.length, 0);
    assert.ok(result.requiredFieldsMissing.includes("final_closing_odds_semantics"));
  });

  it("returns ready when all required fields are present", () => {
    const result = checkModelReadiness(
      "fundamental_win_probability_v1",
      allPresent(),
    );

    assert.equal(result.status, "ready");
    assert.deepEqual(result.requiredFieldsMissing, []);
    assert.equal(result.opportunityLinkageSatisfied, true);
  });

  it("blocks benter blending until both fundamental and market components are at least partial", () => {
    const result = checkModelReadiness("benter_blended_probability_v1", {
      ...allPresent(),
      dependencyReadiness: {
        fundamental_win_probability_v1: "blocked",
        market_implied_probability_v1: "partial",
      },
    });

    assert.equal(result.status, "blocked");
    assert.ok(
      result.blockingReasons.some((reason) =>
        reason.includes("fundamental_win_probability_v1"),
      ),
    );
  });

  it("blocks value overlay without value calculation lineage and Opportunity score linkage", () => {
    const input = allPresent();
    input.fields.value_calculations = "missing";
    input.fields.opportunity_score_linkage = "missing";

    const result = checkModelReadiness("value_overlay_v1", input);

    assert.equal(result.status, "blocked");
    assert.ok(result.requiredFieldsMissing.includes("value_calculations"));
    assert.ok(result.requiredFieldsMissing.includes("opportunity_score_linkage"));
  });

  it("blocks Harville finish-order readiness without calibrated probabilities and finish-order/payout support", () => {
    const input = allPresent();
    input.fields.calibrated_win_probabilities = "missing";
    input.fields.finish_order_probability_support = "missing";
    input.fields.exotic_pools = "missing";
    input.fields.payouts = "missing";

    const result = checkModelReadiness("harville_finish_order_v1", input);

    assert.equal(result.status, "blocked");
    assert.ok(result.requiredFieldsMissing.includes("calibrated_win_probabilities"));
    assert.ok(result.requiredFieldsMissing.includes("finish_order_probability_support"));
  });

  it("enforces Opportunity linkage for Opportunity-producing components", () => {
    const input = allPresent();
    input.fields.opportunity_attribution = "missing";

    const result = checkModelReadiness("value_overlay_v1", input);

    assert.equal(result.status, "blocked");
    assert.equal(result.opportunityLinkageSatisfied, false);
  });

  it("computes dependent readiness deterministically across all model components", () => {
    const input = allPresent();
    input.fields.horse_historical_form = "missing";
    input.fields.final_closing_odds_semantics = "missing";

    const results = checkAllModelReadiness(input);

    assert.equal(results.fundamental_win_probability_v1.status, "partial");
    assert.equal(results.market_implied_probability_v1.status, "partial");
    assert.equal(results.benter_blended_probability_v1.status, "partial");
  });
});
