import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/admin";

export const EMPTY_IMPORT_STATUS_MESSAGE =
  "No import batches are available yet.";

export type ImportStatusDataStatus = "loaded" | "empty";

export type ImportBatchStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export type ImportBatchDisplayState = "success" | "warning" | "error" | "pending";

export type ImportBatchMetadataSummary = {
  displayName: string | null;
  summary: string | null;
  provider: string | null;
  warningCount: number;
  affectedTrackCount: number | null;
  affectedRaceCount: number | null;
  affectedEntryCount: number | null;
  completedRaceCount: number | null;
  scheduledRaceCount: number | null;
  oddsSnapshotCount: number | null;
  resultVersionCount: number | null;
  resultEntryCount: number | null;
  sourceDetailsHidden: boolean;
  sourceDetailsNote: string | null;
  warnings: string[];
};

export type ImportBatchStatusItem = {
  id: string;
  batchKey: string;
  sourceSystem: string;
  dataDomain: string;
  ingestionScope: string;
  status: ImportBatchStatus;
  coverageStartDate: string | null;
  coverageEndDate: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  rowCount: number | null;
  errorCount: number;
  createdAt: string;
  displayState: ImportBatchDisplayState;
  metadata: ImportBatchMetadataSummary;
};

export type ImportStatusSummary = {
  batchCount: number;
  successfulCount: number;
  warningCount: number;
  failedCount: number;
  runningCount: number;
};

export type ImportStatusListResult = {
  status: ImportStatusDataStatus;
  batches: ImportBatchStatusItem[];
  summary: ImportStatusSummary;
  message: string;
};

type RawImportBatchRow = {
  id: string;
  batch_key: string;
  source_system: string;
  data_domain: string;
  ingestion_scope: string;
  status: ImportBatchStatus;
  coverage_start_date: string | null;
  coverage_end_date: string | null;
  started_at: string | null;
  finished_at: string | null;
  row_count: number | null;
  error_count: number | null;
  metadata: unknown;
  created_at: string;
};

function raiseImportStatusError(operation: string) {
  throw new Error(`Import status data is unavailable during ${operation}.`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" ? value : null;
}

function readNumber(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readBoolean(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "boolean" ? value : false;
}

function readWarnings(metadata: Record<string, unknown>) {
  const value = metadata.warnings;

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function sanitizeMetadata(value: unknown): ImportBatchMetadataSummary {
  const metadata = isRecord(value) ? value : {};
  const warnings = readWarnings(metadata);

  return {
    displayName: readString(metadata, "display_name"),
    summary: readString(metadata, "summary"),
    provider: readString(metadata, "provider"),
    warningCount: readNumber(metadata, "warning_count") ?? warnings.length,
    affectedTrackCount: readNumber(metadata, "affected_track_count"),
    affectedRaceCount: readNumber(metadata, "affected_race_count"),
    affectedEntryCount: readNumber(metadata, "affected_entry_count"),
    completedRaceCount: readNumber(metadata, "completed_race_count"),
    scheduledRaceCount: readNumber(metadata, "scheduled_race_count"),
    oddsSnapshotCount: readNumber(metadata, "odds_snapshot_count"),
    resultVersionCount: readNumber(metadata, "result_version_count"),
    resultEntryCount: readNumber(metadata, "result_entry_count"),
    sourceDetailsHidden: readBoolean(metadata, "source_details_hidden"),
    sourceDetailsNote: readString(metadata, "source_details_note"),
    warnings,
  };
}

function getDisplayState(
  status: ImportBatchStatus,
  errorCount: number,
  warningCount: number,
): ImportBatchDisplayState {
  if (status === "failed" || errorCount > 0) {
    return "error";
  }

  if (warningCount > 0) {
    return "warning";
  }

  if (status === "queued" || status === "running") {
    return "pending";
  }

  return "success";
}

function mapImportBatch(row: RawImportBatchRow): ImportBatchStatusItem {
  const metadata = sanitizeMetadata(row.metadata);
  const errorCount = row.error_count ?? 0;

  return {
    id: row.id,
    batchKey: row.batch_key,
    sourceSystem: row.source_system,
    dataDomain: row.data_domain,
    ingestionScope: row.ingestion_scope,
    status: row.status,
    coverageStartDate: row.coverage_start_date,
    coverageEndDate: row.coverage_end_date,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    rowCount: row.row_count,
    errorCount,
    createdAt: row.created_at,
    displayState: getDisplayState(
      row.status,
      errorCount,
      metadata.warningCount,
    ),
    metadata,
  };
}

function summarizeImportBatches(
  batches: ImportBatchStatusItem[],
): ImportStatusSummary {
  return batches.reduce<ImportStatusSummary>(
    (summary, batch) => {
      summary.batchCount += 1;

      if (batch.displayState === "success") {
        summary.successfulCount += 1;
      }

      if (batch.displayState === "warning") {
        summary.warningCount += 1;
      }

      if (batch.displayState === "error") {
        summary.failedCount += 1;
      }

      if (batch.displayState === "pending") {
        summary.runningCount += 1;
      }

      return summary;
    },
    {
      batchCount: 0,
      successfulCount: 0,
      warningCount: 0,
      failedCount: 0,
      runningCount: 0,
    },
  );
}

export async function listImportBatches(): Promise<ImportStatusListResult> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("data_ingestion_batches")
    .select(
      `
        id,
        batch_key,
        source_system,
        data_domain,
        ingestion_scope,
        status,
        coverage_start_date,
        coverage_end_date,
        started_at,
        finished_at,
        row_count,
        error_count,
        metadata,
        created_at
      `,
    )
    .order("created_at", { ascending: false })
    .limit(25)
    .returns<RawImportBatchRow[]>();

  if (error) {
    raiseImportStatusError("batch list");
  }

  const batches = (data ?? []).map(mapImportBatch);
  const summary = summarizeImportBatches(batches);

  return {
    status: batches.length > 0 ? "loaded" : "empty",
    batches,
    summary,
    message:
      batches.length > 0
        ? `${batches.length} import batch${batches.length === 1 ? "" : "es"} loaded.`
        : EMPTY_IMPORT_STATUS_MESSAGE,
  };
}
