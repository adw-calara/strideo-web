import { isFoundationEnvReady } from "@/lib/env/server";
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    app: "strideo",
    phase: "0-foundation",
    env: {
      supabase: isFoundationEnvReady() ? "configured" : "missing",
    },
  });
}
