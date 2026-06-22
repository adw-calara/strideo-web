import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  OPPORTUNITY_FEATURE_CONTRACT_VERSION,
  OPPORTUNITY_FEATURE_SNAPSHOT_SCHEMA_VERSION,
  VALUE_SCORING_CONTRACT_VERSION,
  buildOpportunityFeatureSnapshot,
  featureSnapshotReference,
  validateValueScoringResult,
  type OpportunityFeatureSnapshotInput,
  type ValueScoringResult,
} from "./contracts";

function baseSnapshotInput(
  overrides: Partial<OpportunityFeatureSnapshotInput> = {},
): OpportunityFeatureSnapshotInput {
  return {
    featureContractVersion: OPPORTUNITY_FEATURE_CONTRACT_VERSION,
    snapshotSchemaVersion: OPPORTUNITY_FEATURE_SNAPSHOT_SCHEMA_VERSION,
    opportunity: {
      opportunityId: "opportunity-1",
      opportunityRaceDate: "2026-06-22",
    },
    race: {
      raceId: "race-1",
      raceDate: "2026-06-22",
      provider: "test-provider",
      providerRaceId: "provider-race-1",
      raceNumber: 7,
    },
    entry: {
      raceEntryId: "entry-1",
      providerEntryId: "provider-entry-1",
      horseId: "horse-1",
      horseProviderId: "provider-horse-1",
      horseName: "Contract Runner",
      programNumber: "4",
      postPosition: 4,
    },
    context: {
      trackId: "track-1",
      trackCode: "SAR",
      trackName: "Saratoga",
      surfaceId: null,
      surfaceCode: null,
      surfaceName: null,
      distanceText: null,
      distanceYards: null,
      raceType: null,
      classRating: null,
      conditions: null,
    },
    market: {
      morningLineOdds: "5/1",
      morningLineImpliedProbability: 0.1667,
      latestOddsSnapshotId: null,
      latestOddsImpliedProbability: null,
      marketImpliedProbability: 0.1667,
      marketProbabilitySource: "morning_line",
    },
    lineage: {
      featureSnapshotId: null,
      capturedAt: "2026-06-22T14:00:00.000Z",
      sourceLineageIds: [],
    },
    ...overrides,
  };
}

