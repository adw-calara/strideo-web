export type JsonObject = Record<string, unknown>;

export type RacingCodeNormalizationInput = {
  source_system?: string;
  code_set_key?: string;
  source_code?: string;
  source_label?: string | null;
  source_description?: string | null;
  context?: JsonObject;
  entity_type?: string | null;
  entity_id?: string | null;
  race_id?: string | null;
  race_date?: string | null;
  race_entry_id?: string | null;
  horse_id?: string | null;
  opportunity_id?: string | null;
  job_run_id?: string | null;
  effective_date?: string | null;
  source_payload_path?: string | null;
  source_url?: string | null;
  notes?: string | null;
  sample_payload?: JsonObject;
};

export type ValidatedRacingCodeNormalizationInput = {
  source_system: string;
  code_set_key: string;
  source_code: string;
  source_label: string | null;
  source_description: string | null;
  context: JsonObject;
  entity_type: string | null;
  entity_id: string | null;
  race_id: string | null;
  race_date: string | null;
  race_entry_id: string | null;
  horse_id: string | null;
  opportunity_id: string | null;
  job_run_id: string | null;
  effective_date: string | null;
  source_payload_path: string | null;
  source_url: string | null;
  notes: string | null;
  sample_payload: JsonObject;
  raw_source_value: string;
};

export type ResolvedRacingCodeAlias = {
  alias_id: string;
  code_set_id: string;
  code_value_id: string;
  canonical_code: string;
  canonical_label: string;
  normalized_value: JsonObject;
  source_system: string;
  source_code: string;
  source_label: string | null;
  effective_from: string | null;
  effective_to: string | null;
};

export type ResolvedRacingCodeNormalization = {
  status: "resolved";
  blocked_for_ml: false;
  alias_id: string;
  code_set_id: string;
  code_value_id: string;
  canonical_code: string;
  canonical_label: string;
  normalized_value: JsonObject;
  source_system: string;
  source_code: string;
  source_label: string | null;
  raw_source_value: string;
  effective_date: string | null;
};

export type UnresolvedRacingCodeNormalization = {
  status: "unresolved";
  blocked_for_ml: true;
  unresolved_source_code_id: string | null;
  source_system: string;
  code_set_key: string;
  source_code: string;
  source_label: string | null;
  context: JsonObject;
  reason: string;
  raw_source_value: string;
};

export type InvalidRacingCodeNormalization = {
  status: "invalid";
  blocked_for_ml: true;
  reason: string;
  source_system: string | null;
  code_set_key: string | null;
  source_code: string | null;
  raw_source_value: string | null;
};

export type RacingCodeNormalizationResult =
  | ResolvedRacingCodeNormalization
  | UnresolvedRacingCodeNormalization
  | InvalidRacingCodeNormalization;

export type RacingCodeAliasClassification =
  | {
      status: "valid";
      input: ValidatedRacingCodeNormalizationInput;
      result: ResolvedRacingCodeNormalization | UnresolvedRacingCodeNormalization;
    }
  | {
      status: "invalid";
      result: InvalidRacingCodeNormalization;
    };

