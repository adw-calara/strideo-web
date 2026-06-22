import {
  OPPORTUNITY_FEATURE_CONTRACT_VERSION,
  OPPORTUNITY_FEATURE_SNAPSHOT_SCHEMA_VERSION,
  buildOpportunityFeatureSnapshot,
  type OpportunityFeatureSnapshot,
  type OpportunityIdentity,
  type OpportunityMissingFeatureReason,
} from "./contracts";

type PreRaceReasonCode =
  | "ambiguous_cutoff"
  | "ambiguous_timing"
  | "invalid_market_probability"
  | "post_race_timing"
  | "result_or_outcome_source";

export type PreRaceFeatureSnapshotRace = {
  id: string;
  raceDate: string;
  provider: string | null;
  providerRaceId: string | null;
  raceNumber: number | null;
  scheduledAt: string | null;
  trackId: string | null;
  trackCode: string | null;
  trackName: string | null;
  surfaceId: string | null;
  surfaceCode: string | null;
  surfaceName: string | null;
  distanceText: string | null;
  distanceYards: number | null;
  raceType: string | null;
  classRating: string | null;
  conditions: string | null;
};

export type PreRaceFeatureSnapshotEntry = {
  id: string;
  raceId: string;
  raceDate: string;
  providerEntryId: string | null;
  horseId: string | null;
  horseProviderId: string | null;
  horseName: string | null;
  programNumber: string | null;
  postPosition: number | null;
  morningLineOdds: string | null;
};

export type PreRaceOddsSnapshotInput = {
  id: string;
  raceId: string;
  raceDate: string;
  raceEntryId: string | null;
  poolType: string;
  oddsFractional: string | null;
  oddsDecimal: number | null;
  impliedProbability: number | null;
  snapshotAt: string | null;
  sequenceNumber: number | null;
};

export type PreRaceForbiddenInput = {
  key: string;
  source: "result" | "result_entry" | "payout" | "settlement" | "post_race";
  message?: string;
};

export type PreRaceExcludedInput = {
  key: string;
  sourceId: string | null;
  reasonCode: PreRaceReasonCode;
  message: string;
};

export type PreRaceFeatureSnapshotBuilderInput = {
  race: PreRaceFeatureSnapshotRace;
  entry: PreRaceFeatureSnapshotEntry;
  oddsSnapshots?: readonly PreRaceOddsSnapshotInput[];
  opportunity?: OpportunityIdentity | null;
  capturedAt: string;
  trustedPreRaceCutoffAt?: string | null;
  sourceLineageIds?: readonly string[];
  forbiddenInputs?: readonly PreRaceForbiddenInput[];
};

export type PreRaceFeatureSnapshotAudit = {
  cutoffAt: string | null;
  cutoffSource: "trusted_cutoff" | "race_scheduled_at" | "unavailable";
  usedMarketSource: "latest_odds" | "morning_line" | "unavailable";
  usedOddsSnapshotId: string | null;
  excludedInputs: readonly PreRaceExcludedInput[];
  persistence: {
    wroteFeatureSnapshot: false;
    wrotePredictionOutput: false;
    wroteScore: false;
    wroteWager: false;
  };
};

export type PreRaceFeatureSnapshotBuildResult = {
  snapshot: OpportunityFeatureSnapshot;
  audit: PreRaceFeatureSnapshotAudit;
};

function reason(
  key: OpportunityMissingFeatureReason["key"],
  reasonCode: OpportunityMissingFeatureReason["reasonCode"],
  message: string,
  requirementLevel: OpportunityMissingFeatureReason["requirementLevel"] = "future_required",
): OpportunityMissingFeatureReason {
  return {
    key,
    requirementLevel,
    reasonCode,
    message,
  };
}

function exclusion(
  key: string,
  sourceId: string | null,
  reasonCode: PreRaceReasonCode,
  message: string,
): PreRaceExcludedInput {
  return {
    key,
    sourceId,
    reasonCode,
    message,
  };
}

function parseDateTime(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp) ? timestamp : null;
}

function clampProbability(value: number) {
  return Math.min(Math.max(value, 0.01), 0.95);
}

