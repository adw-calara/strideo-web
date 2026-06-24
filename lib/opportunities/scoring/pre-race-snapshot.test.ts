import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { VALUE_SCORING_CONTRACT_VERSION } from "./contracts";
import {
  buildPreRaceOpportunityFeatureSnapshot,
  type PreRaceFeatureSnapshotBuilderInput,
  type PreRaceOddsSnapshotInput,
} from "./pre-race-snapshot";

function baseInput(
  overrides: Partial<PreRaceFeatureSnapshotBuilderInput> = {},
): PreRaceFeatureSnapshotBuilderInput {
  return {
    capturedAt: "2026-06-22T15:00:00.000Z",
    sourceLineageIds: ["race:race-1", "entry:entry-1", "odds:odds-early"],
    opportunity: {
      opportunityId: "opportunity-1",
      opportunityRaceDate: "2026-06-22",
    },
    race: {
      id: "race-1",
      raceDate: "2026-06-22",
      provider: "test-provider",
      providerRaceId: "provider-race-1",
      raceNumber: 7,
      scheduledAt: "2026-06-22T18:00:00.000Z",
      trackId: "track-1",
      trackCode: "SAR",
      trackName: "Saratoga",
      surfaceId: "surface-1",
      surfaceCode: "DIRT",
      surfaceName: "Dirt",
      distanceText: "6f",
      distanceYards: 1320,
      raceType: "Allowance",
      classRating: "AOC",
      conditions: "Fillies and mares",
    },
    entry: {
      id: "entry-1",
      raceId: "race-1",
      raceDate: "2026-06-22",
      providerEntryId: "provider-entry-1",
      horseId: "horse-1",
      horseProviderId: "provider-horse-1",
      horseName: "Contract Runner",
      programNumber: "4",
      postPosition: 4,
      morningLineOdds: "5/1",
    },
    oddsSnapshots: [
      odds({
        id: "odds-early",
        snapshotAt: "2026-06-22T17:30:00.000Z",
        impliedProbability: 0.2,
        sequenceNumber: 1,
      }),
    ],
    ...overrides,
  };
}

function odds(
  overrides: Partial<PreRaceOddsSnapshotInput> = {},
): PreRaceOddsSnapshotInput {
  return {
    id: "odds-1",
    raceId: "race-1",
    raceDate: "2026-06-22",
    raceEntryId: "entry-1",
    poolType: "win",
    oddsFractional: null,
    oddsDecimal: null,
    impliedProbability: 0.2,
    snapshotAt: "2026-06-22T17:30:00.000Z",
    sequenceNumber: null,
    ...overrides,
  };
}

