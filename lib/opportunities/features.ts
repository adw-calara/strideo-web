import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/admin";

export const SCORING_VERSION = "demo-value-overlay-v1";
export const FEATURE_SET_KEY = "opportunity_value_overlay_demo";
export const FEATURE_SET_VERSION = "v1";
export const QUALIFYING_ENTRY_STATUSES = [
  "entered",
  "reinstated",
  "started",
] as const;

export type JsonRecord = Record<string, unknown>;

export type RaceStatus =
  | "scheduled"
  | "open"
  | "closed"
  | "resulted"
  | "official"
  | "cancelled";

export type EntryStatus =
  | "entered"
  | "scratched"
  | "reinstated"
  | "started"
  | "finished";

export type RaceCandidateRow = {
  id: string;
  race_date: string;
  provider: string;
  provider_race_id: string;
  name: string | null;
  race_number: number;
  status: RaceStatus;
  scheduled_at: string | null;
  distance_text: string | null;
  distance_yards: number | null;
  race_type: string | null;
  class_rating: string | null;
  conditions: string | null;
  track_id: string;
  surface_id: string | null;
  track:
    | {
        id: string;
        code: string | null;
        name: string;
        region: string | null;
        timezone: string;
      }
    | Array<{
        id: string;
        code: string | null;
        name: string;
        region: string | null;
        timezone: string;
      }>
    | null;
  surface:
    | {
        id: string;
        code: string;
        name: string;
      }
    | Array<{
        id: string;
        code: string;
        name: string;
      }>
    | null;
};

export type RaceEntryCandidateRow = {
  id: string;
  race_id: string;
  race_date: string;
  provider: string;
  provider_entry_id: string;
  post_position: number | null;
  program_number: string | null;
  status: EntryStatus;
  morning_line_odds: string | null;
  horse_id: string | null;
  jockey_id: string | null;
  trainer_id: string | null;
  weight_lbs: number | null;
  medication: string | null;
  equipment: string | null;
  horse:
    | {
        id: string;
        provider_horse_id: string;
        name: string;
        foaling_year: number | null;
        sex: string | null;
        country_code: string | null;
      }
    | Array<{
        id: string;
        provider_horse_id: string;
        name: string;
        foaling_year: number | null;
        sex: string | null;
        country_code: string | null;
      }>
    | null;
  jockey:
    | {
        id: string;
        provider_jockey_id: string;
        name: string;
      }
    | Array<{
        id: string;
        provider_jockey_id: string;
        name: string;
      }>
    | null;
  trainer:
    | {
        id: string;
        provider_trainer_id: string;
        name: string;
      }
    | Array<{
        id: string;
        provider_trainer_id: string;
        name: string;
      }>
    | null;
};

export type OddsSnapshotCandidateRow = {
  id: string;
  race_id: string;
  race_date: string;
  race_entry_id: string | null;
  provider: string;
  pool_type: string;
  odds_fractional: string | null;
  odds_decimal: number | null;
  implied_probability: number | null;
  pool_total: number | null;
  snapshot_at: string;
  sequence_number: number | null;
};

export type OpportunityFeatures = {
  race: {
    id: string;
    raceDate: string;
    provider: string;
    providerRaceId: string;
    name: string | null;
    status: RaceStatus;
    raceNumber: number;
    scheduledAt: string | null;
    conditions: string | null;
  };
  track: {
    id: string;
    code: string | null;
    name: string | null;
    region: string | null;
    timezone: string | null;
  };
  surface: {
    id: string | null;
    code: string | null;
    name: string | null;
  };
  distance: {
    text: string | null;
    yards: number | null;
  };
  class: {
    raceType: string | null;
    rating: string | null;
  };
  field: {
    entryCount: number;
    activeEntryStatuses: readonly string[];
  };
  subject: {
    raceEntryId: string;
    provider: string;
    providerEntryId: string;
    entryStatus: EntryStatus;
    postPosition: number | null;
    programNumber: string | null;
    horseId: string | null;
    horseProviderId: string | null;
    horseName: string | null;
    horseFoalingYear: number | null;
    horseSex: string | null;
    horseCountryCode: string | null;
    jockeyId: string | null;
    jockeyProviderId: string | null;
    jockeyName: string | null;
    trainerId: string | null;
    trainerProviderId: string | null;
    trainerName: string | null;
    ownerId: null;
    ownerProviderId: null;
    ownerName: null;
    weightLbs: number | null;
    medication: string | null;
    equipment: string | null;
  };
  odds: {
    morningLineOdds: string | null;
    morningLineImpliedProbability: number | null;
    latestOddsSnapshotId: string | null;
    latestOddsFractional: string | null;
    latestOddsDecimal: number | null;
    latestOddsImpliedProbability: number | null;
    latestOddsSnapshotAt: string | null;
    marketImpliedProbability: number;
    marketProbabilitySource: "latest_odds" | "morning_line" | "entry_count";
  };
  marketMovement: {
    openingOddsSnapshotId: string | null;
    openingImpliedProbability: number | null;
    impliedProbabilityDelta: number | null;
    oddsSnapshotCount: number;
  };
  history: {
    horseHistoricalStarts: null;
    trainerRecentWinRate: null;
    jockeyRecentWinRate: null;
    trackSurfaceDistanceProfile: null;
    resultHistorySummary: null;
    priorPredictionPerformance: null;
    priorOpportunityPerformance: null;
  };
  lineage: {
    featureSetKey: typeof FEATURE_SET_KEY;
    featureSetVersion: typeof FEATURE_SET_VERSION;
    modelVersionId: null;
    predictionOutputId: null;
    scoringVersion: typeof SCORING_VERSION;
    placeholderOnly: true;
    unavailableInputs: string[];
  };
  deterministicSeed: number;
  extractedAt: string;
};

