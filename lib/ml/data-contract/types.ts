export const MODEL_KEYS = [
  "fundamental_win_probability_v1",
  "market_implied_probability_v1",
  "benter_blended_probability_v1",
  "value_overlay_v1",
  "harville_finish_order_v1",
] as const;

export type ModelKey = (typeof MODEL_KEYS)[number];

export type ModelReadinessStatus = "ready" | "partial" | "blocked";

export type FieldReadinessGroup =
  | "required_now"
  | "required_before_training"
  | "required_before_production"
  | "optional_enhancement";

export type CapabilityStatus = "present" | "partial" | "missing";

export const DATA_REQUIREMENT_KEYS = [
  "race_identity",
  "race_conditions",
  "race_entries",
  "horse_identity",
  "horse_historical_form",
  "owner_identity",
  "jockey_identity",
  "jockey_performance",
  "trainer_identity",
  "trainer_performance",
  "workouts",
  "speed_features",
  "pace_features",
  "fractional_times",
  "final_times",
  "beaten_lengths",
  "class_movement",
  "distance_fit",
  "surface_fit",
  "track_fit",
  "scratches",
  "morning_line_odds",
  "live_odds_snapshots",
  "final_closing_odds_semantics",
  "win_place_show_pools",
  "exotic_pools",
  "official_results",
  "payouts",
  "result_corrections",
  "feature_snapshots",
  "pre_race_feature_snapshots",
  "model_versions",
  "prediction_outputs",
  "calibrated_win_probabilities",
  "finish_order_probability_support",
  "value_calculations",
  "opportunity_score_linkage",
  "opportunity_attribution",
  "recommendation_results",
  "user_wager_results",
  "roi_performance_attribution",
  "source_lineage",
  "ingestion_coverage",
  "holdout_evaluation",
] as const;

export type DataRequirementKey = (typeof DATA_REQUIREMENT_KEYS)[number];

export type FieldCapability =
  | CapabilityStatus
  | {
      status: CapabilityStatus;
      detail?: string;
    };

export type DataCapabilityInput = {
  fields: Partial<Record<DataRequirementKey, FieldCapability>>;
  dependencyReadiness?: Partial<Record<ModelKey, ModelReadinessStatus>>;
  duplicateRiskWarnings?: string[];
};

export type DataRequirement = {
  key: DataRequirementKey;
  group: FieldReadinessGroup;
  label: string;
  description: string;
  schemaEvidence: string;
  missingMessage: string;
  recommendedNextDataWork: string;
};

export type ModelRequirement = {
  modelKey: ModelKey;
  label: string;
  purpose: string;
  opportunityLinkageRequired: boolean;
  dependencies?: readonly ModelKey[];
  duplicateRiskWarnings: readonly string[];
  requirements: readonly DataRequirement[];
};

export type ModelReadinessResult = {
  modelKey: ModelKey;
  status: ModelReadinessStatus;
  requiredFieldsPresent: DataRequirementKey[];
  requiredFieldsMissing: DataRequirementKey[];
  partialFields: DataRequirementKey[];
  blockingReasons: string[];
  duplicateRiskWarnings: string[];
  recommendedNextDataWork: string[];
  opportunityLinkageSatisfied: boolean;
};
