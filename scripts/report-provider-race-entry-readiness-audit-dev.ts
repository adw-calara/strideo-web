import { readFileSync } from "node:fs";
import { loadEnvConfig } from "@next/env";

import {
  getProviderRaceEntryAuditTargetBlocker,
  PROVIDER_RACE_ENTRY_AUDIT_JOB_KEY,
} from "@/lib/provider-ingestion/provider-race-entry-job-audit-core";
import {
  RACE_ENTRY_TARGET_TABLE,
  STRIDEO_DEV_PROJECT_NAME,
  STRIDEO_DEV_PROJECT_REF,
} from "@/lib/provider-ingestion/provider-race-entry-dev-boundary";

type LinkedProject = {
  ref?: string;
  name?: string;
};

function printHelp() {
  console.log(`Create a Dev-only audit wrapper record for provider race-entry readiness.

Usage:
  npm run provider-ingestion:audit:race-entry-dev

Safety:
  - Refuses NODE_ENV=production.
  - Refuses Supabase targets other than ${STRIDEO_DEV_PROJECT_NAME} (${STRIDEO_DEV_PROJECT_REF}).
  - Creates ${PROVIDER_RACE_ENTRY_AUDIT_JOB_KEY} job_runs metadata and agent_logs.
  - Calls the existing read-only provider race-entry readiness report.
  - Does not execute provider ingestion or call the ${RACE_ENTRY_TARGET_TABLE} write store.
  - Provider data writes are expected to remain [] by default.
`);
}

function assertNoArgs(argv: string[]) {
  if (argv.length === 0) {
    return;
  }

  if (argv.length === 1 && (argv[0] === "--help" || argv[0] === "-h")) {
    printHelp();
    process.exit(0);
  }

  throw new Error(`Unknown option: ${argv.join(" ")}`);
}

function readLinkedProject() {
  const raw = readFileSync("supabase/.temp/linked-project.json", "utf8");
  return JSON.parse(raw) as LinkedProject;
}

function assertDevSupabaseTarget() {
  const blocker = getProviderRaceEntryAuditTargetBlocker({
    nodeEnv: process.env.NODE_ENV,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKeyPresent: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    linkedProject: readLinkedProject(),
  });

  if (blocker) {
    throw new Error(blocker);
  }
}

async function main() {
  loadEnvConfig(process.cwd());
  assertNoArgs(process.argv.slice(2));
  assertDevSupabaseTarget();

  const { runProviderRaceEntryReadinessAuditForDev } = await import(
    "@/lib/provider-ingestion/provider-race-entry-job-audit"
  );
  const result = await runProviderRaceEntryReadinessAuditForDev();

  console.log(JSON.stringify(result, null, 2));

  if (result.status === "failed") {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Provider race-entry Dev readiness audit failed: ${message}`);
  process.exitCode = 1;
});
