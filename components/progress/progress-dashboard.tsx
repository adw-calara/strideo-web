import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock3,
  Database,
  GitBranch,
  ListChecks,
  Radio,
} from "lucide-react";

import { ProgressRefresh } from "@/components/progress/progress-refresh";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  ProgressDashboardData,
  ProgressMetric,
  ProgressPhase,
  ProgressPhaseStatus,
} from "@/lib/progress/data-access";
import { cn } from "@/lib/utils";

const statusDisplay: Record<
  ProgressPhaseStatus,
  {
    label: string;
    badge: "default" | "secondary" | "outline";
    icon: typeof CheckCircle2;
    bar: string;
  }
> = {
  complete: {
    label: "Complete",
    badge: "default",
    icon: CheckCircle2,
    bar: "bg-emerald-500",
  },
  active: {
    label: "Active",
    badge: "default",
    icon: Radio,
    bar: "bg-sky-500",
  },
  partial: {
    label: "Partial",
    badge: "secondary",
    icon: Clock3,
    bar: "bg-amber-500",
  },
  queued: {
    label: "Queued",
    badge: "outline",
    icon: Circle,
    bar: "bg-muted-foreground",
  },
};

function formatCount(metric: ProgressMetric) {
  if (metric.status === "unavailable") {
    return "Unavailable";
  }

  return new Intl.NumberFormat("en-US").format(metric.value ?? 0);
}

function MetricCard({ metric }: { metric: ProgressMetric }) {
  const unavailable = metric.status === "unavailable";

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {metric.label}
        </CardTitle>
        {unavailable ? (
          <AlertTriangle
            aria-hidden="true"
            className="size-4 text-muted-foreground"
          />
        ) : (
          <Database aria-hidden="true" className="size-4 text-muted-foreground" />
        )}
      </CardHeader>
      <CardContent>
        <p
          className={cn(
            "text-2xl font-semibold",
            unavailable && "text-muted-foreground",
          )}
        >
          {formatCount(metric)}
        </p>
      </CardContent>
    </Card>
  );
}

function PhaseRow({ phase }: { phase: ProgressPhase }) {
  const display = statusDisplay[phase.status];
  const Icon = display.icon;

  return (
    <div className="grid gap-3 rounded-md border p-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)_minmax(0,2fr)]">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted/30">
          <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">
              Phase {phase.phase}: {phase.title}
            </p>
            <Badge variant={display.badge}>{display.label}</Badge>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full", display.bar)}
              style={{ width: `${phase.progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {phase.progress}% complete
          </p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{phase.summary}</p>
      <p className="text-sm">{phase.nextStep}</p>
    </div>
  );
}

export function ProgressDashboard({
  data,
}: {
  data: ProgressDashboardData;
}) {
  const loadedMetricCount = data.metrics.filter(
    (metric) => metric.status === "loaded",
  ).length;
  const activePhaseCount = data.phases.filter(
    (phase) => phase.status === "active" || phase.status === "partial",
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-medium uppercase tracking-normal text-muted-foreground">
            Progress
          </p>
          <Badge>Live dashboard</Badge>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <h1 className="text-3xl font-semibold tracking-normal">
              Build Progress Dashboard
            </h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              Current project phase status with live counts from readable Dev
              data surfaces.
            </p>
          </div>
          <ProgressRefresh generatedAt={data.generatedAt} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle className="text-base">Process state</CardTitle>
            <GitBranch
              aria-hidden="true"
              className="size-4 text-muted-foreground"
            />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{activePhaseCount}</p>
            <CardDescription className="mt-2">
              Active or partial roadmap phases.
            </CardDescription>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle className="text-base">Readable metrics</CardTitle>
            <Database
              aria-hidden="true"
              className="size-4 text-muted-foreground"
            />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{loadedMetricCount}</p>
            <CardDescription className="mt-2">
              Supabase count checks loaded for this session.
            </CardDescription>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle className="text-base">Immediate actions</CardTitle>
            <ListChecks
              aria-hidden="true"
              className="size-4 text-muted-foreground"
            />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{data.nextSteps.length}</p>
            <CardDescription className="mt-2">
              Guardrails and decisions before the next handoff.
            </CardDescription>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {data.metrics.map((metric) => (
          <MetricCard key={metric.key} metric={metric} />
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Roadmap Status</CardTitle>
            <CardDescription>
              Phase progress reflects the current repository and Dev data
              posture.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {data.phases.map((phase) => (
              <PhaseRow key={phase.phase} phase={phase} />
            ))}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Work</CardTitle>
              <CardDescription>
                Current workstream before the next product decision.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              {data.activeWork.map((item) => (
                <div key={item} className="flex gap-2">
                  <Radio
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  />
                  <p>{item}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
              <CardDescription>
                Guardrails for the next execution pass.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              {data.nextSteps.map((item) => (
                <div key={item} className="flex gap-2">
                  <CheckCircle2
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  />
                  <p>{item}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
