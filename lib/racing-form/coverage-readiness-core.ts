import { checkAllModelReadiness } from "@/lib/ml/data-contract/readiness-check";
import type {
  CapabilityStatus,
  DataCapabilityInput,
  FieldCapability,
  ModelKey,
  ModelReadinessResult,
} from "@/lib/ml/data-contract/types";
import type { RacingFormReadErrorCategory } from "./coverage-readiness-read-errors";

export type RacingFormCoverageStatus = "ready" | "partial" | "blocked";

export const RACING_FORM_COVERAGE_DOMAIN_KEYS = [
  "race_metadata",
  "race_entries",
  "owner_claim_context",
  "past_performances",
  "workouts",
  "trainer_stats",
  "value_calculation_inputs",
  "glossary_normalization",
] as const;

export type RacingFormCoverageDomainKey =
  (typeof RACING_FORM_COVERAGE_DOMAIN_KEYS)[number];

export type RacingFormCoverageCounts = {
  available: number;
  missing: number;
  total: number;
  percent: number | null;
};

export type RacingFormCoverageDomainReport = {
  key: RacingFormCoverageDomainKey;
  label: string;
  status: RacingFormCoverageStatus;
  counts: RacingFormCoverageCounts;
  notes: string[];
};

export type RacingFormCoverageReviewedScope = {
  racesReviewed: number;
  entriesReviewed: number;
  tracksReviewed: number;
  raceDateStart: string | null;
  raceDateEnd: string | null;
};

export type RacingFormCoverageSafetyFlags = {
  writesPerformed: false;
  productionTouched: false;
  providerIngestionRun: false;
  mlTrainingRun: false;
  scoringRun: false;
};

export type RacingFormCoverageMetricInput = {
  races: number;
  raceConditionRows: number;
  raceEntries: number;
  raceEntriesWithHorse: number;
  raceEntriesWithJockey: number;
  raceEntriesWithTrainer: number;
  raceEntriesWithMorningLine: number;
  raceEntriesWithOwner: number;
  raceEntriesWithClaim: number;
  raceEntriesWithLayoff: number;
  raceEntriesWithComments: number;
  tracks: number;
  owners: number;
  pastPerformances: number;
  pastPerformancesWithSpeed: number;
  pastPerformancesWithFinalTime: number;
  workouts: number;
  trainerStats: number;
  distinctRaceEntryTrainers: number;
  distinctRaceEntryTrainersWithStats: number;
  valueCalculations: number;
  featureSnapshots: number;
  modelVersions: number;
  predictionOutputs: number;
  oddsSnapshots: number;
  resultVersions: number;
  resultEntries: number;
  racingCodeSets: number;
  racingCodeValues: number;
  racingCodeAliases: number;
  trackCodeAliases: number;
  openUnresolvedSourceCodes: number;
  sourceLineageRows: number;
};

export type RacingFormCoverageReadError = {
  table: string;
  operation: string;
  category: RacingFormReadErrorCategory;
  httpStatus?: number;
  message: string;
};

export type RacingFormCoverageInput = {
  targetProject: "strideo-dev";
  targetRef: "ntxtakbggtljjbalgris";
  reviewedScope: RacingFormCoverageReviewedScope;
  metrics: RacingFormCoverageMetricInput;
  readErrors?: RacingFormCoverageReadError[];
};

export type RacingFormCoverageReport = {
  status: RacingFormCoverageStatus;
  targetProject: "strideo-dev";
  targetRef: "ntxtakbggtljjbalgris";
  reviewedScope: RacingFormCoverageReviewedScope;
  domains: RacingFormCoverageDomainReport[];
  blockers: string[];
  warnings: string[];
  safeNextSteps: string[];
  modelReadiness: Record<ModelKey, ModelReadinessResult>;
  duplicateRiskWarnings: string[];
  readErrors: RacingFormCoverageReadError[];
  supabaseOperations: {
    reads: string[];
    writes: [];
  };
  safety: RacingFormCoverageSafetyFlags;
};

const SAFETY_FLAGS: RacingFormCoverageSafetyFlags = {
  writesPerformed: false,
  productionTouched: false,
  providerIngestionRun: false,
  mlTrainingRun: false,
  scoringRun: false,
};

const READ_TABLES = [
  "races",
  "race_entries",
  "tracks",
  "owners",
  "horse_past_performances",
  "horse_workouts",
  "trainer_performance_stats",
  "value_calculations",
  "feature_snapshots",
  "model_versions",
  "prediction_outputs",
  "odds_snapshots",
  "result_versions",
  "result_entries",
  "racing_code_sets",
  "racing_code_values",
  "racing_code_aliases",
  "track_code_aliases",
  "racing_unresolved_source_codes",
] as const;

