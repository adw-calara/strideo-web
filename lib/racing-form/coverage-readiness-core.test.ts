import assert from "node:assert/strict";
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
        warning.includes("Owner, claim, layoff, and comment context"),
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

  it("reports missing trainer stats", () => {
    const report = buildRacingFormCoverageReport(makeInput({ trainerStats: 0 }));
    const domain = report.domains.find((item) => item.key === "trainer_stats");

    assert.equal(domain?.status, "partial");
    assert.ok(report.warnings.some((warning) => warning.includes("Trainer stats")));
  });

  it("blocks glossary readiness when canonical normalization tables are empty", () => {
    const report = buildRacingFormCoverageReport(
      makeInput({
        racingCodeSets: 0,
        racingCodeValues: 0,
        racingCodeAliases: 0,
        trackCodeAliases: 0,
      }),
    );
    const domain = report.domains.find(
      (item) => item.key === "glossary_normalization",
    );

    assert.equal(report.status, "blocked");
    assert.equal(domain?.status, "blocked");
  });

  it("keeps deterministic domain and warning ordering", () => {
    const report = buildRacingFormCoverageReport(
      makeInput({
        workouts: 0,
        trainerStats: 0,
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
