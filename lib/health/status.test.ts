import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildHealthStatus, HEALTH_PHASE } from "./status";

describe("health status payload", () => {
  it("reports the stable pre-release phase without exposing configuration values", () => {
    assert.deepEqual(buildHealthStatus({ supabaseConfigured: true }), {
      status: "ok",
      app: "strideo",
      phase: HEALTH_PHASE,
      env: {
        supabase: "configured",
      },
    });
  });

  it("reports missing public Supabase configuration without failing health", () => {
    assert.deepEqual(buildHealthStatus({ supabaseConfigured: false }), {
      status: "ok",
      app: "strideo",
      phase: "pre-release",
      env: {
        supabase: "missing",
      },
    });
  });
});