export type GenerateOpportunityOptions = {
  raceDate?: string;
  raceIds?: string[];
  maxRaces?: number;
};

export type EligibleRaceFacts = {
  races: RaceCandidateRow[];
  entriesByRaceId: Map<string, RaceEntryCandidateRow[]>;
  latestOddsByEntryId: Map<string, OddsSnapshotCandidateRow>;
  openingOddsByEntryId: Map<string, OddsSnapshotCandidateRow>;
  oddsSnapshotCountByEntryId: Map<string, number>;
};

export function raiseOpportunityGenerationError(
  operation: string,
  message: string,
): never {
  throw new Error(`Opportunity generation failed during ${operation}: ${message}`);
}

export function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function round(value: number, decimals = 4) {
  const multiplier = 10 ** decimals;
  return Math.round(value * multiplier) / multiplier;
}

function stableUnitInterval(seed: string) {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return (hash % 10000) / 10000;
}

function firstOrNull<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function parseFractionalProbability(value: string | null) {
  if (!value) {
    return null;
  }

  const [numeratorText, denominatorText] = value.split("/");
  const numerator = Number(numeratorText);
  const denominator = Number(denominatorText);

  if (
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    denominator <= 0
  ) {
    return null;
  }

  return clamp(denominator / (numerator + denominator), 0.01, 0.95);
}

function impliedProbabilityFromDecimal(value: number | null) {
  if (!value || value <= 1) {
    return null;
  }

  return clamp(1 / value, 0.01, 0.95);
}

export function opportunityFeaturesToJsonRecord(
  features: OpportunityFeatures,
): JsonRecord {
  return {
    race: features.race,
    track: features.track,
    surface: features.surface,
    distance: features.distance,
    class: features.class,
    field: features.field,
    subject: features.subject,
    odds: features.odds,
    market_movement: features.marketMovement,
    history: features.history,
    lineage: features.lineage,
    deterministic_seed: features.deterministicSeed,
    extracted_at: features.extractedAt,
  };
}

