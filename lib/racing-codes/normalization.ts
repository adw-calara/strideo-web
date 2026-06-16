import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  buildRacingCodeContext,
  buildResolvedRacingCodeResult,
  buildUnresolvedRacingCodeResult,
  type JsonObject,
  type RacingCodeNormalizationInput,
  type RacingCodeNormalizationResult,
  type ResolvedRacingCodeAlias,
  type UnresolvedRacingCodeNormalization,
  type ValidatedRacingCodeNormalizationInput,
  validateRacingCodeNormalizationInput,
} from "./normalization-core";

type ServiceRoleClient = ReturnType<typeof createServiceRoleClient>;

type CodeSetRow = {
  id: string;
  code_set_key: string;
};

type AliasValueRow = {
  id: string;
  canonical_code: string;
  canonical_label: string;
  normalized_value: JsonObject | null;
};

type AliasRow = {
  id: string;
  code_set_id: string;
  code_value_id: string;
  source_system: string;
  source_code: string;
  source_label: string | null;
  effective_from: string | null;
  effective_to: string | null;
  racing_code_values: AliasValueRow | AliasValueRow[] | null;
};

type ActiveUnresolvedRow = {
  id: string;
  occurrence_count: number;
  source_context: JsonObject | null;
  sample_payload: JsonObject | null;
};

type RecordUnresolvedOptions = {
  reason: string;
  codeSetId?: string | null;
  extraContext?: JsonObject;
  client?: ServiceRoleClient;
};

const ACTIVE_UNRESOLVED_STATUSES = ["open", "reviewing", "deferred"];
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeNestedValue(
  value: AliasRow["racing_code_values"],
): AliasValueRow | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function normalizeAliasRow(row: AliasRow): ResolvedRacingCodeAlias | null {
  const value = normalizeNestedValue(row.racing_code_values);

  if (!value) {
    return null;
  }

  return {
    alias_id: row.id,
    code_set_id: row.code_set_id,
    code_value_id: row.code_value_id,
    canonical_code: value.canonical_code,
    canonical_label: value.canonical_label,
    normalized_value: value.normalized_value ?? {},
    source_system: row.source_system,
    source_code: row.source_code,
    source_label: row.source_label,
    effective_from: row.effective_from,
    effective_to: row.effective_to,
  };
}

function getSourceField(input: ValidatedRacingCodeNormalizationInput) {
  return input.source_payload_path ?? input.code_set_key;
}

function getUuid(value: string | null) {
  return value && UUID_PATTERN.test(value) ? value : null;
}

function hasUniqueViolation(error: { code?: string } | null) {
  return error?.code === "23505";
}

async function getCodeSet(
  client: ServiceRoleClient,
  codeSetKey: string,
): Promise<CodeSetRow | null> {
  const { data, error } = await client
    .from("racing_code_sets")
    .select("id, code_set_key")
    .ilike("code_set_key", codeSetKey)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to look up racing code set: ${error.message}`);
  }

  return data as CodeSetRow | null;
}

async function getActiveUnresolvedRow(
  client: ServiceRoleClient,
  input: ValidatedRacingCodeNormalizationInput,
  codeSetId: string | null,
): Promise<ActiveUnresolvedRow | null> {
  let query = client
    .from("racing_unresolved_source_codes")
    .select("id, occurrence_count, source_context, sample_payload")
    .in("status", ACTIVE_UNRESOLVED_STATUSES)
    .ilike("source_system", input.source_system)
    .ilike("source_field", getSourceField(input))
    .ilike("source_code", input.source_code)
    .order("last_seen_at", { ascending: false })
    .limit(1);

  query = codeSetId ? query.eq("code_set_id", codeSetId) : query.is("code_set_id", null);
  query = input.effective_date
    ? query.eq("effective_on", input.effective_date)
    : query.is("effective_on", null);

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(`Failed to look up unresolved racing code: ${error.message}`);
  }

  return data as ActiveUnresolvedRow | null;
}

async function updateActiveUnresolvedRow(
  client: ServiceRoleClient,
  row: ActiveUnresolvedRow,
  input: ValidatedRacingCodeNormalizationInput,
  reason: string,
  extraContext: JsonObject,
): Promise<string> {
  const now = new Date().toISOString();
  const sourceContext = {
    ...(row.source_context ?? {}),
    ...buildRacingCodeContext(input, reason, extraContext),
  };
  const samplePayload = {
    ...(row.sample_payload ?? {}),
    ...input.sample_payload,
  };
  const { data, error } = await client
    .from("racing_unresolved_source_codes")
    .update({
      occurrence_count: row.occurrence_count + 1,
      last_seen_at: now,
      updated_at: now,
      source_label: input.source_label,
      source_description: input.source_description,
      source_context: sourceContext,
      sample_payload: samplePayload,
      source_url: input.source_url,
      source_job_run_id: getUuid(input.job_run_id),
      notes: input.notes,
    })
    .eq("id", row.id)
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to update unresolved racing code: ${error.message}`);
  }

  return data.id as string;
}

