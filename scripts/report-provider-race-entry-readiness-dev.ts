import { readFileSync } from "node:fs";
import { loadEnvConfig } from "@next/env";

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
  console.log(`Report PR #70 provider race-entry persistence readiness against Strideo Dev.

Usage:
  npm run provider-ingestion:status:race-entry-dev

Safety:
  - Refuses NODE_ENV=production.
  - Refuses Supabase targets other than ${STRIDEO_DEV_PROJECT_NAME} (${STRIDEO_DEV_PROJECT_REF}).
  - Performs Supabase reads only.
  - Does not execute provider ingestion or call the ${RACE_ENTRY_TARGET_TABLE} write store.
  - Emits JSON for review before the separate write harness is run.
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
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to report provider race-entry readiness in production.");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL.");
  }

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
  }

  const parsedUrl = new URL(supabaseUrl);
  if (!parsedUrl.hostname.startsWith(`${STRIDEO_DEV_PROJECT_REF}.`)) {
    throw new Error(
      `Refusing Supabase target ${parsedUrl.hostname}. Expected ${STRIDEO_DEV_PROJECT_NAME} (${STRIDEO_DEV_PROJECT_REF}).`,
    );
  }

  const linkedProject = readLinkedProject();
  if (
    linkedProject.name !== STRIDEO_DEV_PROJECT_NAME ||
    linkedProject.ref !== STRIDEO_DEV_PROJECT_REF
  ) {
    throw new Error(
      `Refusing linked project ${linkedProject.name ?? "unknown"} (${linkedProject.ref ?? "unknown"}). Expected ${STRIDEO_DEV_PROJECT_NAME} (${STRIDEO_DEV_PROJECT_REF}).`,
    );
  }
}

async function main() {
  loadEnvConfig(process.cwd());
  assertNoArgs(process.argv.slice(2));
  assertDevSupabaseTarget();

  const [{ createServiceRoleClient }, { buildProviderRaceEntryReadinessReport }] =
    await Promise.all([
      import("@/lib/supabase/admin"),
      import("@/lib/provider-ingestion/provider-race-entry-readiness-report"),
    ]);

  const report = await buildProviderRaceEntryReadinessReport(
    createServiceRoleClient(),
  );

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Provider race-entry Dev readiness report failed: ${message}`);
  process.exitCode = 1;
});
