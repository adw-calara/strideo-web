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
  dailyTasks: ProgressTask[];
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
      "Implement the first real provider import path for Dev after reliability, lineage materialization, and preview verification are complete.",
  },
  {
    phase: "3",
    title: "Opportunity Engine",
    status: "active",
    progress: 85,
    summary:
      "Demo generation, narrow service-role grants, candidate quality, feed visibility, detail display, tracked Opportunities, scoring contracts, pre-race snapshot contracts, Dev-only persisted feature snapshot materialization, racing-form readiness, value-calculation input lineage, and the model/prediction dry-run plus insert-grant prerequisite are validated.",
    nextStep:
      "After the reliability baseline is green, materialize only one Dev model identity and seven prediction outputs; keep existing value calculations, scoring, Opportunities, wagers, and production untouched.",
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
      "Add preview deployment and focused Playwright smoke coverage while preserving current Opportunity and mobile surfaces.",
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
    summary:
      "Entitlement schema exists; CI, preview verification, repository visibility, Stripe, analytics, alerts, and broader deployment hardening remain incomplete.",
    nextStep:
      "Move reliability, CI, and preview verification earlier; keep payments and broader commercial integrations behind the Opportunity vertical slice.",
  },
];

const activeWork = [
  "Use docs/ROADMAP.md for phase sequencing and this dashboard as the living day-to-day status handoff.",
  "Keep the reliability PR draft while its local migration, lint, 123-test, build, and runtime checks pass but the production Next.js-to-Sharp audit path keeps verification red; the development-tool findings, runtime/tool pins, automatic discovery, and pinned Actions are implemented on the branch.",
  "After CI is green on main, enable GitHub vulnerability/security updates and protect main with the exact stable verification check.",
  "Use the Dev-only model/prediction planner and merged insert grants for a materialization-only slice with exact one-model/seven-prediction first-run, direct-readback, and replay counts.",
  "Keep the seven existing Dev value_calculations immutable; real model-backed value work must insert new rows from an independent, time-valid prediction signal.",
  "Resolve the currently public GitHub repository visibility before provider credentials, proprietary scoring logic, or sensitive deployment configuration are introduced.",
];

const nextSteps = [
  "Publish and inspect the draft reliability PR, preserving the real audit failure until a supported Next.js and Sharp combination is available.",
  "After that workflow is green on main, enable GitHub vulnerability alerts, Dependabot security updates, and branch protection.",
  "Confirm whether the public GitHub repository should remain public.",
  "Materialize one Dev model-version fixture and seven prediction-output fixtures against the currently empty target set, read back all eight rows, then verify replay skips one plus seven identities with no other writes.",
  "Generate Supabase boundary types through a temporary local-schema comparison and add Vercel preview plus Playwright smoke verification, splitting the work if needed.",
  "Import one real provider-backed race card into Dev through the audited ingestion path.",
  "Create the first real Opportunity from an independent pre-race prediction and a time-valid market comparator using new append-only value evidence.",
  "Continue through Bet Sheet, settlement, and performance attribution before Alerts, Assistant, payments, or scale work.",
  "Keep production untouched until explicitly authorized.",
];

