import { readFileSync } from "node:fs";
import { loadEnvConfig } from "@next/env";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RacingCodeNormalizationInput } from "@/lib/racing-codes/normalization-core";

const STRIDEO_DEV_PROJECT_REF = "ntxtakbggtljjbalgris";
const STRIDEO_DEV_PROJECT_NAME = "strideo-dev";
const TARGET_TABLE = "race_entries";
const APPROVED_LOGICAL_TARGET = "race_entry_source_fact";
const EXPECTED_PAYLOAD_SHAPE = "the_racing_api_race_entry_v1";
const FIXTURE_NAME = "the-racing-api-race-entry-runtime-verification";
const FIXTURE_RACE_DATE = "2026-06-08";
const FIXTURE_PROVIDER_RACE_ID = "tra-runtime-verification-race-20260608-demo-01";
const FIXTURE_PROVIDER_ENTRY_ID = "tra-runtime-verification-entry-20260608-demo-01";
const FIXTURE_PROVIDER_HORSE_ID = "tra-runtime-verification-horse-9001";
const EXISTING_DEV_RACE_PROVIDER = "demo";
const EXISTING_DEV_RACE_PROVIDER_ID = "demo-race-2026-06-08-01";
const FORBIDDEN_WRITE_IDENTIFIERS = [
  "opportunity",
  "opportunities",
  "prediction",
  "prediction_output",
  "prediction_outputs",
  "value_calculation",
  "value_calculations",
  "wager",
  "wagers",
  "wager_recommendation",
  "feature_snapshot",
  "feature_snapshots",
  "model_training",
  "model_training_run",
  "strategy",
  "strategy_marketplace",
  "bankroll",
  "bet_sheet",
  "bet-sheet",
] as const;

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

type RaceEntryReadbackRow = {
  id: string;
  race_date: string;
  race_id: string;
  provider: string;
  provider_entry_id: string;
  status: string;
  medication: string | null;
  metadata: Record<string, unknown>;
};

type CountSnapshot = {
  count: number;
  rows: RaceEntryReadbackRow[];
};

function printHelp() {
  console.log(`Verify the PR #70 provider race-entry persistence executor against Strideo Dev.

Usage:
  npm run provider-ingestion:verify:race-entry-dev

Safety:
  - Refuses NODE_ENV=production.
  - Refuses Supabase targets other than ${STRIDEO_DEV_PROJECT_NAME} (${STRIDEO_DEV_PROJECT_REF}).
  - Requires server-only Supabase service-role env vars, but never prints them.
  - Uses read-only normalization alias lookup; unresolved-code rows are not created.
  - Writes only a deterministic ${TARGET_TABLE} fixture row, executes twice for
    idempotency, reads it back, and deletes only that deterministic row.
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
    throw new Error("Refusing to verify provider race-entry persistence in production.");
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
    const keyHit = FORBIDDEN_WRITE_IDENTIFIERS.find(
      (identifier) => normalizedKey === identifier || normalizedKey.includes(identifier),
    );

    if (keyHit) {
      throw new Error(`Forbidden write identifier ${keyHit} found at ${path}.${key}.`);
    }

    if (typeof child === "string") {
      const normalizedValue = child.toLowerCase();
      const valueHit = FORBIDDEN_WRITE_IDENTIFIERS.find(
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
    .eq("provider", EXISTING_DEV_RACE_PROVIDER)
    .eq("provider_race_id", EXISTING_DEV_RACE_PROVIDER_ID)
    .eq("race_date", FIXTURE_RACE_DATE)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read Dev race binding: ${error.message}`);
  }

  if (!data) {
    throw new Error(
      `Missing Dev race fixture ${EXISTING_DEV_RACE_PROVIDER}:${EXISTING_DEV_RACE_PROVIDER_ID}:${FIXTURE_RACE_DATE}. Apply or review the Dev race-card fixture before runtime verification.`,
    );
  }

  return data as RaceBindingRow;
}

async function readRaceEntryRows(client: SupabaseClient): Promise<CountSnapshot> {
  const { data, error, count } = await client
    .from(TARGET_TABLE)
    .select("id,race_date,race_id,provider,provider_entry_id,status,medication,metadata", {
      count: "exact",
    })
    .eq("provider", "the_racing_api")
    .eq("provider_entry_id", FIXTURE_PROVIDER_ENTRY_ID)
    .eq("race_date", FIXTURE_RACE_DATE);

  if (error) {
    throw new Error(`Failed to read ${TARGET_TABLE}: ${error.message}`);
  }

  return {
    count: count ?? data?.length ?? 0,
    rows: (data ?? []) as RaceEntryReadbackRow[],
  };
}

