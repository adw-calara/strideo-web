import "server-only";

import {
  SCORING_VERSION,
  clamp,
  round,
  type OpportunityFeatures,
} from "@/lib/opportunities/features";

export const OPPORTUNITY_SCORE_METHOD = "deterministic_demo_value_overlay";

export type OpportunityCandidateScore = {
  scoringVersion: typeof SCORING_VERSION;
  method: typeof OPPORTUNITY_SCORE_METHOD;
  score: number;
  confidence: number;
  edge: number;
  displayEdge: number;
  fairValue: number | null;
  marketImpliedProbability: number;
  placeholderProbability: number;
  scoredAt: string;
  inputs: {
    deterministicSeed: number;
    marketProbabilitySource: OpportunityFeatures["odds"]["marketProbabilitySource"];
    morningLineImpliedProbability: number | null;
    latestOddsImpliedProbability: number | null;
    oddsSnapshotCount: number;
    impliedProbabilityDelta: number | null;
  };
  signals: {
    seedSignal: number;
    postPositionSignal: number;
    marketMovementSignal: number;
    confidenceBase: number;
    morningLineConfidence: number;
    latestOddsConfidence: number;
    openingOddsConfidence: number;
    oddsDepthConfidence: number;
    fieldSizePenalty: number;
  };
};

export function scoreOpportunityCandidate(
  features: OpportunityFeatures,
): OpportunityCandidateScore {
  const marketImpliedProbability = clamp(
    features.odds.marketImpliedProbability,
    0.01,
    0.95,
  );
  const entryCount = Math.max(features.field.entryCount, 1);
  const seedSignal = (features.deterministicSeed - 0.48) * 0.16;
  const postPositionSignal =
    features.subject.postPosition === null
      ? 0
      : clamp(
          ((entryCount + 1 - features.subject.postPosition) / entryCount - 0.5) *
            0.04,
          -0.025,
          0.025,
        );
  const movementSignal =
    features.marketMovement.impliedProbabilityDelta === null
      ? 0
      : clamp(
          features.marketMovement.impliedProbabilityDelta * -0.35,
          -0.04,
          0.04,
        );
  const confidenceBase = 36;
  const morningLineConfidence =
    features.odds.morningLineImpliedProbability === null ? 0 : 6;
  const latestOddsConfidence = features.odds.latestOddsSnapshotId ? 12 : 0;
  const openingOddsConfidence = features.marketMovement.openingOddsSnapshotId
    ? 8
    : 0;
  const oddsDepthConfidence =
    Math.min(features.marketMovement.oddsSnapshotCount, 6) * 3;
  const fieldSizePenalty = Math.max(entryCount - 12, 0) * 1.5;
  const placeholderProbability = round(
    clamp(
      marketImpliedProbability + seedSignal + postPositionSignal + movementSignal,
      0.01,
      0.95,
    ),
  );
  const edge = round(placeholderProbability - marketImpliedProbability);
  const confidence = round(
    clamp(
      confidenceBase +
        morningLineConfidence +
        latestOddsConfidence +
        openingOddsConfidence +
        oddsDepthConfidence -
        fieldSizePenalty,
      0,
      100,
    ),
    2,
  );
  const score = round(clamp(50 + edge * 500 + confidence * 0.15, 0, 100), 2);

  return {
    scoringVersion: SCORING_VERSION,
    method: OPPORTUNITY_SCORE_METHOD,
    score,
    confidence,
    edge,
    displayEdge: round(clamp(edge * 100, 0, 100), 2),
    fairValue:
      placeholderProbability > 0 ? round(1 / placeholderProbability, 4) : null,
    marketImpliedProbability,
    placeholderProbability,
    scoredAt: features.extractedAt,
    inputs: {
      deterministicSeed: features.deterministicSeed,
      marketProbabilitySource: features.odds.marketProbabilitySource,
      morningLineImpliedProbability: features.odds.morningLineImpliedProbability,
      latestOddsImpliedProbability: features.odds.latestOddsImpliedProbability,
      oddsSnapshotCount: features.marketMovement.oddsSnapshotCount,
      impliedProbabilityDelta: features.marketMovement.impliedProbabilityDelta,
    },
    signals: {
      seedSignal: round(seedSignal),
      postPositionSignal: round(postPositionSignal),
      marketMovementSignal: round(movementSignal),
      confidenceBase,
      morningLineConfidence,
      latestOddsConfidence,
      openingOddsConfidence,
      oddsDepthConfidence,
      fieldSizePenalty,
    },
  };
}
