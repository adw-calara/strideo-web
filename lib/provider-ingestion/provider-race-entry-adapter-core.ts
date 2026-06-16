import type { JsonObject } from "@/lib/racing-codes/normalization-core";
import {
  parseProviderRaceEntryShorthandSegment,
  type ParsedProviderRaceEntrySegment,
  type ProviderRaceEntryParserContext,
  type ProviderRaceEntryShorthandPayload,
  type RaceEntryShorthandFieldKey,
  type RacingCodeNormalizer,
} from "./racing-form-parser-core";

export const THE_RACING_API_SOURCE_SYSTEM = "the_racing_api";
export const THE_RACING_API_RACE_ENTRY_PAYLOAD_SHAPE =
  "the_racing_api_race_entry_v1";

export type TheRacingApiRaceEntryPayload = {
  provider?: "the_racing_api" | string | null;
  race: {
    id: string;
    date: string;
    type_code: string | null;
    surface_code: string | null;
    track_condition_code?: string | null;
  };
  entry: {
    id: string;
    status_code: string | null;
    medication_code?: string | null;
  };
  horse: {
    id: string;
    sex_code?: string | null;
    color_code?: string | null;
  };
  recent_workout?: {
    work_type_code?: string | null;
  } | null;
  links?: {
    source_url?: string | null;
  } | null;
};

export type TheRacingApiRaceEntryAdapterContext = {
  sourceSystem?: string;
  jobRunId?: string | null;
  opportunityId?: string | null;
  sourceUrl?: string | null;
  notes?: string | null;
  normalizer: RacingCodeNormalizer;
};

export type ProviderRaceEntrySourcePaths = Record<
  RaceEntryShorthandFieldKey,
  string
>;

export type ProviderRaceEntryWritePlan = {
  target: "race_entry_source_fact";
  operation: "upsert_plan";
  idempotency_key: string;
  source_system: string;
  provider_payload_shape: typeof THE_RACING_API_RACE_ENTRY_PAYLOAD_SHAPE;
  provider_identifiers: {
    provider_race_id: string;
    provider_entry_id: string;
    provider_horse_id: string;
  };
  source_paths: ProviderRaceEntrySourcePaths;
  raw_values: ParsedProviderRaceEntrySegment["raw"];
  canonical_values: Record<RaceEntryShorthandFieldKey, string | null>;
  canonical_labels: Record<RaceEntryShorthandFieldKey, string | null>;
  raw_provider_payload: TheRacingApiRaceEntryPayload;
  ml_feature_materialization_status: "ready";
  prohibited_side_effects: readonly [
    "opportunities",
    "prediction_outputs",
    "wager_recommendations",
  ];
};

export type TheRacingApiRaceEntryAdapterResult = {
  source_system: string;
  provider: typeof THE_RACING_API_SOURCE_SYSTEM;
  segment_type: "race_entry_shorthand";
  provider_payload_shape: typeof THE_RACING_API_RACE_ENTRY_PAYLOAD_SHAPE;
  raw_provider_payload: TheRacingApiRaceEntryPayload;
  parser_input: ProviderRaceEntryShorthandPayload;
  parser_result: ParsedProviderRaceEntrySegment;
  source_paths: ProviderRaceEntrySourcePaths;
  write_plan: ProviderRaceEntryWritePlan | null;
  blocked_for_ml: boolean;
  blocking_reasons: string[];
  warnings: string[];
  metadata: {
    persistence_status: "planned" | "blocked";
    writes_executed: false;
    provider_race_id: string;
    provider_entry_id: string;
    provider_horse_id: string;
  };
};

const SOURCE_PATHS: ProviderRaceEntrySourcePaths = {
  race_type: "race.type_code",
  surface: "race.surface_code",
  track_condition: "race.track_condition_code",
  horse_sex: "horse.sex_code",
  horse_color: "horse.color_code",
  medication: "entry.medication_code",
  entry_status: "entry.status_code",
  workout_type: "recent_workout.work_type_code",
};

const FIELD_KEYS = Object.keys(SOURCE_PATHS) as RaceEntryShorthandFieldKey[];

function toCanonicalValues(
  parserResult: ParsedProviderRaceEntrySegment,
  property: "canonical_code" | "canonical_label",
) {
  return Object.fromEntries(
    FIELD_KEYS.map((key) => [key, parserResult.normalized[key]?.[property] ?? null]),
  ) as Record<RaceEntryShorthandFieldKey, string | null>;
}

