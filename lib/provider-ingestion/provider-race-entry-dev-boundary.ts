export const STRIDEO_DEV_PROJECT_REF = "ntxtakbggtljjbalgris";
export const STRIDEO_DEV_PROJECT_NAME = "strideo-dev";
export const RACE_ENTRY_TARGET_TABLE = "race_entries";
export const APPROVED_RACE_ENTRY_LOGICAL_TARGET = "race_entry_source_fact";
export const EXPECTED_RACE_ENTRY_PAYLOAD_SHAPE = "the_racing_api_race_entry_v1";
export const RACE_ENTRY_VERIFICATION_FIXTURE_NAME =
  "the-racing-api-race-entry-runtime-verification";
export const RACE_ENTRY_VERIFICATION_DATE = "2026-06-08";
export const RACE_ENTRY_VERIFICATION_PROVIDER_RACE_ID =
  "tra-runtime-verification-race-20260608-demo-01";
export const RACE_ENTRY_VERIFICATION_PROVIDER_ENTRY_ID =
  "tra-runtime-verification-entry-20260608-demo-01";
export const RACE_ENTRY_VERIFICATION_PROVIDER_HORSE_ID =
  "tra-runtime-verification-horse-9001";
export const RACE_ENTRY_VERIFICATION_BOUND_RACE_PROVIDER = "demo";
export const RACE_ENTRY_VERIFICATION_BOUND_RACE_PROVIDER_ID =
  "demo-race-2026-06-08-01";

export const FORBIDDEN_PROVIDER_RACE_ENTRY_WRITE_IDENTIFIERS = [
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
