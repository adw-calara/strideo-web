import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { RacingCodeNormalizationInput } from "@/lib/racing-codes/normalization-core";
import { classifyRacingCodeAliases } from "@/lib/racing-codes/normalization-core";
import { resolveRacingCodeAlias } from "@/lib/racing-codes/normalization";
import { makeTheRacingApiRaceEntryFixture } from "./fixtures/the-racing-api-race-entry.fixture";
import { planTheRacingApiRaceEntryAdaptation } from "./provider-race-entry-adapter-core";
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
} from "./provider-race-entry-dev-boundary";
import { inspectRaceEntryWritePlanReadiness } from "./provider-race-entry-persistence-core";

type RaceBindingRow = {
  id: string;
  race_date: string;
  provider: string;
  provider_race_id: string;
};

type RaceEntryIdentityRow = {
  id: string;
};

export type ProviderRaceEntryReadinessReport = {
  status: "ready" | "blocked";
  targetProject: typeof STRIDEO_DEV_PROJECT_NAME;
  targetRef: typeof STRIDEO_DEV_PROJECT_REF;
  workflow: {
    mode: "read_only_status";
    providerIngestionEnabledByDefault: false;
    writesPerformed: [];
    writeHarnessCommand: "npm run provider-ingestion:verify:race-entry-dev";
    writeHarnessRequiresReview: true;
  };
  fixture: typeof RACE_ENTRY_VERIFICATION_FIXTURE_NAME;
  targetTable: typeof RACE_ENTRY_TARGET_TABLE;
  expectedRowIdentity: {
    provider: "the_racing_api";
    providerEntryId: typeof RACE_ENTRY_VERIFICATION_PROVIDER_ENTRY_ID;
    raceDate: typeof RACE_ENTRY_VERIFICATION_DATE;
    conflictTarget: "provider,provider_entry_id,race_date";
  };
  boundRace: {
    provider: string;
    providerRaceId: string;
    raceId: string;
    raceDate: string;
  } | null;
  normalization: {
    blockedForMl: boolean;
    warningCount: number;
    blockingReasons: string[];
    writePlanPresent: boolean;
  };
  persistenceReadiness: {
    status: "ready" | "blocked" | "skipped" | "rejected";
    targetTable: typeof RACE_ENTRY_TARGET_TABLE | null;
    idempotencyKey: string | null;
    reason: string | null;
    upsert: {
      operation: "upsert";
      conflictTarget: "provider,provider_entry_id,race_date";
    } | null;
  };
  deterministicRowPrecheck: {
    count: number;
    rowIds: string[];
  };
  readyToRunWriteHarness: boolean;
  blockingReasons: string[];
  supabaseOperations: {
    reads: readonly [
      "races",
      "racing_code_sets",
      "racing_code_aliases",
      "racing_code_values",
      typeof RACE_ENTRY_TARGET_TABLE,
    ];
    writes: [];
  };
  forbiddenTableFamiliesUntouched: true;
};

export const PROVIDER_RACE_ENTRY_READINESS_READ_TABLES = [
  "races",
  "racing_code_sets",
  "racing_code_aliases",
  "racing_code_values",
  RACE_ENTRY_TARGET_TABLE,
] as const;

export function assertNoForbiddenWriteIdentifiers(value: unknown, path = "plan") {
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

export async function buildProviderRaceEntryReadinessReport(
  client: SupabaseClient,
): Promise<ProviderRaceEntryReadinessReport> {
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

  return {
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
          targetTable: readiness.status === "ready" ? readiness.target_table : null,
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
      reads: PROVIDER_RACE_ENTRY_READINESS_READ_TABLES,
      writes: [],
    },
    forbiddenTableFamiliesUntouched: true,
  };
}
