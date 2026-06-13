import "server-only";

import { createClient } from "@/lib/supabase/server";

export const EMPTY_RACE_DATA_MESSAGE =
  "No race data is available for the current filters.";

export type RaceDataStatus = "loaded" | "empty";

const DEFAULT_RACE_WINDOW_DAYS = 7;
const DEFAULT_RACE_LIST_LIMIT = 50;
const DEFAULT_RACE_LIST_OFFSET = 0;
const MAX_RACE_LIST_LIMIT = 100;
const RACE_DATE_SUMMARY_ROW_LIMIT = 500;

type RaceReadWindow = {
  startDate: string;
  endDate: string;
};

export type RaceReadWindowOptions = {
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
};

export type RaceReference = {
  id: string;
  provider: string;
  providerId: string;
  name: string;
};

export type RaceTrack = RaceReference & {
  code: string | null;
  countryCode: string | null;
  region: string | null;
  timezone: string;
};

export type RaceSurface = {
  id: string;
  code: string;
  name: string;
  description: string | null;
};

export type RaceDetail = {
  id: string;
  raceDate: string;
  provider: string;
  providerRaceId: string;
  raceNumber: number;
  name: string | null;
  status: RaceStatus;
  scheduledAt: string | null;
  offAt: string | null;
  distanceText: string | null;
  distanceYards: number | null;
  raceType: string | null;
  classRating: string | null;
  purse: number | null;
  conditions: string | null;
  track: RaceTrack | null;
  surface: RaceSurface | null;
};

export type RaceDateSummary = {
  raceDate: string;
  raceCount: number;
  trackCount: number;
};

export type RaceDateListResult = {
  status: RaceDataStatus;
  dates: RaceDateSummary[];
  message: string;
};

export type RaceListItem = RaceDetail & {
  entryCount: number;
};

export type RaceListGroup = {
  raceDate: string;
  track: RaceTrack | null;
  races: RaceListItem[];
};

export type RaceListResult = {
  status: RaceDataStatus;
  groups: RaceListGroup[];
  message: string;
};

export type RaceEntryDetail = {
  id: string;
  raceId: string;
  raceDate: string;
  provider: string;
  providerEntryId: string;
  postPosition: number | null;
  programNumber: string | null;
  status: EntryStatus;
  morningLineOdds: string | null;
  weightLbs: number | null;
  medication: string | null;
  equipment: string | null;
  horse: RaceReference | null;
  jockey: RaceReference | null;
  trainer: RaceReference | null;
};

export type RaceOddsSnapshot = {
  id: string;
  raceId: string;
  raceEntryId: string | null;
  raceDate: string;
  provider: string;
  poolType: string;
  oddsFractional: string | null;
  oddsDecimal: number | null;
  impliedProbability: number | null;
  poolTotal: number | null;
  snapshotAt: string;
  sequenceNumber: number | null;
};

export type LatestOddsByEntryId = Record<string, RaceOddsSnapshot>;

export type RaceResultEntry = {
  id: string;
  raceEntryId: string;
  raceDate: string;
  finishPosition: number | null;
  deadHeatGroup: string | null;
  beatenLengths: number | null;
  payoutWin: number | null;
  payoutPlace: number | null;
  payoutShow: number | null;
};

export type RaceResults = {
  id: string;
  raceId: string;
  raceDate: string;
  resultVersion: number;
  status: ResultStatus;
  officialAt: string | null;
  source: string;
  entries: RaceResultEntry[];
};

export type RaceCardEntry = RaceEntryDetail & {
  latestOdds: RaceOddsSnapshot | null;
  result: RaceResultEntry | null;
};

export type RaceCard = {
  race: RaceDetail;
  entries: RaceCardEntry[];
  latestOddsByEntryId: LatestOddsByEntryId;
  results: RaceResults | null;
};

export type RaceCardResult = {
  status: RaceDataStatus;
  raceCard: RaceCard | null;
  message: string;
};

