import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildProviderRaceEntryReadinessDisplayModel,
  buildUnavailableProviderRaceEntryReadinessDisplayModel,
} from "./provider-race-entry-readiness-core";

function makeReport(overrides = {}) {
  return {
    status: "ready" as const,
    targetProject: "strideo-dev",
    targetRef: "ntxtakbggtljjbalgris",
    workflow: {
      providerIngestionEnabledByDefault: false,
    },
    normalization: {
      warningCount: 0,
      writePlanPresent: true,
    },
    deterministicRowPrecheck: {
      count: 0,
    },
    readyToRunWriteHarness: true,
    blockingReasons: [],
    supabaseOperations: {
      reads: [
        "races",
        "racing_code_sets",
        "racing_code_aliases",
        "racing_code_values",
        "race_entries",
      ],
      writes: [],
    },
    ...overrides,
  };
}

describe("provider race-entry readiness display model", () => {
  it("maps ready read-only reports without introducing write operations", () => {
    const model = buildProviderRaceEntryReadinessDisplayModel(makeReport());

    assert.equal(model.state, "ready");
    assert.equal(model.badgeLabel, "Ready");
    assert.equal(model.targetLabel, "strideo-dev / ntxtakbggtljjbalgris");
    assert.deepEqual(model.writesPlannedOrExecuted, []);
    assert.equal(model.metrics.writePlanPresent, true);
    assert.equal(model.metrics.readyToRunWriteHarness, true);
    assert.equal(model.blockingReasons.length, 0);
  });

  it("maps blocked reports into review notes without enabling ingestion", () => {
    const model = buildProviderRaceEntryReadinessDisplayModel(
      makeReport({
        status: "blocked",
        readyToRunWriteHarness: false,
        blockingReasons: ["Missing Dev race fixture."],
      }),
    );

    assert.equal(model.state, "blocked");
    assert.equal(model.badgeLabel, "Blocked");
    assert.equal(model.metrics.readyToRunWriteHarness, false);
    assert.deepEqual(model.blockingReasons, ["Missing Dev race fixture."]);
    assert.match(model.disabledNotice, /disabled by default/i);
  });

  it("fails closed if a report unexpectedly includes writes or enabled ingestion", () => {
    const model = buildProviderRaceEntryReadinessDisplayModel(
      makeReport({
        workflow: {
          providerIngestionEnabledByDefault: true,
        },
        supabaseOperations: {
          reads: ["races"],
          writes: ["race_entries"],
        },
      }),
    );

    assert.equal(model.state, "blocked");
    assert.deepEqual(model.writesPlannedOrExecuted, ["race_entries"]);
    assert.match(model.blockingReasons.join(" "), /unexpected write operations/);
    assert.match(model.blockingReasons.join(" "), /unexpectedly enabled/);
  });

  it("keeps unavailable non-Dev runtime states free of reads and writes", () => {
    const model = buildUnavailableProviderRaceEntryReadinessDisplayModel(
      "Configured Supabase target is not Strideo Dev.",
    );

    assert.equal(model.state, "unavailable");
    assert.deepEqual(model.readTables, []);
    assert.deepEqual(model.writesPlannedOrExecuted, []);
    assert.deepEqual(model.blockingReasons, [
      "Configured Supabase target is not Strideo Dev.",
    ]);
  });
});
