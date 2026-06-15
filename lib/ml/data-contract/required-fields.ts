import type { DataRequirement, DataRequirementKey } from "./types";

type RequirementSeed = Omit<DataRequirement, "description" | "schemaEvidence" | "missingMessage" | "recommendedNextDataWork"> & {
  description?: string;
  schemaEvidence?: string;
  missingMessage?: string;
  recommendedNextDataWork?: string;
};

const DEFAULT_RECOMMENDED_WORK =
  "Wire deterministic coverage checks to ingestion batches, source files, and pre-race feature snapshots before trusting this requirement.";

function requirement(seed: RequirementSeed): DataRequirement {
  return {
    description: `${seed.label} must be available with auditable lineage before the dependent model can be trusted.`,
    schemaEvidence: "Current schema contains a storage path, but readiness depends on data coverage and lineage checks.",
    missingMessage: `${seed.label} is missing or not proven for this model requirement.`,
    recommendedNextDataWork: DEFAULT_RECOMMENDED_WORK,
    ...seed,
  };
}

export const DATA_REQUIREMENTS: Record<DataRequirementKey, DataRequirement> = {
  race_identity: requirement({
    key: "race_identity",
    group: "required_now",
    label: "Race identity",
    schemaEvidence: "`races` preserves provider race identity, track, date, and race number.",
  }),
  race_conditions: requirement({
    key: "race_conditions",
    group: "required_before_training",
    label: "Race conditions",
    schemaEvidence: "PR #60 added structured race-condition fields to `races`.",
    recommendedNextDataWork: "Ingest and validate structured condition, class, restriction, weather, and track-condition coverage.",
  }),
  race_entries: requirement({
    key: "race_entries",
    group: "required_now",
    label: "Race entries",
    schemaEvidence: "`race_entries` links races, horses, jockeys, trainers, post positions, and entry status.",
  }),
  horse_identity: requirement({
    key: "horse_identity",
    group: "required_now",
    label: "Horse identity",
    schemaEvidence: "`horses` preserves provider-aware horse identity.",
  }),
  horse_historical_form: requirement({
    key: "horse_historical_form",
    group: "required_before_training",
    label: "Horse historical form",
    schemaEvidence: "PR #60 added `horse_past_performances`.",
    recommendedNextDataWork: "Backfill past-performance rows with source-file lineage, dedupe checks, and historical label quality checks.",
  }),
  owner_identity: requirement({
    key: "owner_identity",
    group: "required_before_training",
    label: "Owner identity",
    schemaEvidence: "PR #60 added `owners` and owner links on `race_entries`.",
  }),
  jockey_identity: requirement({
    key: "jockey_identity",
    group: "required_now",
    label: "Jockey identity",
    schemaEvidence: "`jockeys` preserves provider-aware jockey identity.",
  }),
  jockey_performance: requirement({
    key: "jockey_performance",
    group: "required_before_training",
    label: "Jockey performance",
    schemaEvidence: "`jockey_features` can store derived features, but normalized jockey-stat source facts are not first-class yet.",
    recommendedNextDataWork: "Define jockey-stat source facts or derive audited jockey features from result and past-performance history.",
  }),
  trainer_identity: requirement({
    key: "trainer_identity",
    group: "required_now",
    label: "Trainer identity",
    schemaEvidence: "`trainers` preserves provider-aware trainer identity.",
  }),
  trainer_performance: requirement({
    key: "trainer_performance",
    group: "required_before_training",
    label: "Trainer performance",
    schemaEvidence: "PR #60 added `trainer_performance_stats`.",
  }),
  workouts: requirement({
    key: "workouts",
    group: "required_before_training",
    label: "Workouts",
    schemaEvidence: "PR #60 added `horse_workouts`.",
  }),
  speed_features: requirement({
    key: "speed_features",
    group: "required_before_training",
    label: "Speed features",
    schemaEvidence: "`horse_past_performances` includes speed figure columns; feature snapshots still need materialization.",
  }),
  pace_features: requirement({
    key: "pace_features",
    group: "required_before_training",
    label: "Pace features",
    schemaEvidence: "`horse_past_performances.pace_figures` preserves provider pace payloads.",
  }),
  fractional_times: requirement({
    key: "fractional_times",
    group: "required_before_training",
    label: "Fractional times",
    schemaEvidence: "`horse_past_performances.fractional_times` preserves provider fractional-time payloads.",
  }),
  final_times: requirement({
    key: "final_times",
    group: "required_before_training",
    label: "Final times",
    schemaEvidence: "`horse_past_performances.final_time_seconds` exists for historical lines.",
  }),
  beaten_lengths: requirement({
    key: "beaten_lengths",
    group: "required_before_training",
    label: "Beaten lengths",
    schemaEvidence: "`result_entries` and `horse_past_performances` preserve beaten lengths.",
  }),
  class_movement: requirement({
    key: "class_movement",
    group: "required_before_training",
    label: "Class movement",
    schemaEvidence: "`races.class_level`, `claiming_price`, and past-performance class fields can support class movement.",
  }),
  distance_fit: requirement({
    key: "distance_fit",
    group: "required_before_training",
    label: "Distance fit",
    schemaEvidence: "`races.distance_yards` and past-performance distance fields exist.",
  }),
  surface_fit: requirement({
    key: "surface_fit",
    group: "required_before_training",
    label: "Surface fit",
    schemaEvidence: "`surfaces`, `races.surface_id`, and past-performance/workout surface fields exist.",
  }),
  track_fit: requirement({
    key: "track_fit",
    group: "required_before_training",
    label: "Track fit",
    schemaEvidence: "`tracks`, `track_features`, and track-aware past-performance/workout fields exist.",
  }),
  scratches: requirement({
    key: "scratches",
    group: "required_now",
    label: "Scratches",
    schemaEvidence: "`entry_events` and `race_entries.status` support scratch state.",
  }),
  morning_line_odds: requirement({
    key: "morning_line_odds",
    group: "required_now",
    label: "Morning line odds",
    schemaEvidence: "`race_entries.morning_line_odds` exists.",
  }),
  live_odds_snapshots: requirement({
    key: "live_odds_snapshots",
    group: "required_now",
    label: "Live odds snapshots",
    schemaEvidence: "`odds_snapshots` stores odds, implied probability, pool type, snapshot time, and pool total.",
  }),
  final_closing_odds_semantics: requirement({
    key: "final_closing_odds_semantics",
    group: "required_before_production",
    label: "Final or closing odds semantics",
    schemaEvidence: "`recommendation_results.closing_odds_snapshot_id` can point to a snapshot, but market-close rules are not formalized.",
    recommendedNextDataWork: "Define final/closing snapshot selection, market-close time, and late odds handling before production scoring.",
  }),
  win_place_show_pools: requirement({
    key: "win_place_show_pools",
    group: "required_before_training",
    label: "Win/place/show pools",
    schemaEvidence: "`odds_snapshots.pool_type` and `pool_total` can represent WPS pools.",
  }),
  exotic_pools: requirement({
    key: "exotic_pools",
    group: "required_before_production",
    label: "Exotic pools",
    schemaEvidence: "Generic pool fields exist, but no dedicated exotic pool taxonomy or payout foundation exists.",
    recommendedNextDataWork: "Define exotic pool taxonomy, combinations, takeout, and payout lineage before Harville-backed products.",
  }),
  official_results: requirement({
    key: "official_results",
    group: "required_now",
    label: "Official results",
    schemaEvidence: "`result_versions` preserves official/unofficial result versions.",
  }),
  payouts: requirement({
    key: "payouts",
    group: "required_before_training",
    label: "Payouts",
    schemaEvidence: "`result_entries` stores win/place/show payouts; exotic payouts remain unresolved.",
  }),
  result_corrections: requirement({
    key: "result_corrections",
    group: "required_before_production",
    label: "Result corrections",
    schemaEvidence: "`result_versions` supports append-only corrections.",
  }),
  feature_snapshots: requirement({
    key: "feature_snapshots",
    group: "required_now",
    label: "Feature snapshots",
    schemaEvidence: "`feature_snapshots` stores exact input payloads.",
    recommendedNextDataWork: "Materialize exact feature payloads with source lineage and stable feature-set versions.",
  }),
  pre_race_feature_snapshots: requirement({
    key: "pre_race_feature_snapshots",
    group: "required_before_training",
    label: "Pre-race feature snapshots",
    schemaEvidence: "`feature_snapshots.captured_at` exists, but leakage checks must prove snapshots were captured before outcomes.",
    recommendedNextDataWork: "Add leakage checks proving feature snapshots are pre-race and exclude result-only data.",
  }),
  model_versions: requirement({
    key: "model_versions",
    group: "required_now",
    label: "Model versions",
    schemaEvidence: "`model_versions` preserves immutable model identity.",
  }),
  prediction_outputs: requirement({
    key: "prediction_outputs",
    group: "required_now",
    label: "Prediction outputs",
    schemaEvidence: "`prediction_outputs` links model versions and feature snapshots.",
  }),
  calibrated_win_probabilities: requirement({
    key: "calibrated_win_probabilities",
    group: "required_now",
    label: "Calibrated win probabilities",
    schemaEvidence: "Schema can store probabilities, but calibration evidence is not schema-only.",
    recommendedNextDataWork: "Produce holdout calibration evidence before blend, value, or finish-order layers use win probabilities.",
  }),
  finish_order_probability_support: requirement({
    key: "finish_order_probability_support",
    group: "required_now",
    label: "Finish-order probability support",
    schemaEvidence: "`prediction_outputs.output` can store structured output, but no finish-order contract is implemented yet.",
    recommendedNextDataWork: "Define finish-order output shape and validation against historical finish orders.",
  }),
  value_calculations: requirement({
    key: "value_calculations",
    group: "required_now",
    label: "Value calculations",
    schemaEvidence: "PR #60 added append-only `value_calculations`.",
  }),
  opportunity_score_linkage: requirement({
    key: "opportunity_score_linkage",
    group: "required_now",
    label: "Opportunity score linkage",
    schemaEvidence: "PR #60 added `opportunity_scores.value_calculation_id`.",
  }),
  opportunity_attribution: requirement({
    key: "opportunity_attribution",
    group: "required_now",
    label: "Opportunity attribution",
    schemaEvidence: "`opportunities`, `opportunity_subjects`, and recommendation/performance tables preserve Opportunity lineage.",
  }),
  recommendation_results: requirement({
    key: "recommendation_results",
    group: "required_before_production",
    label: "Recommendation results",
    schemaEvidence: "`recommendation_results` stores settled recommendation facts.",
  }),
  user_wager_results: requirement({
    key: "user_wager_results",
    group: "optional_enhancement",
    label: "User wager results",
    schemaEvidence: "`user_wager_results` stores user-owned wager outcomes.",
  }),
  roi_performance_attribution: requirement({
    key: "roi_performance_attribution",
    group: "required_before_production",
    label: "ROI/performance attribution",
    schemaEvidence: "Performance runs and Opportunity/strategy/model rollups exist, but need populated settled results.",
  }),
  source_lineage: requirement({
    key: "source_lineage",
    group: "required_before_training",
    label: "Source lineage",
    schemaEvidence: "Source-file and ingestion-batch links exist across racing-form source facts.",
  }),
  ingestion_coverage: requirement({
    key: "ingestion_coverage",
    group: "required_before_training",
    label: "Ingestion coverage",
    schemaEvidence: "`data_ingestion_batches` and source-file metadata can support coverage checks.",
    recommendedNextDataWork: "Add coverage checks by track, race date, race, entry, horse, form line, workout, odds snapshot, and result.",
  }),
  holdout_evaluation: requirement({
    key: "holdout_evaluation",
    group: "required_before_production",
    label: "Holdout evaluation",
    schemaEvidence: "Training and evaluation tables exist, but no holdout evidence is populated.",
    recommendedNextDataWork: "Define temporal holdout, track split, longshot segment, calibration, and leakage checks.",
  }),
};