export function extractOpportunityFeatures({
  race,
  entry,
  entryCount,
  latestOdds,
  openingOdds,
  oddsSnapshotCount,
  calculatedAt,
}: {
  race: RaceCandidateRow;
  entry: RaceEntryCandidateRow;
  entryCount: number;
  latestOdds: OddsSnapshotCandidateRow | null;
  openingOdds: OddsSnapshotCandidateRow | null;
  oddsSnapshotCount: number;
  calculatedAt: string;
}): OpportunityFeatures {
  const track = firstOrNull(race.track);
  const surface = firstOrNull(race.surface);
  const horse = firstOrNull(entry.horse);
  const jockey = firstOrNull(entry.jockey);
  const trainer = firstOrNull(entry.trainer);
  const morningLineImpliedProbability = parseFractionalProbability(
    entry.morning_line_odds,
  );
  const latestOddsImpliedProbability =
    latestOdds?.implied_probability ??
    impliedProbabilityFromDecimal(latestOdds?.odds_decimal ?? null) ??
    parseFractionalProbability(latestOdds?.odds_fractional ?? null);
  const marketImpliedProbability =
    latestOddsImpliedProbability ??
    morningLineImpliedProbability ??
    clamp(1 / Math.max(entryCount, 1), 0.01, 0.95);
  const openingImpliedProbability =
    openingOdds?.implied_probability ??
    impliedProbabilityFromDecimal(openingOdds?.odds_decimal ?? null) ??
    parseFractionalProbability(openingOdds?.odds_fractional ?? null);
  const impliedProbabilityDelta =
    latestOddsImpliedProbability !== null && openingImpliedProbability !== null
      ? round(latestOddsImpliedProbability - openingImpliedProbability)
      : null;

  return {
    race: {
      id: race.id,
      raceDate: race.race_date,
      provider: race.provider,
      providerRaceId: race.provider_race_id,
      name: race.name,
      status: race.status,
      raceNumber: race.race_number,
      scheduledAt: race.scheduled_at,
      conditions: race.conditions,
    },
    track: {
      id: race.track_id,
      code: track?.code ?? null,
      name: track?.name ?? null,
      region: track?.region ?? null,
      timezone: track?.timezone ?? null,
    },
    surface: {
      id: race.surface_id,
      code: surface?.code ?? null,
      name: surface?.name ?? null,
    },
    distance: {
      text: race.distance_text,
      yards: race.distance_yards,
    },
    class: {
      raceType: race.race_type,
      rating: race.class_rating,
    },
    field: {
      entryCount,
      activeEntryStatuses: QUALIFYING_ENTRY_STATUSES,
    },
    subject: {
      raceEntryId: entry.id,
      provider: entry.provider,
      providerEntryId: entry.provider_entry_id,
      entryStatus: entry.status,
      postPosition: entry.post_position,
      programNumber: entry.program_number,
      horseId: entry.horse_id,
      horseProviderId: horse?.provider_horse_id ?? null,
      horseName: horse?.name ?? null,
      horseFoalingYear: horse?.foaling_year ?? null,
      horseSex: horse?.sex ?? null,
      horseCountryCode: horse?.country_code ?? null,
      jockeyId: entry.jockey_id,
      jockeyProviderId: jockey?.provider_jockey_id ?? null,
      jockeyName: jockey?.name ?? null,
      trainerId: entry.trainer_id,
      trainerProviderId: trainer?.provider_trainer_id ?? null,
      trainerName: trainer?.name ?? null,
      ownerId: null,
      ownerProviderId: null,
      ownerName: null,
      weightLbs: entry.weight_lbs,
      medication: entry.medication,
      equipment: entry.equipment,
    },
    odds: {
      morningLineOdds: entry.morning_line_odds,
      morningLineImpliedProbability,
      latestOddsSnapshotId: latestOdds?.id ?? null,
      latestOddsFractional: latestOdds?.odds_fractional ?? null,
      latestOddsDecimal: latestOdds?.odds_decimal ?? null,
      latestOddsImpliedProbability,
      latestOddsSnapshotAt: latestOdds?.snapshot_at ?? null,
      marketImpliedProbability,
      marketProbabilitySource: latestOddsImpliedProbability
        ? "latest_odds"
        : morningLineImpliedProbability
          ? "morning_line"
          : "entry_count",
    },
    marketMovement: {
      openingOddsSnapshotId: openingOdds?.id ?? null,
      openingImpliedProbability,
      impliedProbabilityDelta,
      oddsSnapshotCount,
    },
    history: {
      horseHistoricalStarts: null,
      trainerRecentWinRate: null,
      jockeyRecentWinRate: null,
      trackSurfaceDistanceProfile: null,
      resultHistorySummary: null,
      priorPredictionPerformance: null,
      priorOpportunityPerformance: null,
    },
    lineage: {
      featureSetKey: FEATURE_SET_KEY,
      featureSetVersion: FEATURE_SET_VERSION,
      modelVersionId: null,
      predictionOutputId: null,
      scoringVersion: SCORING_VERSION,
      placeholderOnly: true,
      unavailableInputs: [
        "owners",
        "horse_historical_performance",
        "trainer_recent_performance",
        "jockey_recent_performance",
        "track_surface_distance_tendencies",
        "prior_prediction_performance",
        "prior_opportunity_performance",
      ],
    },
    deterministicSeed: stableUnitInterval(
      `${race.id}:${entry.id}:${SCORING_VERSION}`,
    ),
    extractedAt: calculatedAt,
  };
}