const dailyTasks: ProgressTask[] = [
  {
    id: "today-amend-delivery-plan",
    title: "Amend the near-term delivery plan",
    status: "complete",
    phase: "Today",
    summary:
      "Roadmap, architecture, Codex guidance, lineage contracts, and the living progress surface now use the reliability-to-provider-to-Opportunity vertical sequence.",
  },
  {
    id: "today-full-system-validation",
    title: "Run full safe system validation",
    status: "complete",
    phase: "Today",
    summary:
      "Migration checks, lint, 121 tests, build, Dev migration alignment, schema lint, read-only lineage/provider reports, and HTTP runtime smoke checks passed. Verify fails dependency audit on four high-severity findings: narrow development-tool paths through brace-expansion and js-yaml plus the production next-to-sharp path. Playwright/authenticated UI coverage is not installed; agent-browser is optional Codex convenience tooling.",
  },
  {
    id: "today-repository-visibility",
    title: "Resolve public repository visibility",
    status: "next",
    phase: "Today",
    summary:
      "The GitHub repository is public. Owner decision is required before provider credentials, proprietary scoring logic, or sensitive deployment configuration are added.",
  },
  {
    id: "today-reliability-ci",
    title: "Implement reliability and CI baseline",
    status: "active",
    phase: "Today",
    summary:
      "Locally implemented and validated on the isolated branch: development-tool audit fixes, Next.js 16.2.11, Node 24.18.0, local Supabase CLI 2.105.0, 16-file automatic test discovery, the pre-release health label, pinned Actions, and Dependabot. The production Next.js-to-Sharp audit path remains the explicit blocker, so verification is red and the PR must stay draft.",
  },
  {
    id: "today-github-security-settings",
    title: "Apply GitHub security and protection settings",
    status: "queued",
    phase: "Today",
    summary:
      "Only after CI is green on main, enable vulnerability alerts and Dependabot security updates, then protect main with required pull requests, the exact verification check, and no direct or force pushes.",
  },
  {
    id: "today-model-prediction-materialization",
    title: "Materialize Dev model/prediction lineage",
    status: "queued",
    phase: "Today",
    summary:
      "Use the existing planner and merged grants to insert one model identity and seven prediction identities into the currently empty target set; read back all eight rows before replay, which must skip all eight while existing value calculations remain unchanged.",
  },
  {
    id: "today-end-of-day-cleanup",
    title: "End-of-day clean handoff",
    status: "queued",
    phase: "Today",
    summary:
      "After today's planned work, confirm git status, verification, Supabase touch status, and the next smallest Opportunity-lineage task.",
  },
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
      "docs/ROADMAP.md and the living progress dashboard now agree on an early reliability baseline followed by Dev model/prediction materialization, typed preview verification, one provider import, and the first independently scored Opportunity vertical slice.",
  },
  {
    id: "dev-only-value-calculation-lineage-plan",
    title: "Dev-only value-calculation lineage",
    status: "complete",
    phase: "Opportunity Engine",
    summary:
      "Dev-only materialization inserted 7 immutable public.value_calculations rows linked to the 7 existing Dev feature_snapshots, replay skips all 7 identities, and their model, prediction, probability, Opportunity, and score linkage remains null permanently; later real value work inserts new rows.",
  },
  {
    id: "dev-only-model-prediction-lineage-plan",
    title: "Dev-only model and prediction lineage plan",
    status: "complete",
    phase: "Opportunity Engine",
    summary:
      "Dry-run-only planner/report proposes one honest non-production model_versions row shape and 7 market-derived baseline prediction_outputs row shapes linked to existing Dev feature_snapshots and value_calculations, with no writes, migrations, trained ML claims, scoring, opportunity_scores linkage, wagers, Bet Sheet, Assistant, Alerts, or production access.",
  },
  {
    id: "dev-only-model-prediction-materialization-plan",
    title: "Dev-only model and prediction materialization plan",
    status: "next",
    phase: "Opportunity Engine",
    summary:
      "PR #109 completed the insert-only grant prerequisite. After reliability work, implement the apply path for one Dev model identity and seven prediction identities only; direct readback must confirm all eight before replay skips one plus seven, and existing value_calculations must remain unchanged.",
  },
  {
    id: "delivery-reliability-ci",
    title: "Reliability and CI baseline",
    status: "active",
    phase: "Release Coordination",
    summary:
      "Implemented and locally validated on the isolated branch with Node 24.18.0, Supabase CLI 2.105.0, Next.js 16.2.11, 16-file automatic test discovery, a pre-release health label, Dependabot, and least-privilege Actions pinned to immutable SHAs. The production Next.js-to-Sharp advisory keeps verify red and the PR draft; GitHub settings remain unchanged.",
  },
  {
    id: "github-security-protection-settings",
    title: "GitHub security and branch protection settings",
    status: "queued",
    phase: "Release Coordination",
    summary:
      "After the verification workflow is green on main, enable vulnerability alerts and Dependabot security updates, then require pull requests and the exact verification check while preventing direct and force pushes.",
  },
  {
    id: "repository-visibility-decision",
    title: "Public repository visibility decision",
    status: "next",
    phase: "Release Coordination",
    summary:
      "The GitHub repository is currently public. An owner decision is required before proprietary scoring logic, provider credentials, or sensitive deployment configuration are introduced.",
  },
  {
    id: "typed-preview-browser-verification",
    title: "Typed boundary and preview verification",
    status: "queued",
    phase: "Release Coordination",
    summary:
      "Generate Supabase types at raw database boundaries by comparing temporary output from a migration-built local schema, configure Vercel preview deployment, and add focused Playwright smoke coverage without replacing intentional domain or UI types; agent-browser remains optional Codex tooling.",
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
      "After reliability, materialization, and preview verification, import one provider-backed race card through the existing normalization, idempotency, persistence, and job-audit path.",
  },
  {
    id: "first-real-opportunity-vertical-slice",
    title: "First real Opportunity vertical slice",
    status: "queued",
    phase: "Opportunity Engine",
    summary:
      "Use an independent pre-race prediction and time-valid market comparator to insert new append-only value evidence, score, explanation, and Opportunity lineage without updating the seven existing fixtures.",
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
    dailyTasks,
    tasks,
    activeWork,
    nextSteps,
  };
}
