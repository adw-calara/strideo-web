import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildPreRaceFeatureSnapshotMaterializationPlan,
  type FeatureSnapshotInsertRow,
  type FeatureSnapshotMaterializationEntry,
  type FeatureSnapshotMaterializationPlan,
  type FeatureSnapshotMaterializationRace,
} from "./pre-race-snapshot-materialization-core";
import type { PreRaceOddsSnapshotInput } from "./pre-race-snapshot";

type MaybeRelation<T> = T | T[] | null;

type RaceRow = {
  id: string;
  race_date: string;
  provider: string | null;
  provider_race_id: string | null;
  race_number: number | null;
  status: string | null;
  scheduled_at: string | null;
  track_id: string | null;
  surface_id: string | null;
  distance_text: string | null;
  distance_yards: number | null;
  race_type: string | null;
  class_rating: string | null;
  conditions: string | null;
  track: MaybeRelation<{
    id: string;
    code: string | null;
    name: string | null;
  }>;
  surface: MaybeRelation<{
    id: string;
    code: string | null;
    name: string | null;
  }>;
};

type EntryRow = {
  id: string;
  race_id: string;
  race_date: string;
  provider_entry_id: string | null;
  status: string | null;
  horse_id: string | null;
  horse: MaybeRelation<{
    id: string;
    provider_horse_id: string | null;
    name: string | null;
  }>;
  program_number: string | null;
  post_position: number | null;
  morning_line_odds: string | null;
};

type OddsRow = {
  id: string;
  race_id: string;
  race_date: string;
  race_entry_id: string | null;
  pool_type: string;
  odds_fractional: string | null;
  odds_decimal: number | null;
  implied_probability: number | null;
  snapshot_at: string | null;
  sequence_number: number | null;
};

export type FeatureSnapshotMaterializationOptions = {
  raceDate?: string;
  raceIds?: readonly string[];
  maxRaces?: number;
};

export type FeatureSnapshotMaterializationReport = {
  status: "completed";
  mode: "dry_run" | "apply";
  writesPerformed: boolean;
  plan: FeatureSnapshotMaterializationPlan;
  insertedFeatureSnapshotIds: readonly string[];
};

function firstRelation<T>(value: MaybeRelation<T>) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapRace(row: RaceRow): FeatureSnapshotMaterializationRace {
  const track = firstRelation(row.track);
  const surface = firstRelation(row.surface);

  return {
    id: row.id,
    raceDate: row.race_date,
    provider: row.provider,
    providerRaceId: row.provider_race_id,
    raceNumber: row.race_number,
    status: row.status,
    scheduledAt: row.scheduled_at,
    trackId: row.track_id,
    trackCode: track?.code ?? null,
    trackName: track?.name ?? null,
    surfaceId: row.surface_id,
    surfaceCode: surface?.code ?? null,
    surfaceName: surface?.name ?? null,
    distanceText: row.distance_text,
    distanceYards: row.distance_yards,
    raceType: row.race_type,
    classRating: row.class_rating,
    conditions: row.conditions,
  };
}

function mapEntry(row: EntryRow): FeatureSnapshotMaterializationEntry {
  const horse = firstRelation(row.horse);

  return {
    id: row.id,
    raceId: row.race_id,
    raceDate: row.race_date,
    status: row.status,
    providerEntryId: row.provider_entry_id,
    horseId: row.horse_id,
    horseProviderId: horse?.provider_horse_id ?? null,
    horseName: horse?.name ?? null,
    programNumber: row.program_number,
    postPosition: row.post_position,
    morningLineOdds: row.morning_line_odds,
  };
}

function mapOdds(row: OddsRow): PreRaceOddsSnapshotInput {
  return {
    id: row.id,
    raceId: row.race_id,
    raceDate: row.race_date,
    raceEntryId: row.race_entry_id,
    poolType: row.pool_type,
    oddsFractional: row.odds_fractional,
    oddsDecimal: row.odds_decimal,
    impliedProbability: row.implied_probability,
    snapshotAt: row.snapshot_at,
    sequenceNumber: row.sequence_number,
  };
}

function raiseMaterializationError(scope: string, message: string): never {
  throw new Error(`Feature snapshot materialization ${scope} failed: ${message}`);
}