function percent(available: number, total: number) {
  if (total <= 0) {
    return null;
  }

  return Math.round((available / total) * 10000) / 100;
}

function counts(available: number, total: number): RacingFormCoverageCounts {
  const normalizedTotal = Math.max(0, total);
  const normalizedAvailable = Math.min(Math.max(0, available), normalizedTotal);

  return {
    available: normalizedAvailable,
    missing: normalizedTotal - normalizedAvailable,
    total: normalizedTotal,
    percent: percent(normalizedAvailable, normalizedTotal),
  };
}

function statusForCounts(
  coverageCounts: RacingFormCoverageCounts,
  options: { required: boolean },
): RacingFormCoverageStatus {
  if (coverageCounts.total === 0) {
    return options.required ? "blocked" : "partial";
  }

  if (coverageCounts.available === 0 && options.required) {
    return "blocked";
  }

  if (coverageCounts.missing > 0 || coverageCounts.available === 0) {
    return "partial";
  }

  return "ready";
}

function domain(
  key: RacingFormCoverageDomainKey,
  label: string,
  coverageCounts: RacingFormCoverageCounts,
  options: { required: boolean; notes?: string[] },
): RacingFormCoverageDomainReport {
  return {
    key,
    label,
    status: statusForCounts(coverageCounts, options),
    counts: coverageCounts,
    notes: [...(options.notes ?? [])].sort(),
  };
}

function capabilityFromCounts(coverageCounts: RacingFormCoverageCounts): CapabilityStatus {
  if (coverageCounts.total === 0 || coverageCounts.available === 0) {
    return "missing";
  }

  return coverageCounts.missing > 0 ? "partial" : "present";
}

function field(status: CapabilityStatus, detail: string): FieldCapability {
  return { status, detail };
}

function max(...values: number[]) {
  return Math.max(0, ...values);
}