async function cleanupRaceEntryRows(client: SupabaseClient) {
  const { data, error, count } = await client
    .from(TARGET_TABLE)
    .delete({ count: "exact" })
    .eq("provider", "the_racing_api")
    .eq("provider_entry_id", FIXTURE_PROVIDER_ENTRY_ID)
    .eq("race_date", FIXTURE_RACE_DATE)
    .select("id");

  if (error) {
    throw new Error(`Failed to clean up ${TARGET_TABLE} fixture row: ${error.message}`);
  }

  return {
    deletedCount: count ?? data?.length ?? 0,
    deletedIds: (data ?? []).map((row) => (row as { id: string }).id),
  };
}

function assertSingleReadback(label: string, snapshot: CountSnapshot) {
  if (snapshot.count !== 1 || snapshot.rows.length !== 1) {
    throw new Error(
      `${label} expected exactly one ${TARGET_TABLE} row; found count=${snapshot.count}, rows=${snapshot.rows.length}.`,
    );
  }

  return snapshot.rows[0];
}

function assertReadbackMatchesExpected(row: RaceEntryReadbackRow, raceBinding: RaceBindingRow) {
  if (row.provider !== "the_racing_api") {
    throw new Error(`Unexpected provider in readback: ${row.provider}.`);
  }

  if (row.provider_entry_id !== FIXTURE_PROVIDER_ENTRY_ID) {
    throw new Error(`Unexpected provider entry id in readback: ${row.provider_entry_id}.`);
  }

  if (row.race_id !== raceBinding.id) {
    throw new Error(`Unexpected race_id in readback: ${row.race_id}.`);
  }

  if (row.race_date !== FIXTURE_RACE_DATE) {
    throw new Error(`Unexpected race_date in readback: ${row.race_date}.`);
  }

  if (row.status !== "started") {
    throw new Error(`Unexpected status in readback: ${row.status}.`);
  }

  if (row.medication !== "lasix") {
    throw new Error(`Unexpected medication in readback: ${row.medication ?? "null"}.`);
  }

  const boundary = row.metadata.persistence_boundary as
    | { logical_target?: unknown; physical_target_table?: unknown }
    | undefined;

  if (
    boundary?.logical_target !== APPROVED_LOGICAL_TARGET ||
    boundary?.physical_target_table !== TARGET_TABLE
  ) {
    throw new Error("Readback metadata does not preserve the expected persistence boundary.");
  }
}

