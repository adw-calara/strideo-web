import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/admin";
import { STRIDEO_DEV_PROJECT_REF } from "@/lib/provider-ingestion/provider-race-entry-dev-boundary";
import { buildProviderRaceEntryReadinessReport } from "@/lib/provider-ingestion/provider-race-entry-readiness-report";
import {
  buildProviderRaceEntryReadinessDisplayModel,
  buildUnavailableProviderRaceEntryReadinessDisplayModel,
  type ProviderRaceEntryReadinessDisplayModel,
} from "./provider-race-entry-readiness-core";

function getDevTargetBlocker() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return "Missing NEXT_PUBLIC_SUPABASE_URL; readiness status cannot confirm the Strideo Dev target.";
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(supabaseUrl);
  } catch {
    return "Configured Supabase URL is invalid; readiness status cannot confirm the Strideo Dev target.";
  }

  if (!parsedUrl.hostname.startsWith(`${STRIDEO_DEV_PROJECT_REF}.`)) {
    return `Configured Supabase target ${parsedUrl.hostname} is not Strideo Dev (${STRIDEO_DEV_PROJECT_REF}).`;
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return "Missing server-only Supabase service-role configuration for Dev readiness reads.";
  }

  return null;
}

export async function getProviderRaceEntryReadinessDisplayModel(): Promise<ProviderRaceEntryReadinessDisplayModel> {
  const blocker = getDevTargetBlocker();

  if (blocker) {
    return buildUnavailableProviderRaceEntryReadinessDisplayModel(blocker);
  }

  const report = await buildProviderRaceEntryReadinessReport(createServiceRoleClient());
  return buildProviderRaceEntryReadinessDisplayModel(report);
}
