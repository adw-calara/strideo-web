import { readFileSync } from "node:fs";
import { loadEnvConfig } from "@next/env";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RacingCodeNormalizationInput } from "@/lib/racing-codes/normalization-core";
import {
  APPROVED_RACE_ENTRY_LOGICAL_TARGET,
  EXPECTED_RACE_ENTRY_PAYLOAD_SHAPE,
  FORBIDDEN_PROVIDER_RACE_ENTRY_WRITE_IDENTIFIERS,
  RACE_ENTRY_TARGET_TABLE,
  RACE_ENTRY_VERIFICATION_BOUND_RACE_PROVIDER,
  RACE_ENTRY_VERIFICATION_BOUND_RACE_PROVIDER_ID,
  RACE_ENTRY_VERIFICATION_DATE,
  RACE_ENTRY_VERIFICATION_FIXTURE_NAME,
  RACE_ENTRY_VERIFICATION_PROVIDER_ENTRY_ID,
  RACE_ENTRY_VERIFICATION_PROVIDER_HORSE_ID,
  RACE_ENTRY_VERIFICATION_PROVIDER_RACE_ID,
  STRIDEO_DEV_PROJECT_NAME,
  STRIDEO_DEV_PROJECT_REF,
} from "@/lib/provider-ingestion/provider-race-entry-dev-boundary";

type LinkedProject = {
  ref?: string;
  name?: string;
};

type RaceBindingRow = {
  id: string;
  race_date: string;
  provider: string;
  provider_race_id: string;
};

type RaceEntryIdentityRow = {
  id: string;
};

function printHelp() {
  console.log(`Report PR #70 provider race-entry persistence readiness against Strideo Dev.

Usage:
  npm run provider-ingestion:status:race-entry-dev

Safety:
  - Refuses NODE_ENV=production.
  - Refuses Supabase targets other than ${STRIDEO_DEV_PROJECT_NAME} (${STRIDEO_DEV_PROJECT_REF}).
  - Performs Supabase reads only.
  - Does not execute provider ingestion or call the race_entries write store.
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

function assertNoForbiddenWriteIdentifiers(value: unknown, path = "plan") {
  if (!value || typeof value !== "object") {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    if (key === "prohibited_side_effects") {
      continue;
    }

    const normalizedKey = key.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`);
    const keyHit = FORBIDDEN_PROVIDER_RACE_ENTRY_WRITE_IDENTIFIERS.find(
      (identifier) => normalizedKey === identifier || normalizedKey.includes(identifier),
    );

    if (keyHit) {
      throw new Error(`Forbidden write identifier ${keyHit} found at ${path}.${key}.`);
    }

    if (typeof child === "string") {
      const normalizedValue = child.toLowerCase();
      const valueHit = FORBIDDEN_PROVIDER_RACE_ENTRY_WRITE_IDENTIFIERS.find(
        (identifier) =>
          normalizedValue === identifier || normalizedValue.includes(identifier),
      );

      if (valueHit) {
        throw new Error(
          `Forbidden write identifier ${valueHit} found at ${path}.${key}.`,
        );
      }
    }

    assertNoForbiddenWriteIdentifiers(child, `${path}.${key}`);
  }
}