type RaceStatus =
  | "scheduled"
  | "open"
  | "closed"
  | "resulted"
  | "official"
  | "cancelled";

type EntryStatus =
  | "entered"
  | "scratched"
  | "reinstated"
  | "started"
  | "finished";

type ResultStatus = "unofficial" | "official" | "corrected" | "voided";

type MaybeArray<T> = T | T[] | null;

type RawTrackRow = {
  id: string;
  provider: string;
  provider_track_id: string;
  code: string | null;
  name: string;
  country_code: string | null;
  region: string | null;
  timezone: string;
};

type RawSurfaceRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
};

type RawReferenceRow = {
  id: string;
  provider: string;
  provider_horse_id?: string;
  provider_jockey_id?: string;
  provider_trainer_id?: string;
  name: string;
};

type RawRaceRow = {
  id: string;
  race_date: string;
  provider: string;
  provider_race_id: string;
  race_number: number;
  name: string | null;
  status: RaceStatus;
  scheduled_at: string | null;
  off_at: string | null;
  distance_text: string | null;
  distance_yards: number | null;
  race_type: string | null;
  class_rating: string | null;
  purse: number | null;
  conditions: string | null;
  track: MaybeArray<RawTrackRow>;
  surface: MaybeArray<RawSurfaceRow>;
};

type RawRaceEntryRow = {
  id: string;
  race_id: string;
  race_date: string;
  provider: string;
  provider_entry_id: string;
  post_position: number | null;
  program_number: string | null;
  status: EntryStatus;
  morning_line_odds: string | null;
  weight_lbs: number | null;
  medication: string | null;
  equipment: string | null;
  horse: MaybeArray<RawReferenceRow>;
  jockey: MaybeArray<RawReferenceRow>;
  trainer: MaybeArray<RawReferenceRow>;
};

type RawOddsSnapshotRow = {
  id: string;
  race_id: string;
  race_entry_id: string | null;
  race_date: string;
  provider: string;
  pool_type: string;
  odds_fractional: string | null;
  odds_decimal: number | null;
  implied_probability: number | null;
  pool_total: number | null;
  snapshot_at: string;
  sequence_number: number | null;
};

type RawResultVersionRow = {
  id: string;
  race_id: string;
  race_date: string;
  result_version: number;
  status: ResultStatus;
  official_at: string | null;
  source: string;
};

type RawResultEntryRow = {
  id: string;
  race_entry_id: string;
  race_date: string;
  finish_position: number | null;
  dead_heat_group: string | null;
  beaten_lengths: number | null;
  payout_win: number | null;
  payout_place: number | null;
  payout_show: number | null;
};

const raceSelect = `
  id,
  race_date,
  provider,
  provider_race_id,
  race_number,
  name,
  status,
  scheduled_at,
  off_at,
  distance_text,
  distance_yards,
  race_type,
  class_rating,
  purse,
  conditions,
  track:tracks (
    id,
    provider,
    provider_track_id,
    code,
    name,
    country_code,
    region,
    timezone
  ),
  surface:surfaces (
    id,
    code,
    name,
    description
  )
`;

const raceEntrySelect = `
  id,
  race_id,
  race_date,
  provider,
  provider_entry_id,
  post_position,
  program_number,
  status,
  morning_line_odds,
  weight_lbs,
  medication,
  equipment,
  horse:horses (
    id,
    provider,
    provider_horse_id,
    name
  ),
  jockey:jockeys (
    id,
    provider,
    provider_jockey_id,
    name
  ),
  trainer:trainers (
    id,
    provider,
    provider_trainer_id,
    name
  )
`;

function firstOrNull<T>(value: MaybeArray<T>): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function raiseRaceDataError(operation: string, message: string) {
  throw new Error(`Race data access failed during ${operation}: ${message}`);
}

