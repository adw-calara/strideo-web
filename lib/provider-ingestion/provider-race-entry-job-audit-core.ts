import type { ProviderRaceEntryReadinessReport } from "./provider-race-entry-readiness-report";
import {
  STRIDEO_DEV_PROJECT_NAME,
  STRIDEO_DEV_PROJECT_REF,
} from "./provider-race-entry-dev-boundary";

export const PROVIDER_RACE_ENTRY_AUDIT_JOB_KEY =
  "provider-race-entry-readiness-audit";
export const PROVIDER_RACE_ENTRY_AUDIT_AGENT_KEY =
  "provider-ingestion-race-entry-readiness";
export const PROVIDER_RACE_ENTRY_AUDIT_MODE =
  "dev_read_only_readiness_audit";
export const PROVIDER_RACE_ENTRY_AGENT_LOG_APPEND_RPC =
  "append_agent_log_for_service_role";

type JsonRecord = Record<string, unknown>;

export type LinkedSupabaseProject = {
  ref?: string;
  name?: string;
};

export type ProviderRaceEntryAuditTarget = {
  nodeEnv?: string;
  supabaseUrl?: string;
  serviceRoleKeyPresent: boolean;
  linkedProject: LinkedSupabaseProject;
};

export type ProviderRaceEntryAuditJobStatus = "succeeded" | "failed";

export type ProviderRaceEntryAuditAgentLogInput = {
  jobRunId: string;
  agentKey: string;
  level: "info" | "warning" | "error";
  message: string;
  context: JsonRecord;
};

export type ProviderRaceEntryAuditResult = {
  status: ProviderRaceEntryAuditJobStatus;
  targetProject: typeof STRIDEO_DEV_PROJECT_NAME;
  targetRef: typeof STRIDEO_DEV_PROJECT_REF;
  jobKey: typeof PROVIDER_RACE_ENTRY_AUDIT_JOB_KEY;
  agentKey: typeof PROVIDER_RACE_ENTRY_AUDIT_AGENT_KEY;
  jobRunId: string;
  agentLogIds: string[];
  idempotencyKey: string;
  provider: "the_racing_api";
  mode: typeof PROVIDER_RACE_ENTRY_AUDIT_MODE;
  providerIngestionEnabledByDefault: false;
  providerDataWritesPerformed: [];
  supabaseOperations: {
    reads: readonly string[];
    writes: [];
  };
  readiness: {
    status: ProviderRaceEntryReadinessReport["status"] | null;
    readyToRunWriteHarness: boolean;
    blockingReasons: string[];
    plannedWriteTargetTable: string | null;
    plannedWriteOperation: string | null;
    plannedWriteConflictTarget: string | null;
    deterministicRowPrecheckCount: number | null;
  };
  errorMessage: string | null;
};

export type ProviderRaceEntryAuditStore = {
  createJobRun: (input: {
    jobKey: string;
    agentKey: string;
    idempotencyKey: string;
    startedAt: string;
    metadata: JsonRecord;
  }) => Promise<{ id: string }>;
  appendAgentLog: (
    input: ProviderRaceEntryAuditAgentLogInput,
  ) => Promise<{ id: string }>;
  finishJobRun: (input: {
    jobRunId: string;
    status: ProviderRaceEntryAuditJobStatus;
    finishedAt: string;
    output: JsonRecord;
    errorMessage: string | null;
  }) => Promise<void>;
};

export type RunProviderRaceEntryAuditOptions = {
  store: ProviderRaceEntryAuditStore;
  buildReadinessReport: () => Promise<ProviderRaceEntryReadinessReport>;
  idempotencyKey?: string;
  now?: () => Date;
};

