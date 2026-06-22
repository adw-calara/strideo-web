import type { ModelKey } from "@/lib/ml/data-contract";

export const OPPORTUNITY_FEATURE_CONTRACT_VERSION =
  "opportunity_feature_snapshot_v1" as const;
export const OPPORTUNITY_FEATURE_SNAPSHOT_SCHEMA_VERSION =
  "opportunity_feature_snapshot_schema_v1" as const;
export const VALUE_SCORING_CONTRACT_VERSION = "value_scoring_result_v1" as const;

export type OpportunityFeatureReadinessStatus = "ready" | "partial" | "blocked";

export type OpportunityFeatureRequirementLevel =
  | "required_now"
  | "future_required";

export type OpportunityFeatureKey =
  | "race_identity"
  | "race_date"
  | "entry_identity"
  | "horse_identity"
  | "track_context"
  | "surface_context"
  | "distance_context"
  | "class_context"
  | "market_odds_input"
  | "feature_snapshot_reference"
  | "source_lineage";

export type OpportunityMissingFeatureReasonCode =
  | "not_available"
  | "not_ingested"
  | "not_materialized"
  | "schema_gap"
  | "coverage_unproven"
  | "future_required";

export type OpportunityMissingFeatureReason = {
  key: OpportunityFeatureKey;
  requirementLevel: OpportunityFeatureRequirementLevel;
  reasonCode: OpportunityMissingFeatureReasonCode;
  message: string;
};

export type OpportunityFeatureSnapshotReadiness = {
  status: OpportunityFeatureReadinessStatus;
  missingFeatureReasons: readonly OpportunityMissingFeatureReason[];
  blockingReasons: readonly string[];
};

export type OpportunityIdentity = {
  opportunityId: string;
  opportunityRaceDate: string;
};

export type OpportunityFeatureSnapshotReference = {
  featureSnapshotId: string | null;
  featureContractVersion: typeof OPPORTUNITY_FEATURE_CONTRACT_VERSION;
  snapshotSchemaVersion: typeof OPPORTUNITY_FEATURE_SNAPSHOT_SCHEMA_VERSION;
  raceId: string;
  raceDate: string;
  raceEntryId: string;
  opportunity?: OpportunityIdentity | null;
};

type RaceIdentitySnapshot = {
  raceId: string;
  raceDate: string;
  provider: string | null;
  providerRaceId: string | null;
  raceNumber: number | null;
};

type EntryIdentitySnapshot = {
  raceEntryId: string;
  providerEntryId: string | null;
  horseId: string | null;
  horseProviderId: string | null;
  horseName: string | null;
  programNumber: string | null;
  postPosition: number | null;
};

