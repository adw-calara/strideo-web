import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  EyeOff,
  FileText,
  Gauge,
  Layers3,
  Signal,
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  OpportunityFeedItem,
  OpportunityFeedSummary,
} from "@/lib/opportunities/data-access";

type BadgeTone = "default" | "secondary" | "outline";

const stateDisplay: Record<
  string,
  { label: string; helper: string; badge: BadgeTone }
> = {
  published: {
    label: "Published",
    helper: "Visible in the protected feed",
    badge: "default",
  },
  closed: {
    label: "Closed",
    helper: "No longer active for new feed updates",
    badge: "secondary",
  },
  resulted: {
    label: "Resulted",
    helper: "Linked race has result context",
    badge: "secondary",
  },
  verified: {
    label: "Verified",
    helper: "Result context has been verified",
    badge: "secondary",
  },
};

function titleCase(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}

function formatScore(value: number | null) {
  if (value === null) {
    return "Unavailable";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

function OpportunityMetric({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

function OpportunityStateBadge({ state }: { state: string }) {
  const display = stateDisplay[state] ?? {
    label: titleCase(state),
    helper: "Visible feed state",
    badge: "outline" as BadgeTone,
  };

  return (
    <Badge variant={display.badge} title={display.helper}>
      {display.label}
    </Badge>
  );
}

function formatSubjectSummary(opportunity: OpportunityFeedItem) {
  if (opportunity.subjects.length === 0) {
    return "No subjects available";
  }

  const roleCounts = opportunity.subjects.reduce<Record<string, number>>(
    (counts, subject) => {
      const label = titleCase(subject.subjectRole);
      counts[label] = (counts[label] ?? 0) + 1;
      return counts;
    },
    {},
  );

  return Object.entries(roleCounts)
    .map(([role, count]) => `${count} ${role}`)
    .join(", ");
}

export function OpportunityFeedHeader({
  summary,
}: {
  summary: OpportunityFeedSummary;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm font-medium uppercase tracking-normal text-muted-foreground">
          Opportunities
        </p>
        <Badge>{summary.opportunityCount} visible</Badge>
      </div>
      <div className="max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-normal">
          Opportunity Feed
        </h1>
        <p className="mt-2 text-muted-foreground">
          Opportunity signals are informational and not betting instructions.
        </p>
      </div>
      <div className="grid gap-3 rounded-md border bg-muted/30 p-4 sm:grid-cols-4">
        <OpportunityMetric
          label="Signals"
          value={summary.opportunityCount}
        />
        <OpportunityMetric label="Subjects" value={summary.subjectCount} />
        <OpportunityMetric label="Scores" value={summary.scoreCount} />
        <OpportunityMetric
          label="Explanations"
          value={summary.explanationCount}
        />
      </div>
    </section>
  );
}

export function OpportunityFeedEmptyState({ message }: { message: string }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Signal aria-hidden="true" className="size-5 text-muted-foreground" />
          <CardTitle>No visible Opportunities yet</CardTitle>
        </div>
        <CardDescription>
          {message} Published Opportunity signals will appear here when approved
          Dev data is available.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

export function OpportunityHiddenInternalsNotice() {
  return (
    <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
      <EyeOff aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <p>
        This feed shows approved display fields only. Source payloads, model
        lineage, event history, private strategy details, and workflow records
        remain hidden.
      </p>
    </div>
  );
}

export function OpportunityFeedCard({
  opportunity,
}: {
  opportunity: OpportunityFeedItem;
}) {
  const explanation = opportunity.latestExplanation;
  const score = opportunity.latestScore;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">
              {titleCase(opportunity.opportunityType)}
            </CardTitle>
            <CardDescription className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1">
                <CalendarDays
                  aria-hidden="true"
                  className="size-4 text-muted-foreground"
                />
                {formatDate(opportunity.raceDate)}
              </span>
              <span>{formatSubjectSummary(opportunity)}</span>
            </CardDescription>
          </div>
          <OpportunityStateBadge state={opportunity.state} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <OpportunityMetric
            label="Score"
            value={
              <span className="inline-flex items-center gap-2">
                <Gauge
                  aria-hidden="true"
                  className="size-4 text-muted-foreground"
                />
                {formatScore(opportunity.currentScore ?? score?.score ?? null)}
              </span>
            }
          />
          <OpportunityMetric
            label="Confidence"
            value={formatScore(
              opportunity.currentConfidence ?? score?.confidence ?? null,
            )}
          />
          <OpportunityMetric
            label="Edge"
            value={formatScore(opportunity.currentEdge ?? score?.edge ?? null)}
          />
        </div>

        {explanation?.headline || explanation?.summary ? (
          <div className="rounded-md border bg-muted/20 p-4">
            <div className="flex items-center gap-2">
              <FileText
                aria-hidden="true"
                className="size-4 text-muted-foreground"
              />
              <p className="text-sm font-medium">
                {explanation.headline ?? "Explanation available"}
              </p>
            </div>
            {explanation.summary ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {explanation.summary}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
            Explanation summary unavailable for this signal.
          </div>
        )}

        <div className="grid gap-3 border-t pt-4 sm:grid-cols-3">
          <OpportunityMetric
            label="Published"
            value={formatDateTime(opportunity.publishedAt)}
          />
          <OpportunityMetric
            label="Detected"
            value={formatDateTime(opportunity.firstDetectedAt)}
          />
          <OpportunityMetric
            label="Score version"
            value={
              score ? (
                <span className="inline-flex items-center gap-2">
                  <Layers3
                    aria-hidden="true"
                    className="size-4 text-muted-foreground"
                  />
                  {score.scoringVersion ?? "Not available"}
                </span>
              ) : (
                "Unavailable"
              )
            }
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-sm text-muted-foreground">
            This Opportunity stays linked to the source race context.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href={`/protected/races/${opportunity.raceId}`}>
              Open linked race
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
