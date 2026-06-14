import { loadEnvConfig } from "@next/env";

const STRIDEO_DEV_PROJECT_REF = "ntxtakbggtljjbalgris";
const STRIDEO_DEV_PROJECT_NAME = "strideo-dev";

type CliOptions = {
  raceDate?: string;
  raceIds?: string[];
  maxRaces?: number;
  dryRun?: boolean;
};

function printHelp() {
  console.log(`Generate demo Opportunity signals for Strideo Dev.

Usage:
  npm run opportunities:generate:demo -- [options]

Options:
  --race-date=YYYY-MM-DD           Limit generation to one race date.
  --race-ids=<uuid>,<uuid>         Limit generation to specific race ids.
  --max-races=<number>             Limit loaded eligible races. Defaults to 25.
  --dry-run                        Analyze candidates without writing rows.
  --help                           Show this help text.

Safety:
  - Refuses NODE_ENV=production.
  - Refuses Supabase targets other than ${STRIDEO_DEV_PROJECT_NAME} (${STRIDEO_DEV_PROJECT_REF}).
  - Requires server-only Supabase service-role env vars, but never prints them.
  - With --dry-run, reads eligible Dev race facts but does not create strategies,
    Opportunities, scores, explanations, events, or links.
`);
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {};

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg.startsWith("--race-date=")) {
      options.raceDate = arg.slice("--race-date=".length);
      continue;
    }

    if (arg.startsWith("--race-ids=")) {
      options.raceIds = arg
        .slice("--race-ids=".length)
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      continue;
    }

    if (arg.startsWith("--max-races=")) {
      options.maxRaces = Number(arg.slice("--max-races=".length));
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function assertValidOptions(options: CliOptions) {
  if (options.raceDate && !/^\d{4}-\d{2}-\d{2}$/.test(options.raceDate)) {
    throw new Error("--race-date must use YYYY-MM-DD format.");
  }

  if (options.raceIds?.length === 0) {
    throw new Error("--race-ids must include at least one race id.");
  }

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  for (const raceId of options.raceIds ?? []) {
    if (!uuidPattern.test(raceId)) {
      throw new Error(`Invalid race id: ${raceId}`);
    }
  }

  if (
    options.maxRaces !== undefined &&
    (!Number.isInteger(options.maxRaces) || options.maxRaces < 1)
  ) {
    throw new Error("--max-races must be a positive integer.");
  }
}

function assertDevSupabaseTarget() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to generate demo Opportunities in production.");
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
}

async function main() {
  loadEnvConfig(process.cwd());

  const options = parseArgs(process.argv.slice(2));
  assertValidOptions(options);
  assertDevSupabaseTarget();

  const { generateDemoValueOverlayOpportunities } = await import(
    "@/lib/opportunities/generation"
  );
  const startedAt = new Date();
  const result = await generateDemoValueOverlayOpportunities(options);

  console.log(
    JSON.stringify(
      {
        targetProject: STRIDEO_DEV_PROJECT_NAME,
        targetRef: STRIDEO_DEV_PROJECT_REF,
        generatedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt.getTime(),
        options,
        result,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Opportunity generation failed: ${message}`);
  process.exitCode = 1;
});