type RaceContextSnapshot = {
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

type MarketInputSnapshot = {
  morningLineOdds: string | null;
  morningLineImpliedProbability: number | null;
  latestOddsSnapshotId: string | null;
  latestOddsImpliedProbability: number | null;
  marketImpliedProbability: number | null;
  marketProbabilitySource: "latest_odds" | "morning_line" | "unavailable";
};

type FeatureSnapshotLineage = {
  featureSnapshotId: string | null;
  capturedAt: string;
  sourceLineageIds: readonly string[];
};

type OpportunityFeatureSnapshotBase = {
  featureContractVersion: typeof OPPORTUNITY_FEATURE_CONTRACT_VERSION;
  snapshotSchemaVersion: typeof OPPORTUNITY_FEATURE_SNAPSHOT_SCHEMA_VERSION;
  opportunity: OpportunityIdentity | null;
  race: RaceIdentitySnapshot;
  entry: EntryIdentitySnapshot;
  context: RaceContextSnapshot;
  market: MarketInputSnapshot;
  lineage: FeatureSnapshotLineage;
};

export type OpportunityFeatureSnapshotInput = OpportunityFeatureSnapshotBase & {
  missingFeatureReasons?: readonly OpportunityMissingFeatureReason[];
};

export type OpportunityFeatureSnapshot = OpportunityFeatureSnapshotBase & {
  readiness: OpportunityFeatureSnapshotReadiness;
};

export type ValueExplanationFactor = {
  key: string;
  label: string;
  direction: "positive" | "negative" | "neutral";
  summary: string;
};

type ValueScoringResultBase = {
  scoringContractVersion: typeof VALUE_SCORING_CONTRACT_VERSION;
  inputFeatureSnapshot: OpportunityFeatureSnapshotReference;
  opportunity: OpportunityIdentity | null;
  generatedAt: string;
  explanationFactors: readonly ValueExplanationFactor[];
};

export type BlockedValueScoringResult = ValueScoringResultBase & {
  status: "blocked";
  modelKey: ModelKey | null;
  modelVersion: null;
  estimatedWinProbability: null;
  marketImpliedProbability: null;
  edgeDelta: null;
  confidence: null;
  valueScore: null;
  blockedReasons: readonly string[];
};

export type ScoredValueScoringResult = ValueScoringResultBase & {
  status: "scored";
  modelKey: ModelKey;
  modelVersion: string;
  estimatedWinProbability: number;
  marketImpliedProbability: number;
  edgeDelta: number;
  confidence: number;
  valueScore: number | null;
  blockedReasons: readonly [];
};

export type ValueScoringResult =
  | BlockedValueScoringResult
  | ScoredValueScoringResult;

export type ValueScoringValidation = {
  isValid: boolean;
  issues: readonly string[];
};

const missingFeatureMessages: Record<OpportunityFeatureKey, string> = {
  race_identity: "Race identity is required before an Opportunity can be scored.",
  race_date: "Race date is required to preserve composite Opportunity identity.",
  entry_identity: "Race-entry identity is required for entrant-level scoring.",
  horse_identity: "Horse identity is required for entrant-level feature linkage.",
  track_context: "Track context is expected before model-ready scoring.",
  surface_context: "Surface context is future-required for model-ready scoring.",
  distance_context: "Distance context is future-required for model-ready scoring.",
  class_context: "Class context is future-required for model-ready scoring.",
  market_odds_input:
    "A measured market input is required; do not fabricate implied probability.",
  feature_snapshot_reference:
    "A materialized feature snapshot reference is future-required for auditability.",
  source_lineage:
    "Source lineage is future-required before training or production scoring.",
};

function missing(
  key: OpportunityFeatureKey,
  requirementLevel: OpportunityFeatureRequirementLevel,
  reasonCode: OpportunityMissingFeatureReasonCode,
): OpportunityMissingFeatureReason {
  return {
    key,
    requirementLevel,
    reasonCode,
    message: missingFeatureMessages[key],
  };
}

function isProbability(value: number | null) {
  return value !== null && Number.isFinite(value) && value >= 0 && value <= 1;
}

function uniqueMissingReasons(
  reasons: readonly OpportunityMissingFeatureReason[],
) {
  const seen = new Set<string>();

  return reasons.filter((reason) => {
    const key = `${reason.key}:${reason.requirementLevel}:${reason.reasonCode}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function detectMissingFeatures(
  snapshot: OpportunityFeatureSnapshotInput,
): OpportunityMissingFeatureReason[] {
  const reasons: OpportunityMissingFeatureReason[] = [];

  if (!snapshot.race.raceId) {
    reasons.push(missing("race_identity", "required_now", "not_available"));
  }

  if (!snapshot.race.raceDate) {
    reasons.push(missing("race_date", "required_now", "not_available"));
  }

  if (!snapshot.entry.raceEntryId) {
    reasons.push(missing("entry_identity", "required_now", "not_available"));
  }

  if (!snapshot.entry.horseId && !snapshot.entry.horseName) {
    reasons.push(missing("horse_identity", "required_now", "not_available"));
  }

  if (
    !snapshot.market.latestOddsSnapshotId &&
    !snapshot.market.morningLineOdds &&
    !isProbability(snapshot.market.marketImpliedProbability)
  ) {
    reasons.push(missing("market_odds_input", "required_now", "not_available"));
  }

  if (
    !snapshot.context.trackId &&
    !snapshot.context.trackCode &&
    !snapshot.context.trackName
  ) {
    reasons.push(missing("track_context", "future_required", "not_available"));
  }

  if (!snapshot.context.surfaceId && !snapshot.context.surfaceCode) {
    reasons.push(missing("surface_context", "future_required", "not_ingested"));
  }

  if (!snapshot.context.distanceText && snapshot.context.distanceYards === null) {
    reasons.push(missing("distance_context", "future_required", "not_ingested"));
  }

  if (!snapshot.context.raceType && !snapshot.context.classRating) {
    reasons.push(missing("class_context", "future_required", "not_ingested"));
  }

  if (!snapshot.lineage.featureSnapshotId) {
    reasons.push(
      missing(
        "feature_snapshot_reference",
        "future_required",
        "not_materialized",
      ),
    );
  }

  if (snapshot.lineage.sourceLineageIds.length === 0) {
    reasons.push(missing("source_lineage", "future_required", "coverage_unproven"));
  }

  return reasons;
}

export function buildOpportunityFeatureSnapshot(
  input: OpportunityFeatureSnapshotInput,
): OpportunityFeatureSnapshot {
  const { missingFeatureReasons: suppliedMissingFeatureReasons, ...snapshot } =
    input;
  const missingFeatureReasons = uniqueMissingReasons([
    ...detectMissingFeatures(input),
    ...(suppliedMissingFeatureReasons ?? []),
  ]);
  const blockingReasons = missingFeatureReasons
    .filter((reason) => reason.requirementLevel === "required_now")
    .map((reason) => reason.message);
  const status: OpportunityFeatureReadinessStatus =
    blockingReasons.length > 0
      ? "blocked"
      : missingFeatureReasons.length > 0
        ? "partial"
        : "ready";

  return {
    ...snapshot,
    readiness: {
      status,
      missingFeatureReasons,
      blockingReasons,
    },
  };
}

export function featureSnapshotReference(
  snapshot: OpportunityFeatureSnapshot,
): OpportunityFeatureSnapshotReference {
  return {
    featureSnapshotId: snapshot.lineage.featureSnapshotId,
    featureContractVersion: snapshot.featureContractVersion,
    snapshotSchemaVersion: snapshot.snapshotSchemaVersion,
    raceId: snapshot.race.raceId,
    raceDate: snapshot.race.raceDate,
    raceEntryId: snapshot.entry.raceEntryId,
    opportunity: snapshot.opportunity,
  };
}

export function validateValueScoringResult(
  result: ValueScoringResult,
): ValueScoringValidation {
  const issues: string[] = [];

  if (result.scoringContractVersion !== VALUE_SCORING_CONTRACT_VERSION) {
    issues.push("Value scoring contract version is not recognized.");
  }

  if (
    result.inputFeatureSnapshot.featureContractVersion !==
    OPPORTUNITY_FEATURE_CONTRACT_VERSION
  ) {
    issues.push("Feature contract version is not recognized.");
  }

  if (
    result.inputFeatureSnapshot.snapshotSchemaVersion !==
    OPPORTUNITY_FEATURE_SNAPSHOT_SCHEMA_VERSION
  ) {
    issues.push("Feature snapshot schema version is not recognized.");
  }

  if (!result.inputFeatureSnapshot.raceId) {
    issues.push("Input feature snapshot reference must include raceId.");
  }

  if (!result.inputFeatureSnapshot.raceDate) {
    issues.push("Input feature snapshot reference must include raceDate.");
  }

  if (!result.inputFeatureSnapshot.raceEntryId) {
    issues.push("Input feature snapshot reference must include raceEntryId.");
  }

  if (
    result.opportunity &&
    result.opportunity.opportunityRaceDate !== result.inputFeatureSnapshot.raceDate
  ) {
    issues.push(
      "Opportunity linkage must preserve opportunity_id + opportunity_race_date.",
    );
  }

  if (result.status === "blocked") {
    if (result.blockedReasons.length === 0) {
      issues.push("Blocked scoring results must explain why scoring is blocked.");
    }

    if (
      result.estimatedWinProbability !== null ||
      result.marketImpliedProbability !== null ||
      result.edgeDelta !== null ||
      result.confidence !== null ||
      result.valueScore !== null
    ) {
      issues.push("Blocked scoring results must not include synthetic values.");
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  if (!result.modelVersion) {
    issues.push("Scored value outputs must include a modelVersion.");
  }

  if (result.modelVersion === result.inputFeatureSnapshot.featureContractVersion) {
    issues.push("modelVersion must be separate from featureContractVersion.");
  }

  if (!isProbability(result.estimatedWinProbability)) {
    issues.push("estimatedWinProbability must be between 0 and 1.");
  }

  if (!isProbability(result.marketImpliedProbability)) {
    issues.push("marketImpliedProbability must be between 0 and 1.");
  }

  if (!Number.isFinite(result.edgeDelta)) {
    issues.push("edgeDelta must be a finite number.");
  }

  if (!Number.isFinite(result.confidence) || result.confidence < 0 || result.confidence > 100) {
    issues.push("confidence must be a finite 0-100 value.");
  }

  if (
    result.valueScore !== null &&
    (!Number.isFinite(result.valueScore) ||
      result.valueScore < 0 ||
      result.valueScore > 100)
  ) {
    issues.push("valueScore must be null or a finite 0-100 value.");
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}
