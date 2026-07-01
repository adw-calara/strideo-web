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
      "Next.js, Supabase Auth, protected shell, source docs, operating prompt, and hardened auth-link handling are in place.",
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
    progress: 85,
    summary:
      "Demo generation, narrow service-role grants, candidate quality, feed visibility, detail display, tracked Opportunities, scoring contracts, pre-race snapshot contracts, Dev-only persisted feature snapshot materialization, the Dev-only racing-form readiness ladder through glossary normalization, and Dev-only value-calculation input lineage rows are validated.",
    nextStep:
      "Plan model-version and prediction-output lineage separately while keeping real ML, scoring, wagers, and production rollout out of scope until lineage is cleaner.",
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
    progress: 60,
    summary:
      "Dashboard, races, imports, strategies, predictions, Opportunities, detail views, tracked Opportunities, progress reporting, and mobile/PWA shell improvements are scaffolded.",
    nextStep:
      "Preserve the current Opportunity UI surfaces while the next slice focuses on Dev-only data-quality readiness.",
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
  "Use docs/ROADMAP.md for phase sequencing and this dashboard as the living day-to-day status handoff.",
  "Use the merged Dev-only feature snapshot materialization as the completed persisted-readiness baseline for the next Opportunity/ML foundation slice.",
  "Use the Dev-only value-calculation lineage rows as the completed market-input lineage baseline before model training, prediction output, or scoring work.",
  "Keep the merged tracked Opportunities, scoring contracts, pre-race snapshot builder, mobile shell, race-card work, and Dev-only materialization intact while future work stays scoped and non-production unless explicitly authorized.",
];

