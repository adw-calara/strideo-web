import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/admin";

type JsonObject = Record<string, unknown>;

type UnresolvedCodeRow = {
  id: string;
  code_set_id: string | null;
  code_set_key: string | null;
  code_set_display_name: string | null;
  source_system: string;
  source_field: string;
  source_code: string;
  source_label: string | null;
  source_description: string | null;
  source_context: JsonObject;
  sample_source_table: string | null;
  sample_source_id: string | null;
  race_id: string | null;
  race_date: string | null;
  opportunity_id: string | null;
  effective_on: string | null;
  source_url: string | null;
  source_job_run_id: string | null;
  status: string;
  resolution_code_alias_id: string | null;
  resolution_track_alias_id: string | null;
  occurrence_count: number;
  first_seen_at: string;
  last_seen_at: string;
  reviewed_at: string | null;
  reviewed_by_user_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type RawUnresolvedCodeRow = Omit<
  UnresolvedCodeRow,
  "code_set_key" | "code_set_display_name"
> & {
  racing_code_sets:
    | {
        code_set_key: string | null;
        display_name: string | null;
      }
    | {
        code_set_key: string | null;
        display_name: string | null;
      }[]
    | null;
};

export type UnresolvedCodeGroup = {
  sourceSystem: string;
  codeSetKey: string | null;
  intendedCodeSet: string;
  sourceField: string;
  sourceCode: string;
  sourceLabel: string | null;
  context: string;
  status: string;
  occurrenceCount: number;
  rowCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  latestJobRunId: string | null;
  opportunityIds: string[];
  reviewerUserIds: string[];
  reviewedAt: string | null;
  resolutionCodeAliasIds: string[];
  resolutionTrackAliasIds: string[];
  rowIds: string[];
};

export type UnresolvedCodeSafetyChecks = {
  repeatedUnknownCodes: UnresolvedCodeGroup[];
  opportunityLinkedCodes: UnresolvedCodeGroup[];
  modelOrValueContextCodes: UnresolvedCodeGroup[];
  staleOpenCodes: UnresolvedCodeGroup[];
  missingSourceSystemCodes: UnresolvedCodeGroup[];
  missingCodeSetContextCodes: UnresolvedCodeGroup[];
  ambiguousAcrossContexts: UnresolvedCodeGroup[];
};

export type UnresolvedRacingCodeReport = {
  generatedAt: string;
  staleThresholdDays: number;
  totalUnresolvedRows: number;
  oldestUnresolvedAt: string | null;
  newestUnresolvedAt: string | null;
  countsByStatus: Record<string, number>;
  countsBySourceSystem: Record<string, number>;
  countsByCodeSet: Record<string, number>;
  countsByContext: Record<string, number>;
  reviewQueue: UnresolvedCodeGroup[];
  safetyChecks: UnresolvedCodeSafetyChecks;
};

export type UnresolvedRacingCodeReportOptions = {
  limit?: number;
  staleThresholdDays?: number;
};

const DEFAULT_LIMIT = 1000;
const DEFAULT_STALE_THRESHOLD_DAYS = 7;
const MISSING_LABEL = "(missing)";

function normalizeRecord(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as JsonObject;
}

function firstNestedCodeSet(
  value: RawUnresolvedCodeRow["racing_code_sets"],
): { code_set_key: string | null; display_name: string | null } | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function normalizeRow(row: RawUnresolvedCodeRow): UnresolvedCodeRow {
  const codeSet = firstNestedCodeSet(row.racing_code_sets);

  return {
    ...row,
    code_set_key: codeSet?.code_set_key ?? null,
    code_set_display_name: codeSet?.display_name ?? null,
    source_context: normalizeRecord(row.source_context),
  };
}

function countBy<T>(
  rows: readonly T[],
  getKey: (row: T) => string | null | undefined,
): Record<string, number> {
  return rows.reduce<Record<string, number>>((counts, row) => {
    const key = getKey(row)?.trim() || MISSING_LABEL;
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function getStringContextValue(
  context: JsonObject,
  keys: readonly string[],
): string | null {
  for (const key of keys) {
    const value = context[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function getContextLabel(row: UnresolvedCodeRow): string {
  return (
    getStringContextValue(row.source_context, [
      "entity_type",
      "entityType",
      "entity",
      "source_entity",
      "sourceEntity",
      "context",
      "field_path",
      "fieldPath",
      "document_type",
      "documentType",
    ]) ??
    row.sample_source_table ??
    row.source_field ??
    MISSING_LABEL
  );
}

function getIntendedCodeSet(row: UnresolvedCodeRow): string {
  return row.code_set_key ?? row.source_field ?? MISSING_LABEL;
}

function minIso(values: string[]): string | null {
  return values.length > 0
    ? values.reduce((oldest, value) => (value < oldest ? value : oldest))
    : null;
}

function maxIso(values: string[]): string | null {
  return values.length > 0
    ? values.reduce((newest, value) => (value > newest ? value : newest))
    : null;
}

function uniqueSorted(values: Array<string | null>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort();
}

function addGroupRow(
  groups: Map<string, UnresolvedCodeGroup>,
  row: UnresolvedCodeRow,
) {
  const context = getContextLabel(row);
  const intendedCodeSet = getIntendedCodeSet(row);
  const key = [
    row.source_system.toLowerCase(),
    intendedCodeSet.toLowerCase(),
    row.source_field.toLowerCase(),
    row.source_code.toLowerCase(),
    row.source_label?.toLowerCase() ?? "",
    context.toLowerCase(),
    row.status.toLowerCase(),
  ].join("|");

  const existing = groups.get(key);

  if (!existing) {
    groups.set(key, {
      sourceSystem: row.source_system,
      codeSetKey: row.code_set_key,
      intendedCodeSet,
      sourceField: row.source_field,
      sourceCode: row.source_code,
      sourceLabel: row.source_label,
      context,
      status: row.status,
      occurrenceCount: row.occurrence_count,
      rowCount: 1,
      firstSeenAt: row.first_seen_at,
      lastSeenAt: row.last_seen_at,
      latestJobRunId: row.source_job_run_id,
      opportunityIds: uniqueSorted([row.opportunity_id]),
      reviewerUserIds: uniqueSorted([row.reviewed_by_user_id]),
      reviewedAt: row.reviewed_at,
      resolutionCodeAliasIds: uniqueSorted([row.resolution_code_alias_id]),
      resolutionTrackAliasIds: uniqueSorted([row.resolution_track_alias_id]),
      rowIds: [row.id],
    });
    return;
  }

  existing.occurrenceCount += row.occurrence_count;
  existing.rowCount += 1;
  existing.firstSeenAt = minIso([existing.firstSeenAt, row.first_seen_at]) ?? existing.firstSeenAt;

  if (row.last_seen_at > existing.lastSeenAt) {
    existing.lastSeenAt = row.last_seen_at;
    existing.latestJobRunId = row.source_job_run_id;
  }

  existing.opportunityIds = uniqueSorted([...existing.opportunityIds, row.opportunity_id]);
  existing.reviewerUserIds = uniqueSorted([
    ...existing.reviewerUserIds,
    row.reviewed_by_user_id,
  ]);
  existing.resolutionCodeAliasIds = uniqueSorted([
    ...existing.resolutionCodeAliasIds,
    row.resolution_code_alias_id,
  ]);
  existing.resolutionTrackAliasIds = uniqueSorted([
    ...existing.resolutionTrackAliasIds,
    row.resolution_track_alias_id,
  ]);
  existing.rowIds = uniqueSorted([...existing.rowIds, row.id]);
  existing.reviewedAt = maxIso([existing.reviewedAt, row.reviewed_at].filter(Boolean) as string[]);
}

function groupRows(rows: readonly UnresolvedCodeRow[]): UnresolvedCodeGroup[] {
  const groups = new Map<string, UnresolvedCodeGroup>();

  for (const row of rows) {
    addGroupRow(groups, row);
  }

  return Array.from(groups.values()).sort((left, right) => {
    const recency = right.lastSeenAt.localeCompare(left.lastSeenAt);

    if (recency !== 0) {
      return recency;
    }

    return right.occurrenceCount - left.occurrenceCount;
  });
}

function isOpenQueueStatus(status: string) {
  return ["open", "reviewing", "deferred"].includes(status);
}

function includesModelOrValueContext(group: UnresolvedCodeGroup) {
  const haystack = [
    group.codeSetKey,
    group.intendedCodeSet,
    group.sourceField,
    group.context,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return [
    "feature",
    "model",
    "prediction",
    "value",
    "score",
    "opportunity_score",
    "value_calculation",
  ].some((needle) => haystack.includes(needle));
}

function buildSafetyChecks(
  groups: readonly UnresolvedCodeGroup[],
  staleThresholdDays: number,
): UnresolvedCodeSafetyChecks {
  const staleBefore = Date.now() - staleThresholdDays * 24 * 60 * 60 * 1000;
  const openGroups = groups.filter((group) => isOpenQueueStatus(group.status));
  const contextKeysBySourceCode = new Map<string, Set<string>>();

  for (const group of openGroups) {
    const key = `${group.sourceSystem.toLowerCase()}|${group.sourceCode.toLowerCase()}`;
    const contextKey = [
      group.codeSetKey ?? group.intendedCodeSet,
      group.sourceField,
      group.context,
    ]
      .join("|")
      .toLowerCase();
    const contexts = contextKeysBySourceCode.get(key) ?? new Set<string>();
    contexts.add(contextKey);
    contextKeysBySourceCode.set(key, contexts);
  }

  return {
    repeatedUnknownCodes: openGroups.filter((group) => group.occurrenceCount > 1),
    opportunityLinkedCodes: groups.filter((group) => group.opportunityIds.length > 0),
    modelOrValueContextCodes: groups.filter(includesModelOrValueContext),
    staleOpenCodes: openGroups.filter(
      (group) => new Date(group.lastSeenAt).getTime() < staleBefore,
    ),
    missingSourceSystemCodes: groups.filter((group) => !group.sourceSystem.trim()),
    missingCodeSetContextCodes: groups.filter(
      (group) =>
        !group.codeSetKey &&
        (!group.intendedCodeSet.trim() || group.intendedCodeSet === MISSING_LABEL),
    ),
    ambiguousAcrossContexts: groups.filter((group) => {
      const key = `${group.sourceSystem.toLowerCase()}|${group.sourceCode.toLowerCase()}`;
      return (contextKeysBySourceCode.get(key)?.size ?? 0) > 1;
    }),
  };
}

export async function getUnresolvedRacingCodeReport(
  options: UnresolvedRacingCodeReportOptions = {},
): Promise<UnresolvedRacingCodeReport> {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const staleThresholdDays =
    options.staleThresholdDays ?? DEFAULT_STALE_THRESHOLD_DAYS;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("racing_unresolved_source_codes")
    .select(
      `
        id,
        code_set_id,
        source_system,
        source_field,
        source_code,
        source_label,
        source_description,
        source_context,
        sample_source_table,
        sample_source_id,
        race_id,
        race_date,
        opportunity_id,
        effective_on,
        source_url,
        source_job_run_id,
        status,
        resolution_code_alias_id,
        resolution_track_alias_id,
        occurrence_count,
        first_seen_at,
        last_seen_at,
        reviewed_at,
        reviewed_by_user_id,
        notes,
        created_at,
        updated_at,
        racing_code_sets (
          code_set_key,
          display_name
        )
      `,
    )
    .order("last_seen_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load unresolved racing codes: ${error.message}`);
  }

  const rows = ((data ?? []) as RawUnresolvedCodeRow[]).map(normalizeRow);
  const reviewQueue = groupRows(rows);

  return {
    generatedAt: new Date().toISOString(),
    staleThresholdDays,
    totalUnresolvedRows: rows.length,
    oldestUnresolvedAt: minIso(rows.map((row) => row.first_seen_at)),
    newestUnresolvedAt: maxIso(rows.map((row) => row.last_seen_at)),
    countsByStatus: countBy(rows, (row) => row.status),
    countsBySourceSystem: countBy(rows, (row) => row.source_system),
    countsByCodeSet: countBy(rows, getIntendedCodeSet),
    countsByContext: countBy(rows, getContextLabel),
    reviewQueue,
    safetyChecks: buildSafetyChecks(reviewQueue, staleThresholdDays),
  };
}
