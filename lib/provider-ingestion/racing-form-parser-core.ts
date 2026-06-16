import type {
  JsonObject,
  RacingCodeNormalizationInput,
  RacingCodeNormalizationResult,
  ResolvedRacingCodeNormalization,
  UnresolvedRacingCodeNormalization,
} from "@/lib/racing-codes/normalization-core";

export type ProviderRaceEntryShorthandPayload = {
  provider?: string | null;
  race?: {
    providerRaceId?: string | null;
    raceId?: string | null;
    raceDate?: string | null;
    classCode?: string | null;
    surfaceCode?: string | null;
    trackConditionCode?: string | null;
  };
  entry?: {
    providerEntryId?: string | null;
    raceEntryId?: string | null;
    statusCode?: string | null;
    medicationCode?: string | null;
  };
  horse?: {
    providerHorseId?: string | null;
    horseId?: string | null;
    sexCode?: string | null;
    colorCode?: string | null;
  };
  recentWorkout?: {
    workTypeCode?: string | null;
  };
};

export type ProviderRaceEntryParserContext = {
  sourceSystem: string;
  jobRunId?: string | null;
  opportunityId?: string | null;
  sourceUrl?: string | null;
  notes?: string | null;
  normalizer: RacingCodeNormalizer;
};

export type RacingCodeNormalizer = (
  input: RacingCodeNormalizationInput,
) => Promise<RacingCodeNormalizationResult>;

export type RaceEntrySegmentNormalizedField = {
  code_set_id: string;
  code_value_id: string;
  canonical_code: string;
  canonical_label: string;
  normalized_value: JsonObject;
  raw_source_value: string;
};

export type RaceEntrySegmentNormalized = Partial<
  Record<RaceEntryShorthandFieldKey, RaceEntrySegmentNormalizedField>
>;

export type RaceEntryShorthandFieldKey =
  | "race_type"
  | "surface"
  | "track_condition"
  | "horse_sex"
  | "horse_color"
  | "medication"
  | "entry_status"
  | "workout_type";

export type ParsedProviderRaceEntrySegment = {
  source_system: string;
  segment_type: "race_entry_shorthand";
  raw: Record<RaceEntryShorthandFieldKey, string | null>;
  normalized: RaceEntrySegmentNormalized;
  unresolved_codes: Array<UnresolvedRacingCodeNormalization | RacingCodeNormalizationResult>;
  blocked_for_ml: boolean;
  blocking_reasons: string[];
  normalization_results: Partial<
    Record<RaceEntryShorthandFieldKey, RacingCodeNormalizationResult>
  >;
  warnings: string[];
  metadata: {
    required_fields: RaceEntryShorthandFieldKey[];
    optional_fields: RaceEntryShorthandFieldKey[];
    ml_feature_materialization_status: "ready" | "blocked";
    provider_race_id: string | null;
    provider_entry_id: string | null;
    provider_horse_id: string | null;
  };
};

type FieldSpec = {
  key: RaceEntryShorthandFieldKey;
  codeSetKey: string;
  sourcePayloadPath: string;
  requiredForMl: boolean;
  getRawValue: (payload: ProviderRaceEntryShorthandPayload) => string | null;
};

const FIELD_SPECS: readonly FieldSpec[] = [
  {
    key: "race_type",
    codeSetKey: "race_type",
    sourcePayloadPath: "race.classCode",
    requiredForMl: true,
    getRawValue: (payload) => normalizeRawValue(payload.race?.classCode),
  },
  {
    key: "surface",
    codeSetKey: "surface",
    sourcePayloadPath: "race.surfaceCode",
    requiredForMl: true,
    getRawValue: (payload) => normalizeRawValue(payload.race?.surfaceCode),
  },
  {
    key: "track_condition",
    codeSetKey: "track_condition",
    sourcePayloadPath: "race.trackConditionCode",
    requiredForMl: false,
    getRawValue: (payload) => normalizeRawValue(payload.race?.trackConditionCode),
  },
  {
    key: "horse_sex",
    codeSetKey: "horse_sex",
    sourcePayloadPath: "horse.sexCode",
    requiredForMl: false,
    getRawValue: (payload) => normalizeRawValue(payload.horse?.sexCode),
  },
  {
    key: "horse_color",
    codeSetKey: "horse_color",
    sourcePayloadPath: "horse.colorCode",
    requiredForMl: false,
    getRawValue: (payload) => normalizeRawValue(payload.horse?.colorCode),
  },
  {
    key: "medication",
    codeSetKey: "medication",
    sourcePayloadPath: "entry.medicationCode",
    requiredForMl: false,
    getRawValue: (payload) => normalizeRawValue(payload.entry?.medicationCode),
  },
  {
    key: "entry_status",
    codeSetKey: "entry_status",
    sourcePayloadPath: "entry.statusCode",
    requiredForMl: true,
    getRawValue: (payload) => normalizeRawValue(payload.entry?.statusCode),
  },
  {
    key: "workout_type",
    codeSetKey: "workout_type",
    sourcePayloadPath: "recentWorkout.workTypeCode",
    requiredForMl: false,
    getRawValue: (payload) => normalizeRawValue(payload.recentWorkout?.workTypeCode),
  },
];

function normalizeRawValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toNormalizedField(
  result: ResolvedRacingCodeNormalization,
): RaceEntrySegmentNormalizedField {
  return {
    code_set_id: result.code_set_id,
    code_value_id: result.code_value_id,
    canonical_code: result.canonical_code,
    canonical_label: result.canonical_label,
    normalized_value: result.normalized_value,
    raw_source_value: result.raw_source_value,
  };
}

function makeNormalizationInput(
  payload: ProviderRaceEntryShorthandPayload,
  context: ProviderRaceEntryParserContext,
  spec: FieldSpec,
  sourceCode: string,
): RacingCodeNormalizationInput {
  return {
    source_system: context.sourceSystem,
    code_set_key: spec.codeSetKey,
    source_code: sourceCode,
    context: {
      segment_type: "race_entry_shorthand",
      parser: "provider_race_entry_shorthand_v1",
      provider: payload.provider ?? context.sourceSystem,
      provider_race_id: payload.race?.providerRaceId ?? null,
      provider_entry_id: payload.entry?.providerEntryId ?? null,
      provider_horse_id: payload.horse?.providerHorseId ?? null,
    },
    entity_type: spec.key === "workout_type" ? "horse_workout" : "race_entry",
    entity_id: payload.entry?.raceEntryId ?? payload.horse?.horseId ?? null,
    race_id: payload.race?.raceId ?? null,
    race_entry_id: payload.entry?.raceEntryId ?? null,
    horse_id: payload.horse?.horseId ?? null,
    opportunity_id: context.opportunityId ?? null,
    job_run_id: context.jobRunId ?? null,
    effective_date: payload.race?.raceDate ?? null,
    source_payload_path: spec.sourcePayloadPath,
    source_url: context.sourceUrl ?? null,
    notes: context.notes ?? null,
    sample_payload: {
      provider: payload.provider ?? context.sourceSystem,
      [spec.sourcePayloadPath]: sourceCode,
    },
  };
}

function getResultReason(
  key: RaceEntryShorthandFieldKey,
  result: RacingCodeNormalizationResult,
) {
  if (result.status === "resolved") {
    return null;
  }

  const rawSourceValue = result.raw_source_value
    ? ` raw=${result.raw_source_value}`
    : "";

  return `${key}: ${result.reason}${rawSourceValue}`;
}

export async function parseProviderRaceEntryShorthandSegment(
  payload: ProviderRaceEntryShorthandPayload,
  context: ProviderRaceEntryParserContext,
): Promise<ParsedProviderRaceEntrySegment> {
  const raw = Object.fromEntries(
    FIELD_SPECS.map((spec) => [spec.key, spec.getRawValue(payload)]),
  ) as Record<RaceEntryShorthandFieldKey, string | null>;
  const normalized: RaceEntrySegmentNormalized = {};
  const unresolvedCodes: ParsedProviderRaceEntrySegment["unresolved_codes"] = [];
  const normalizationResults: ParsedProviderRaceEntrySegment["normalization_results"] =
    {};
  const blockingReasons: string[] = [];
  const warnings: string[] = [];

  for (const spec of FIELD_SPECS) {
    const rawValue = raw[spec.key];

    if (!rawValue) {
      if (spec.requiredForMl) {
        blockingReasons.push(`${spec.key}: missing required shorthand`);
      } else {
        warnings.push(`${spec.key}: optional shorthand not supplied`);
      }
      continue;
    }

    const result = await context.normalizer(
      makeNormalizationInput(payload, context, spec, rawValue),
    );
    normalizationResults[spec.key] = result;

    if (result.status === "resolved") {
      normalized[spec.key] = toNormalizedField(result);
      continue;
    }

    unresolvedCodes.push(result);
    blockingReasons.push(
      getResultReason(spec.key, result) ?? `${spec.key}: unresolved shorthand`,
    );
  }

  const blockedForMl = blockingReasons.length > 0;

  return {
    source_system: context.sourceSystem,
    segment_type: "race_entry_shorthand",
    raw,
    normalized,
    unresolved_codes: unresolvedCodes,
    blocked_for_ml: blockedForMl,
    blocking_reasons: blockingReasons,
    normalization_results: normalizationResults,
    warnings,
    metadata: {
      required_fields: FIELD_SPECS.filter((spec) => spec.requiredForMl).map(
        (spec) => spec.key,
      ),
      optional_fields: FIELD_SPECS.filter((spec) => !spec.requiredForMl).map(
        (spec) => spec.key,
      ),
      ml_feature_materialization_status: blockedForMl ? "blocked" : "ready",
      provider_race_id: payload.race?.providerRaceId ?? null,
      provider_entry_id: payload.entry?.providerEntryId ?? null,
      provider_horse_id: payload.horse?.providerHorseId ?? null,
    },
  };
}
