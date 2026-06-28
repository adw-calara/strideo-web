import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  STRIDEO_DEV_PROJECT_NAME,
  STRIDEO_DEV_PROJECT_REF,
} from "@/lib/provider-ingestion/provider-race-entry-dev-boundary";
import {
  buildRacingFormCoverageReport,
  type RacingFormCoverageInput,
  type RacingFormCoverageMetricInput,
  type RacingFormCoverageReadError,
  type RacingFormCoverageReviewedScope,
} from "./coverage-readiness-core";
import { classifyRacingFormReadFailure } from "./coverage-readiness-read-errors";

type CountResult = {
  count: number;
  error: RacingFormCoverageReadError | null;
};

type SupabaseCountQuery = ReturnType<
  ReturnType<SupabaseClient["from"]>["select"]
>;

type RaceDateRow = {
  race_date: string;
};

async function countQuery(
  client: SupabaseClient,
  table: string,
  operation: string,
  build: (query: SupabaseCountQuery) => SupabaseCountQuery,
): Promise<CountResult> {
  const query = build(
    client.from(table).select("*", {
      count: "exact",
      head: true,
    }),
  );
  const { count, error, status, statusText } = await query;

  if (error) {
    const diagnostic = classifyRacingFormReadFailure({
      error,
      status,
      statusText,
    });

    return {
      count: 0,
      error: {
        table,
        operation,
        category: diagnostic.category,
        httpStatus: diagnostic.httpStatus,
        message: diagnostic.message,
      },
    };
  }

  return {
    count: count ?? 0,
    error: null,
  };
}

function countRows(client: SupabaseClient, table: string) {
  return countQuery(client, table, "count", (query) => query);
}

function countNotNull(client: SupabaseClient, table: string, column: string) {
  return countQuery(client, table, `${column} not-null count`, (query) =>
    query.not(column, "is", null),
  );
}

async function readRaceDateBoundary(
  client: SupabaseClient,
  ascending: boolean,
) {
  const { data, error, status, statusText } = await client
    .from("races")
    .select("race_date")
    .order("race_date", { ascending })
    .limit(1)
    .returns<RaceDateRow[]>();

  if (error) {
    const diagnostic = classifyRacingFormReadFailure({
      error,
      status,
      statusText,
    });

    return {
      value: null,
      error: {
        table: "races",
        operation: ascending ? "earliest race date" : "latest race date",
        category: diagnostic.category,
        httpStatus: diagnostic.httpStatus,
        message: diagnostic.message,
      },
    };
  }

  return {
    value: data?.[0]?.race_date ?? null,
    error: null,
  };
}

