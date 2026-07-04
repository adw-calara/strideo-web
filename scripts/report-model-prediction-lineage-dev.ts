import { existsSync, readFileSync } from "node:fs";

import { loadEnvConfig } from "@next/env";

import {
  STRIDEO_DEV_PROJECT_NAME,
  STRIDEO_DEV_PROJECT_REF,
} from "@/lib/provider-ingestion/provider-race-entry-dev-boundary";

const DEV_MODEL_PREDICTION_LINEAGE_EXPECTED_SNAPSHOTS = 7;
const DEV_MODEL_PREDICTION_LINEAGE_EXPECTED_VALUE_CALCULATIONS = 7;

type LinkedProject = {
  ref?: string;
  name?: string;
};

type CliOptions = {
  expectedFeatureSnapshotCount: number;
  expectedValueCalculationCount: number;
};

function printHelp() {
  console.log(`Plan Dev-only model_versions and prediction_outputs lineage.

Usage:
  npm run model-prediction-lineage:plan:dev -- [--expected-snapshots N] [--expected-value-calculations N]

Safety:
  - Dry-run/report only; there is no apply mode.
  - Performs Supabase reads only against ${STRIDEO_DEV_PROJECT_NAME} (${STRIDEO_DEV_PROJECT_REF}).
  - Refuses NODE_ENV=production.
  - Refuses Supabase targets other than ${STRIDEO_DEV_PROJECT_NAME} (${STRIDEO_DEV_PROJECT_REF}).
  - Requires the linked Supabase project marker for ${STRIDEO_DEV_PROJECT_NAME} (${STRIDEO_DEV_PROJECT_REF}).
  - Never writes model_versions, prediction_outputs, value_calculations,
    opportunity_scores, wagers, provider-ingestion rows, model-training rows,
    or production data.
  - Planned probabilities are market-derived baseline lineage only, not
    trained ML, calibrated model_probability, or scoring-authorized output.
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
    expectedFeatureSnapshotCount:
      DEV_MODEL_PREDICTION_LINEAGE_EXPECTED_SNAPSHOTS,
    expectedValueCalculationCount:
      DEV_MODEL_PREDICTION_LINEAGE_EXPECTED_VALUE_CALCULATIONS,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    if (arg === "--expected-snapshots") {
      const value = Number(argv[index + 1]);
      if (!Number.isInteger(value) || value <= 0) {
        throw new Error("--expected-snapshots requires a positive integer.");
      }
      options.expectedFeatureSnapshotCount = value;
      index += 1;
      continue;
    }

    if (arg === "--expected-value-calculations") {
      const value = Number(argv[index + 1]);
      if (!Number.isInteger(value) || value <= 0) {
        throw new Error(
          "--expected-value-calculations requires a positive integer.",
        );
      }
      options.expectedValueCalculationCount = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function getDevSupabaseTargetBlocker() {
  if (process.env.NODE_ENV === "production") {
    return "Refusing model/prediction lineage planning in production.";
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
          mode: "dry_run",
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
    import("@/lib/opportunities/scoring/model-prediction-lineage"),
  ]);
  const client = createServiceRoleClient();
  const report = await lineage.buildModelPredictionLineageReport(client, {
    expectedFeatureSnapshotCount: options.expectedFeatureSnapshotCount,
    expectedValueCalculationCount: options.expectedValueCalculationCount,
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
  console.error(`Model/prediction lineage Dev plan failed: ${message}`);
  process.exitCode = 1;
});
