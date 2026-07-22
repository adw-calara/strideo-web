export const HEALTH_PHASE = "pre-release" as const;

export function buildHealthStatus({
  supabaseConfigured,
}: {
  supabaseConfigured: boolean;
}) {
  return {
    status: "ok" as const,
    app: "strideo" as const,
    phase: HEALTH_PHASE,
    env: {
      supabase: supabaseConfigured ? ("configured" as const) : ("missing" as const),
    },
  };
}
