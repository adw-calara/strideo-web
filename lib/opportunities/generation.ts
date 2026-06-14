import "server-only";

import {
  FEATURE_SET_KEY,
  FEATURE_SET_VERSION,
  SCORING_VERSION,
  type GenerateOpportunityOptions,
  extractOpportunityFeatures,
  loadEligibleRaceFacts,
} from "@/lib/opportunities/features";
import { persistOpportunityCandidate } from "@/lib/opportunities/persistence";
import { scoreOpportunityCandidate } from "@/lib/opportunities/scoring/value-overlay-demo";
import {
  STRATEGY_SLUG,
  STRATEGY_VERSION_NUMBER,
  ensureDemoValueOverlayStrategy,
  matchOpportunityStrategy,
} from "@/lib/opportunities/strategies/value-overlay-demo";

export type { GenerateOpportunityOptions } from "@/lib/opportunities/features";

const MAX_SKIPPED_SAMPLE_SIZE = 50;

type GenerateDemoOpportunityOptions = GenerateOpportunityOptions & {
  dryRun?: boolean;
};

type PersistedStrategyIdentity = {
  strategyId: string;
  strategyVersionId: string;
};

type SkippedCandidate = {
  raceId: string;
  raceEntryId: string;
  reason: string;
};

export type GenerateOpportunityResult = {
  mode: "dry-run" | "write";
  strategySlug: typeof STRATEGY_SLUG;
  strategyVersionNumber: typeof STRATEGY_VERSION_NUMBER;
  strategyId: string | null;
  strategyVersionId: string | null;
  scoringVersion: typeof SCORING_VERSION;
  featureSetKey: typeof FEATURE_SET_KEY;
  featureSetVersion: typeof FEATURE_SET_VERSION;
  racesLoaded: number;
  racesWithoutEligibleEntries: number;
  entriesEvaluated: number;
  candidatesQualified: number;
  opportunitiesPublished: number;
  skippedCount: number;
  skippedReasonCounts: Record<string, number>;
  skippedSample: SkippedCandidate[];
  skippedSampleTruncated: boolean;
};

export async function generateDemoValueOverlayOpportunities(
  options: GenerateDemoOpportunityOptions = {},
): Promise<GenerateOpportunityResult> {
  const dryRun = options.dryRun ?? false;
  const calculatedAt = new Date().toISOString();
  let persistedStrategy: PersistedStrategyIdentity | null = null;
  const {
    races,
    entriesByRaceId,
    latestOddsByEntryId,
    openingOddsByEntryId,
    oddsSnapshotCountByEntryId,
  } = await loadEligibleRaceFacts(options);
  const result: GenerateOpportunityResult = {
    mode: dryRun ? "dry-run" : "write",
    strategySlug: STRATEGY_SLUG,
    strategyVersionNumber: STRATEGY_VERSION_NUMBER,
    strategyId: null,
    strategyVersionId: null,
    scoringVersion: SCORING_VERSION,
    featureSetKey: FEATURE_SET_KEY,
    featureSetVersion: FEATURE_SET_VERSION,
    racesLoaded: races.length,
    racesWithoutEligibleEntries: 0,
    entriesEvaluated: 0,
    candidatesQualified: 0,
    opportunitiesPublished: 0,
    skippedCount: 0,
    skippedReasonCounts: {},
    skippedSample: [],
    skippedSampleTruncated: false,
  };

  async function getPersistedStrategy() {
    if (persistedStrategy) {
      return persistedStrategy;
    }

    persistedStrategy = await ensureDemoValueOverlayStrategy();
    result.strategyId = persistedStrategy.strategyId;
    result.strategyVersionId = persistedStrategy.strategyVersionId;

    return persistedStrategy;
  }

  function recordSkipped(candidate: SkippedCandidate) {
    result.skippedCount += 1;
    result.skippedReasonCounts[candidate.reason] =
      (result.skippedReasonCounts[candidate.reason] ?? 0) + 1;

    if (result.skippedSample.length < MAX_SKIPPED_SAMPLE_SIZE) {
      result.skippedSample.push(candidate);
    } else {
      result.skippedSampleTruncated = true;
    }
  }

  for (const race of races) {
    const entries = entriesByRaceId.get(race.id) ?? [];

    if (entries.length === 0) {
      result.racesWithoutEligibleEntries += 1;
    }

    for (const entry of entries) {
      result.entriesEvaluated += 1;

      const features = extractOpportunityFeatures({
        race,
        entry,
        entryCount: entries.length,
        latestOdds: latestOddsByEntryId.get(entry.id) ?? null,
        openingOdds: openingOddsByEntryId.get(entry.id) ?? null,
        oddsSnapshotCount: oddsSnapshotCountByEntryId.get(entry.id) ?? 0,
        calculatedAt,
      });
      const score = scoreOpportunityCandidate(features);
      const decision = matchOpportunityStrategy(score);

      if (!decision.qualified) {
        recordSkipped({
          raceId: race.id,
          raceEntryId: entry.id,
          reason: decision.reason,
        });
        continue;
      }

      result.candidatesQualified += 1;

      if (dryRun) {
        continue;
      }

      const { strategyId, strategyVersionId } = await getPersistedStrategy();

      await persistOpportunityCandidate({
        strategyId,
        strategyVersionId,
        features,
        score,
        decision,
      });
      result.opportunitiesPublished += 1;
    }
  }

  return result;
}