describe("pre-race Opportunity feature snapshot builder", () => {
  it("builds a deterministic in-memory snapshot from available pre-race inputs", () => {
    const first = buildPreRaceOpportunityFeatureSnapshot(baseInput());
    const second = buildPreRaceOpportunityFeatureSnapshot(baseInput());

    assert.deepEqual(first, second);
    assert.equal(first.snapshot.race.raceId, "race-1");
    assert.equal(first.snapshot.entry.raceEntryId, "entry-1");
    assert.equal(first.snapshot.market.latestOddsSnapshotId, "odds-early");
    assert.equal(first.snapshot.market.marketImpliedProbability, 0.2);
    assert.equal(first.snapshot.market.marketProbabilitySource, "latest_odds");
    assert.equal(first.audit.cutoffSource, "race_scheduled_at");
    assert.equal(first.audit.persistence.wroteFeatureSnapshot, false);
    assert.equal(first.audit.persistence.wrotePredictionOutput, false);
    assert.equal(first.audit.persistence.wroteScore, false);
    assert.equal(first.audit.persistence.wroteWager, false);
    assert.equal("modelVersion" in first.snapshot, false);
  });

  it("excludes post-race odds and falls back to trusted morning line", () => {
    const result = buildPreRaceOpportunityFeatureSnapshot(
      baseInput({
        oddsSnapshots: [
          odds({
            id: "odds-post",
            snapshotAt: "2026-06-22T18:00:00.000Z",
            impliedProbability: 0.4,
          }),
        ],
      }),
    );

    assert.equal(result.snapshot.market.latestOddsSnapshotId, null);
    assert.equal(result.snapshot.market.marketProbabilitySource, "morning_line");
    assert.equal(result.snapshot.market.marketImpliedProbability, 1 / 6);
    assert.ok(
      result.audit.excludedInputs.some(
        (input) =>
          input.sourceId === "odds-post" &&
          input.reasonCode === "post_race_timing",
      ),
    );
    assert.ok(
      result.snapshot.readiness.missingFeatureReasons.some(
        (reason) =>
          reason.key === "market_odds_input" &&
          reason.reasonCode === "leakage_risk",
      ),
    );
  });

  it("blocks readiness when neither pre-race odds nor morning line are available", () => {
    const result = buildPreRaceOpportunityFeatureSnapshot(
      baseInput({
        entry: {
          ...baseInput().entry,
          morningLineOdds: null,
        },
        oddsSnapshots: [
          odds({
            id: "odds-post",
            snapshotAt: "2026-06-22T18:01:00.000Z",
          }),
        ],
      }),
    );

    assert.equal(result.snapshot.readiness.status, "blocked");
    assert.equal(result.snapshot.market.marketProbabilitySource, "unavailable");
    assert.equal(result.snapshot.market.marketImpliedProbability, null);
    assert.ok(
      result.snapshot.readiness.blockingReasons.some((reason) =>
        reason.includes("measured market input"),
      ),
    );
  });

  it("excludes live odds when the pre-race cutoff is ambiguous", () => {
    const result = buildPreRaceOpportunityFeatureSnapshot(
      baseInput({
        race: {
          ...baseInput().race,
          scheduledAt: null,
        },
        oddsSnapshots: [
          odds({
            id: "odds-without-cutoff",
            snapshotAt: "2026-06-22T17:30:00.000Z",
          }),
        ],
      }),
    );

    assert.equal(result.audit.cutoffAt, null);
    assert.equal(result.audit.cutoffSource, "unavailable");
    assert.equal(result.snapshot.market.latestOddsSnapshotId, null);
    assert.equal(result.snapshot.market.marketProbabilitySource, "morning_line");
    assert.ok(
      result.audit.excludedInputs.some(
        (input) =>
          input.sourceId === "odds-without-cutoff" &&
          input.reasonCode === "ambiguous_cutoff",
      ),
    );
  });

  it("uses an explicit trusted pre-race cutoff when supplied", () => {
    const result = buildPreRaceOpportunityFeatureSnapshot(
      baseInput({
        trustedPreRaceCutoffAt: "2026-06-22T17:45:00.000Z",
        oddsSnapshots: [
          odds({
            id: "odds-before-cutoff",
            snapshotAt: "2026-06-22T17:44:00.000Z",
            impliedProbability: null,
            oddsDecimal: 5,
          }),
          odds({
            id: "odds-after-cutoff",
            snapshotAt: "2026-06-22T17:46:00.000Z",
            impliedProbability: 0.35,
          }),
        ],
      }),
    );

    assert.equal(result.audit.cutoffSource, "trusted_cutoff");
    assert.equal(result.audit.usedOddsSnapshotId, "odds-before-cutoff");
    assert.equal(result.snapshot.market.marketImpliedProbability, 0.2);
    assert.ok(
      result.audit.excludedInputs.some(
        (input) => input.sourceId === "odds-after-cutoff",
      ),
    );
  });

  it("records forbidden result, payout, and settlement inputs as excluded leakage", () => {
    const result = buildPreRaceOpportunityFeatureSnapshot(
      baseInput({
        forbiddenInputs: [
          { key: "result_entries.finish_position", source: "result_entry" },
          { key: "payout_win", source: "payout" },
          { key: "settlement_status", source: "settlement" },
        ],
      }),
    );

    assert.deepEqual(
      result.audit.excludedInputs
        .filter((input) => input.reasonCode === "result_or_outcome_source")
        .map((input) => input.key),
      ["result_entries.finish_position", "payout_win", "settlement_status"],
    );
    assert.equal(JSON.stringify(result.snapshot).includes("finish_position"), false);
    assert.equal(JSON.stringify(result.snapshot).includes("payout_win"), false);
    assert.equal(JSON.stringify(result.snapshot).includes("settlement_status"), false);
  });

  it("does not create prediction, scoring, or wagering output", () => {
    const result = buildPreRaceOpportunityFeatureSnapshot(baseInput());
    const serialized = JSON.stringify(result);

    assert.equal(serialized.includes(VALUE_SCORING_CONTRACT_VERSION), false);
    assert.equal(serialized.includes("estimatedWinProbability"), false);
    assert.equal(serialized.includes("edgeDelta"), false);
    assert.equal(serialized.includes("valueScore"), false);
    assert.deepEqual(result.audit.persistence, {
      wroteFeatureSnapshot: false,
      wrotePredictionOutput: false,
      wroteScore: false,
      wroteWager: false,
    });
  });
});