async function main() {
  loadEnvConfig(process.cwd());
  assertNoArgs(process.argv.slice(2));
  assertDevSupabaseTarget();

  const [
    { createServiceRoleClient },
    { makeTheRacingApiRaceEntryFixture },
    { planTheRacingApiRaceEntryAdaptation },
    { executeProviderRaceEntryPersistence, makeSupabaseRaceEntryFactStore },
    { resolveRacingCodeAlias },
    { classifyRacingCodeAliases },
  ] = await Promise.all([
    import("@/lib/supabase/admin"),
    import("@/lib/provider-ingestion/fixtures/the-racing-api-race-entry.fixture"),
    import("@/lib/provider-ingestion/provider-race-entry-adapter-core"),
    import("@/lib/provider-ingestion/provider-race-entry-persistence"),
    import("@/lib/racing-codes/normalization"),
    import("@/lib/racing-codes/normalization-core"),
  ]);

  const client = createServiceRoleClient();
  const raceBinding = await getRaceBinding(client);
  const fixture = makeTheRacingApiRaceEntryFixture({
    race: {
      id: FIXTURE_PROVIDER_RACE_ID,
      date: FIXTURE_RACE_DATE,
    },
    entry: {
      id: FIXTURE_PROVIDER_ENTRY_ID,
    },
    horse: {
      id: FIXTURE_PROVIDER_HORSE_ID,
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
    notes: "Dev-only provider race-entry persistence runtime verification",
  });

  if (adaptation.blocked_for_ml || !adaptation.write_plan) {
    throw new Error(
      `Normalization did not produce a writable plan: ${adaptation.blocking_reasons.join("; ")}`,
    );
  }

  if (adaptation.provider_payload_shape !== EXPECTED_PAYLOAD_SHAPE) {
    throw new Error(
      `Unexpected payload shape: ${adaptation.provider_payload_shape}. Expected ${EXPECTED_PAYLOAD_SHAPE}.`,
    );
  }

  if (adaptation.write_plan.target !== APPROVED_LOGICAL_TARGET) {
    throw new Error(`Unexpected write target: ${adaptation.write_plan.target}.`);
  }

  assertNoForbiddenWriteIdentifiers(adaptation.write_plan);

  const before = await readRaceEntryRows(client);
  if (before.count !== 0) {
    throw new Error(
      `Refusing to overwrite existing runtime verification row for the deterministic identity. Found ${before.count}.`,
    );
  }

  const store = makeSupabaseRaceEntryFactStore(
    client as unknown as Parameters<typeof makeSupabaseRaceEntryFactStore>[0],
  );
  const context = {
    bindings: {
      raceId: raceBinding.id,
      raceDate: raceBinding.race_date,
    },
    store,
  };
  const firstExecution = await executeProviderRaceEntryPersistence(
    adaptation.write_plan,
    context,
  );
  const firstReadback = assertSingleReadback(
    "first readback",
    await readRaceEntryRows(client),
  );
  assertReadbackMatchesExpected(firstReadback, raceBinding);

  const secondExecution = await executeProviderRaceEntryPersistence(
    adaptation.write_plan,
    context,
  );
  const secondReadback = assertSingleReadback(
    "second readback",
    await readRaceEntryRows(client),
  );
  assertReadbackMatchesExpected(secondReadback, raceBinding);

  if (firstReadback.id !== secondReadback.id) {
    throw new Error(
      `Idempotency failed: first row ${firstReadback.id} differed from second row ${secondReadback.id}.`,
    );
  }

  const cleanup = await cleanupRaceEntryRows(client);
  const afterCleanup = await readRaceEntryRows(client);
  if (afterCleanup.count !== 0) {
    throw new Error(
      `Cleanup failed: expected zero ${TARGET_TABLE} rows, found ${afterCleanup.count}.`,
    );
  }

  console.log(
    JSON.stringify(
      {
        status: "passed",
        targetProject: STRIDEO_DEV_PROJECT_NAME,
        targetRef: STRIDEO_DEV_PROJECT_REF,
        fixture: FIXTURE_NAME,
        sourceFixture: "lib/provider-ingestion/fixtures/the-racing-api-race-entry.fixture.ts",
        targetTable: TARGET_TABLE,
        expectedRowIdentity: {
          provider: "the_racing_api",
          providerEntryId: FIXTURE_PROVIDER_ENTRY_ID,
          raceDate: FIXTURE_RACE_DATE,
          conflictTarget: "provider,provider_entry_id,race_date",
        },
        boundRace: {
          provider: raceBinding.provider,
          providerRaceId: raceBinding.provider_race_id,
          raceId: raceBinding.id,
          raceDate: raceBinding.race_date,
        },
        firstExecution,
        secondExecution,
        readback: {
          rowId: firstReadback.id,
          status: firstReadback.status,
          medication: firstReadback.medication,
          duplicateRowsAfterSecondExecution: 0,
        },
        idempotency: {
          passed: true,
          sameRowId: firstReadback.id,
          rowCountAfterFirstExecution: 1,
          rowCountAfterSecondExecution: 1,
        },
        cleanup: {
          passed: true,
          deletedCount: cleanup.deletedCount,
          deletedIds: cleanup.deletedIds,
          rowCountAfterCleanup: afterCleanup.count,
        },
        forbiddenTableFamiliesUntouched: true,
        writesPerformed: [
          {
            table: TARGET_TABLE,
            operation: "upsert",
            count: 2,
            deterministicIdentity: `${FIXTURE_PROVIDER_ENTRY_ID}:${FIXTURE_RACE_DATE}`,
          },
          {
            table: TARGET_TABLE,
            operation: "delete",
            count: cleanup.deletedCount,
            deterministicIdentity: `${FIXTURE_PROVIDER_ENTRY_ID}:${FIXTURE_RACE_DATE}`,
          },
        ],
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Provider race-entry Dev runtime verification failed: ${message}`);
  process.exitCode = 1;
});
