import "server-only";

import { createClient } from "@/lib/supabase/server";

type CountStatus = "loaded" | "unavailable";

export type ProgressMetric = {
  key: string;
  label: string;
  value: number | null;
  status: CountStatus;
};

export type ProgressPhaseStatus =
  | "complete"
  | "active"
  | "partial"
  | "queued";

export type ProgressPhase = {
  phase: string;
  title: string;
  status: ProgressPhaseStatus;
  progress: number;
  summary: string;
  nextStep: string;
};

export type ProgressDashboardData = {
  generatedAt: string;
  metrics: ProgressMetric[];
  phases: ProgressPhase[];
  activeWork: string[];
  nextSteps: string[];
};

type CountTarget = {
  key: string;
  label: string;
  table: string;
};

const countTargets: CountTarget[] = [
  {
    key: "races",
    label: "Races",
    table: "races",
  },
  {
    key: "entries",
    label: "Entries",
    table: "race_entries",
  },
  {
    key: "odds",
    label: "Odds snapshots",
    table: "odds_snapshots",
  },
  {
    key: "results",
    label: "Result versions",
    table: "result_versions",
  },
  {
    key: "imports",
    label: "Import batches",
    table: "data_ingestion_batches",
  },
  {
    key: "opportunities",
    label: "Opportunities",
    table: "opportunities",
  },
  {
    key: "scores",
    label: "Opportunity scores",
    table: "opportunity_scores",
  },
  {
    key: "explanations",
    label: "Explanations",
    table: "opportunity_explanations",
  },
];

const phases: ProgressPhase[] = [
  {
    phase: "0",
    title: "Foundation",
    status: "complete",
    progress: 100,
    summary: "Next.js, Supabase Auth, protected shell, and source docs are in place.",
    nextStep: "Keep auth and environment checks passing as product surfaces expand.",
  },
  {
    phase: "1",
    title: "Data Model",
    status: "complete",
    progress: 100,
    summary: "Core migrations through Opportunity read access are present.",
    nextStep: "Treat future schema work as append-only and scoped to approved tasks.",
  },
  {
    phase: "2",
    title: "Race Data",
    status: "partial",
    progress: 55,
    summary: "Protected race-card reads and Dev fixtures are available.",
    nextStep: "Implement the first real provider import path for Dev.",
  },
  {
    phase: "3",
    title: "Opportunity Engine",
    status: "active",
    progress: 35,
    summary: "Opportunity Feed is live; demo generation is the current workstream.",
    nextStep: "Run and verify Dev-only Opportunity generation against visible feed data.",
  },
  {
    phase: "4",
    title: "Wager Construction",
    status: "queued",
    progress: 10,
    summary: "Schema foundation exists, but user-facing bet-sheet workflow is not built.",
    nextStep: "Start only after Opportunities have stable detail and recommendation context.",
  },
  {
    phase: "5",
    title: "Product UI MVP",
    status: "partial",
    progress: 40,
    summary: "Dashboard, races, imports, strategies, predictions, and Opportunities are scaffolded.",
    nextStep: "Add Opportunity detail, then Bet Sheet, Alerts, Assistant, and Performance views.",
  },
  {
    phase: "6",
    title: "Performance Verification",
    status: "queued",
    progress: 5,
    summary: "Result schema exists; ROI and settlement workflows are not active.",
    nextStep: "Connect settled Opportunities to recommendation results and performance rollups.",
  },
  {
    phase: "7",
    title: "Assistant",
    status: "queued",
    progress: 5,
    summary: "Assistant schema exists; structured tools and UI are not implemented.",
    nextStep: "Build database-scoped tools after Opportunity and performance surfaces stabilize.",
  },
  {
    phase: "8",
    title: "Commercial Readiness",
    status: "queued",
    progress: 5,
    summary: "Entitlement schema exists; Stripe, analytics, alerts, and deployment hardening remain future work.",
    nextStep: "Introduce Pro access enforcement when subscription flow work begins.",
  },
];

const activeWork = [
  "Review and finalize the Dev-only Opportunity generation slice.",
  "Verify generated Opportunities appear in the protected Opportunity Feed.",
  "Decide whether the next product surface is Opportunity detail or real provider ingestion.",
];

const nextSteps = [
  "Confirm Strideo Dev before any Supabase execution: strideo-dev, ntxtakbggtljjbalgris.",
  "Run lint and build after the progress dashboard and generation slice are finalized.",
  "Keep production untouched until explicitly authorized.",
];

async function readCount(table: string) {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });

  if (error) {
    return {
      value: null,
      status: "unavailable" as const,
    };
  }

  return {
    value: count ?? 0,
    status: "loaded" as const,
  };
}

export async function loadProgressDashboard(): Promise<ProgressDashboardData> {
  const metrics = await Promise.all(
    countTargets.map(async (target) => {
      const count = await readCount(target.table);

      return {
        key: target.key,
        label: target.label,
        ...count,
      };
    }),
  );

  return {
    generatedAt: new Date().toISOString(),
    metrics,
    phases,
    activeWork,
    nextSteps,
  };
}
