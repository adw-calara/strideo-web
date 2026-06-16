import "server-only";

import { normalizeOrFlagRacingCode } from "@/lib/racing-codes/normalization";
import {
  parseProviderRaceEntryShorthandSegment,
  type ParsedProviderRaceEntrySegment,
  type ProviderRaceEntryParserContext,
  type ProviderRaceEntryShorthandPayload,
} from "./racing-form-parser-core";

export type { ParsedProviderRaceEntrySegment, ProviderRaceEntryShorthandPayload };

export async function parseProviderRaceEntryShorthand(
  payload: ProviderRaceEntryShorthandPayload,
  context: Omit<ProviderRaceEntryParserContext, "normalizer">,
): Promise<ParsedProviderRaceEntrySegment> {
  return parseProviderRaceEntryShorthandSegment(payload, {
    ...context,
    normalizer: normalizeOrFlagRacingCode,
  });
}