async function insertUnresolvedRow(
  client: ServiceRoleClient,
  input: ValidatedRacingCodeNormalizationInput,
  codeSetId: string | null,
  reason: string,
  extraContext: JsonObject,
): Promise<string> {
  const sourceField = getSourceField(input);
  const raceDate = input.race_date;
  const { data, error } = await client
    .from("racing_unresolved_source_codes")
    .insert({
      code_set_id: codeSetId,
      source_system: input.source_system,
      source_field: sourceField,
      source_code: input.source_code,
      source_label: input.source_label,
      source_description: input.source_description,
      source_context: buildRacingCodeContext(input, reason, extraContext),
      sample_payload: input.sample_payload,
      sample_source_table: input.entity_type,
      sample_source_id: getUuid(input.entity_id),
      race_id: raceDate ? getUuid(input.race_id) : null,
      race_date: raceDate,
      opportunity_id: raceDate ? getUuid(input.opportunity_id) : null,
      effective_on: input.effective_date,
      source_url: input.source_url,
      source_job_run_id: getUuid(input.job_run_id),
      status: "open",
      occurrence_count: 1,
      notes: input.notes ?? `Normalization reason: ${reason}`,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id as string;
}

export async function resolveRacingCodeAlias(
  input: RacingCodeNormalizationInput,
  client: ServiceRoleClient = createServiceRoleClient(),
): Promise<ResolvedRacingCodeAlias[]> {
  const validation = validateRacingCodeNormalizationInput(input);

  if (validation.status === "invalid") {
    return [];
  }

  const codeSet = await getCodeSet(client, validation.input.code_set_key);

  if (!codeSet) {
    return [];
  }

  let query = client
    .from("racing_code_aliases")
    .select(
      `
        id,
        code_set_id,
        code_value_id,
        source_system,
        source_code,
        source_label,
        effective_from,
        effective_to,
        racing_code_values!inner (
          id,
          canonical_code,
          canonical_label,
          normalized_value
        )
      `,
    )
    .eq("code_set_id", codeSet.id)
    .eq("is_active", true)
    .ilike("source_system", validation.input.source_system)
    .ilike("source_code", validation.input.source_code);

  if (validation.input.effective_date) {
    query = query
      .or(`effective_from.is.null,effective_from.lte.${validation.input.effective_date}`)
      .or(`effective_to.is.null,effective_to.gte.${validation.input.effective_date}`);
  } else {
    query = query.is("effective_to", null);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to resolve racing code alias: ${error.message}`);
  }

  return ((data ?? []) as AliasRow[])
    .map(normalizeAliasRow)
    .filter((alias): alias is ResolvedRacingCodeAlias => Boolean(alias));
}

export async function recordUnresolvedRacingCode(
  input: RacingCodeNormalizationInput,
  options: RecordUnresolvedOptions,
): Promise<UnresolvedRacingCodeNormalization | RacingCodeNormalizationResult> {
  const validation = validateRacingCodeNormalizationInput(input);

  if (validation.status === "invalid") {
    return validation.result;
  }

  const client = options.client ?? createServiceRoleClient();
  const codeSetId =
    options.codeSetId === undefined
      ? (await getCodeSet(client, validation.input.code_set_key))?.id ?? null
      : options.codeSetId;
  const extraContext = options.extraContext ?? {};
  const existing = await getActiveUnresolvedRow(client, validation.input, codeSetId);

  if (existing) {
    const id = await updateActiveUnresolvedRow(
      client,
      existing,
      validation.input,
      options.reason,
      extraContext,
    );
    return buildUnresolvedRacingCodeResult(
      validation.input,
      options.reason,
      id,
      extraContext,
    );
  }

  try {
    const id = await insertUnresolvedRow(
      client,
      validation.input,
      codeSetId,
      options.reason,
      extraContext,
    );
    return buildUnresolvedRacingCodeResult(
      validation.input,
      options.reason,
      id,
      extraContext,
    );
  } catch (error) {
    if (!hasUniqueViolation(error as { code?: string })) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to insert unresolved racing code: ${message}`);
    }

    const racedRow = await getActiveUnresolvedRow(client, validation.input, codeSetId);

    if (!racedRow) {
      throw new Error("Unresolved racing-code insert conflicted but no active row was found.");
    }

    const id = await updateActiveUnresolvedRow(
      client,
      racedRow,
      validation.input,
      options.reason,
      extraContext,
    );
    return buildUnresolvedRacingCodeResult(
      validation.input,
      options.reason,
      id,
      extraContext,
    );
  }
}

export async function normalizeOrFlagRacingCode(
  input: RacingCodeNormalizationInput,
  client: ServiceRoleClient = createServiceRoleClient(),
): Promise<RacingCodeNormalizationResult> {
  const validation = validateRacingCodeNormalizationInput(input);

  if (validation.status === "invalid") {
    return validation.result;
  }

  const codeSet = await getCodeSet(client, validation.input.code_set_key);
  const aliases = codeSet ? await resolveRacingCodeAlias(input, client) : [];

  if (aliases.length === 1) {
    return buildResolvedRacingCodeResult(validation.input, aliases[0]);
  }

  const reason =
    aliases.length > 1
      ? "multiple active aliases matched the source code"
      : "no active alias matched the source code";

  return recordUnresolvedRacingCode(input, {
    client,
    codeSetId: codeSet?.id ?? null,
    reason,
    extraContext:
      aliases.length > 1
        ? {
            ambiguous_alias_ids: aliases.map((alias) => alias.alias_id),
            ambiguous_code_value_ids: aliases.map((alias) => alias.code_value_id),
          }
        : {},
  });
}

export async function normalizeRacingCode(
  input: RacingCodeNormalizationInput,
  client?: ServiceRoleClient,
) {
  return normalizeOrFlagRacingCode(input, client);
}