function mapTrack(row: MaybeArray<RawTrackRow>): RaceTrack | null {
  const track = firstOrNull(row);

  if (!track) {
    return null;
  }

  return {
    id: track.id,
    provider: track.provider,
    providerId: track.provider_track_id,
    code: track.code,
    name: track.name,
    countryCode: track.country_code,
    region: track.region,
    timezone: track.timezone,
  };
}

function mapSurface(row: MaybeArray<RawSurfaceRow>): RaceSurface | null {
  const surface = firstOrNull(row);

  if (!surface) {
    return null;
  }

  return {
    id: surface.id,
    code: surface.code,
    name: surface.name,
    description: surface.description,
  };
}

function mapReference(
  row: MaybeArray<RawReferenceRow>,
  providerIdKey:
    | "provider_horse_id"
    | "provider_jockey_id"
    | "provider_trainer_id",
): RaceReference | null {
  const reference = firstOrNull(row);

  if (!reference) {
    return null;
  }

  return {
    id: reference.id,
    provider: reference.provider,
    providerId: reference[providerIdKey] ?? "",
    name: reference.name,
  };
}

function mapRace(row: RawRaceRow): RaceDetail {
  return {
    id: row.id,
    raceDate: row.race_date,
    provider: row.provider,
    providerRaceId: row.provider_race_id,
    raceNumber: row.race_number,
    name: row.name,
    status: row.status,
    scheduledAt: row.scheduled_at,
    offAt: row.off_at,
    distanceText: row.distance_text,
    distanceYards: row.distance_yards,
    raceType: row.race_type,
    classRating: row.class_rating,
    purse: row.purse,
    conditions: row.conditions,
    track: mapTrack(row.track),
    surface: mapSurface(row.surface),
  };
}

function mapRaceEntry(row: RawRaceEntryRow): RaceEntryDetail {
  return {
    id: row.id,
    raceId: row.race_id,
    raceDate: row.race_date,
    provider: row.provider,
    providerEntryId: row.provider_entry_id,
    postPosition: row.post_position,
    programNumber: row.program_number,
    status: row.status,
    morningLineOdds: row.morning_line_odds,
    weightLbs: row.weight_lbs,
    medication: row.medication,
    equipment: row.equipment,
    horse: mapReference(row.horse, "provider_horse_id"),
    jockey: mapReference(row.jockey, "provider_jockey_id"),
    trainer: mapReference(row.trainer, "provider_trainer_id"),
  };
}

function mapOddsSnapshot(row: RawOddsSnapshotRow): RaceOddsSnapshot {
  return {
    id: row.id,
    raceId: row.race_id,
    raceEntryId: row.race_entry_id,
    raceDate: row.race_date,
    provider: row.provider,
    poolType: row.pool_type,
    oddsFractional: row.odds_fractional,
    oddsDecimal: row.odds_decimal,
    impliedProbability: row.implied_probability,
    poolTotal: row.pool_total,
    snapshotAt: row.snapshot_at,
    sequenceNumber: row.sequence_number,
  };
}

function mapResultEntry(row: RawResultEntryRow): RaceResultEntry {
  return {
    id: row.id,
    raceEntryId: row.race_entry_id,
    raceDate: row.race_date,
    finishPosition: row.finish_position,
    deadHeatGroup: row.dead_heat_group,
    beatenLengths: row.beaten_lengths,
    payoutWin: row.payout_win,
    payoutPlace: row.payout_place,
    payoutShow: row.payout_show,
  };
}

function groupRacesByDateAndTrack(races: RaceListItem[]): RaceListGroup[] {
  const groups = new Map<string, RaceListGroup>();

  for (const race of races) {
    const key = `${race.raceDate}:${race.track?.id ?? "unknown-track"}`;
    const group = groups.get(key);

    if (group) {
      group.races.push(race);
    } else {
      groups.set(key, {
        raceDate: race.raceDate,
        track: race.track,
        races: [race],
      });
    }
  }

  return Array.from(groups.values()).map((group) => ({
    ...group,
    races: group.races.sort((a, b) => a.raceNumber - b.raceNumber),
  }));
}