export async function loadEligibleRaceFacts(
  options: GenerateOpportunityOptions,
): Promise<EligibleRaceFacts> {
  const supabase = createServiceRoleClient();
  let raceQuery = supabase
    .from("races")
    .select(
      `
        id,
        race_date,
        provider,
        provider_race_id,
        name,
        race_number,
        status,
        scheduled_at,
        distance_text,
        distance_yards,
        race_type,
        class_rating,
        conditions,
        track_id,
        surface_id,
        track:tracks (
          id,
          code,
          name,
          region,
          timezone
        ),
        surface:surfaces (
          id,
          code,
          name
        )
      `,
    )
    .in("status", ["scheduled", "open"]);

  if (options.raceDate) {
    raceQuery = raceQuery.eq("race_date", options.raceDate);
  }

  if (options.raceIds && options.raceIds.length > 0) {
    raceQuery = raceQuery.in("id", options.raceIds);
  }

  const { data: races, error: raceError } = await raceQuery
    .order("race_date", { ascending: false })
    .order("race_number", { ascending: true })
    .limit(options.maxRaces ?? 25)
    .returns<RaceCandidateRow[]>();

  if (raceError) {
    raiseOpportunityGenerationError("eligible race load", raceError.message);
  }

  const raceRows = races ?? [];

  if (raceRows.length === 0) {
    return {
      races: [],
      entriesByRaceId: new Map<string, RaceEntryCandidateRow[]>(),
      latestOddsByEntryId: new Map<string, OddsSnapshotCandidateRow>(),
      openingOddsByEntryId: new Map<string, OddsSnapshotCandidateRow>(),
      oddsSnapshotCountByEntryId: new Map<string, number>(),
    };
  }

  const raceIds = raceRows.map((race) => race.id);
  const [entryResult, oddsResult] = await Promise.all([
    supabase
      .from("race_entries")
      .select(
        `
          id,
          race_id,
          race_date,
          provider,
          provider_entry_id,
          post_position,
          program_number,
          status,
          morning_line_odds,
          horse_id,
          jockey_id,
          trainer_id,
          weight_lbs,
          medication,
          equipment,
          horse:horses (
            id,
            provider_horse_id,
            name,
            foaling_year,
            sex,
            country_code
          ),
          jockey:jockeys (
            id,
            provider_jockey_id,
            name
          ),
          trainer:trainers (
            id,
            provider_trainer_id,
            name
          )
        `,
      )
      .in("race_id", raceIds)
      .in("status", ["entered", "reinstated", "started"])
      .order("post_position", { ascending: true, nullsFirst: false })
      .returns<RaceEntryCandidateRow[]>(),
    supabase
      .from("odds_snapshots")
      .select(
        "id,race_id,race_date,race_entry_id,provider,pool_type,odds_fractional,odds_decimal,implied_probability,pool_total,snapshot_at,sequence_number",
      )
      .in("race_id", raceIds)
      .eq("pool_type", "win")
      .order("snapshot_at", { ascending: false })
      .order("sequence_number", { ascending: false, nullsFirst: false })
      .returns<OddsSnapshotCandidateRow[]>(),
  ]);

  if (entryResult.error) {
    raiseOpportunityGenerationError(
      "eligible entry load",
      entryResult.error.message,
    );
  }

  if (oddsResult.error) {
    raiseOpportunityGenerationError("latest odds load", oddsResult.error.message);
  }

  const entriesByRaceId = new Map<string, RaceEntryCandidateRow[]>();

  for (const entry of entryResult.data ?? []) {
    const entries = entriesByRaceId.get(entry.race_id) ?? [];
    entries.push(entry);
    entriesByRaceId.set(entry.race_id, entries);
  }

  const latestOddsByEntryId = new Map<string, OddsSnapshotCandidateRow>();
  const openingOddsByEntryId = new Map<string, OddsSnapshotCandidateRow>();
  const oddsSnapshotCountByEntryId = new Map<string, number>();

  for (const odds of oddsResult.data ?? []) {
    if (!odds.race_entry_id) {
      continue;
    }

    oddsSnapshotCountByEntryId.set(
      odds.race_entry_id,
      (oddsSnapshotCountByEntryId.get(odds.race_entry_id) ?? 0) + 1,
    );

    if (!latestOddsByEntryId.has(odds.race_entry_id)) {
      latestOddsByEntryId.set(odds.race_entry_id, odds);
    }

    openingOddsByEntryId.set(odds.race_entry_id, odds);
  }

  return {
    races: raceRows,
    entriesByRaceId,
    latestOddsByEntryId,
    openingOddsByEntryId,
    oddsSnapshotCountByEntryId,
  };
}
