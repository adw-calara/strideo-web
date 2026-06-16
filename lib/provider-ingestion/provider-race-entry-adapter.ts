import "server-only";

import { normalizeOrFlagRacingCode } from "@/lib/racing-codes/normalization";
import {
  planTheRacingApiRaceEntryAdaptation,
  type TheRacingApiRaceEntryAdapterContext,
  type TheRacingApiRaceEntryAdapterResult,
  type TheRacingApiRaceEntryPayload,
} from "./provider-race-entry-adapter-core";

export type {
  ProviderRaceEntryWritePlan,
  TheRacingApiRaceEntryAdapterResult,
  TheRacingApiRaceEntryPayload,
} from "./provider-race-entry-adapter-core";

export async function planTheRacingApiRaceEntry(
  payload: TheRacingApiRaceEntryPayload,
  context: Omit<TheRacingApiRaceEntryAdapterContext, "normalizer"> = {},
): Promise<TheRacingApiRaceEntryAdapterResult> {
  return planTheRacingApiRaceEntryAdaptation(payload, {
    ...context,
    normalizer: normalizeOrFlagRacingCode,
  });
}
