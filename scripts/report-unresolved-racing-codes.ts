import { loadEnvConfig } from "@next/env";
import type {
  UnresolvedCodeGroup,
  UnresolvedRacingCodeReport,
} from "@/lib/racing-codes/unresolved-report";

const STRIDEO_DEV_PROJECT_REF = "ntxtakbggtljjbalgris";
const STRIDEO_DEV_PROJECT_NAME = "strideo-dev";

type CliOptions = {
  json?: boolean;
  limit?: number;
  staleThresholdDays?: number;
};

function printHelp() {
  console.log(`Report unresolved racing-form source codes for Strideo Dev.

Usage:
  npm run racing-codes:unresolved:report -- [options]

Options:
  --json                         Print machine-readable JSON.
  --limit=<number>               Maximum unresolved rows to load. Defaults to 1000.
  --stale-threshold-days=<days>  Flag open rows older than this. Defaults to 7.
  --help                         Show this help text.

Safety:
  - Read-only reporting; no rows are inserted, updated, resolved, or deleted.
  - Refuses NODE_ENV=production.
  - Refuses Supabase targets other than ${STRIDEO_DEV_PROJECT_NAME} (${STRIDEO_DEV_PROJECT_REF}).
  - Requires server-only Supabase service-role env vars, but never prints them.
`);
}

function parsePositiveInteger(value: string, optionName: string) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${optionName} must be a positive integer.`);
  }

  return parsed;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {};

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    if (arg === "--json") {
      options.json = true;
      continue;
    }

    if (arg.startsWith("--limit=")) {
      options.limit = parsePositiveInteger(arg.slice("--limit=".length), "--limit");
      continue;
    }

    if (arg.startsWith("--stale-threshold-days=")) {
      options.staleThresholdDays = parsePositiveInteger(
        arg.slice("--stale-threshold-days=".length),
        "--stale-threshold-days",
      );
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function assertDevSupabaseTarget() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to report unresolved racing codes in production.");
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

function printCounts(title: string, counts: Record<string, number>) {
  console.log(`\n${title}`);

  const entries = Object.entries(counts).sort(([left], [right]) =>
    left.localeCompare(right),
  );

  if (entries.length === 0) {
    console.log("  none");
    return;
  }

  for (const [key, count] of entries) {
    console.log(`  ${key}: ${count}`);
  }
}

function printGroupList(
  title: string,
  groups: UnresolvedCodeGroup[],
  limit = 10,
) {
  console.log(`\n${title}: ${groups.length}`);

  if (groups.length === 0) {
    console.log("  none");
    return;
  }

  for (const group of groups.slice(0, limit)) {
    const opportunityText =
      group.opportunityIds.length > 0
        ? ` opportunities=${group.opportunityIds.join(",")}`
        : "";
    const jobText = group.latestJobRunId ? ` latestJobRun=${group.latestJobRunId}` : "";

    console.log(
      [
        `  ${group.sourceSystem}`,
        group.intendedCodeSet,
        group.sourceCode,
        `status=${group.status}`,
        `occurrences=${group.occurrenceCount}`,
        `first=${group.firstSeenAt}`,
        `last=${group.lastSeenAt}`,
        `context=${group.context}`,
        jobText,
        opportunityText,
      ]
        .filter(Boolean)
        .join(" | "),
    );
  }

  if (groups.length > limit) {
    console.log(`  ...${groups.length - limit} more`);
  }
}

function printTextReport(report: UnresolvedRacingCodeReport) {
  console.log("Unresolved racing-code report");
  console.log(`Target: ${STRIDEO_DEV_PROJECT_NAME} (${STRIDEO_DEV_PROJECT_REF})`);
  console.log(`Generated: ${report.generatedAt}`);
  console.log(`Total unresolved rows: ${report.totalUnresolvedRows}`);
  console.log(`Oldest unresolved row: ${report.oldestUnresolvedAt ?? "none"}`);
  console.log(`Newest unresolved row: ${report.newestUnresolvedAt ?? "none"}`);

  printCounts("By status", report.countsByStatus);
  printCounts("By source system", report.countsBySourceSystem);
  printCounts("By code set / intended code set", report.countsByCodeSet);
  printCounts("By context / entity type", report.countsByContext);

  printGroupList("Review queue", report.reviewQueue);
  printGroupList("Repeated unknown codes", report.safetyChecks.repeatedUnknownCodes);
  printGroupList(
    "Unknown codes linked to Opportunities",
    report.safetyChecks.opportunityLinkedCodes,
  );
  printGroupList(
    "Unknown codes in model/value contexts",
    report.safetyChecks.modelOrValueContextCodes,
  );
  printGroupList(
    `Stale open codes older than ${report.staleThresholdDays} days`,
    report.safetyChecks.staleOpenCodes,
  );
  printGroupList(
    "Codes with no source system",
    report.safetyChecks.missingSourceSystemCodes,
  );
  printGroupList(
    "Codes with no code-set context",
    report.safetyChecks.missingCodeSetContextCodes,
  );
  printGroupList(
    "Codes ambiguous across multiple contexts",
    report.safetyChecks.ambiguousAcrossContexts,
  );

  if (report.totalUnresolvedRows === 0) {
    console.log("\nQueue is empty. No unresolved racing-form shorthand is pending review.");
  }
}

async function main() {
  loadEnvConfig(process.cwd());

  const options = parseArgs(process.argv.slice(2));
  assertDevSupabaseTarget();

  const { getUnresolvedRacingCodeReport } = await import(
    "@/lib/racing-codes/unresolved-report"
  );
  const report = await getUnresolvedRacingCodeReport({
    limit: options.limit,
    staleThresholdDays: options.staleThresholdDays,
  });

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          targetProject: STRIDEO_DEV_PROJECT_NAME,
          targetRef: STRIDEO_DEV_PROJECT_REF,
          report,
        },
        null,
        2,
      ),
    );
    return;
  }

  printTextReport(report);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Unresolved racing-code report failed: ${message}`);
  process.exitCode = 1;
});
