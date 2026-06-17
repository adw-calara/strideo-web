export type ProviderRaceEntryReadinessDisplayState =
  | "ready"
  | "blocked"
  | "unavailable";

type ProviderRaceEntryReadinessDisplayReport = {
  status: "ready" | "blocked";
  targetProject: string;
  targetRef: string;
  workflow: {
    providerIngestionEnabledByDefault: boolean;
  };
  normalization: {
    warningCount: number;
    writePlanPresent: boolean;
  };
  deterministicRowPrecheck: {
    count: number;
  };
  readyToRunWriteHarness: boolean;
  blockingReasons: string[];
  supabaseOperations: {
    reads: readonly string[];
    writes: readonly string[];
  };
};

export type ProviderRaceEntryReadinessDisplayModel = {
  state: ProviderRaceEntryReadinessDisplayState;
  badgeLabel: string;
  badgeVariant: "default" | "secondary" | "destructive" | "outline";
  targetLabel: string;
  statusText: string;
  boundaryNotice: string;
  disabledNotice: string;
  readTables: string[];
  writesPlannedOrExecuted: string[];
  blockingReasons: string[];
  metrics: {
    deterministicRows: number;
    normalizationWarnings: number;
    writePlanPresent: boolean;
    readyToRunWriteHarness: boolean;
  };
};

export function buildProviderRaceEntryReadinessDisplayModel(
  report: ProviderRaceEntryReadinessDisplayReport,
): ProviderRaceEntryReadinessDisplayModel {
  const hasWrites = report.supabaseOperations.writes.length > 0;
  const isReady =
    report.status === "ready" &&
    report.readyToRunWriteHarness &&
    !hasWrites &&
    report.workflow.providerIngestionEnabledByDefault === false;
  const state: ProviderRaceEntryReadinessDisplayState = isReady
    ? "ready"
    : "blocked";
  const blockingReasons = [
    ...report.blockingReasons,
    hasWrites
      ? "Read-only visibility surface received unexpected write operations."
      : null,
    report.workflow.providerIngestionEnabledByDefault
      ? "Provider ingestion is unexpectedly enabled."
      : null,
  ].filter((reason): reason is string => typeof reason === "string");

  return {
    state,
    badgeLabel: state === "ready" ? "Ready" : "Blocked",
    badgeVariant: state === "ready" ? "default" : "secondary",
    targetLabel: `${report.targetProject} / ${report.targetRef}`,
    statusText:
      state === "ready"
        ? "Race-entry persistence readiness is clean for the reviewed Dev harness."
        : "Race-entry persistence readiness needs operator review before any write verification.",
    boundaryNotice:
      "Dev-only status visibility. This surface reads readiness inputs and does not run provider ingestion.",
    disabledNotice:
      "Provider ingestion remains disabled by default; the separate write verification harness still requires explicit operator review.",
    readTables: [...report.supabaseOperations.reads],
    writesPlannedOrExecuted: [...report.supabaseOperations.writes],
    blockingReasons,
    metrics: {
      deterministicRows: report.deterministicRowPrecheck.count,
      normalizationWarnings: report.normalization.warningCount,
      writePlanPresent: report.normalization.writePlanPresent,
      readyToRunWriteHarness: report.readyToRunWriteHarness,
    },
  };
}

export function buildUnavailableProviderRaceEntryReadinessDisplayModel(
  reason: string,
): ProviderRaceEntryReadinessDisplayModel {
  return {
    state: "unavailable",
    badgeLabel: "Unavailable",
    badgeVariant: "outline",
    targetLabel: "Strideo Dev only",
    statusText: "Provider race-entry readiness is not available for this runtime.",
    boundaryNotice:
      "Dev-only status visibility. This surface does not read non-Dev Supabase projects.",
    disabledNotice:
      "Provider ingestion remains disabled by default; no ingestion action is available here.",
    readTables: [],
    writesPlannedOrExecuted: [],
    blockingReasons: [reason],
    metrics: {
      deterministicRows: 0,
      normalizationWarnings: 0,
      writePlanPresent: false,
      readyToRunWriteHarness: false,
    },
  };
}
