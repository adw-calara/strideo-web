import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ProviderRaceEntryReadinessReport } from "./provider-race-entry-readiness-report";
import {
  PROVIDER_RACE_ENTRY_AGENT_LOG_APPEND_RPC,
  PROVIDER_RACE_ENTRY_AUDIT_AGENT_KEY,
  PROVIDER_RACE_ENTRY_AUDIT_JOB_KEY,
  buildProviderRaceEntryAgentLogAppendRpcArgs,
  getProviderRaceEntryAuditTargetBlocker,
  runProviderRaceEntryReadinessAudit,
  type ProviderRaceEntryAuditStore,
} from "./provider-race-entry-job-audit-core";
import {
  STRIDEO_DEV_PROJECT_NAME,
  STRIDEO_DEV_PROJECT_REF,
} from "./provider-race-entry-dev-boundary";

function makeReadinessReport(
  overrides: Partial<ProviderRaceEntryReadinessReport> = {},
): ProviderRaceEntryReadinessReport {
  return {
    status: "blocked",
    targetProject: STRIDEO_DEV_PROJECT_NAME,
    targetRef: STRIDEO_DEV_PROJECT_REF,
    workflow: {
      mode: "read_only_status",
      providerIngestionEnabledByDefault: false,
      writesPerformed: [],
      writeHarnessCommand: "npm run provider-ingestion:verify:race-entry-dev",
      writeHarnessRequiresReview: true,
    },
    fixture: "the-racing-api-race-entry-runtime-verification",
    targetTable: "race_entries",
    expectedRowIdentity: {
      provider: "the_racing_api",
      providerEntryId: "entry-1",
      raceDate: "2026-06-08",
      conflictTarget: "provider,provider_entry_id,race_date",
    },
    boundRace: null,
    normalization: {
      blockedForMl: false,
      warningCount: 0,
      blockingReasons: [],
      writePlanPresent: true,
    },
    persistenceReadiness: {
      status: "ready",
      targetTable: "race_entries",
      idempotencyKey: "race-entry-plan-1",
      reason: null,
      upsert: {
        operation: "upsert",
        conflictTarget: "provider,provider_entry_id,race_date",
      },
    },
    deterministicRowPrecheck: {
      count: 0,
      rowIds: [],
    },
    readyToRunWriteHarness: true,
    blockingReasons: [],
    supabaseOperations: {
      reads: [
        "races",
        "racing_code_sets",
        "racing_code_aliases",
        "racing_code_values",
        "race_entries",
      ],
      writes: [],
    },
    forbiddenTableFamiliesUntouched: true,
    ...overrides,
  };
}

function makeStore() {
  const calls: {
    createdJobs: Parameters<ProviderRaceEntryAuditStore["createJobRun"]>[0][];
    logs: Parameters<ProviderRaceEntryAuditStore["appendAgentLog"]>[0][];
    finishedJobs: Parameters<ProviderRaceEntryAuditStore["finishJobRun"]>[0][];
  } = {
    createdJobs: [],
    logs: [],
    finishedJobs: [],
  };
  const store: ProviderRaceEntryAuditStore = {
    async createJobRun(input) {
      calls.createdJobs.push(input);
      return { id: "job-run-1" };
    },
    async appendAgentLog(input) {
      calls.logs.push(input);
      return { id: `agent-log-${calls.logs.length}` };
    },
    async finishJobRun(input) {
      calls.finishedJobs.push(input);
    },
  };

  return { store, calls };
}

describe("provider race-entry readiness audit target validation", () => {
  it("refuses production targets before any audit record is created", () => {
    const blocker = getProviderRaceEntryAuditTargetBlocker({
      nodeEnv: "production",
      supabaseUrl: `https://${STRIDEO_DEV_PROJECT_REF}.supabase.co`,
      serviceRoleKeyPresent: true,
      linkedProject: {
        name: STRIDEO_DEV_PROJECT_NAME,
        ref: STRIDEO_DEV_PROJECT_REF,
      },
    });

    assert.match(blocker ?? "", /production/);
  });

  it("requires the Strideo Dev Supabase URL and linked project", () => {
    const blocker = getProviderRaceEntryAuditTargetBlocker({
      nodeEnv: "development",
      supabaseUrl: "https://not-strideo.supabase.co",
      serviceRoleKeyPresent: true,
      linkedProject: {
        name: STRIDEO_DEV_PROJECT_NAME,
        ref: STRIDEO_DEV_PROJECT_REF,
      },
    });

    assert.match(blocker ?? "", /Refusing Supabase target/);
  });
});

