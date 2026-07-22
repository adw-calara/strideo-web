import { hasPublicEnv } from "@/lib/env/public";
import { buildHealthStatus } from "@/lib/health/status";
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json(
    buildHealthStatus({ supabaseConfigured: hasPublicEnv() }),
  );
}