export function getProviderRaceEntryAuditTargetBlocker(
  target: ProviderRaceEntryAuditTarget,
) {
  if (target.nodeEnv === "production") {
    return "Refusing to run provider race-entry audit wrapper in production.";
  }

  if (!target.supabaseUrl) {
    return "Missing NEXT_PUBLIC_SUPABASE_URL.";
  }

  if (!target.serviceRoleKeyPresent) {
    return "Missing SUPABASE_SERVICE_ROLE_KEY.";
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(target.supabaseUrl);
  } catch {
    return "Configured Supabase URL is invalid.";
  }

  if (!parsedUrl.hostname.startsWith(`${STRIDEO_DEV_PROJECT_REF}.`)) {
    return `Refusing Supabase target ${parsedUrl.hostname}. Expected ${STRIDEO_DEV_PROJECT_NAME} (${STRIDEO_DEV_PROJECT_REF}).`;
  }

  if (
    target.linkedProject.name !== STRIDEO_DEV_PROJECT_NAME ||
    target.linkedProject.ref !== STRIDEO_DEV_PROJECT_REF
  ) {
    return `Refusing linked project ${target.linkedProject.name ?? "unknown"} (${target.linkedProject.ref ?? "unknown"}). Expected ${STRIDEO_DEV_PROJECT_NAME} (${STRIDEO_DEV_PROJECT_REF}).`;
  }

  return null;
}

export function buildProviderRaceEntryAgentLogAppendRpcArgs(
  input: ProviderRaceEntryAuditAgentLogInput,
) {
  return {
    p_job_run_id: input.jobRunId,
    p_agent_key: input.agentKey,
    p_level: input.level,
    p_message: input.message,
    p_context: input.context,
  };
}

function toIsoString(date: Date) {
  return date.toISOString();
}

function safeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/g, " ").slice(0, 500);
}

function buildAuditInputMetadata(idempotencyKey: string): JsonRecord {
  return {
    targetProject: STRIDEO_DEV_PROJECT_NAME,
    targetRef: STRIDEO_DEV_PROJECT_REF,
    provider: "the_racing_api",
    mode: PROVIDER_RACE_ENTRY_AUDIT_MODE,
    idempotencyKey,
    providerIngestionEnabledByDefault: false,
    providerDataWritesEnabled: false,
    providerDataWritesPerformed: [],
    writeHarnessRemainsExplicit: true,
    automatedIngestionTriggerCreated: false,
  };
}

function buildSuccessOutput(
  report: ProviderRaceEntryReadinessReport,
  agentLogIds: string[],
): Omit<ProviderRaceEntryAuditResult, "jobRunId" | "idempotencyKey"> {
  return {
    status: "succeeded",
    targetProject: STRIDEO_DEV_PROJECT_NAME,
    targetRef: STRIDEO_DEV_PROJECT_REF,
    jobKey: PROVIDER_RACE_ENTRY_AUDIT_JOB_KEY,
    agentKey: PROVIDER_RACE_ENTRY_AUDIT_AGENT_KEY,
    agentLogIds,
    provider: "the_racing_api",
    mode: PROVIDER_RACE_ENTRY_AUDIT_MODE,
    providerIngestionEnabledByDefault: false,
    providerDataWritesPerformed: [],
    supabaseOperations: {
      reads: report.supabaseOperations.reads,
      writes: [],
    },
    readiness: {
      status: report.status,
      readyToRunWriteHarness: report.readyToRunWriteHarness,
      blockingReasons: report.blockingReasons,
      plannedWriteTargetTable: report.persistenceReadiness.targetTable,
      plannedWriteOperation: report.persistenceReadiness.upsert?.operation ?? null,
      plannedWriteConflictTarget:
        report.persistenceReadiness.upsert?.conflictTarget ?? null,
      deterministicRowPrecheckCount: report.deterministicRowPrecheck.count,
    },
    errorMessage: null,
  };
}

