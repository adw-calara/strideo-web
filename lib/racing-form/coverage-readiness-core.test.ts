import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { STRIDEO_DEV_PROJECT_REF } from "@/lib/provider-ingestion/provider-race-entry-dev-boundary";
import { getRacingFormCoverageDevTargetBlocker } from "./coverage-readiness-dev-boundary";
import { classifyRacingFormReadFailure } from "./coverage-readiness-read-errors";
import {
  buildRacingFormCoverageReport,
  type RacingFormCoverageInput,
  type RacingFormCoverageMetricInput,
} from "./coverage-readiness-core";

function completeMetrics(): RacingFormCoverageMetricInput {
  return {
    races: 10,
    raceConditionRows: 10,
    raceEntries: 80,
    raceEntriesWithHorse: 80,
    raceEntriesWithJockey: 80,
    raceEntriesWithTrainer: 80,
    raceEntriesWithMorningLine: 80,
    raceEntriesWithOwner: 80,
    raceEntriesWithClaim: 20,
    raceEntriesWithLayoff: 80,
    raceEntriesWithComments: 80,
    tracks: 4,
    owners: 40,
    pastPerformances: 80,
    pastPerformancesWithSpeed: 80,
    pastPerformancesWithFinalTime: 80,
    workouts: 80,
    trainerStats: 80,
    distinctRaceEntryTrainers: 40,
    distinctRaceEntryTrainersWithStats: 40,
    valueCalculations: 80,
    featureSnapshots: 80,
    modelVersions: 3,
    predictionOutputs: 80,
    oddsSnapshots: 120,
    resultVersions: 10,
    resultEntries: 80,
    racingCodeSets: 8,
    racingCodeValues: 100,
    racingCodeAliases: 100,
    trackCodeAliases: 20,
    reviewedTrackCodeAliasTargets: 4,
    reviewedTrackCodeAliasesResolved: 4,
    openUnresolvedSourceCodes: 0,
    sourceLineageRows: 80,
  };
}

function makeInput(
  metrics: Partial<RacingFormCoverageMetricInput> = {},
): RacingFormCoverageInput {
  return {
    targetProject: "strideo-dev",
    targetRef: "ntxtakbggtljjbalgris",
    reviewedScope: {
      racesReviewed: metrics.races ?? 10,
      entriesReviewed: metrics.raceEntries ?? 80,
      tracksReviewed: metrics.tracks ?? 4,
      raceDateStart: "2026-06-01",
      raceDateEnd: "2026-06-08",
    },
    metrics: {
      ...completeMetrics(),
      ...metrics,
    },
  };
}