function probabilityFromFractional(value: string | null) {
  if (!value) {
    return null;
  }

  const [numeratorText, denominatorText] = value.split("/");
  const numerator = Number(numeratorText);
  const denominator = Number(denominatorText);

  if (
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    numerator < 0 ||
    denominator <= 0
  ) {
    return null;
  }

  return clampProbability(denominator / (numerator + denominator));
}

function probabilityFromDecimal(value: number | null) {
  if (value === null || !Number.isFinite(value) || value <= 1) {
    return null;
  }

  return clampProbability(1 / value);
}

function normalizeProbability(value: number | null) {
  if (value === null || !Number.isFinite(value) || value < 0 || value > 1) {
    return null;
  }

  return value;
}

function oddsProbability(odds: PreRaceOddsSnapshotInput) {
  return (
    normalizeProbability(odds.impliedProbability) ??
    probabilityFromDecimal(odds.oddsDecimal) ??
    probabilityFromFractional(odds.oddsFractional)
  );
}

function sortLatestFirst(
  a: PreRaceOddsSnapshotInput,
  b: PreRaceOddsSnapshotInput,
) {
  const aTime = parseDateTime(a.snapshotAt) ?? Number.NEGATIVE_INFINITY;
  const bTime = parseDateTime(b.snapshotAt) ?? Number.NEGATIVE_INFINITY;

  if (aTime !== bTime) {
    return bTime - aTime;
  }

  return (b.sequenceNumber ?? 0) - (a.sequenceNumber ?? 0);
}

function resolveCutoff(
  input: PreRaceFeatureSnapshotBuilderInput,
): Pick<PreRaceFeatureSnapshotAudit, "cutoffAt" | "cutoffSource"> {
  if (input.trustedPreRaceCutoffAt) {
    return {
      cutoffAt: input.trustedPreRaceCutoffAt,
      cutoffSource: "trusted_cutoff",
    };
  }

  if (input.race.scheduledAt) {
    return {
      cutoffAt: input.race.scheduledAt,
      cutoffSource: "race_scheduled_at",
    };
  }

  return {
    cutoffAt: null,
    cutoffSource: "unavailable",
  };
}

function eligiblePreRaceOdds(
  input: PreRaceFeatureSnapshotBuilderInput,
  cutoffAt: string | null,
) {
  const excludedInputs: PreRaceExcludedInput[] = [];
  const cutoffTime = parseDateTime(cutoffAt);
  const candidates = (input.oddsSnapshots ?? []).filter(
    (odds) =>
      odds.raceId === input.race.id &&
      odds.raceDate === input.race.raceDate &&
      odds.raceEntryId === input.entry.id &&
      odds.poolType === "win",
  );

  if (cutoffTime === null) {
    return {
      eligibleOdds: [],
      candidateCount: candidates.length,
      excludedInputs: candidates.map((odds) =>
        exclusion(
          "odds_snapshot",
          odds.id,
          "ambiguous_cutoff",
          "Odds snapshot excluded because no trusted pre-race cutoff is available.",
        ),
      ),
    };
  }

  const eligibleOdds: PreRaceOddsSnapshotInput[] = [];

  for (const odds of candidates) {
    const snapshotTime = parseDateTime(odds.snapshotAt);

    if (snapshotTime === null) {
      excludedInputs.push(
        exclusion(
          "odds_snapshot",
          odds.id,
          "ambiguous_timing",
          "Odds snapshot excluded because snapshot_at is missing or invalid.",
        ),
      );
      continue;
    }

    if (snapshotTime >= cutoffTime) {
      excludedInputs.push(
        exclusion(
          "odds_snapshot",
          odds.id,
          "post_race_timing",
          "Odds snapshot excluded because snapshot_at is not before the trusted pre-race cutoff.",
        ),
      );
      continue;
    }

    if (oddsProbability(odds) === null) {
      excludedInputs.push(
        exclusion(
          "odds_snapshot",
          odds.id,
          "invalid_market_probability",
          "Odds snapshot excluded because no valid implied probability can be derived from the market fields.",
        ),
      );
      continue;
    }

    eligibleOdds.push(odds);
  }

  return {
    eligibleOdds: eligibleOdds.sort(sortLatestFirst),
    candidateCount: candidates.length,
    excludedInputs,
  };
}