function raceListMessage(count: number) {
  return count > 0
    ? `${count} race${count === 1 ? "" : "s"} loaded.`
    : EMPTY_RACE_DATA_MESSAGE;
}

function normalizeDateOption(value: string | undefined) {
  const date = value?.slice(0, 10);

  return date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function normalizeRaceListLimit(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_RACE_LIST_LIMIT;
  }

  return Math.min(Math.max(Math.trunc(value), 1), MAX_RACE_LIST_LIMIT);
}

function normalizeRaceListOffset(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_RACE_LIST_OFFSET;
  }

  return Math.max(Math.trunc(value), 0);
}

function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function orderRaceWindow(startDate: string, endDate: string): RaceReadWindow {
  return startDate <= endDate
    ? { startDate, endDate }
    : { startDate: endDate, endDate: startDate };
}

async function findNearestUpcomingRaceDate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  raceDate: string,
) {
  const { data, error } = await supabase
    .from("races")
    .select("race_date")
    .gte("race_date", raceDate)
    .order("race_date", { ascending: true })
    .limit(1)
    .returns<Array<{ race_date: string }>>();

  if (error) {
    raiseRaceDataError("default race window upcoming lookup", error.message);
  }

  return data?.[0]?.race_date ?? null;
}

async function findLatestPastRaceDate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  raceDate: string,
) {
  const { data, error } = await supabase
    .from("races")
    .select("race_date")
    .lte("race_date", raceDate)
    .order("race_date", { ascending: false })
    .limit(1)
    .returns<Array<{ race_date: string }>>();

  if (error) {
    raiseRaceDataError("default race window past lookup", error.message);
  }

  return data?.[0]?.race_date ?? null;
}