function providerIdempotencyKey(
  sourceSystem: string,
  payload: TheRacingApiRaceEntryPayload,
) {
  return [
    sourceSystem,
    payload.race.id,
    payload.entry.id,
    THE_RACING_API_RACE_ENTRY_PAYLOAD_SHAPE,
  ].join(":");
}

export function adaptTheRacingApiRaceEntryPayload(
  payload: TheRacingApiRaceEntryPayload,
): ProviderRaceEntryShorthandPayload {
  return {
    provider: THE_RACING_API_SOURCE_SYSTEM,
    race: {
      providerRaceId: payload.race.id,
      raceDate: payload.race.date,
      classCode: payload.race.type_code,
      surfaceCode: payload.race.surface_code,
      trackConditionCode: payload.race.track_condition_code ?? null,
    },
    entry: {
      providerEntryId: payload.entry.id,
      statusCode: payload.entry.status_code,
      medicationCode: payload.entry.medication_code ?? null,
    },
    horse: {
      providerHorseId: payload.horse.id,
      sexCode: payload.horse.sex_code ?? null,
      colorCode: payload.horse.color_code ?? null,
    },
    recentWorkout: {
      workTypeCode: payload.recent_workout?.work_type_code ?? null,
    },
  };
}

export function buildRaceEntryWritePlan(
  payload: TheRacingApiRaceEntryPayload,
  parserResult: ParsedProviderRaceEntrySegment,
): ProviderRaceEntryWritePlan | null {
  if (parserResult.blocked_for_ml) {
    return null;
  }

  return {
    target: "race_entry_source_fact",
    operation: "upsert_plan",
    idempotency_key: providerIdempotencyKey(parserResult.source_system, payload),
    source_system: parserResult.source_system,
    provider_payload_shape: THE_RACING_API_RACE_ENTRY_PAYLOAD_SHAPE,
    provider_identifiers: {
      provider_race_id: payload.race.id,
      provider_entry_id: payload.entry.id,
      provider_horse_id: payload.horse.id,
    },
    source_paths: SOURCE_PATHS,
    raw_values: parserResult.raw,
    canonical_values: toCanonicalValues(parserResult, "canonical_code"),
    canonical_labels: toCanonicalValues(parserResult, "canonical_label"),
    raw_provider_payload: payload,
    ml_feature_materialization_status: "ready",
    prohibited_side_effects: [
      "opportunities",
      "prediction_outputs",
      "wager_recommendations",
    ],
  };
}

export async function planTheRacingApiRaceEntryAdaptation(
  payload: TheRacingApiRaceEntryPayload,
  context: TheRacingApiRaceEntryAdapterContext,
): Promise<TheRacingApiRaceEntryAdapterResult> {
  const sourceSystem = context.sourceSystem ?? THE_RACING_API_SOURCE_SYSTEM;
  const parserInput = adaptTheRacingApiRaceEntryPayload(payload);
  const parserContext: ProviderRaceEntryParserContext = {
    sourceSystem,
    jobRunId: context.jobRunId ?? null,
    opportunityId: context.opportunityId ?? null,
    sourceUrl: context.sourceUrl ?? payload.links?.source_url ?? null,
    notes: context.notes ?? "The Racing API race-entry adapter slice",
    normalizer: context.normalizer,
  };
  const parserResult = await parseProviderRaceEntryShorthandSegment(
    parserInput,
    parserContext,
  );
  const writePlan = buildRaceEntryWritePlan(payload, parserResult);

  return {
    source_system: sourceSystem,
    provider: THE_RACING_API_SOURCE_SYSTEM,
    segment_type: "race_entry_shorthand",
    provider_payload_shape: THE_RACING_API_RACE_ENTRY_PAYLOAD_SHAPE,
    raw_provider_payload: payload,
    parser_input: parserInput,
    parser_result: parserResult,
    source_paths: SOURCE_PATHS,
    write_plan: writePlan,
    blocked_for_ml: parserResult.blocked_for_ml,
    blocking_reasons: parserResult.blocking_reasons,
    warnings: parserResult.warnings,
    metadata: {
      persistence_status: writePlan ? "planned" : "blocked",
      writes_executed: false,
      provider_race_id: payload.race.id,
      provider_entry_id: payload.entry.id,
      provider_horse_id: payload.horse.id,
    },
  };
}

export function makeTheRacingApiRaceEntrySamplePayload(
  payload: TheRacingApiRaceEntryPayload,
): JsonObject {
  return {
    provider_payload_shape: THE_RACING_API_RACE_ENTRY_PAYLOAD_SHAPE,
    source_paths: SOURCE_PATHS,
    race: payload.race,
    entry: payload.entry,
    horse: payload.horse,
    recent_workout: payload.recent_workout ?? null,
  };
}