export function buildRacingFormCoverageReport(
  input: RacingFormCoverageInput,
): RacingFormCoverageReport {
  const metrics = input.metrics;
  const raceMetadataCounts = counts(metrics.raceConditionRows, metrics.races);
  const entryIdentityAvailable = Math.min(
    metrics.raceEntriesWithHorse,
    metrics.raceEntriesWithJockey,
    metrics.raceEntriesWithTrainer,
  );
  const raceEntryCounts = counts(entryIdentityAvailable, metrics.raceEntries);
  const ownerClaimContextCounts = counts(
    max(
      metrics.raceEntriesWithOwner,
      metrics.raceEntriesWithClaim,
      metrics.raceEntriesWithLayoff,
      metrics.raceEntriesWithComments,
    ),
    metrics.raceEntries,
  );
  const pastPerformanceCounts = counts(
    Math.min(metrics.pastPerformances, metrics.raceEntries),
    metrics.raceEntries,
  );
  const workoutCounts = counts(
    Math.min(metrics.workouts, metrics.raceEntries),
    metrics.raceEntries,
  );
  const trainerStatCounts = counts(
    metrics.distinctRaceEntryTrainersWithStats,
    metrics.distinctRaceEntryTrainers,
  );
  const valueCalculationCounts = counts(
    metrics.valueCalculations,
    metrics.featureSnapshots > 0 ? metrics.featureSnapshots : metrics.raceEntries,
  );
  const glossaryComponentsAvailable = [
    metrics.racingCodeSets,
    metrics.racingCodeValues,
    metrics.racingCodeAliases,
    metrics.trackCodeAliases,
  ].filter((value) => value > 0).length;
  const glossaryCounts = counts(glossaryComponentsAvailable, 4);

  const domains = [
    domain("race_metadata", "Race metadata", raceMetadataCounts, {
      required: true,
      notes: [
        metrics.races > 0
          ? `${metrics.races} race rows are available for review.`
          : "No race rows are available for review.",
      ],
    }),
    domain("race_entries", "Race entries", raceEntryCounts, {
      required: true,
      notes: [
        `${metrics.raceEntriesWithHorse} entries have horse identity.`,
        `${metrics.raceEntriesWithJockey} entries have jockey identity.`,
        `${metrics.raceEntriesWithTrainer} entries have trainer identity.`,
      ],
    }),
    domain("owner_claim_context", "Owner, claim, layoff, or comment context signals", ownerClaimContextCounts, {
      required: false,
      notes: [
        `${metrics.owners} owner rows are available.`,
        `${metrics.raceEntriesWithOwner} entries have owner links.`,
        `${metrics.raceEntriesWithClaim} entries have claim links.`,
        `${metrics.raceEntriesWithLayoff} entries have layoff days.`,
        `${metrics.raceEntriesWithComments} entries have physical, entry, or trip notes.`,
      ],
    }),
    domain("past_performances", "Past performances", pastPerformanceCounts, {
      required: false,
      notes: [
        `${metrics.pastPerformances} past-performance rows are available.`,
        `${metrics.pastPerformancesWithSpeed} past-performance rows include speed figures.`,
        `${metrics.pastPerformancesWithFinalTime} past-performance rows include final times.`,
      ],
    }),
    domain("workouts", "Workouts", workoutCounts, {
      required: false,
      notes: [`${metrics.workouts} workout rows are available.`],
    }),
    domain("trainer_stats", "Trainer stats", trainerStatCounts, {
      required: false,
      notes: [
        `${metrics.distinctRaceEntryTrainers} distinct reviewed trainers are represented by race entries.`,
        `${metrics.distinctRaceEntryTrainersWithStats} distinct reviewed trainers have trainer-stat profiles.`,
        `${metrics.trainerStats} total trainer-stat rows are available.`,
      ],
    }),
    domain("value_calculation_inputs", "Value calculation inputs", valueCalculationCounts, {
      required: false,
      notes: [
        `${metrics.featureSnapshots} feature snapshot rows are available.`,
        `${metrics.valueCalculations} value calculation rows are available.`,
      ],
    }),
    domain("glossary_normalization", "Glossary and normalization readiness", glossaryCounts, {
      required: true,
      notes: [
        `${metrics.racingCodeSets} racing code sets are available.`,
        `${metrics.racingCodeValues} racing code values are available.`,
        `${metrics.racingCodeAliases} racing code aliases are available.`,
        `${metrics.trackCodeAliases} track code aliases are available.`,
        `${metrics.openUnresolvedSourceCodes} open unresolved source codes are queued.`,
      ],
    }),
  ];

  const blockers = [
    ...domains
      .filter((item) => item.status === "blocked")
      .map((item) => `${item.label} is blocked for Dev coverage readiness.`),
    ...((input.readErrors ?? []).map(
      (error) =>
        `${error.table} ${error.operation} read failed (${error.category}${error.httpStatus ? `, HTTP ${error.httpStatus}` : ""}): ${error.message}`,
    )),
  ].sort();

  const warnings = [
    ...domains
      .filter((item) => item.status === "partial")
      .map((item) => `${item.label} coverage is partial.`),
    metrics.openUnresolvedSourceCodes > 0
      ? `${metrics.openUnresolvedSourceCodes} unresolved racing-form source code rows remain open.`
      : null,
    metrics.sourceLineageRows === 0
      ? "No reviewed racing-form source-fact rows have source-file, ingestion-batch, or job lineage yet."
      : null,
  ]
    .filter((item): item is string => typeof item === "string")
    .sort();

  const dataCapabilityInput: DataCapabilityInput = {
    fields: {
      race_identity: field(metrics.races > 0 ? "present" : "missing", "Race rows are required for model readiness."),
      race_conditions: field(capabilityFromCounts(raceMetadataCounts), "Structured race-condition coverage."),
      race_entries: field(metrics.raceEntries > 0 ? "present" : "missing", "Race-entry rows are required for model readiness."),
      horse_identity: field(
        capabilityFromCounts(counts(metrics.raceEntriesWithHorse, metrics.raceEntries)),
        "Race entries with horse identity.",
      ),
      jockey_identity: field(
        capabilityFromCounts(counts(metrics.raceEntriesWithJockey, metrics.raceEntries)),
        "Race entries with jockey identity.",
      ),
      trainer_identity: field(
        capabilityFromCounts(counts(metrics.raceEntriesWithTrainer, metrics.raceEntries)),
        "Race entries with trainer identity.",
      ),
      scratches: field(metrics.raceEntries > 0 ? "present" : "missing", "Race-entry status can represent scratches."),
      morning_line_odds: field(
        capabilityFromCounts(counts(metrics.raceEntriesWithMorningLine, metrics.raceEntries)),
        "Race entries with morning-line odds.",
      ),
      owner_identity: field(capabilityFromCounts(ownerClaimContextCounts), "Owner, claim, layoff, or comment context signal coverage."),
      horse_historical_form: field(capabilityFromCounts(pastPerformanceCounts), "Past-performance row coverage."),
      speed_features: field(
        metrics.pastPerformancesWithSpeed > 0 ? "partial" : "missing",
        "Past-performance rows with speed figures.",
      ),
      pace_features: field(
        metrics.pastPerformances > 0 ? "partial" : "missing",
        "Past-performance pace payload coverage still needs normalization.",
      ),
      fractional_times: field(
        metrics.pastPerformances > 0 ? "partial" : "missing",
        "Past-performance fractional-time payload coverage still needs normalization.",
      ),
      final_times: field(
        metrics.pastPerformancesWithFinalTime > 0 ? "partial" : "missing",
        "Past-performance rows with final times.",
      ),
      class_movement: field(capabilityFromCounts(raceMetadataCounts), "Structured class and condition coverage."),
      distance_fit: field(metrics.races > 0 ? "partial" : "missing", "Race and past-performance distance coverage."),
      surface_fit: field(metrics.races > 0 ? "partial" : "missing", "Race and past-performance surface coverage."),
      track_fit: field(metrics.tracks > 0 ? "partial" : "missing", "Track identity coverage."),
      trainer_performance: field(capabilityFromCounts(trainerStatCounts), "Distinct reviewed trainer-stat profile coverage."),
      workouts: field(capabilityFromCounts(workoutCounts), "Workout row coverage."),
      feature_snapshots: field(metrics.featureSnapshots > 0 ? "partial" : "missing", "Feature snapshot storage/readiness coverage."),
      pre_race_feature_snapshots: field(
        metrics.featureSnapshots > 0 ? "partial" : "missing",
        "Pre-race feature snapshot leakage coverage still needs broader review.",
      ),
      model_versions: field(metrics.modelVersions > 0 ? "present" : "missing", "Model-version registry rows."),
      prediction_outputs: field(metrics.predictionOutputs > 0 ? "present" : "missing", "Prediction output rows."),
      live_odds_snapshots: field(metrics.oddsSnapshots > 0 ? "present" : "missing", "Odds snapshot rows."),
      official_results: field(metrics.resultVersions > 0 ? "present" : "missing", "Result version rows."),
      payouts: field(metrics.resultEntries > 0 ? "partial" : "missing", "Result-entry payout rows."),
      value_calculations: field(capabilityFromCounts(valueCalculationCounts), "Value-calculation row coverage."),
      opportunity_score_linkage: field(
        metrics.valueCalculations > 0 ? "partial" : "missing",
        "Opportunity score linkage through value calculations.",
      ),
      source_lineage: field(
        metrics.sourceLineageRows > 0 ? "partial" : "missing",
        "Racing-form source lineage coverage.",
      ),
      ingestion_coverage: field(
        warnings.length === 0 && blockers.length === 0 ? "present" : "partial",
        "Aggregate Dev coverage report status.",
      ),
    },
    duplicateRiskWarnings: [
      "Use existing racing-form source-fact tables; do not create duplicate form, prediction, value, or Opportunity tables.",
      "This Dev coverage report is read-only and does not authorize provider ingestion, ML training, scoring, or production rollout.",
    ],
  };

  const modelReadiness = checkAllModelReadiness(dataCapabilityInput);
  const modelWarnings = Object.values(modelReadiness)
    .filter((result) => result.status !== "ready")
    .flatMap((result) =>
      result.recommendedNextDataWork.map(
        (work) => `${result.modelKey}: ${work}`,
      ),
    );
  const safeNextSteps = [
    ...warnings,
    ...modelWarnings,
    "Review this Dev-only coverage report before planning any provider-ingestion, feature-materialization, or model-readiness work.",
  ].sort();
  const status: RacingFormCoverageStatus =
    blockers.length > 0
      ? "blocked"
      : domains.some((item) => item.status === "partial") || warnings.length > 0
        ? "partial"
        : "ready";

  return {
    status,
    targetProject: input.targetProject,
    targetRef: input.targetRef,
    reviewedScope: input.reviewedScope,
    domains,
    blockers,
    warnings,
    safeNextSteps,
    modelReadiness,
    duplicateRiskWarnings: dataCapabilityInput.duplicateRiskWarnings ?? [],
    readErrors: [...(input.readErrors ?? [])].sort((a, b) =>
      `${a.table}:${a.operation}`.localeCompare(`${b.table}:${b.operation}`),
    ),
    supabaseOperations: {
      reads: [...READ_TABLES].sort(),
      writes: [],
    },
    safety: SAFETY_FLAGS,
  };
}