async function getRaceBinding(client: SupabaseClient) {
  const { data, error } = await client
    .from("races")
    .select("id,race_date,provider,provider_race_id")
    .eq("provider", RACE_ENTRY_VERIFICATION_BOUND_RACE_PROVIDER)
    .eq("provider_race_id", RACE_ENTRY_VERIFICATION_BOUND_RACE_PROVIDER_ID)
    .eq("race_date", RACE_ENTRY_VERIFICATION_DATE)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read Dev race binding: ${error.message}`);
  }

  return data as RaceBindingRow | null;
}

async function readDeterministicRaceEntryRows(client: SupabaseClient) {
  const { data, error, count } = await client
    .from(RACE_ENTRY_TARGET_TABLE)
    .select("id", { count: "exact" })
    .eq("provider", "the_racing_api")
    .eq("provider_entry_id", RACE_ENTRY_VERIFICATION_PROVIDER_ENTRY_ID)
    .eq("race_date", RACE_ENTRY_VERIFICATION_DATE);

  if (error) {
    throw new Error(`Failed to read ${RACE_ENTRY_TARGET_TABLE}: ${error.message}`);
  }

  return {
    count: count ?? data?.length ?? 0,
    rowIds: ((data ?? []) as RaceEntryIdentityRow[]).map((row) => row.id),
  };
}

async function main() {
  loadEnvConfig(process.cwd());
  assertNoArgs(process.argv.slice(2));
  assertDevSupabaseTarget();

  const [
    { createServiceRoleClient },
    { makeTheRacingApiRaceEntryFixture },
    { planTheRacingApiRaceEntryAdaptation },
    { inspectRaceEntryWritePlanReadiness },
    { resolveRacingCodeAlias },
    { classifyRacingCodeAliases },
  ] = await Promise.all([
    import("@/lib/supabase/admin"),
    import("@/lib/provider-ingestion/fixtures/the-racing-api-race-entry.fixture"),
    import("@/lib/provider-ingestion/provider-race-entry-adapter-core"),
    import("@/lib/provider-ingestion/provider-race-entry-persistence-core"),
    import("@/lib/racing-codes/normalization"),
    import("@/lib/racing-codes/normalization-core"),
  ]);

  const client = createServiceRoleClient();
  const [raceBinding, deterministicRows] = await Promise.all([
    getRaceBinding(client),
    readDeterministicRaceEntryRows(client),
  ]);

  const fixture = makeTheRacingApiRaceEntryFixture({
    race: {
      id: RACE_ENTRY_VERIFICATION_PROVIDER_RACE_ID,
      date: RACE_ENTRY_VERIFICATION_DATE,
    },
    entry: {
      id: RACE_ENTRY_VERIFICATION_PROVIDER_ENTRY_ID,
    },
    horse: {
      id: RACE_ENTRY_VERIFICATION_PROVIDER_HORSE_ID,
    },
    links: {
      source_url:
        "https://example.provider.local/runtime-verification/race-entry-persistence",
    },
  });

  const readOnlyNormalizer = async (input: RacingCodeNormalizationInput) => {
    const aliases = await resolveRacingCodeAlias(input, client);
    return classifyRacingCodeAliases(input, aliases).result;
  };

  const adaptation = await planTheRacingApiRaceEntryAdaptation(fixture, {
    normalizer: readOnlyNormalizer,
    notes: "Dev-only provider race-entry persistence readiness report",
  });

  if (adaptation.provider_payload_shape !== EXPECTED_RACE_ENTRY_PAYLOAD_SHAPE) {
    throw new Error(
      `Unexpected payload shape: ${adaptation.provider_payload_shape}. Expected ${EXPECTED_RACE_ENTRY_PAYLOAD_SHAPE}.`,
    );
  }

  if (
    adaptation.write_plan &&
    adaptation.write_plan.target !== APPROVED_RACE_ENTRY_LOGICAL_TARGET
  ) {
    throw new Error(`Unexpected write target: ${adaptation.write_plan.target}.`);
  }

  assertNoForbiddenWriteIdentifiers(adaptation.write_plan);

  const readiness = raceBinding
    ? inspectRaceEntryWritePlanReadiness(adaptation.write_plan, {
        raceId: raceBinding.id,
        raceDate: raceBinding.race_date,
      })
    : null;
  const blockingReasons = [
    ...adaptation.blocking_reasons,
    raceBinding
      ? null
      : `Missing Dev race fixture ${RACE_ENTRY_VERIFICATION_BOUND_RACE_PROVIDER}:${RACE_ENTRY_VERIFICATION_BOUND_RACE_PROVIDER_ID}:${RACE_ENTRY_VERIFICATION_DATE}.`,
    readiness && readiness.status !== "ready" ? readiness.reason : null,
    deterministicRows.count > 0
      ? `Deterministic runtime-verification ${RACE_ENTRY_TARGET_TABLE} row already exists.`
      : null,
  ].filter((reason): reason is string => typeof reason === "string");
  const readyToRunWriteHarness =
    readiness?.status === "ready" && deterministicRows.count === 0;

  console.log(
    JSON.stringify(
      {
        status: readyToRunWriteHarness ? "ready" : "blocked",
        targetProject: STRIDEO_DEV_PROJECT_NAME,
        targetRef: STRIDEO_DEV_PROJECT_REF,
        workflow: {
          mode: "read_only_status",
          providerIngestionEnabledByDefault: false,
          writesPerformed: [],
          writeHarnessCommand: "npm run provider-ingestion:verify:race-entry-dev",
          writeHarnessRequiresReview: true,
        },
        fixture: RACE_ENTRY_VERIFICATION_FIXTURE_NAME,
        targetTable: RACE_ENTRY_TARGET_TABLE,
        expectedRowIdentity: {
          provider: "the_racing_api",
          providerEntryId: RACE_ENTRY_VERIFICATION_PROVIDER_ENTRY_ID,
          raceDate: RACE_ENTRY_VERIFICATION_DATE,
          conflictTarget: "provider,provider_entry_id,race_date",
        },
        boundRace: raceBinding
          ? {
              provider: raceBinding.provider,
              providerRaceId: raceBinding.provider_race_id,
              raceId: raceBinding.id,
              raceDate: raceBinding.race_date,
            }
          : null,
        normalization: {
          blockedForMl: adaptation.blocked_for_ml,
          warningCount: adaptation.warnings.length,
          blockingReasons: adaptation.blocking_reasons,
          writePlanPresent: Boolean(adaptation.write_plan),
        },
        persistenceReadiness: readiness
          ? {
              status: readiness.status,
              targetTable:
                readiness.status === "ready" ? readiness.target_table : null,
              idempotencyKey: readiness.idempotency_key,
              reason: readiness.status === "ready" ? null : readiness.reason,
              upsert:
                readiness.status === "ready"
                  ? {
                      operation: readiness.upsert.operation,
                      conflictTarget: readiness.upsert.on_conflict,
                    }
                  : null,
            }
          : {
              status: "blocked",
              targetTable: null,
              idempotencyKey: adaptation.write_plan?.idempotency_key ?? null,
              reason: "Dev race binding is missing.",
              upsert: null,
            },
        deterministicRowPrecheck: {
          count: deterministicRows.count,
          rowIds: deterministicRows.rowIds,
        },
        readyToRunWriteHarness,
        blockingReasons,
        supabaseOperations: {
          reads: [
            "races",
            "racing_code_sets",
            "racing_code_aliases",
            "racing_code_values",
            RACE_ENTRY_TARGET_TABLE,
          ],
          writes: [],
        },
        forbiddenTableFamiliesUntouched: true,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Provider race-entry Dev readiness report failed: ${message}`);
  process.exitCode = 1;
});
