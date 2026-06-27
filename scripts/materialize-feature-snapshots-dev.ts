import { existsSync, readFileSync } from "node:fs";

import { loadEnvConfig } from "@next/env";

import {
  STRIDEO_DEV_PROJECT_NAME,
  STRIDEO_DEV_PROJECT_REF,
} from "@/lib/provider-ingestion/provider-race-entry-dev-boundary";

type LinkedProject = {
  ref?: string;
  name?: string;
};

type CliOptions = {
  apply: boolean;
  raceDate?: string;
  raceIds: string[];
  maxRaces?: number;
};

function printHelp() {
  console.log(`Materialize Dev-only pre-race feature_snapshots.

Usage:
  npm run feature-snapshots:materialize:dev -- [--race-date YYYY-MM-DD] [--race-id UUID] [--limit N] [--apply]

Safety:
  - Dry-run is the default and performs Supabase reads only.
  - --apply is required before any feature_snapshots insert.
  - Refuses NODE_ENV=production.
  - Refuses Supabase targets other than ${STRIDEO_DEV_PROJECT_NAME} (${STRIDEO_DEV_PROJECT_REF}).
  - Apply mode additionally requires the linked Supabase project marker.
  - Writes only public.feature_snapshots and never writes predictions, scores,
    wagers, provider-ingestion rows, model-training rows, or production data.
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
    raceIds: [],
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

    if (arg === "--race-date") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--race-date requires a YYYY-MM-DD value.");
      }
      options.raceDate = value;
      index += 1;
      continue;
    }

    if (arg === "--race-id") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--race-id requires a UUID value.");
      }
      options.raceIds.push(value);
      index += 1;
      continue;
    }

    if (arg === "--limit") {
      const value = Number(argv[index + 1]);
      if (!Number.isInteger(value) || value <= 0) {
        throw new Error("--limit requires a positive integer.");
      }
      options.maxRaces = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function getDevSupabaseTargetBlocker(options: { apply: boolean }) {
  if (process.env.NODE_ENV === "production") {
    return "Refusing feature snapshot materialization in production.";
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    return "Missing NEXT_PUBLIC_SUPABASE_URL.";
  }

  if (!serviceRoleKey) {
    return "Missing SUPABASE_SERVICE_ROLE_KEY.";
  }

  const parsedUrl = new URL(supabaseUrl);
  if (!parsedUrl.hostname.startsWith(`${STRIDEO_DEV_PROJECT_REF}.`)) {
    return `Refusing Supabase target ${parsedUrl.hostname}. Expected ${STRIDEO_DEV_PROJECT_NAME} (${STRIDEO_DEV_PROJECT_REF}).`;
  }

  if (!options.apply) {
    return null;
  }

  const linkedProject = readLinkedProject();

  if (
    linkedProject?.name !== STRIDEO_DEV_PROJECT_NAME ||
    linkedProject.ref !== STRIDEO_DEV_PROJECT_REF
  ) {
    return `Refusing apply without linked project ${STRIDEO_DEV_PROJECT_NAME} (${STRIDEO_DEV_PROJECT_REF}). Current link: ${linkedProject?.name ?? "missing"} (${linkedProject?.ref ?? "missing"}).`;
  }

  return null;
}

async function main() {
  loadEnvConfig(process.cwd());

  const options = parseArgs(process.argv.slice(2));
  const targetBlocker = getDevSupabaseTargetBlocker({ apply: options.apply });

  if (targetBlocker) {
    console.log(
      JSON.stringify(
        {
          status: "blocked",
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

  const [{ createServiceRoleClient }, materialization] = await Promise.all([
    import("@/lib/supabase/admin"),
    import("@/lib/opportunities/scoring/pre-race-snapshot-materialization"),
  ]);

  const client = createServiceRoleClient();
  const report = options.apply
    ? await materialization.applyPreRaceFeatureSnapshotMaterialization(client, {
        raceDate: options.raceDate,
        raceIds: options.raceIds,
        maxRaces: options.maxRaces,
      })
    : await materialization.buildPreRaceFeatureSnapshotMaterializationReport(
        client,
        {
          raceDate: options.raceDate,
          raceIds: options.raceIds,
          maxRaces: options.maxRaces,
        },
      );

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Feature snapshot Dev materialization failed: ${message}`);
  process.exitCode = 1;
});