export async function loadPreRaceFeatureSnapshotMaterializationInput(
  client: SupabaseClient,
  options: FeatureSnapshotMaterializationOptions = {},
) {
  let raceQuery = client
    .from("races")
    .select(
      `
        id,
        race_date,
        provider,
        provider_race_id,
        race_number,
        status,
        scheduled_at,
        track_id,
        surface_id,
        distance_text,
        distance_yards,
        race_type,
        class_rating,
        conditions,
        track:tracks (
          id,
          code,
          name
        ),
        surface:surfaces (
          id,
          code,
          name
        )
      `,
    )
    .in("status", ["scheduled", "open"])
    .order("race_date", { ascending: false })
    .order("race_number", { ascending: true })
    .limit(options.maxRaces ?? 25);

  if (options.raceDate) {
    raceQuery = raceQuery.eq("race_date", options.raceDate);
  }

  if (options.raceIds && options.raceIds.length > 0) {
    raceQuery = raceQuery.in("id", [...options.raceIds]);
  }

  const { data: raceData, error: raceError } = await raceQuery.returns<
    RaceRow[]
  >();

  if (raceError) {
    raiseMaterializationError("race load", raceError.message);
  }

  const races = (raceData ?? []).map(mapRace);

  if (races.length === 0) {
    return {
      races,
      entries: [],
      oddsSnapshots: [],
    };
  }

  const raceIds = races.map((race) => race.id);
  const [entryResult, oddsResult] = await Promise.all([
    client
      .from("race_entries")
      .select(
        `
          id,
          race_id,
          race_date,
          provider_entry_id,
          status,
          horse_id,
          horse:horses (
            id,
            provider_horse_id,
            name
          ),
          program_number,
          post_position,
          morning_line_odds
        `,
      )
      .in("race_id", raceIds)
      .in("status", ["entered", "reinstated", "started"])
      .order("post_position", { ascending: true, nullsFirst: false })
      .returns<EntryRow[]>(),
    client
      .from("odds_snapshots")
      .select(
        "id,race_id,race_date,race_entry_id,pool_type,odds_fractional,odds_decimal,implied_probability,snapshot_at,sequence_number",
      )
      .in("race_id", raceIds)
      .eq("pool_type", "win")
      .order("snapshot_at", { ascending: false })
      .order("sequence_number", { ascending: false, nullsFirst: false })
      .returns<OddsRow[]>(),
  ]);

  if (entryResult.error) {
    raiseMaterializationError("entry load", entryResult.error.message);
  }

  if (oddsResult.error) {
    raiseMaterializationError("odds load", oddsResult.error.message);
  }

  return {
    races,
    entries: (entryResult.data ?? []).map(mapEntry),
    oddsSnapshots: (oddsResult.data ?? []).map(mapOdds),
  };
}

async function readExistingFeatureSnapshotIds(
  client: SupabaseClient,
  ids: readonly string[],
) {
  if (ids.length === 0) {
    return new Set<string>();
  }

  const { data, error } = await client
    .from("feature_snapshots")
    .select("id")
    .in("id", [...ids])
    .returns<Array<{ id: string }>>();

  if (error) {
    raiseMaterializationError("existing snapshot lookup", error.message);
  }

  return new Set((data ?? []).map((row) => row.id));
}

async function insertFeatureSnapshotRows(
  client: SupabaseClient,
  rows: readonly FeatureSnapshotInsertRow[],
) {
  if (rows.length === 0) {
    return [];
  }

  const { data, error } = await client
    .from("feature_snapshots")
    .insert([...rows])
    .select("id")
    .returns<Array<{ id: string }>>();

  if (error) {
    raiseMaterializationError("insert", error.message);
  }

  return (data ?? []).map((row) => row.id);
}

async function buildPlan(
  client: SupabaseClient,
  options: FeatureSnapshotMaterializationOptions,
) {
  const input = await loadPreRaceFeatureSnapshotMaterializationInput(
    client,
    options,
  );
  const candidatePlan = buildPreRaceFeatureSnapshotMaterializationPlan(input);
  const candidateIds = candidatePlan.items
    .filter((item) => item.status !== "blocked")
    .map((item) => item.id);
  const existingFeatureSnapshotIds = await readExistingFeatureSnapshotIds(
    client,
    candidateIds,
  );

  return buildPreRaceFeatureSnapshotMaterializationPlan({
    ...input,
    existingFeatureSnapshotIds,
  });
}

export async function buildPreRaceFeatureSnapshotMaterializationReport(
  client: SupabaseClient,
  options: FeatureSnapshotMaterializationOptions = {},
): Promise<FeatureSnapshotMaterializationReport> {
  const plan = await buildPlan(client, options);

  return {
    status: "completed",
    mode: "dry_run",
    writesPerformed: false,
    plan,
    insertedFeatureSnapshotIds: [],
  };
}

export async function applyPreRaceFeatureSnapshotMaterialization(
  client: SupabaseClient,
  options: FeatureSnapshotMaterializationOptions = {},
): Promise<FeatureSnapshotMaterializationReport> {
  const plan = await buildPlan(client, options);
  const rowsToInsert = plan.items
    .filter((item) => item.status === "planned")
    .map((item) => item.row);
  const insertedFeatureSnapshotIds = await insertFeatureSnapshotRows(
    client,
    rowsToInsert,
  );

  return {
    status: "completed",
    mode: "apply",
    writesPerformed: insertedFeatureSnapshotIds.length > 0,
    plan,
    insertedFeatureSnapshotIds,
  };
}