async function collectRacingFormCoverageInput(
  client: SupabaseClient,
): Promise<RacingFormCoverageInput> {
  const [
    raceCount,
    raceClassLevelCount,
    raceTrackConditionCount,
    raceFieldSizeCount,
    raceEntries,
    entriesWithHorse,
    entriesWithJockey,
    entriesWithTrainer,
    entriesWithMorningLine,
    entriesWithOwner,
    entriesWithClaimedFrom,
    entriesWithClaimedBy,
    entriesWithLayoff,
    entriesWithPhysicalNotes,
    entriesWithEntryComments,
    entriesWithTripNotes,
    tracks,
    owners,
    pastPerformances,
    pastPerformancesWithSpeed,
    pastPerformancesWithBeyer,
    pastPerformancesWithFinalTime,
    pastPerformancesWithSourceFile,
    pastPerformancesWithBatch,
    pastPerformancesWithJob,
    workouts,
    workoutsWithSourceFile,
    workoutsWithBatch,
    workoutsWithJob,
    trainerStats,
    trainerStatsWithSourceFile,
    trainerStatsWithBatch,
    trainerStatsWithJob,
    valueCalculations,
    featureSnapshots,
    modelVersions,
    predictionOutputs,
    oddsSnapshots,
    resultVersions,
    resultEntries,
    racingCodeSets,
    racingCodeValues,
    racingCodeAliases,
    trackCodeAliases,
    openUnresolvedCodes,
    earliestRaceDate,
    latestRaceDate,
  ] = await Promise.all([
    countRows(client, "races"),
    countNotNull(client, "races", "class_level"),
    countNotNull(client, "races", "track_condition"),
    countNotNull(client, "races", "field_size"),
    countRows(client, "race_entries"),
    countNotNull(client, "race_entries", "horse_id"),
    countNotNull(client, "race_entries", "jockey_id"),
    countNotNull(client, "race_entries", "trainer_id"),
    countNotNull(client, "race_entries", "morning_line_odds"),
    countNotNull(client, "race_entries", "owner_id"),
    countNotNull(client, "race_entries", "claimed_from_owner_id"),
    countNotNull(client, "race_entries", "claimed_by_owner_id"),
    countNotNull(client, "race_entries", "layoff_days"),
    countNotNull(client, "race_entries", "physical_notes"),
    countNotNull(client, "race_entries", "entry_comments"),
    countNotNull(client, "race_entries", "trip_notes"),
    countRows(client, "tracks"),
    countRows(client, "owners"),
    countRows(client, "horse_past_performances"),
    countNotNull(client, "horse_past_performances", "speed_figure"),
    countNotNull(client, "horse_past_performances", "beyer_speed_figure"),
    countNotNull(client, "horse_past_performances", "final_time_seconds"),
    countNotNull(client, "horse_past_performances", "source_data_file_id"),
    countNotNull(client, "horse_past_performances", "data_ingestion_batch_id"),
    countNotNull(client, "horse_past_performances", "source_job_run_id"),
    countRows(client, "horse_workouts"),
    countNotNull(client, "horse_workouts", "source_data_file_id"),
    countNotNull(client, "horse_workouts", "data_ingestion_batch_id"),
    countNotNull(client, "horse_workouts", "source_job_run_id"),
    countRows(client, "trainer_performance_stats"),
    countNotNull(client, "trainer_performance_stats", "source_data_file_id"),
    countNotNull(client, "trainer_performance_stats", "data_ingestion_batch_id"),
    countNotNull(client, "trainer_performance_stats", "source_job_run_id"),
    countRows(client, "value_calculations"),
    countRows(client, "feature_snapshots"),
    countRows(client, "model_versions"),
    countRows(client, "prediction_outputs"),
    countRows(client, "odds_snapshots"),
    countRows(client, "result_versions"),
    countRows(client, "result_entries"),
    countRows(client, "racing_code_sets"),
    countRows(client, "racing_code_values"),
    countRows(client, "racing_code_aliases"),
    countRows(client, "track_code_aliases"),
    countQuery(client, "racing_unresolved_source_codes", "open count", (query) =>
      query.in("status", ["open", "reviewing", "deferred"]),
    ),
    readRaceDateBoundary(client, true),
    readRaceDateBoundary(client, false),
  ]);

  const countResults = [
    raceCount,
    raceClassLevelCount,
    raceTrackConditionCount,
    raceFieldSizeCount,
    raceEntries,
    entriesWithHorse,
    entriesWithJockey,
    entriesWithTrainer,
    entriesWithMorningLine,
    entriesWithOwner,
    entriesWithClaimedFrom,
    entriesWithClaimedBy,
    entriesWithLayoff,
    entriesWithPhysicalNotes,
    entriesWithEntryComments,
    entriesWithTripNotes,
    tracks,
    owners,
    pastPerformances,
    pastPerformancesWithSpeed,
    pastPerformancesWithBeyer,
    pastPerformancesWithFinalTime,
    pastPerformancesWithSourceFile,
    pastPerformancesWithBatch,
    pastPerformancesWithJob,
    workouts,
    workoutsWithSourceFile,
    workoutsWithBatch,
    workoutsWithJob,
    trainerStats,
    trainerStatsWithSourceFile,
    trainerStatsWithBatch,
    trainerStatsWithJob,
    valueCalculations,
    featureSnapshots,
    modelVersions,
    predictionOutputs,
    oddsSnapshots,
    resultVersions,
    resultEntries,
    racingCodeSets,
    racingCodeValues,
    racingCodeAliases,
    trackCodeAliases,
    openUnresolvedCodes,
  ];
  const readErrors = [
    ...countResults
      .map((result) => result.error)
      .filter((error): error is RacingFormCoverageReadError => Boolean(error)),
    earliestRaceDate.error,
    latestRaceDate.error,
  ].filter((error): error is RacingFormCoverageReadError => Boolean(error));
  const reviewedScope: RacingFormCoverageReviewedScope = {
    racesReviewed: raceCount.count,
    entriesReviewed: raceEntries.count,
    tracksReviewed: tracks.count,
    raceDateStart: earliestRaceDate.value,
    raceDateEnd: latestRaceDate.value,
  };
  const metrics: RacingFormCoverageMetricInput = {
    races: raceCount.count,
    raceConditionRows: Math.max(
      raceClassLevelCount.count,
      raceTrackConditionCount.count,
      raceFieldSizeCount.count,
    ),
    raceEntries: raceEntries.count,
    raceEntriesWithHorse: entriesWithHorse.count,
    raceEntriesWithJockey: entriesWithJockey.count,
    raceEntriesWithTrainer: entriesWithTrainer.count,
    raceEntriesWithMorningLine: entriesWithMorningLine.count,
    raceEntriesWithOwner: entriesWithOwner.count,
    raceEntriesWithClaim: Math.max(
      entriesWithClaimedFrom.count,
      entriesWithClaimedBy.count,
    ),
    raceEntriesWithLayoff: entriesWithLayoff.count,
    raceEntriesWithComments: Math.max(
      entriesWithPhysicalNotes.count,
      entriesWithEntryComments.count,
      entriesWithTripNotes.count,
    ),
    tracks: tracks.count,
    owners: owners.count,
    pastPerformances: pastPerformances.count,
    pastPerformancesWithSpeed: Math.max(
      pastPerformancesWithSpeed.count,
      pastPerformancesWithBeyer.count,
    ),
    pastPerformancesWithFinalTime: pastPerformancesWithFinalTime.count,
    workouts: workouts.count,
    trainerStats: trainerStats.count,
    valueCalculations: valueCalculations.count,
    featureSnapshots: featureSnapshots.count,
    modelVersions: modelVersions.count,
    predictionOutputs: predictionOutputs.count,
    oddsSnapshots: oddsSnapshots.count,
    resultVersions: resultVersions.count,
    resultEntries: resultEntries.count,
    racingCodeSets: racingCodeSets.count,
    racingCodeValues: racingCodeValues.count,
    racingCodeAliases: racingCodeAliases.count,
    trackCodeAliases: trackCodeAliases.count,
    openUnresolvedSourceCodes: openUnresolvedCodes.count,
    sourceLineageRows: Math.max(
      pastPerformancesWithSourceFile.count,
      pastPerformancesWithBatch.count,
      pastPerformancesWithJob.count,
      workoutsWithSourceFile.count,
      workoutsWithBatch.count,
      workoutsWithJob.count,
      trainerStatsWithSourceFile.count,
      trainerStatsWithBatch.count,
      trainerStatsWithJob.count,
    ),
  };

  return {
    targetProject: STRIDEO_DEV_PROJECT_NAME,
    targetRef: STRIDEO_DEV_PROJECT_REF,
    reviewedScope,
    metrics,
    readErrors,
  };
}

export async function buildRacingFormCoverageReadinessReport(
  client: SupabaseClient,
) {
  const input = await collectRacingFormCoverageInput(client);
  return buildRacingFormCoverageReport(input);
}
