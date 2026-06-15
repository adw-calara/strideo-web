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

export type ProgressTaskStatus =
  | "complete"
  | "active"
  | "next"
  | "queued";

export type ProgressTask = {
  id: string;
  title: string;
  status: ProgressTaskStatus;
  phase: string;
  summary: string;
};

export type ProgressDashboardData = {
  generatedAt: string;
  metrics: ProgressMetric[];
  phases: ProgressPhase[];
  tasks: ProgressTask[];
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
    summary:
      "Next.js, Supabase Auth, protected shell, source docs, and hardened auth-link handling are in place.",
    nextStep:
      "Keep auth, environment, and protected-route checks passing as product surfaces expand.",
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
    progress: 60,
    summary:
      "Protected race-card reads, Dev fixtures, and generator-ready race context are available.",
    nextStep:
      "Implement the first real provider import path for Dev after the Opportunity detail surface is stable.",
  },
  {
    phase: "3",
    title: "Opportunity Engine",
    status: "active",
    progress: 75,
    summary:
      "Demo generation, narrow service-role grants, candidate quality, feed visibility, detail display, and the first user tracking workflow are validated in Dev.",
    nextStep:
      "Consider a focused tracked Opportunities list or filter before expanding to alerts or wager workflows.",
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
    progress: 50,
    summary:
      "Dashboard, races, imports, strategies, predictions, Opportunities, detail views, and progress reporting are scaffolded.",
    nextStep:
      "Add the next Opportunity-centered workflow, then Bet Sheet, Alerts, Assistant, and Performance views.",
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
  "Maintain this plan-backed task list as the visible progress handoff.",
  "Use the merged watchlist_items-backed tracking workflow as the next Opportunity-centered validation path.",
  "Keep real provider ingestion queued behind the next validated Opportunity path.",
];

const nextSteps = [
  "Confirm Strideo Dev before any Supabase execution: strideo-dev, ntxtakbggtljjbalgris.",
  "Run lint and build after progress dashboard or product surface changes.",
  "Consider a focused tracked Opportunities list or filter now that PR #58 is merged.",
  "Keep production untouched until explicitly authorized.",
];

const tasks: ProgressTask[] = [
  {
    id: "auth-hardening",
    title: "Auth password reset hardening",
    status: "complete",
    phase: "Foundation",
    summary:
      "PR #54 merged. Token-hash auth links, recovery copy, and guarded update-password behavior are validated.",
  },
  {
    id: "progress-refresh",
    title: "Progress dashboard milestone refresh",
    status: "complete",
    phase: "Product UI MVP",
    summary:
      "PR #55 merged. Roadmap summaries were refreshed after the auth and Opportunity milestones.",
  },
  {
    id: "opportunity-detail",
    title: "Opportunity detail view",
    status: "complete",
    phase: "Opportunity Engine",
    summary:
      "PR #56 merged. Feed cards open a protected detail view with subject, race, score, explanation, and lifecycle context.",
  },
  {
    id: "progress-task-list",
    title: "Plan-backed progress task list",
    status: "complete",
    phase: "Product UI MVP",
    summary:
      "Progress now uses a maintained task list that reflects completed work, active work, and queued decisions.",
  },
  {
    id: "status-security-drift-audit",
    title: "Status, security, and drift audit",
    status: "complete",
    phase: "Release Coordination",
    summary:
      "Validated the repo against planning docs, dependency audit, migration dry-run, secret scan, duplicate/temp scan, auth callback drift, and Opportunity append-only boundaries.",
  },
  {
    id: "progress-task-list-final-review",
    title: "Progress task list final review",
    status: "complete",
    phase: "Release Coordination",
    summary:
      "Manual visual review and final validation passed for PR #57. Production was untouched, no Supabase writes were run, and the next recommended step remains an Opportunity-centered slice.",
  },
  {
    id: "next-opportunity-slice",
    title: "Select next Opportunity-centered slice",
    status: "complete",
    phase: "Opportunity Engine",
    summary:
      "Selected the Opportunity tracking workflow as the next small PRD-aligned product increment from clean main.",
  },
  {
    id: "opportunity-track-workflow-plan",
    title: "Opportunity tracking workflow",
    status: "complete",
    phase: "Opportunity Engine",
    summary:
      "PR #58 added migration 20260615141628_opportunity_tracking_watchlist_grants.sql and a minimal detail-page Track Opportunity action backed by watchlist_items. The migration was applied to Dev only, dry-run is up to date, the authenticated runtime path saved an Opportunity as watching, the refreshed detail view shows Saved, anon access remains denied, Production was untouched, and untrack UI, tracked-list view, alerts, and wager workflows remain deferred.",
  },
  {
    id: "opportunity-track-final-review",
    title: "Opportunity tracking final review",
    status: "complete",
    phase: "Opportunity Engine",
    summary:
      "Completed the PR #58 vulnerability and efficiency review. Grants remain authenticated-only and column-scoped, owner RLS remains keyed to auth.uid(), anon access remains denied, no restricted product areas were added, and the Track action now treats unique-conflict duplicate submissions as idempotent success/reactivation under existing RLS.",
  },
  {
    id: "opportunity-track-merge-review",
    title: "Opportunity tracking merge review",
    status: "complete",
    phase: "Opportunity Engine",
    summary:
      "PR #58 was marked ready and merged. Local main now includes migration 20260615141628_opportunity_tracking_watchlist_grants.sql, and Dev/main migration dry-run alignment is restored.",
  },
  {
    id: "retrospective-pr-audit",
    title: "Retrospective PR security and drift audit",
    status: "complete",
    phase: "Release Coordination",
    summary:
      "Audited submitted PRs #29-#58 with priority on migrations, Auth, grants, service-role usage, server actions, user-owned writes, Opportunity read models, and progress surfaces. No high-severity blocker was found; PR #58 includes the duplicate-submit hardening fix, Dev/main migration alignment is restored after merge, Production was untouched, and validation passed except for the pre-merge main dry-run skew that PR #58 resolved.",
  },
  {
    id: "real-provider-import",
    title: "First real provider import path for Dev",
    status: "queued",
    phase: "Race Data",
    summary:
      "Keep queued until the next Opportunity-centered validation path is chosen and scoped.",
  },
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
    tasks,
    activeWork,
    nextSteps,
  };
}
