import { existsSync, readFileSync } from "node:fs";

import { loadEnvConfig } from "@next/env";

import {
  STRIDEO_DEV_PROJECT_NAME,
  STRIDEO_DEV_PROJECT_REF,
} from "@/lib/provider-ingestion/provider-race-entry-dev-boundary";
import {
  getRacingFormCoverageDevTargetBlocker,
  type LinkedSupabaseProject,
} from "@/lib/racing-form/coverage-readiness-dev-boundary";

function printHelp() {
  console.log(`Report Dev-only racing-form coverage readiness.

Usage:
  npm run racing-form:coverage:dev

Safety:
  - Performs Strideo Dev Supabase reads only.
  - Refuses NODE_ENV=production.
  - Refuses Supabase targets other than ${STRIDEO_DEV_PROJECT_NAME} (${STRIDEO_DEV_PROJECT_REF}).
  - Requires the linked Supabase project marker before reads.
  - Does not ingest provider data.
  - Does not write feature_snapshots, predictions, scores, wagers, provider rows,
    model-training rows, or production data.
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

  if (argv.length === 1 && argv[0] === "--json") {
    return;
  }

  throw new Error(`Unknown option: ${argv.join(" ")}`);
}

function readLinkedProject(): LinkedSupabaseProject | null {
  const path = "supabase/.temp/linked-project.json";

  if (!existsSync(path)) {
    return null;
  }

  return JSON.parse(readFileSync(path, "utf8")) as LinkedSupabaseProject;
}

async function main() {
  loadEnvConfig(process.cwd());
  assertNoArgs(process.argv.slice(2));

  const blocker = getRacingFormCoverageDevTargetBlocker({
    nodeEnv: process.env.NODE_ENV,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKeyPresent: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    linkedProject: readLinkedProject(),
  });

  if (blocker) {
    console.log(
      JSON.stringify(
        {
          status: "blocked",
          targetProject: STRIDEO_DEV_PROJECT_NAME,
          targetRef: STRIDEO_DEV_PROJECT_REF,
          blockers: [blocker],
          safety: {
            writesPerformed: false,
            productionTouched: false,
            providerIngestionRun: false,
            mlTrainingRun: false,
            scoringRun: false,
          },
          supabaseOperations: {
            reads: [],
            writes: [],
          },
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
    return;
  }

  const [{ createServiceRoleClient }, { buildRacingFormCoverageReadinessReport }] =
    await Promise.all([
      import("@/lib/supabase/admin"),
      import("@/lib/racing-form/coverage-readiness-report"),
    ]);

  const report = await buildRacingFormCoverageReadinessReport(
    createServiceRoleClient(),
  );
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Racing-form Dev coverage readiness report failed: ${message}`);
  process.exitCode = 1;
});