function normalizeOptionalString(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeContext(value: JsonObject | undefined): JsonObject {
  if (!value || Array.isArray(value)) {
    return {};
  }

  return value;
}

function hasValidDateShape(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function invalidResult(
  input: RacingCodeNormalizationInput,
  reason: string,
): InvalidRacingCodeNormalization {
  return {
    status: "invalid",
    blocked_for_ml: true,
    reason,
    source_system: normalizeOptionalString(input.source_system),
    code_set_key: normalizeOptionalString(input.code_set_key),
    source_code: normalizeOptionalString(input.source_code),
    raw_source_value: input.source_code ?? null,
  };
}

export function validateRacingCodeNormalizationInput(
  input: RacingCodeNormalizationInput,
): { status: "valid"; input: ValidatedRacingCodeNormalizationInput } | {
  status: "invalid";
  result: InvalidRacingCodeNormalization;
} {
  const sourceSystem = normalizeOptionalString(input.source_system);
  const codeSetKey = normalizeOptionalString(input.code_set_key);
  const sourceCode = normalizeOptionalString(input.source_code);
  const effectiveDate = normalizeOptionalString(input.effective_date);

  if (!sourceSystem) {
    return {
      status: "invalid",
      result: invalidResult(input, "source_system is required"),
    };
  }

  if (!codeSetKey) {
    return {
      status: "invalid",
      result: invalidResult(input, "code_set_key is required"),
    };
  }

  if (!sourceCode) {
    return {
      status: "invalid",
      result: invalidResult(input, "source_code is required"),
    };
  }

  if (effectiveDate && !hasValidDateShape(effectiveDate)) {
    return {
      status: "invalid",
      result: invalidResult(input, "effective_date must use YYYY-MM-DD"),
    };
  }

  return {
    status: "valid",
    input: {
      source_system: sourceSystem,
      code_set_key: codeSetKey,
      source_code: sourceCode,
      source_label: normalizeOptionalString(input.source_label),
      source_description: normalizeOptionalString(input.source_description),
      context: normalizeContext(input.context),
      entity_type: normalizeOptionalString(input.entity_type),
      entity_id: normalizeOptionalString(input.entity_id),
      race_id: normalizeOptionalString(input.race_id),
      race_date: normalizeOptionalString(input.race_date),
      race_entry_id: normalizeOptionalString(input.race_entry_id),
      horse_id: normalizeOptionalString(input.horse_id),
      opportunity_id: normalizeOptionalString(input.opportunity_id),
      job_run_id: normalizeOptionalString(input.job_run_id),
      effective_date: effectiveDate,
      source_payload_path: normalizeOptionalString(input.source_payload_path),
      source_url: normalizeOptionalString(input.source_url),
      notes: normalizeOptionalString(input.notes),
      sample_payload: normalizeContext(input.sample_payload),
      raw_source_value: input.source_code ?? sourceCode,
    },
  };
}

export function buildRacingCodeContext(
  input: ValidatedRacingCodeNormalizationInput,
  reason?: string,
  extraContext: JsonObject = {},
): JsonObject {
  return {
    ...input.context,
    ...extraContext,
    ...(input.entity_type ? { entity_type: input.entity_type } : {}),
    ...(input.entity_id ? { entity_id: input.entity_id } : {}),
    ...(input.race_entry_id ? { race_entry_id: input.race_entry_id } : {}),
    ...(input.horse_id ? { horse_id: input.horse_id } : {}),
    ...(input.source_payload_path
      ? { source_payload_path: input.source_payload_path }
      : {}),
    ...(reason ? { normalization_reason: reason } : {}),
    raw_source_value: input.raw_source_value,
  };
}

export function buildResolvedRacingCodeResult(
  input: ValidatedRacingCodeNormalizationInput,
  alias: ResolvedRacingCodeAlias,
): ResolvedRacingCodeNormalization {
  return {
    status: "resolved",
    blocked_for_ml: false,
    alias_id: alias.alias_id,
    code_set_id: alias.code_set_id,
    code_value_id: alias.code_value_id,
    canonical_code: alias.canonical_code,
    canonical_label: alias.canonical_label,
    normalized_value: alias.normalized_value,
    source_system: input.source_system,
    source_code: input.source_code,
    source_label: input.source_label,
    raw_source_value: input.raw_source_value,
    effective_date: input.effective_date,
  };
}

export function buildUnresolvedRacingCodeResult(
  input: ValidatedRacingCodeNormalizationInput,
  reason: string,
  unresolvedSourceCodeId: string | null = null,
  extraContext: JsonObject = {},
): UnresolvedRacingCodeNormalization {
  return {
    status: "unresolved",
    blocked_for_ml: true,
    unresolved_source_code_id: unresolvedSourceCodeId,
    source_system: input.source_system,
    code_set_key: input.code_set_key,
    source_code: input.source_code,
    source_label: input.source_label,
    context: buildRacingCodeContext(input, reason, extraContext),
    reason,
    raw_source_value: input.raw_source_value,
  };
}

export function classifyRacingCodeAliases(
  input: RacingCodeNormalizationInput,
  aliases: readonly ResolvedRacingCodeAlias[],
): RacingCodeAliasClassification {
  const validation = validateRacingCodeNormalizationInput(input);

  if (validation.status === "invalid") {
    return validation;
  }

  if (aliases.length === 1) {
    return {
      status: "valid",
      input: validation.input,
      result: buildResolvedRacingCodeResult(validation.input, aliases[0]),
    };
  }

  if (aliases.length > 1) {
    return {
      status: "valid",
      input: validation.input,
      result: buildUnresolvedRacingCodeResult(
        validation.input,
        "multiple active aliases matched the source code",
        null,
        {
          ambiguous_alias_ids: aliases.map((alias) => alias.alias_id),
          ambiguous_code_value_ids: aliases.map((alias) => alias.code_value_id),
        },
      ),
    };
  }

  return {
    status: "valid",
    input: validation.input,
    result: buildUnresolvedRacingCodeResult(
      validation.input,
      "no active alias matched the source code",
    ),
  };
}

export function shouldBlockMlFeature(result: RacingCodeNormalizationResult) {
  return result.blocked_for_ml;
}