describe("racing-form coverage readiness planner", () => {
  it("returns ready coverage when all reviewed domains are complete", () => {
    const report = buildRacingFormCoverageReport(makeInput());

    assert.equal(report.status, "ready");
    assert.deepEqual(report.blockers, []);
    assert.equal(report.safety.writesPerformed, false);
    assert.equal(report.safety.providerIngestionRun, false);
    assert.equal(report.safety.mlTrainingRun, false);
    assert.equal(report.safety.scoringRun, false);
  });

  it("returns partial coverage when optional source-fact coverage is incomplete", () => {
    const report = buildRacingFormCoverageReport(
      makeInput({
        raceEntriesWithOwner: 20,
        raceEntriesWithLayoff: 10,
        raceEntriesWithComments: 0,
      }),
    );

    assert.equal(report.status, "partial");
    assert.ok(
      report.warnings.some((warning) =>
        warning.includes("Owner, claim, layoff, or comment context signals"),
      ),
    );
  });

  it("recognizes owner links as honest owner/context signal coverage", () => {
    const report = buildRacingFormCoverageReport(
      makeInput({
        raceEntries: 14,
        raceEntriesWithOwner: 14,
        raceEntriesWithClaim: 0,
        raceEntriesWithLayoff: 0,
        raceEntriesWithComments: 0,
        owners: 14,
      }),
    );
    const domain = report.domains.find(
      (item) => item.key === "owner_claim_context",
    );

    assert.equal(domain?.status, "ready");
    assert.equal(domain?.counts.percent, 100);
    assert.ok(domain?.notes.includes("0 entries have claim links."));
    assert.ok(
      !report.warnings.some((warning) =>
        warning.includes("Owner, claim, layoff, or comment context signals"),
      ),
    );
  });

  it("returns blocked coverage when no race or entry rows are available", () => {
    const report = buildRacingFormCoverageReport(
      makeInput({
        races: 0,
        raceConditionRows: 0,
        raceEntries: 0,
        raceEntriesWithHorse: 0,
        raceEntriesWithJockey: 0,
        raceEntriesWithTrainer: 0,
        raceEntriesWithMorningLine: 0,
      }),
    );

    assert.equal(report.status, "blocked");
    assert.ok(report.blockers.some((reason) => reason.includes("Race metadata")));
    assert.ok(report.blockers.some((reason) => reason.includes("Race entries")));
  });

  it("blocks race metadata when reviewed races lack structured condition coverage", () => {
    const report = buildRacingFormCoverageReport(
      makeInput({
        races: 2,
        raceConditionRows: 0,
        raceEntries: 14,
      }),
    );
    const domain = report.domains.find((item) => item.key === "race_metadata");

    assert.equal(report.status, "blocked");
    assert.equal(domain?.status, "blocked");
    assert.deepEqual(domain?.counts, {
      available: 0,
      missing: 2,
      total: 2,
      percent: 0,
    });
    assert.ok(report.blockers.some((reason) => reason.includes("Race metadata")));
  });

  it("clears race metadata when reviewed races have structured condition coverage", () => {
    const report = buildRacingFormCoverageReport(
      makeInput({
        races: 2,
        raceConditionRows: 2,
        raceEntries: 14,
      }),
    );
    const domain = report.domains.find((item) => item.key === "race_metadata");

    assert.equal(domain?.status, "ready");
    assert.deepEqual(domain?.counts, {
      available: 2,
      missing: 0,
      total: 2,
      percent: 100,
    });
    assert.ok(
      !report.blockers.some((reason) => reason.includes("Race metadata")),
    );
  });

  it("reports missing past performances without inventing source facts", () => {
    const report = buildRacingFormCoverageReport(
      makeInput({
        pastPerformances: 0,
        pastPerformancesWithSpeed: 0,
        pastPerformancesWithFinalTime: 0,
      }),
    );
    const domain = report.domains.find((item) => item.key === "past_performances");

    assert.equal(report.status, "partial");
    assert.equal(domain?.status, "partial");
    assert.equal(domain?.counts.available, 0);
    assert.equal(report.modelReadiness.fundamental_win_probability_v1.status, "blocked");
  });

  it("reports missing workouts", () => {
    const report = buildRacingFormCoverageReport(makeInput({ workouts: 0 }));
    const domain = report.domains.find((item) => item.key === "workouts");

    assert.equal(domain?.status, "partial");
    assert.ok(report.warnings.some((warning) => warning.includes("Workouts")));
  });

  it("recognizes covered past performances and workouts with source lineage", () => {
    const report = buildRacingFormCoverageReport(
      makeInput({
        raceEntries: 14,
        pastPerformances: 14,
        pastPerformancesWithSpeed: 14,
        pastPerformancesWithFinalTime: 14,
        workouts: 14,
        sourceLineageRows: 14,
      }),
    );
    const pastPerformanceDomain = report.domains.find(
      (item) => item.key === "past_performances",
    );
    const workoutDomain = report.domains.find((item) => item.key === "workouts");

    assert.equal(pastPerformanceDomain?.status, "ready");
    assert.equal(pastPerformanceDomain?.counts.percent, 100);
    assert.equal(workoutDomain?.status, "ready");
    assert.equal(workoutDomain?.counts.percent, 100);
    assert.ok(
      !report.warnings.some((warning) =>
        warning.includes("No reviewed racing-form source-fact rows"),
      ),
    );
  });

  it("reports missing trainer stats against distinct reviewed trainers", () => {
    const report = buildRacingFormCoverageReport(
      makeInput({
        raceEntries: 14,
        raceEntriesWithTrainer: 14,
        trainerStats: 0,
        distinctRaceEntryTrainers: 4,
        distinctRaceEntryTrainersWithStats: 0,
      }),
    );
    const domain = report.domains.find((item) => item.key === "trainer_stats");

    assert.equal(domain?.status, "partial");
    assert.deepEqual(domain?.counts, {
      available: 0,
      missing: 4,
      total: 4,
      percent: 0,
    });
    assert.ok(report.warnings.some((warning) => warning.includes("Trainer stats")));
  });

  it("does not inflate trainer_stats coverage for repeated trainers", () => {
    const report = buildRacingFormCoverageReport(
      makeInput({
        raceEntries: 14,
        raceEntriesWithTrainer: 14,
        trainerStats: 2,
        distinctRaceEntryTrainers: 4,
        distinctRaceEntryTrainersWithStats: 2,
      }),
    );
    const domain = report.domains.find((item) => item.key === "trainer_stats");

    assert.equal(domain?.status, "partial");
    assert.deepEqual(domain?.counts, {
      available: 2,
      missing: 2,
      total: 4,
      percent: 50,
    });
    assert.ok(
      domain?.notes.includes(
        "4 distinct reviewed trainers are represented by race entries.",
      ),
    );
  });

  it("does not require one trainer-stat row per race entry", () => {
    const report = buildRacingFormCoverageReport(
      makeInput({
        raceEntries: 14,
        raceEntriesWithTrainer: 14,
        trainerStats: 4,
        distinctRaceEntryTrainers: 4,
        distinctRaceEntryTrainersWithStats: 4,
      }),
    );
    const domain = report.domains.find((item) => item.key === "trainer_stats");

    assert.equal(domain?.status, "ready");
    assert.deepEqual(domain?.counts, {
      available: 4,
      missing: 0,
      total: 4,
      percent: 100,
    });
    assert.ok(
      !report.warnings.some((warning) => warning.includes("Trainer stats")),
    );
  });

  it("counts trainer-stat coverage once per distinct reviewed trainer", () => {
    const report = buildRacingFormCoverageReport(
      makeInput({
        raceEntries: 14,
        raceEntriesWithTrainer: 14,
        trainerStats: 14,
        distinctRaceEntryTrainers: 4,
        distinctRaceEntryTrainersWithStats: 4,
      }),
    );
    const domain = report.domains.find((item) => item.key === "trainer_stats");

    assert.equal(domain?.status, "ready");
    assert.equal(domain?.counts.available, 4);
    assert.equal(domain?.counts.total, 4);
    assert.ok(
      domain?.notes.includes("14 total trainer-stat rows are available."),
    );
  });

  it("blocks glossary readiness when canonical normalization tables are empty", () => {
    const report = buildRacingFormCoverageReport(
      makeInput({
        racingCodeSets: 0,
        racingCodeValues: 0,
        racingCodeAliases: 0,
        trackCodeAliases: 0,
        reviewedTrackCodeAliasesResolved: 0,
      }),
    );
    const domain = report.domains.find(
      (item) => item.key === "glossary_normalization",
    );

    assert.equal(report.status, "blocked");
    assert.equal(domain?.status, "blocked");
  });

  it("does not clear glossary readiness for unrelated track-code aliases", () => {
    const report = buildRacingFormCoverageReport(
      makeInput({
        tracks: 1,
        racingCodeSets: 8,
        racingCodeValues: 100,
        racingCodeAliases: 100,
        trackCodeAliases: 1,
        reviewedTrackCodeAliasTargets: 1,
        reviewedTrackCodeAliasesResolved: 0,
      }),
    );
    const domain = report.domains.find(
      (item) => item.key === "glossary_normalization",
    );

    assert.equal(report.status, "partial");
    assert.equal(domain?.status, "partial");
    assert.deepEqual(domain?.counts, {
      available: 3,
      missing: 1,
      total: 4,
      percent: 75,
    });
    assert.ok(
      domain?.notes.includes(
        "0 reviewed tracks have provider track-code aliases.",
      ),
    );
    assert.ok(
      domain?.notes.includes("1 total track code alias rows are available."),
    );
  });

  it("clears glossary track-code readiness for reviewed demo track aliases", () => {
    const report = buildRacingFormCoverageReport(
      makeInput({
        tracks: 1,
        racingCodeSets: 8,
        racingCodeValues: 100,
        racingCodeAliases: 100,
        trackCodeAliases: 1,
        reviewedTrackCodeAliasTargets: 1,
        reviewedTrackCodeAliasesResolved: 1,
      }),
    );
    const domain = report.domains.find(
      (item) => item.key === "glossary_normalization",
    );

    assert.equal(domain?.status, "ready");
    assert.deepEqual(domain?.counts, {
      available: 4,
      missing: 0,
      total: 4,
      percent: 100,
    });
    assert.ok(
      !report.warnings.some((warning) =>
        warning.includes("Glossary and normalization readiness"),
      ),
    );
  });

  it("keeps deterministic domain and warning ordering", () => {
    const report = buildRacingFormCoverageReport(
      makeInput({
        workouts: 0,
        trainerStats: 0,
        distinctRaceEntryTrainersWithStats: 0,
        openUnresolvedSourceCodes: 2,
      }),
    );

    assert.deepEqual(
      report.domains.map((domain) => domain.key),
      [
        "race_metadata",
        "race_entries",
        "owner_claim_context",
        "past_performances",
        "workouts",
        "trainer_stats",
        "value_calculation_inputs",
        "glossary_normalization",
      ],
    );
    assert.deepEqual([...report.warnings].sort(), report.warnings);
  });

  it("keeps JSON output free of secret, auth, service-role, and raw-payload fields", () => {
    const json = JSON.stringify(buildRacingFormCoverageReport(makeInput()));

    assert.doesNotMatch(json, /SUPABASE_SERVICE_ROLE_KEY/i);
    assert.doesNotMatch(json, /serviceRoleKey/i);
    assert.doesNotMatch(json, /"auth/i);
    assert.doesNotMatch(json, /raw_payload/i);
    assert.doesNotMatch(json, /sample_payload/i);
  });

  it("keeps the Dev source-fact fixture scoped away from scoring and wagering", () => {
    const fixture = readFileSync(
      new URL(
        "../../supabase/fixtures/dev/demo_racing_form_source_facts.sql",
        import.meta.url,
      ),
      "utf8",
    );

    assert.match(fixture, /horse_past_performances/);
    assert.match(fixture, /horse_workouts/);
    assert.match(fixture, /source_data_files/);
    assert.match(fixture, /data_ingestion_batches/);
    assert.match(fixture, /job_runs/);
    assert.match(fixture, /provider = 'demo'/);
    assert.doesNotMatch(fixture, /insert into public\.prediction_outputs/i);
    assert.doesNotMatch(fixture, /insert into public\.opportunity_scores/i);
    assert.doesNotMatch(fixture, /insert into public\.value_calculations/i);
    assert.doesNotMatch(fixture, /insert into public\.wager/i);
    assert.doesNotMatch(fixture, /SUPABASE_/i);
  });

  it("keeps the Dev owner context fixture scoped away from scoring and ingestion", () => {
    const fixture = readFileSync(
      new URL(
        "../../supabase/fixtures/dev/demo_racing_form_owner_context.sql",
        import.meta.url,
      ),
      "utf8",
    );

    assert.match(fixture, /insert into public\.owners/i);
    assert.match(fixture, /update public\.race_entries/i);
    assert.match(fixture, /provider = 'demo'/);
    assert.match(fixture, /owner_id/);
    assert.match(fixture, /layoff_days/);
    assert.match(fixture, /entry_comments/);
    assert.doesNotMatch(fixture, /insert into public\.trainer_performance_stats/i);
    assert.doesNotMatch(fixture, /insert into public\.source_data_files/i);
    assert.doesNotMatch(fixture, /insert into public\.job_runs/i);
    assert.doesNotMatch(fixture, /insert into public\.prediction_outputs/i);
    assert.doesNotMatch(fixture, /insert into public\.opportunity_scores/i);
    assert.doesNotMatch(fixture, /insert into public\.value_calculations/i);
    assert.doesNotMatch(fixture, /insert into public\.wager/i);
    assert.doesNotMatch(fixture, /raw_payload/i);
    assert.doesNotMatch(fixture, /SUPABASE_/i);
  });

  it("keeps the Dev trainer-stat fixture scoped to distinct trainer profiles", () => {
    const fixture = readFileSync(
      new URL(
        "../../supabase/fixtures/dev/demo_racing_form_trainer_stats.sql",
        import.meta.url,
      ),
      "utf8",
    );
    const trainerIds = [
      "demo-trainer-lena-west",
      "demo-trainer-owen-field",
      "demo-trainer-mira-stone",
      "demo-trainer-cal-rowan",
    ];
    const profileKeys = new Set(
      [...fixture.matchAll(/demo-trainer-stat-profile-[a-z-]+/g)].map(
        ([profileKey]) => profileKey,
      ),
    );

    assert.match(fixture, /insert into public\.trainer_performance_stats/i);
    assert.match(fixture, /job_runs/);
    assert.match(fixture, /data_ingestion_batches/);
    assert.match(fixture, /source_data_files/);
    assert.match(fixture, /provider = 'demo'/);
    assert.deepEqual(
      [...profileKeys].sort(),
      [
        "demo-trainer-stat-profile-cal-rowan",
        "demo-trainer-stat-profile-lena-west",
        "demo-trainer-stat-profile-mira-stone",
        "demo-trainer-stat-profile-owen-field",
      ],
    );
    assert.match(fixture, /distinct_trainer_profiles', 4/);
    for (const trainerId of trainerIds) {
      assert.match(fixture, new RegExp(trainerId));
    }
    assert.doesNotMatch(fixture, /insert into public\.prediction_outputs/i);
    assert.doesNotMatch(fixture, /insert into public\.opportunity_scores/i);
    assert.doesNotMatch(fixture, /insert into public\.value_calculations/i);
    assert.doesNotMatch(fixture, /insert into public\.wager/i);
    assert.doesNotMatch(fixture, /insert into public\.model_/i);
    assert.doesNotMatch(fixture, /raw_payload/i);
    assert.doesNotMatch(fixture, /sample_payload/i);
    assert.doesNotMatch(fixture, /SUPABASE_/i);
  });

  it("keeps the Dev track-code alias fixture scoped to reviewed demo aliases", () => {
    const fixture = readFileSync(
      new URL(
        "../../supabase/fixtures/dev/demo_track_code_aliases.sql",
        import.meta.url,
      ),
      "utf8",
    );

    assert.match(fixture, /insert into public\.track_code_aliases/i);
    assert.match(fixture, /provider = 'demo'/);
    assert.match(fixture, /provider_track_id = 'demo-track-strideo-park'/);
    assert.match(fixture, /source_system,\s*source_track_code/i);
    assert.match(fixture, /'demo',\s*'SDP'/);
    assert.doesNotMatch(fixture, /insert into public\.prediction_outputs/i);
    assert.doesNotMatch(fixture, /insert into public\.opportunity_scores/i);
    assert.doesNotMatch(fixture, /insert into public\.value_calculations/i);
    assert.doesNotMatch(fixture, /insert into public\.wager/i);
    assert.doesNotMatch(fixture, /insert into public\.model_/i);
    assert.doesNotMatch(fixture, /raw_payload/i);
    assert.doesNotMatch(fixture, /sample_payload/i);
    assert.doesNotMatch(fixture, /SUPABASE_/i);
  });

  it("fails closed before Dev reads when the target is not confirmed", () => {
    const blocker = getRacingFormCoverageDevTargetBlocker({
      nodeEnv: "development",
      supabaseUrl: "https://not-strideo.supabase.co",
      serviceRoleKeyPresent: true,
      linkedProject: {
        name: "strideo-dev",
        ref: STRIDEO_DEV_PROJECT_REF,
      },
    });

    assert.match(blocker ?? "", /Refusing Supabase target/);
  });

  it("requires the linked Strideo Dev marker before reads", () => {
    const blocker = getRacingFormCoverageDevTargetBlocker({
      nodeEnv: "development",
      supabaseUrl: `https://${STRIDEO_DEV_PROJECT_REF}.supabase.co`,
      serviceRoleKeyPresent: true,
      linkedProject: null,
    });

    assert.match(blocker ?? "", /Refusing linked project/);
  });

  it("classifies forbidden count reads as permission or API exposure issues", () => {
    const diagnostic = classifyRacingFormReadFailure({
      error: { message: "" },
      status: 403,
      statusText: "Forbidden",
    });

    assert.equal(diagnostic.category, "permission_or_api_exposure");
    assert.equal(diagnostic.httpStatus, 403);
    assert.match(diagnostic.message, /status=403/);
    assert.match(diagnostic.message, /statusText=Forbidden/);
  });

  it("classifies missing relation errors without implying a grant fix", () => {
    const diagnostic = classifyRacingFormReadFailure({
      error: {
        code: "42P01",
        message: "relation public.missing_table does not exist",
      },
      status: 404,
      statusText: "Not Found",
    });

    assert.equal(diagnostic.category, "relation_missing");
    assert.equal(diagnostic.httpStatus, 404);
  });

  it("classifies other client errors as query construction diagnostics", () => {
    const diagnostic = classifyRacingFormReadFailure({
      error: {
        code: "PGRST100",
        message: "failed to parse filter",
      },
      status: 400,
      statusText: "Bad Request",
    });

    assert.equal(diagnostic.category, "query_construction");
  });

  it("includes read error categories in report blockers", () => {
    const report = buildRacingFormCoverageReport({
      ...makeInput(),
      readErrors: [
        {
          table: "model_versions",
          operation: "count",
          category: "permission_or_api_exposure",
          httpStatus: 403,
          message: "status=403; statusText=Forbidden",
        },
      ],
    });

    assert.equal(report.status, "blocked");
    assert.ok(
      report.blockers.some((blocker) =>
        blocker.includes(
          "model_versions count read failed (permission_or_api_exposure, HTTP 403)",
        ),
      ),
    );
  });
});