function buildFailureOutput(
  message: string,
  agentLogIds: string[],
): Omit<ProviderRaceEntryAuditResult, "jobRunId" | "idempotencyKey"> {
  return {
    status: "failed",
    targetProject: STRIDEO_DEV_PROJECT_NAME,
    targetRef: STRIDEO_DEV_PROJECT_REF,
    jobKey: PROVIDER_RACE_ENTRY_AUDIT_JOB_KEY,
    agentKey: PROVIDER_RACE_ENTRY_AUDIT_AGENT_KEY,
    agentLogIds,
    provider: "the_racing_api",
    mode: PROVIDER_RACE_ENTRY_AUDIT_MODE,
    providerIngestionEnabledByDefault: false,
    providerDataWritesPerformed: [],
    supabaseOperations: {
      reads: [],
      writes: [],
    },
    readiness: {
      status: null,
      readyToRunWriteHarness: false,
      blockingReasons: [message],
      plannedWriteTargetTable: null,
      plannedWriteOperation: null,
      plannedWriteConflictTarget: null,
      deterministicRowPrecheckCount: null,
    },
    errorMessage: message,
  };
}

export async function runProviderRaceEntryReadinessAudit({
  store,
  buildReadinessReport,
  idempotencyKey = crypto.randomUUID(),
  now = () => new Date(),
}: RunProviderRaceEntryAuditOptions): Promise<ProviderRaceEntryAuditResult> {
  const startedAt = toIsoString(now());
  const inputMetadata = buildAuditInputMetadata(idempotencyKey);
  const jobRun = await store.createJobRun({
    jobKey: PROVIDER_RACE_ENTRY_AUDIT_JOB_KEY,
    agentKey: PROVIDER_RACE_ENTRY_AUDIT_AGENT_KEY,
    idempotencyKey,
    startedAt,
    metadata: inputMetadata,
  });
  const agentLogIds: string[] = [];

  async function log(input: Parameters<ProviderRaceEntryAuditStore["appendAgentLog"]>[0]) {
    const row = await store.appendAgentLog(input);
    agentLogIds.push(row.id);
  }

  await log({
    jobRunId: jobRun.id,
    agentKey: PROVIDER_RACE_ENTRY_AUDIT_AGENT_KEY,
    level: "info",
    message: "Provider race-entry readiness audit started.",
    context: inputMetadata,
  });

  try {
    const report = await buildReadinessReport();
    const completedAt = toIsoString(now());
    const level = report.status === "ready" ? "info" : "warning";

    await log({
      jobRunId: jobRun.id,
      agentKey: PROVIDER_RACE_ENTRY_AUDIT_AGENT_KEY,
      level,
      message: "Provider race-entry readiness audit completed.",
      context: {
        readinessStatus: report.status,
        readyToRunWriteHarness: report.readyToRunWriteHarness,
        blockingReasons: report.blockingReasons,
        providerDataWritesPerformed: [],
        supabaseOperations: report.supabaseOperations,
      },
    });

    const output = buildSuccessOutput(report, agentLogIds);
    await store.finishJobRun({
      jobRunId: jobRun.id,
      status: "succeeded",
      finishedAt: completedAt,
      output,
      errorMessage: null,
    });

    return {
      ...output,
      jobRunId: jobRun.id,
      idempotencyKey,
    };
  } catch (error) {
    const message = safeErrorMessage(error);
    const failedAt = toIsoString(now());

    await log({
      jobRunId: jobRun.id,
      agentKey: PROVIDER_RACE_ENTRY_AUDIT_AGENT_KEY,
      level: "error",
      message: "Provider race-entry readiness audit failed.",
      context: {
        errorMessage: message,
        providerDataWritesPerformed: [],
      },
    });

    const output = buildFailureOutput(message, agentLogIds);
    await store.finishJobRun({
      jobRunId: jobRun.id,
      status: "failed",
      finishedAt: failedAt,
      output,
      errorMessage: message,
    });

    return {
      ...output,
      jobRunId: jobRun.id,
      idempotencyKey,
    };
  }
}
