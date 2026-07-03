import { existsSync, readFileSync } from "node:fs";

import { loadEnvConfig } from "@next/env";

import {
  STRIDEO_DEV_PROJECT_NAME,
  STRIDEO_DEV_PROJECT_REF,
} from "@/lib/provider-ingestion/provider-race-entry-dev-boundary";

const DEV_VALUE_CALCULATION_INPUT_LINEAGE_EXPECTED_SNAPSHOTS = 7;

type LinkedProject = {
  ref?: string;
  name?: string;
};

type CliOptions = {
  apply: boolean;
  expectedFeatureSnapshotCount: number;
};

function printHelp() {
  console.log(`Materialize Dev-only value_calculations from persisted feature_snapshots.

Usage:
  npm run value-calculations:materialize:dev -- [--expected-count N] [--apply]

Safety:
  - Dry-run is the default and performs Supabase reads only.
  - --apply is required before any value_calculations insert.
  - Refuses NODE_ENV=production.
  - Refuses Supabase targets other than ${STRIDEO_DEV_PROJECT_NAME} (${STRIDEO_DEV_PROJECT_REF}).
  - Requires the linked Supabase project marker for ${STRIDEO_DEV_PROJECT_NAME} (${STRIDEO_DEV_PROJECT_REF}).
  - Writes only public.value_calculations in apply mode.
  - Never writes model_versions, prediction_outputs, opportunity_scores, wagers,
    Bet Sheet rows, provider-ingestion rows, model-training rows, or production data.
  - Keeps model_version_id, prediction_output_id, and model_probability null.
`);
}

function readLinkedProject(): LinkedProject | null {
  const path = "supabase/.temp/linked-project.json";

  if (!existsSync(path)) {
    return null;
  }

  return JSON.parse(readFileSync(path, "utf8")) as LinkedProject;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    apply: false,
    expectedFeatureSnapshotCount:
      DEV_VALUE_CALCULATION_INPUT_LINEAGE_EXPECTED_SNAPSHOTS,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    if (arg === "--apply") {
      options.apply = true;
      continue;
    }

    if (arg === "--expected-count") {
      const value = Number(argv[index + 1]);
      if (!Number.isInteger(value) || value <= 0) {
        throw new Error("--expected-count requires a positive integer.");
      }
      options.expectedFeatureSnapshotCount = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function getDevSupabaseTargetBlocker() {
  if (process.env.NODE_ENV === "production") {
    return "Refusing value calculation materialization in production.";
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    return "Missing NEXT_PUBLIC_SUPABASE_URL.";
  }

  if (!serviceRoleKey) {
    return "Missing SUPABASE_SERVICE_ROLE_KEY.";
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(supabaseUrl);
  } catch {
    return "Configured NEXT_PUBLIC_SUPABASE_URL is invalid.";
  }

  if (!parsedUrl.hostname.startsWith(`${STRIDEO_DEV_PROJECT_REF}.`)) {
    return `Refusing Supabase target ${parsedUrl.hostname}. Expected ${STRIDEO_DEV_PROJECT_NAME} (${STRIDEO_DEV_PROJECT_REF}).`;
  }

  const linkedProject = readLinkedProject();

  if (
    linkedProject?.name !== STRIDEO_DEV_PROJECT_NAME ||
    linkedProject.ref !== STRIDEO_DEV_PROJECT_REF
  ) {
    return `Refusing linked project ${linkedProject?.name ?? "missing"} (${linkedProject?.ref ?? "missing"}). Expected ${STRIDEO_DEV_PROJECT_NAME} (${STRIDEO_DEV_PROJECT_REF}).`;
  }

  return null;
}

async function main() {
  loadEnvConfig(process.cwd());

  const options = parseArgs(process.argv.slice(2));
  const targetBlocker = getDevSupabaseTargetBlocker();

  if (targetBlocker) {
    console.log(
      JSON.stringify(
        {
          status: "blocked",
          targetProject: STRIDEO_DEV_PROJECT_NAME,
          targetRef: STRIDEO_DEV_PROJECT_REF,
          mode: options.apply ? "apply" : "dry_run",
          writesPerformed: false,
          blockingReasons: [targetBlocker],
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
    return;
  }

  const [{ createServiceRoleClient }, lineage] = await Promise.all([
    import("@/lib/supabase/admin"),
    import("@/lib/opportunities/scoring/value-calculation-input-lineage"),
  ]);
  const client = createServiceRoleClient();
  const report = options.apply
    ? await lineage.applyValueCalculationInputLineage(client, {
        expectedFeatureSnapshotCount: options.expectedFeatureSnapshotCount,
      })
    : await lineage.buildValueCalculationInputLineageReport(client, {
        expectedFeatureSnapshotCount: options.expectedFeatureSnapshotCount,
      });

  console.log(
    JSON.stringify(
      {
        targetProject: STRIDEO_DEV_PROJECT_NAME,
        targetRef: STRIDEO_DEV_PROJECT_REF,
        ...report,
      },
      null,
      2,
    ),
  );

  if (report.status === "blocked") {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Value calculation Dev materialization failed: ${message}`);
  process.exitCode = 1;
});