async function resolveRaceReadWindow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  options: RaceReadWindowOptions,
): Promise<RaceReadWindow> {
  const explicitStartDate = normalizeDateOption(options.startDate);
  const explicitEndDate = normalizeDateOption(options.endDate);

  if (explicitStartDate && explicitEndDate) {
    return orderRaceWindow(explicitStartDate, explicitEndDate);
  }

  if (explicitStartDate) {
    return {
      startDate: explicitStartDate,
      endDate: addDays(explicitStartDate, DEFAULT_RACE_WINDOW_DAYS - 1),
    };
  }

  if (explicitEndDate) {
    return {
      startDate: addDays(explicitEndDate, -(DEFAULT_RACE_WINDOW_DAYS - 1)),
      endDate: explicitEndDate,
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  const upcomingRaceDate = await findNearestUpcomingRaceDate(supabase, today);

  if (upcomingRaceDate) {
    return {
      startDate: upcomingRaceDate,
      endDate: addDays(upcomingRaceDate, DEFAULT_RACE_WINDOW_DAYS - 1),
    };
  }

  const latestPastRaceDate = await findLatestPastRaceDate(supabase, today);

  if (latestPastRaceDate) {
    return {
      startDate: addDays(latestPastRaceDate, -(DEFAULT_RACE_WINDOW_DAYS - 1)),
      endDate: latestPastRaceDate,
    };
  }

  return {
    startDate: today,
    endDate: addDays(today, DEFAULT_RACE_WINDOW_DAYS - 1),
  };
}

async function fetchRaceForLookup(raceId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("races")
    .select("id,race_date")
    .eq("id", raceId)
    .limit(1)
    .returns<Array<{ id: string; race_date: string }>>();

  if (error) {
    raiseRaceDataError("race lookup", error.message);
  }

  return data?.[0] ?? null;
}

export async function listRaceDates(
  options: RaceReadWindowOptions = {},
): Promise<RaceDateListResult> {
  const supabase = await createClient();
  const window = await resolveRaceReadWindow(supabase, options);
  const { data, error } = await supabase
    .from("races")
    .select("race_date,track_id")
    .gte("race_date", window.startDate)
    .lte("race_date", window.endDate)
    .order("race_date", { ascending: false })
    .range(0, RACE_DATE_SUMMARY_ROW_LIMIT - 1)
    .returns<Array<{ race_date: string; track_id: string }>>();

  if (error) {
    raiseRaceDataError("race date list", error.message);
  }

  const byDate = new Map<
    string,
    { raceDate: string; raceCount: number; trackIds: Set<string> }
  >();

  for (const row of data ?? []) {
    const summary = byDate.get(row.race_date) ?? {
      raceDate: row.race_date,
      raceCount: 0,
      trackIds: new Set<string>(),
    };
    summary.raceCount += 1;
    summary.trackIds.add(row.track_id);
    byDate.set(row.race_date, summary);
  }

  const dates = Array.from(byDate.values()).map((summary) => ({
    raceDate: summary.raceDate,
    raceCount: summary.raceCount,
    trackCount: summary.trackIds.size,
  }));

  return {
    status: dates.length > 0 ? "loaded" : "empty",
    dates,
    message: raceListMessage(dates.reduce((sum, date) => sum + date.raceCount, 0)),
  };
}

export async function listRaces(
  options: RaceReadWindowOptions = {},
): Promise<RaceListResult> {
  const supabase = await createClient();
  const window = await resolveRaceReadWindow(supabase, options);
  const limit = normalizeRaceListLimit(options.limit);
  const offset = normalizeRaceListOffset(options.offset);
  const { data: raceRows, error: raceError } = await supabase
    .from("races")
    .select(raceSelect)
    .gte("race_date", window.startDate)
    .lte("race_date", window.endDate)
    .order("race_date", { ascending: false })
    .order("race_number", { ascending: true })
    .range(offset, offset + limit - 1)
    .returns<RawRaceRow[]>();

  if (raceError) {
    raiseRaceDataError("race list", raceError.message);
  }

  const raceData = raceRows ?? [];

  if (raceData.length === 0) {
    return {
      status: "empty",
      groups: [],
      message: EMPTY_RACE_DATA_MESSAGE,
    };
  }

  const raceIds = raceData.map((race) => race.id);
  // Keep entry counting scoped to the visible race page/window so provider-scale
  // data does not pull every entry ID into app memory.
  const { data: entryRows, error: entryError } = await supabase
    .from("race_entries")
    .select("race_id")
    .in("race_id", raceIds)
    .returns<Array<{ race_id: string }>>();

  if (entryError) {
    raiseRaceDataError("race list entry counts", entryError.message);
  }

  const entryCounts = (entryRows ?? []).reduce<Record<string, number>>(
    (counts, row) => {
      counts[row.race_id] = (counts[row.race_id] ?? 0) + 1;
      return counts;
    },
    {},
  );

  const races = raceData.map((row) => ({
    ...mapRace(row),
    entryCount: entryCounts[row.id] ?? 0,
  }));

  return {
    status: "loaded",
    groups: groupRacesByDateAndTrack(races),
    message: raceListMessage(races.length),
  };
}

export async function getRaceById(raceId: string): Promise<RaceDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("races")
    .select(raceSelect)
    .eq("id", raceId)
    .limit(1)
    .returns<RawRaceRow[]>();

  if (error) {
    raiseRaceDataError("race detail", error.message);
  }

  return data?.[0] ? mapRace(data[0]) : null;
}

export async function getRaceEntries(
  raceId: string,
): Promise<RaceEntryDetail[]> {
  const race = await fetchRaceForLookup(raceId);

  if (!race) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("race_entries")
    .select(raceEntrySelect)
    .eq("race_id", race.id)
    .eq("race_date", race.race_date)
    .order("post_position", { ascending: true, nullsFirst: false })
    .order("program_number", { ascending: true })
    .returns<RawRaceEntryRow[]>();

  if (error) {
    raiseRaceDataError("race entries", error.message);
  }

  return (data ?? []).map(mapRaceEntry);
}

export async function getLatestOddsByRaceId(
  raceId: string,
): Promise<LatestOddsByEntryId> {
  const race = await fetchRaceForLookup(raceId);

  if (!race) {
    return {};
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("odds_snapshots")
    .select(
      `
        id,
        race_id,
        race_entry_id,
        race_date,
        provider,
        pool_type,
        odds_fractional,
        odds_decimal,
        implied_probability,
        pool_total,
        snapshot_at,
        sequence_number
      `,
    )
    .eq("race_id", race.id)
    .eq("race_date", race.race_date)
    .order("snapshot_at", { ascending: false })
    .order("sequence_number", { ascending: false, nullsFirst: false })
    .returns<RawOddsSnapshotRow[]>();

  if (error) {
    raiseRaceDataError("latest race odds", error.message);
  }

  const latestOddsByEntryId: LatestOddsByEntryId = {};

  for (const row of data ?? []) {
    if (row.race_entry_id && !latestOddsByEntryId[row.race_entry_id]) {
      latestOddsByEntryId[row.race_entry_id] = mapOddsSnapshot(row);
    }
  }

  return latestOddsByEntryId;
}

export async function getRaceResults(
  raceId: string,
): Promise<RaceResults | null> {
  const race = await fetchRaceForLookup(raceId);

  if (!race) {
    return null;
  }

  const supabase = await createClient();
  const { data: versions, error: versionError } = await supabase
    .from("result_versions")
    .select("id,race_id,race_date,result_version,status,official_at,source")
    .eq("race_id", race.id)
    .eq("race_date", race.race_date)
    .order("result_version", { ascending: false })
    .limit(1)
    .returns<RawResultVersionRow[]>();

  if (versionError) {
    raiseRaceDataError("race result version", versionError.message);
  }

  const version = versions?.[0];

  if (!version) {
    return null;
  }

  const { data: entries, error: entryError } = await supabase
    .from("result_entries")
    .select(
      `
        id,
        race_entry_id,
        race_date,
        finish_position,
        dead_heat_group,
        beaten_lengths,
        payout_win,
        payout_place,
        payout_show
      `,
    )
    .eq("result_version_id", version.id)
    .eq("race_date", version.race_date)
    .order("finish_position", { ascending: true, nullsFirst: false })
    .returns<RawResultEntryRow[]>();

  if (entryError) {
    raiseRaceDataError("race result entries", entryError.message);
  }

  return {
    id: version.id,
    raceId: version.race_id,
    raceDate: version.race_date,
    resultVersion: version.result_version,
    status: version.status,
    officialAt: version.official_at,
    source: version.source,
    entries: (entries ?? []).map(mapResultEntry),
  };
}

export async function getRaceCard(raceId: string): Promise<RaceCardResult> {
  const race = await getRaceById(raceId);

  if (!race) {
    return {
      status: "empty",
      raceCard: null,
      message: "Race not found.",
    };
  }

  const [entries, latestOddsByEntryId, results] = await Promise.all([
    getRaceEntries(raceId),
    getLatestOddsByRaceId(raceId),
    getRaceResults(raceId),
  ]);

  const resultByEntryId = (results?.entries ?? []).reduce<
    Record<string, RaceResultEntry>
  >((byEntryId, result) => {
    byEntryId[result.raceEntryId] = result;
    return byEntryId;
  }, {});

  const cardEntries = entries.map<RaceCardEntry>((entry) => ({
    ...entry,
    latestOdds: latestOddsByEntryId[entry.id] ?? null,
    result: resultByEntryId[entry.id] ?? null,
  }));

  return {
    status: "loaded",
    raceCard: {
      race,
      entries: cardEntries,
      latestOddsByEntryId,
      results,
    },
    message: `${race.name ?? `Race ${race.raceNumber}`} loaded with ${
      cardEntries.length
    } entr${cardEntries.length === 1 ? "y" : "ies"}.`,
  };
}
