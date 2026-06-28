import {
  STRIDEO_DEV_PROJECT_NAME,
  STRIDEO_DEV_PROJECT_REF,
} from "@/lib/provider-ingestion/provider-race-entry-dev-boundary";

export type LinkedSupabaseProject = {
  name?: string;
  ref?: string;
};

export type RacingFormCoverageTargetInput = {
  nodeEnv?: string;
  supabaseUrl?: string;
  serviceRoleKeyPresent: boolean;
  linkedProject?: LinkedSupabaseProject | null;
};

export function getRacingFormCoverageDevTargetBlocker(
  input: RacingFormCoverageTargetInput,
) {
  if (input.nodeEnv === "production") {
    return "Refusing racing-form coverage readiness reads in production.";
  }

  if (!input.supabaseUrl) {
    return "Missing NEXT_PUBLIC_SUPABASE_URL.";
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(input.supabaseUrl);
  } catch {
    return "Configured NEXT_PUBLIC_SUPABASE_URL is invalid.";
  }

  if (!parsedUrl.hostname.startsWith(`${STRIDEO_DEV_PROJECT_REF}.`)) {
    return `Refusing Supabase target ${parsedUrl.hostname}. Expected ${STRIDEO_DEV_PROJECT_NAME} (${STRIDEO_DEV_PROJECT_REF}).`;
  }

  if (!input.serviceRoleKeyPresent) {
    return "Missing SUPABASE_SERVICE_ROLE_KEY for server-only Dev coverage reads.";
  }

  if (
    input.linkedProject?.name !== STRIDEO_DEV_PROJECT_NAME ||
    input.linkedProject.ref !== STRIDEO_DEV_PROJECT_REF
  ) {
    return `Refusing linked project ${input.linkedProject?.name ?? "missing"} (${input.linkedProject?.ref ?? "missing"}). Expected ${STRIDEO_DEV_PROJECT_NAME} (${STRIDEO_DEV_PROJECT_REF}).`;
  }

  return null;
}