describe("Opportunity scoring contracts", () => {
  it("marks supported current inputs as partial when future-required lineage is missing", () => {
    const snapshot = buildOpportunityFeatureSnapshot(baseSnapshotInput());

    assert.equal(snapshot.readiness.status, "partial");
    assert.deepEqual(snapshot.readiness.blockingReasons, []);
    assert.ok(
      snapshot.readiness.missingFeatureReasons.some(
        (reason) => reason.key === "feature_snapshot_reference",
      ),
    );
    assert.ok(
      snapshot.readiness.missingFeatureReasons.every(
        (reason) => reason.requirementLevel === "future_required",
      ),
    );
  });

  it("blocks snapshots that lack entry identity instead of inventing a subject", () => {
    const snapshot = buildOpportunityFeatureSnapshot(
      baseSnapshotInput({
        entry: {
          ...baseSnapshotInput().entry,
          raceEntryId: "",
        },
      }),
    );

    assert.equal(snapshot.readiness.status, "blocked");
    assert.ok(
      snapshot.readiness.missingFeatureReasons.some(
        (reason) =>
          reason.key === "entry_identity" &&
          reason.requirementLevel === "required_now",
      ),
    );
    assert.ok(snapshot.readiness.blockingReasons.length > 0);
  });

  it("keeps caller-supplied missing-feature reasons inside readiness", () => {
    const snapshot = buildOpportunityFeatureSnapshot(
      baseSnapshotInput({
        missingFeatureReasons: [
          {
            key: "source_lineage",
            requirementLevel: "future_required",
            reasonCode: "schema_gap",
            message: "Coverage check has not run for this source lineage.",
          },
        ],
      }),
    );

    assert.equal("missingFeatureReasons" in snapshot, false);
    assert.ok(
      snapshot.readiness.missingFeatureReasons.some(
        (reason) => reason.message === "Coverage check has not run for this source lineage.",
      ),
    );
  });

  it("requires measured market input and does not allow entry-count fallback as a value signal", () => {
    const snapshot = buildOpportunityFeatureSnapshot(
      baseSnapshotInput({
        market: {
          morningLineOdds: null,
          morningLineImpliedProbability: null,
          latestOddsSnapshotId: null,
          latestOddsImpliedProbability: null,
          marketImpliedProbability: null,
          marketProbabilitySource: "unavailable",
        },
      }),
    );

    assert.equal(snapshot.readiness.status, "blocked");
    assert.ok(
      snapshot.readiness.missingFeatureReasons.some(
        (reason) => reason.key === "market_odds_input",
      ),
    );
  });

  it("validates blocked scoring results without synthetic probability or value fields", () => {
    const snapshot = buildOpportunityFeatureSnapshot(baseSnapshotInput());
    const result: ValueScoringResult = {
      scoringContractVersion: VALUE_SCORING_CONTRACT_VERSION,
      inputFeatureSnapshot: featureSnapshotReference(snapshot),
      opportunity: snapshot.opportunity,
      generatedAt: "2026-06-22T14:05:00.000Z",
      explanationFactors: [],
      status: "blocked",
      modelKey: "value_overlay_v1",
      modelVersion: null,
      estimatedWinProbability: null,
      marketImpliedProbability: null,
      edgeDelta: null,
      confidence: null,
      valueScore: null,
      blockedReasons: ["Feature snapshot is partial."],
    };

    assert.deepEqual(validateValueScoringResult(result), {
      isValid: true,
      issues: [],
    });
  });

  it("rejects blocked scoring results that carry pretend numeric values", () => {
    const snapshot = buildOpportunityFeatureSnapshot(baseSnapshotInput());
    const result = {
      scoringContractVersion: VALUE_SCORING_CONTRACT_VERSION,
      inputFeatureSnapshot: featureSnapshotReference(snapshot),
      opportunity: snapshot.opportunity,
      generatedAt: "2026-06-22T14:05:00.000Z",
      explanationFactors: [],
      status: "blocked",
      modelKey: "value_overlay_v1",
      modelVersion: null,
      estimatedWinProbability: 0.22,
      marketImpliedProbability: null,
      edgeDelta: null,
      confidence: null,
      valueScore: null,
      blockedReasons: ["Feature snapshot is partial."],
    } as unknown as ValueScoringResult;

    const validation = validateValueScoringResult(result);

    assert.equal(validation.isValid, false);
    assert.ok(
      validation.issues.includes(
        "Blocked scoring results must not include synthetic values.",
      ),
    );
  });

  it("keeps feature contract versioning separate from model runtime versioning", () => {
    const snapshot = buildOpportunityFeatureSnapshot(
      baseSnapshotInput({
        context: {
          ...baseSnapshotInput().context,
          surfaceId: "surface-1",
          surfaceCode: "DIRT",
          surfaceName: "Dirt",
          distanceText: "6f",
          distanceYards: 1320,
          raceType: "Allowance",
          classRating: "AOC",
        },
        lineage: {
          featureSnapshotId: "feature-snapshot-1",
          capturedAt: "2026-06-22T14:00:00.000Z",
          sourceLineageIds: ["source-file-1"],
        },
      }),
    );
    const result: ValueScoringResult = {
      scoringContractVersion: VALUE_SCORING_CONTRACT_VERSION,
      inputFeatureSnapshot: featureSnapshotReference(snapshot),
      opportunity: snapshot.opportunity,
      generatedAt: "2026-06-22T14:05:00.000Z",
      explanationFactors: [
        {
          key: "market_overlay",
          label: "Market overlay",
          direction: "positive",
          summary: "Example contract factor from a real model output.",
        },
      ],
      status: "scored",
      modelKey: "value_overlay_v1",
      modelVersion: "model-version-value-overlay-2026-06-22",
      estimatedWinProbability: 0.22,
      marketImpliedProbability: 0.1667,
      edgeDelta: 0.0533,
      confidence: 71,
      valueScore: 63,
      blockedReasons: [],
    };

    assert.equal(snapshot.readiness.status, "ready");
    assert.notEqual(result.modelVersion, snapshot.featureContractVersion);
    assert.deepEqual(validateValueScoringResult(result), {
      isValid: true,
      issues: [],
    });
  });
});