describe("provider race-entry readiness audit wrapper", () => {
  it("maps agent log appends to the service-role RPC contract", () => {
    assert.equal(
      PROVIDER_RACE_ENTRY_AGENT_LOG_APPEND_RPC,
      "append_agent_log_for_service_role",
    );
    assert.deepEqual(
      buildProviderRaceEntryAgentLogAppendRpcArgs({
        jobRunId: "job-run-1",
        agentKey: PROVIDER_RACE_ENTRY_AUDIT_AGENT_KEY,
        level: "info",
        message: "Provider race-entry readiness audit started.",
        context: { providerDataWritesPerformed: [] },
      }),
      {
        p_job_run_id: "job-run-1",
        p_agent_key: PROVIDER_RACE_ENTRY_AUDIT_AGENT_KEY,
        p_level: "info",
        p_message: "Provider race-entry readiness audit started.",
        p_context: { providerDataWritesPerformed: [] },
      },
    );
  });

  it("records safe audit metadata without executing provider data writes", async () => {
    const { store, calls } = makeStore();
    const result = await runProviderRaceEntryReadinessAudit({
      store,
      idempotencyKey: "audit-run-1",
      now: () => new Date("2026-06-17T12:00:00.000Z"),
      buildReadinessReport: async () => makeReadinessReport({ status: "ready" }),
    });

    assert.equal(result.status, "succeeded");
    assert.equal(result.jobRunId, "job-run-1");
    assert.equal(result.jobKey, PROVIDER_RACE_ENTRY_AUDIT_JOB_KEY);
    assert.equal(result.agentKey, PROVIDER_RACE_ENTRY_AUDIT_AGENT_KEY);
    assert.deepEqual(result.providerDataWritesPerformed, []);
    assert.deepEqual(result.supabaseOperations.writes, []);
    assert.equal(result.providerIngestionEnabledByDefault, false);
    assert.equal(calls.createdJobs.length, 1);
    assert.equal(calls.createdJobs[0].jobKey, PROVIDER_RACE_ENTRY_AUDIT_JOB_KEY);
    assert.deepEqual(calls.createdJobs[0].metadata.providerDataWritesPerformed, []);
    assert.equal(calls.logs.length, 2);
    assert.equal(calls.finishedJobs.length, 1);
    assert.equal(calls.finishedJobs[0].status, "succeeded");
    assert.deepEqual(
      (calls.finishedJobs[0].output as typeof result).providerDataWritesPerformed,
      [],
    );
  });

  it("captures readiness failures safely and marks the job failed", async () => {
    const { store, calls } = makeStore();
    const result = await runProviderRaceEntryReadinessAudit({
      store,
      idempotencyKey: "audit-run-failed",
      now: () => new Date("2026-06-17T12:00:00.000Z"),
      buildReadinessReport: async () => {
        throw new Error("readiness lookup failed without provider writes");
      },
    });

    assert.equal(result.status, "failed");
    assert.match(result.errorMessage ?? "", /readiness lookup failed/);
    assert.deepEqual(result.providerDataWritesPerformed, []);
    assert.deepEqual(result.supabaseOperations.writes, []);
    assert.equal(calls.logs.at(-1)?.level, "error");
    assert.equal(calls.finishedJobs.length, 1);
    assert.equal(calls.finishedJobs[0].status, "failed");
    assert.match(calls.finishedJobs[0].errorMessage ?? "", /readiness lookup failed/);
  });

  it("fails closed before provider reads when audit job creation is unavailable", async () => {
    let reportCalled = false;
    const store: ProviderRaceEntryAuditStore = {
      async createJobRun() {
        throw new Error("permission denied for table job_runs");
      },
      async appendAgentLog() {
        throw new Error("agent log should not be written without a job");
      },
      async finishJobRun() {
        throw new Error("job should not be finished without a job id");
      },
    };

    await assert.rejects(
      runProviderRaceEntryReadinessAudit({
        store,
        idempotencyKey: "audit-run-denied",
        buildReadinessReport: async () => {
          reportCalled = true;
          return makeReadinessReport();
        },
      }),
      /permission denied/,
    );
    assert.equal(reportCalled, false);
  });
});