const nextSteps = [
  "Review docs/DEV_ONLY_FEATURE_SNAPSHOTS_MATERIALIZATION.md as the completed Dev-only materialization record.",
  "Run and review the Dev-only racing-form coverage readiness report before planning provider ingestion, prediction output, or Opportunity scoring work.",
  "Review docs/DEV_ONLY_VALUE_CALCULATIONS_LINEAGE.md as the completed Dev-only value-calculation input-lineage record.",
  "Treat current value_calculation_inputs partial status as missing model-version, prediction-output, calibrated model_probability, and Opportunity-score linkage, not as missing Dev value_calculations.",
  "Defer real ML, fake ML, scoring runtime, Bet Sheet, Assistant, Alerts, wager settlement, and ROI workflows until Opportunity scoring lineage is cleaner.",
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
      "PR #58 added migration 20260615141628_opportunity_tracking_watchlist_grants.sql and a minimal detail-page Track Opportunity action backed by watchlist_items. The migration was applied to Dev only, dry-run is up to date, the authenticated runtime path saved an Opportunity as watching, the refreshed detail view shows Saved, anon access remains denied, Production was untouched, and untrack UI, alerts, and wager workflows remain deferred.",
  },
  {
    id: "tracked-opportunities-list",
    title: "Tracked Opportunities list",
    status: "complete",
    phase: "Opportunity Engine",
    summary:
      "PR #85 merged. /protected/opportunities/tracked is a user-owned watchlist_items-backed surface for saved Opportunities, preserving composite Opportunity identity and avoiding new persistence, service-role usage, fake ML, or wager scope.",
  },
  {
    id: "opportunity-scoring-contract",
    title: "Opportunity scoring contract",
    status: "complete",
    phase: "Opportunity Engine",
    summary:
      "PR #86 merged. Feature snapshot and value-scoring output contracts now define readiness/missing-feature reasons, separate feature and model versioning, and explicit no-real-ML/no-wagering scope.",
  },
  {
    id: "pre-race-feature-snapshots",
    title: "Pre-race feature snapshots",
    status: "complete",
    phase: "Opportunity Engine",
    summary:
      "PR #87 merged. In-memory Opportunity feature snapshots now build from pre-race race, entry, and market facts with odds cutoff leakage checks, missing-feature reasons, and explicit no-persistence/no-scoring behavior.",
  },
  {
    id: "dev-only-feature-snapshots-plan",
    title: "Dev-only persisted feature snapshots plan",
    status: "complete",
    phase: "Opportunity Engine",
    summary:
      "PR #88 merged. Persisted Dev-only feature_snapshots are planned against the existing table before any prediction output, Opportunity score, wager, Bet Sheet, or provider-ingestion scope.",
  },
  {
    id: "dev-only-feature-snapshots-materialization",
    title: "Dev-only feature snapshot materialization",
    status: "complete",
    phase: "Opportunity Engine",
    summary:
      "PR #89 merged. Dev-only dry-run/apply materialization now writes only public.feature_snapshots through a server-only CLI, with service_role select/insert grants, 7 initial Dev rows inserted and readback verified, and deterministic skip-existing replay safety confirmed without production, real ML, provider ingestion, scoring, or wagering work.",
  },
  {
    id: "value-calculation-input-semantics",
    title: "Value calculation input semantics",
    status: "complete",
    phase: "Opportunity Engine",
    summary:
      "Read-only audit and checker enhancement completed. The earlier value_calculation_inputs 0/7 report meant 0 value_calculations over 7 Dev feature_snapshots, and the report now exposes seven evidence-based sub-signals without fixture, migration, provider ingestion, scoring, ML, wager, or production work.",
  },
  {
    id: "glossary-track-code-alias-readiness",
    title: "Glossary track-code alias readiness",
    status: "complete",
    phase: "Opportunity Engine",
    summary:
      "Read-only Dev coverage reports glossary normalization ready for the reviewed demo scope: canonical code sets, values, aliases, and the reviewed Strideo Park track-code alias are covered without provider ingestion, scoring, ML, wager, or production work.",
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
    id: "roadmap-progress-reconciliation",
    title: "Roadmap and progress reconciliation",
    status: "complete",
    phase: "Release Coordination",
    summary:
      "docs/ROADMAP.md and the living progress dashboard now agree that Phase 0 and Phase 1 are complete enough for continued product work, Opportunity Engine work is active, and the next sequence remains Dev-only value-calculation lineage readiness before real ML, scoring, wagers, Bet Sheet, Assistant, Alerts, or production rollout.",
  },
  {
    id: "dev-only-value-calculation-lineage-plan",
    title: "Dev-only value-calculation lineage",
    status: "complete",
    phase: "Opportunity Engine",
    summary:
      "Dev-only materialization inserted 7 public.value_calculations rows linked to the 7 existing Dev feature_snapshots, replay dry-run skips all 7 existing deterministic identities, and model_version_id, prediction_output_id, model_probability, opportunity_id, and opportunity_scores linkage remain null until real model/prediction/scoring lineage is explicitly authorized.",
  },
  {
    id: "dev-only-model-prediction-lineage-plan",
    title: "Dev-only model and prediction lineage plan",
    status: "next",
    phase: "Opportunity Engine",
    summary:
      "Scope the smallest non-production model_versions and prediction_outputs lineage path only after reviewing the Dev coverage blockers; do not create real ML claims, fake scoring, opportunity_scores linkage, wagers, Bet Sheet, Assistant, Alerts, or production writes.",
  },
  {
    id: "watch-pr-82-mobile-shell",
    title: "Watch PR #82 mobile shell",
    status: "complete",
    phase: "Risk Watchlist",
    summary:
      "PR #82 merged. Mobile shell/navigation/touch-target work is now on main; future slices should preserve it and avoid duplicate nav systems.",
  },
  {
    id: "watch-pr-83-race-entry-cards",
    title: "Watch PR #83 race entry cards",
    status: "complete",
    phase: "Risk Watchlist",
    summary:
      "PR #83 merged. Race-detail mobile entry cards are now on main; future Opportunity slices should not re-solve race-detail mobile readability.",
  },
  {
    id: "watch-pr-58-opportunity-tracking",
    title: "Watch PR #58 Opportunity tracking",
    status: "queued",
    phase: "Risk Watchlist",
    summary:
      "Watch watchlist_items grants, authenticated user-owned writes, server action idempotency, and owner-scoped RLS. Current status: merged, Dev runtime verified, no blocker found after duplicate-submit hardening.",
  },
  {
    id: "watch-pr-51-generator-grants",
    title: "Watch PR #51 generator grants",
    status: "queued",
    phase: "Risk Watchlist",
    summary:
      "Watch service-role write scope, Opportunity generator permissions, and child-link update restrictions. Current status: merged, no blocker found.",
  },
  {
    id: "watch-pr-54-auth-reset",
    title: "Watch PR #54 auth reset",
    status: "queued",
    phase: "Risk Watchlist",
    summary:
      "Watch Auth token-hash flow, callback consolidation, and reset route/session handling. Current status: merged, no blocker found.",
  },
  {
    id: "watch-pr-48-auth-allowlist",
    title: "Watch PR #48 auth allowlist removal",
    status: "queued",
    phase: "Risk Watchlist",
    summary:
      "Watch DB-backed profile/role authorization and protected shell/profile context. Current status: merged, no blocker found.",
  },
  {
    id: "watch-pr-52-candidate-quality",
    title: "Watch PR #52 candidate quality",
    status: "queued",
    phase: "Risk Watchlist",
    summary:
      "Watch generator scoring and persistence behavior, append-only posture, and no wager or ML drift. Current status: merged, no blocker found.",
  },
  {
    id: "watch-read-access-grants",
    title: "Watch read-access grant PRs",
    status: "queued",
    phase: "Risk Watchlist",
    summary:
      "Watch PR #29, #30, #38, and #44 for migration sequencing, scoped grants, RLS visibility, and no anon broadening. Current status: merged, no blocker found.",
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
