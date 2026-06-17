import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  PROVIDER_RACE_ENTRY_AGENT_LOG_APPEND_RPC,
  buildProviderRaceEntryAgentLogAppendRpcArgs,
  runProviderRaceEntryReadinessAudit,
  type ProviderRaceEntryAuditStore,
} from "./provider-race-entry-job-audit-core";
import { buildProviderRaceEntryReadinessReport } from "./provider-race-entry-readiness-report";

type ServiceRoleClient = SupabaseClient;

function raiseAuditStoreError(operation: string, message: string): never {
  throw new Error(`Provider race-entry audit ${operation} failed: ${message}`);
}

export function createProviderRaceEntryAuditStore(
  client: ServiceRoleClient,
): ProviderRaceEntryAuditStore {
  return {
    async createJobRun(input) {
      const { data, error } = await client
        .from("job_runs")
        .insert({
          job_key: input.jobKey,
          agent_key: input.agentKey,
          status: "running",
          idempotency_key: input.idempotencyKey,
          started_at: input.startedAt,
          input: input.metadata,
          output: {},
        })
        .select("id")
        .single<{ id: string }>();

      if (error) {
        raiseAuditStoreError("job start", error.message);
      }

      const jobRunId = data?.id;

      if (!jobRunId) {
        raiseAuditStoreError("job start", "No job_runs id returned.");
      }

      return { id: jobRunId };
    },
    async appendAgentLog(input) {
      const { data, error } = await client.rpc(
        PROVIDER_RACE_ENTRY_AGENT_LOG_APPEND_RPC,
        buildProviderRaceEntryAgentLogAppendRpcArgs(input),
      );

      if (error) {
        raiseAuditStoreError("agent log append", error.message);
      }

      const agentLogId = typeof data === "string" ? data : null;

      if (!agentLogId) {
        raiseAuditStoreError("agent log append", "No agent_logs id returned.");
      }

      return { id: agentLogId };
    },
    async finishJobRun(input) {
      const { error } = await client
        .from("job_runs")
        .update({
          status: input.status,
          finished_at: input.finishedAt,
          output: input.output,
          error_message: input.errorMessage,
          updated_at: input.finishedAt,
        })
        .eq("id", input.jobRunId);

      if (error) {
        raiseAuditStoreError("job finish", error.message);
      }
    },
  };
}

export async function runProviderRaceEntryReadinessAuditForDev() {
  const client = createServiceRoleClient();

  return runProviderRaceEntryReadinessAudit({
    store: createProviderRaceEntryAuditStore(client),
    buildReadinessReport: () => buildProviderRaceEntryReadinessReport(client),
  });
}
