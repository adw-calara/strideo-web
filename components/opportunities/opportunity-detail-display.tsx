import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookmarkCheck,
  BookmarkPlus,
  CalendarDays,
  FileText,
  Gauge,
  Layers3,
  LinkIcon,
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
  OpportunityDetailItem,
  OpportunityFeedExplanation,
  OpportunityFeedScore,
  OpportunityFeedSubject,
} from "@/lib/opportunities/data-access";
import { trackOpportunityAction } from "@/lib/opportunities/actions";

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

function formatSubjectSummary(subject: OpportunityFeedSubject | undefined) {
  if (!subject) {
    return "Subject context unavailable";
  }

  const horse = subject.horseName ?? "Horse unavailable";

  if (subject.programNumber) {
    return `${horse} (#${subject.programNumber})`;
  }

  return horse;
}

function formatRaceSummary(subject: OpportunityFeedSubject | undefined) {
  const raceLabel = subject?.raceNumber
    ? `Race ${subject.raceNumber}`
    : "Race not available";

  if (subject?.raceName) {
    return `${raceLabel}: ${subject.raceName}`;
  }

  return raceLabel;
}

function DetailMetric({
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

function OpportunityTrackingControl({
  opportunity,
}: {
  opportunity: OpportunityDetailItem;
}) {
  if (!opportunity.trackingState.isAvailable) {
    return (
      <div className="flex flex-col items-start gap-2 sm:items-end">
        <Button disabled variant="outline">
          <BookmarkPlus aria-hidden="true" className="size-4" />
          Tracking unavailable
        </Button>
        <p className="max-w-xs text-left text-xs text-muted-foreground sm:text-right">
          Opportunity details remain visible while tracking access is being
          prepared.
        </p>
      </div>
    );
  }

  if (opportunity.trackingState.isTracked) {
    return (
      <div className="flex flex-col items-start gap-2 sm:items-end">
        <Button disabled variant="secondary">
          <BookmarkCheck aria-hidden="true" className="size-4" />
          Saved
        </Button>
        <p className="max-w-xs text-left text-xs text-muted-foreground sm:text-right">
          Saved to your Opportunity tracking list. No wager has been placed or
          recorded.
        </p>
      </div>
    );
  }

  return (
    <form
      action={trackOpportunityAction}
      className="flex flex-col items-start gap-2 sm:items-end"
    >
      <input name="opportunityId" type="hidden" value={opportunity.id} />
      <input name="raceDate" type="hidden" value={opportunity.raceDate} />
      <Button type="submit">
        <BookmarkPlus aria-hidden="true" className="size-4" />
        Track Opportunity
      </Button>
      <p className="max-w-xs text-left text-xs text-muted-foreground sm:text-right">
        Save this Opportunity for follow-up. This does not place, record, or
        recommend a wager.
      </p>
    </form>
  );
}

function SubjectContextList({
  subjects,
}: {
  subjects: OpportunityFeedSubject[];
}) {
  if (subjects.length === 0) {
    return (
      <div className="rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
        Subject context is unavailable for this Opportunity.
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {subjects.map((subject) => (
        <div
          key={subject.id}
          className="grid gap-3 rounded-md border bg-muted/20 p-4 sm:grid-cols-2"
        >
          <DetailMetric
            label="Subject"
            value={formatSubjectSummary(subject)}
          />
          <DetailMetric
            label="Role"
            value={titleCase(subject.subjectRole)}
          />
          <DetailMetric
            label="Race"
            value={formatRaceSummary(subject)}
          />
          <DetailMetric
            label="Track"
            value={subject.trackName ?? "Track not available"}
          />
        </div>
      ))}
    </div>
  );
}

function ExplanationHistory({
  explanations,
}: {
  explanations: OpportunityFeedExplanation[];
}) {
  if (explanations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Explanation</CardTitle>
          <CardDescription>
            Explanation summary unavailable for this signal.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const [latest, ...prior] = explanations;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText aria-hidden="true" className="size-5 text-muted-foreground" />
          <CardTitle>Explanation</CardTitle>
        </div>
        <CardDescription>
          Demo explanation language is informational and not betting
          instruction.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="rounded-md border bg-muted/20 p-4">
          <p className="text-sm font-medium">
            {latest.headline ?? "Explanation available"}
          </p>
          {latest.summary ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {latest.summary}
            </p>
          ) : null}
          <p className="mt-3 text-xs text-muted-foreground">
            Version {latest.explanationVersion} generated{" "}
            {formatDateTime(latest.generatedAt)}
          </p>
        </div>
        {prior.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Prior explanations</p>
            {prior.map((explanation) => (
              <div
                key={explanation.id}
                className="rounded-md border px-3 py-2 text-sm text-muted-foreground"
              >
                <span className="font-medium text-foreground">
                  {explanation.headline ?? "Explanation"}
                </span>{" "}
                generated {formatDateTime(explanation.generatedAt)}
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ScoreHistory({ scores }: { scores: OpportunityFeedScore[] }) {
  if (scores.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Score History</CardTitle>
          <CardDescription>
            Score history is unavailable for this signal.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Gauge aria-hidden="true" className="size-5 text-muted-foreground" />
          <CardTitle>Score History</CardTitle>
        </div>
        <CardDescription>
          Append-only scoring records visible through the protected Opportunity
          read path.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {scores.map((score) => (
          <div
            key={score.id}
            className="grid gap-3 rounded-md border bg-muted/20 p-4 sm:grid-cols-5"
          >
            <DetailMetric label="Score" value={formatScore(score.score)} />
            <DetailMetric
              label="Confidence"
              value={formatScore(score.confidence)}
            />
            <DetailMetric label="Edge" value={formatScore(score.edge)} />
            <DetailMetric
              label="Fair value"
              value={formatScore(score.fairValue)}
            />
            <DetailMetric
              label="Scored"
              value={formatDateTime(score.scoredAt)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function OpportunityDetailDisplay({
  opportunity,
}: {
  opportunity: OpportunityDetailItem;
}) {
  const primarySubject = opportunity.subjects[0];
  const latestScore = opportunity.latestScore;
  const score = opportunity.currentScore ?? latestScore?.score ?? null;
  const confidence =
    opportunity.currentConfidence ?? latestScore?.confidence ?? null;
  const edge = opportunity.currentEdge ?? latestScore?.edge ?? null;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-3">
            <Link href="/protected/opportunities">
              <ArrowLeft aria-hidden="true" className="size-4" />
              Back to feed
            </Link>
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-medium uppercase tracking-normal text-muted-foreground">
            Opportunity
          </p>
          <OpportunityStateBadge state={opportunity.state} />
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <h1 className="text-3xl font-semibold tracking-normal">
              {titleCase(opportunity.opportunityType)}
            </h1>
            <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
              <span>{formatSubjectSummary(primarySubject)}</span>
              <span>{formatRaceSummary(primarySubject)}</span>
              <span>{primarySubject?.trackName ?? "Track not available"}</span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays aria-hidden="true" className="size-4" />
                {formatDate(opportunity.raceDate)}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <OpportunityTrackingControl opportunity={opportunity} />
            <Button asChild variant="outline">
              <Link href={`/protected/races/${opportunity.raceId}`}>
                Open linked race
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
        <div className="grid gap-3 rounded-md border bg-muted/30 p-4 sm:grid-cols-4">
          <DetailMetric
            label="Score"
            value={
              <span className="inline-flex items-center gap-2">
                <Gauge aria-hidden="true" className="size-4 text-muted-foreground" />
                {formatScore(score)}
              </span>
            }
          />
          <DetailMetric label="Confidence" value={formatScore(confidence)} />
          <DetailMetric label="Edge" value={formatScore(edge)} />
          <DetailMetric
            label="Score version"
            value={
              latestScore ? (
                <span className="inline-flex items-center gap-2">
                  <Layers3
                    aria-hidden="true"
                    className="size-4 text-muted-foreground"
                  />
                  {latestScore.scoringVersion ?? "Not available"}
                </span>
              ) : (
                "Unavailable"
              )
            }
          />
        </div>
      </section>

      <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
        <Signal aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <p>
          Opportunity signals are informational and not betting instructions.
          This view shows approved display fields only.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <LinkIcon
              aria-hidden="true"
              className="size-5 text-muted-foreground"
            />
            <CardTitle>Race And Subject Context</CardTitle>
          </div>
          <CardDescription>
            The Opportunity remains centered on its linked race and entry
            context.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SubjectContextList subjects={opportunity.subjects} />
        </CardContent>
      </Card>

      <ExplanationHistory explanations={opportunity.explanationHistory} />
      <ScoreHistory scores={opportunity.scoreHistory} />

      <Card>
        <CardHeader>
          <CardTitle>Lifecycle</CardTitle>
          <CardDescription>
            Current-state timestamps from the visible Opportunity read model.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <DetailMetric
            label="First detected"
            value={formatDateTime(opportunity.firstDetectedAt)}
          />
          <DetailMetric
            label="Published"
            value={formatDateTime(opportunity.publishedAt)}
          />
          <DetailMetric
            label="Closed"
            value={formatDateTime(opportunity.closedAt)}
          />
          <DetailMetric
            label="Resulted"
            value={formatDateTime(opportunity.resultedAt)}
          />
          <DetailMetric
            label="Verified"
            value={formatDateTime(opportunity.verifiedAt)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