function forbiddenInputExclusions(
  inputs: readonly PreRaceForbiddenInput[] | undefined,
): PreRaceExcludedInput[] {
  return (inputs ?? []).map((input) =>
    exclusion(
      input.key,
      null,
      "result_or_outcome_source",
      input.message ??
        "Input excluded because result, payout, settlement, or other outcome-derived fields cannot be used in a pre-race snapshot.",
    ),
  );
}

export function buildPreRaceOpportunityFeatureSnapshot(
  input: PreRaceFeatureSnapshotBuilderInput,
): PreRaceFeatureSnapshotBuildResult {
  const { cutoffAt, cutoffSource } = resolveCutoff(input);
  const { eligibleOdds, candidateCount, excludedInputs } = eligiblePreRaceOdds(
    input,
    cutoffAt,
  );
  const latestOdds = eligibleOdds[0] ?? null;
  const latestOddsProbability = latestOdds ? oddsProbability(latestOdds) : null;
  const morningLineProbability = probabilityFromFractional(
    input.entry.morningLineOdds,
  );
  const marketImpliedProbability =
    latestOddsProbability ?? morningLineProbability ?? null;
  const marketProbabilitySource =
    latestOddsProbability !== null
    ? "latest_odds"
    : morningLineProbability !== null
      ? "morning_line"
      : "unavailable";
  const missingFeatureReasons: OpportunityMissingFeatureReason[] = [];
  const excludedLeakageInputs = [
    ...excludedInputs,
    ...forbiddenInputExclusions(input.forbiddenInputs),
  ];

  if (!latestOdds && candidateCount > 0) {
    missingFeatureReasons.push(
      reason(
        "market_odds_input",
        "leakage_risk",
        "Live odds were excluded because they were not provably before the trusted pre-race cutoff or lacked usable market probability.",
      ),
    );
  }

  const snapshot = buildOpportunityFeatureSnapshot({
    featureContractVersion: OPPORTUNITY_FEATURE_CONTRACT_VERSION,
    snapshotSchemaVersion: OPPORTUNITY_FEATURE_SNAPSHOT_SCHEMA_VERSION,
    opportunity: input.opportunity ?? null,
    race: {
      raceId: input.race.id,
      raceDate: input.race.raceDate,
      provider: input.race.provider,
      providerRaceId: input.race.providerRaceId,
      raceNumber: input.race.raceNumber,
    },
    entry: {
      raceEntryId: input.entry.id,
      providerEntryId: input.entry.providerEntryId,
      horseId: input.entry.horseId,
      horseProviderId: input.entry.horseProviderId,
      horseName: input.entry.horseName,
      programNumber: input.entry.programNumber,
      postPosition: input.entry.postPosition,
    },
    context: {
      trackId: input.race.trackId,
      trackCode: input.race.trackCode,
      trackName: input.race.trackName,
      surfaceId: input.race.surfaceId,
      surfaceCode: input.race.surfaceCode,
      surfaceName: input.race.surfaceName,
      distanceText: input.race.distanceText,
      distanceYards: input.race.distanceYards,
      raceType: input.race.raceType,
      classRating: input.race.classRating,
      conditions: input.race.conditions,
    },
    market: {
      morningLineOdds: input.entry.morningLineOdds,
      morningLineImpliedProbability: morningLineProbability,
      latestOddsSnapshotId: latestOdds?.id ?? null,
      latestOddsImpliedProbability: latestOddsProbability,
      marketImpliedProbability,
      marketProbabilitySource,
    },
    lineage: {
      featureSnapshotId: null,
      capturedAt: input.capturedAt,
      sourceLineageIds: input.sourceLineageIds ?? [],
    },
    missingFeatureReasons,
  });

  return {
    snapshot,
    audit: {
      cutoffAt,
      cutoffSource,
      usedMarketSource: marketProbabilitySource,
      usedOddsSnapshotId: latestOdds?.id ?? null,
      excludedInputs: excludedLeakageInputs,
      persistence: {
        wroteFeatureSnapshot: false,
        wrotePredictionOutput: false,
        wroteScore: false,
        wroteWager: false,
      },
    },
  };
}
