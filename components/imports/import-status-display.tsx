import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  DatabaseZap,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  ImportBatchDisplayState,
  ImportBatchStatusItem,
  ImportStatusSummary,
} from "@/lib/imports/data-access";
import type { ProviderRaceEntryReadinessDisplayModel } from "@/lib/imports/provider-race-entry-readiness-core";
import { cn } from "@/lib/utils";

type BadgeTone = "default" | "secondary" | "destructive" | "outline";

const stateDisplay: Record<
  ImportBatchDisplayState,
  {
    label: string;
    helper: string;
    badge: BadgeTone;
    icon: typeof CheckCircle2;
  }
> = {
  success: {
    label: "Succeeded",
    helper: "Import completed without visible warnings",
    badge: "default",
    icon: CheckCircle2,
  },
  warning: {
    label: "Warning",
    helper: "Import completed with sanitized warnings",
    badge: "secondary",
    icon: AlertTriangle,
  },
  error: {
    label: "Error",
    helper: "Import reported errors",
    badge: "destructive",
    icon: XCircle,
  },
  pending: {
    label: "In progress",
    helper: "Import has not finished yet",
    badge: "outline",
    icon: LoaderCircle,
  },
};

function titleCase(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatDateRange(start: string | null, end: string | null) {
  if (!start && !end) {
    return "Coverage not set";
  }

  if (!start) {
    return formatDate(end);
  }

  if (start === end || !end) {
    return formatDate(start);
  }

  return `${formatDate(start)} - ${formatDate(end)}`;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}

function formatNumber(value: number | null) {
  return value === null ? "Not recorded" : value.toLocaleString("en-US");
}

function ImportMetric({
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

export function ImportStatusHeader({
  summary,
}: {
  summary: ImportStatusSummary;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm font-medium uppercase tracking-normal text-muted-foreground">
          Data Imports
        </p>
        <Badge>{summary.batchCount} loaded</Badge>
      </div>
      <div className="max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-normal">
          Provider Import Status
        </h1>
        <p className="mt-2 text-muted-foreground">
          Review sanitized import batch status for race-card data. Raw payloads,
          source files, storage details, and job internals stay hidden.
        </p>
      </div>
      <div className="grid gap-3 rounded-md border bg-muted/30 p-4 sm:grid-cols-4">
        <ImportMetric label="Batches" value={summary.batchCount} />
        <ImportMetric label="Succeeded" value={summary.successfulCount} />
        <ImportMetric label="Warnings" value={summary.warningCount} />
        <ImportMetric label="Failed" value={summary.failedCount} />
      </div>
    </section>
  );
}

function formatBoolean(value: boolean) {
  return value ? "Yes" : "No";
}

export function ImportStatusEmptyState({ message }: { message: string }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <DatabaseZap aria-hidden="true" className="size-5 text-muted-foreground" />
          <CardTitle>No import batches yet</CardTitle>
        </div>
        <CardDescription>
          {message} Dev race-card fixture data can exist before import status
          records are added.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function ReadinessBadge({
  model,
}: {
  model: ProviderRaceEntryReadinessDisplayModel;
}) {
  const Icon = model.state === "ready" ? CheckCircle2 : AlertTriangle;

  return (
    <Badge variant={model.badgeVariant} title={model.statusText}>
      <Icon aria-hidden="true" className="mr-1 size-3" />
      {model.badgeLabel}
    </Badge>
  );
}

export function ProviderRaceEntryReadinessCard({
  model,
}: {
  model: ProviderRaceEntryReadinessDisplayModel;
}) {
  const readTables =
    model.readTables.length > 0 ? model.readTables.join(", ") : "No Dev reads";
  const writes =
    model.writesPlannedOrExecuted.length > 0
      ? model.writesPlannedOrExecuted.join(", ")
      : "None";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck
                aria-hidden="true"
                className="size-5 text-muted-foreground"
              />
              <CardTitle className="text-lg">
                Race-entry readiness status
              </CardTitle>
            </div>
            <CardDescription className="mt-2 max-w-3xl">
              {model.statusText}
            </CardDescription>
          </div>
          <ReadinessBadge model={model} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ImportMetric label="Boundary" value={model.targetLabel} />
          <ImportMetric label="Read tables" value={readTables} />
          <ImportMetric label="Writes" value={writes} />
          <ImportMetric
            label="Provider ingestion"
            value="Disabled by default"
          />
          <ImportMetric
            label="Deterministic rows"
            value={model.metrics.deterministicRows}
          />
          <ImportMetric
            label="Normalization warnings"
            value={model.metrics.normalizationWarnings}
          />
          <ImportMetric
            label="Write plan present"
            value={formatBoolean(model.metrics.writePlanPresent)}
          />
          <ImportMetric
            label="Harness ready"
            value={formatBoolean(model.metrics.readyToRunWriteHarness)}
          />
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
            <LockKeyhole aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <p>{model.boundaryNotice}</p>
          </div>
          <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
            <DatabaseZap aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <p>{model.disabledNotice}</p>
          </div>
        </div>
        {model.blockingReasons.length > 0 ? (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
            <p className="text-sm font-medium">Readiness notes</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {model.blockingReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function BatchStateBadge({ batch }: { batch: ImportBatchStatusItem }) {
  const display = stateDisplay[batch.displayState];
  const Icon = display.icon;

  return (
    <Badge variant={display.badge} title={display.helper}>
      <Icon aria-hidden="true" className="mr-1 size-3" />
      {display.label}
    </Badge>
  );
}

function SafeMetadataSummary({ batch }: { batch: ImportBatchStatusItem }) {
  const metadata = batch.metadata;
  const metrics = [
    ["Tracks", metadata.affectedTrackCount],
    ["Races", metadata.affectedRaceCount],
    ["Entries", metadata.affectedEntryCount],
    ["Odds snapshots", metadata.oddsSnapshotCount],
    ["Result versions", metadata.resultVersionCount],
    ["Result entries", metadata.resultEntryCount],
  ] as const;

  return (
    <div className="flex flex-col gap-4">
      {metadata.summary ? (
        <p className="text-sm text-muted-foreground">{metadata.summary}</p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-3">
        {metrics.map(([label, value]) => (
          <ImportMetric key={label} label={label} value={formatNumber(value)} />
        ))}
      </div>
      {metadata.warnings.length > 0 ? (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
          <p className="text-sm font-medium">Sanitized warnings</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {metadata.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {metadata.sourceDetailsHidden ? (
        <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
          <EyeOff aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>
            {metadata.sourceDetailsNote ??
              "Source details are hidden until operator access is implemented."}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function ImportBatchCard({ batch }: { batch: ImportBatchStatusItem }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">
              {batch.metadata.displayName ?? titleCase(batch.ingestionScope)}
            </CardTitle>
            <CardDescription className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              <span>{batch.sourceSystem}</span>
              <span>{titleCase(batch.dataDomain)}</span>
              <span>{formatDateRange(batch.coverageStartDate, batch.coverageEndDate)}</span>
            </CardDescription>
          </div>
          <BatchStateBadge batch={batch} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ImportMetric label="Batch key" value={<code>{batch.batchKey}</code>} />
          <ImportMetric label="Rows processed" value={formatNumber(batch.rowCount)} />
          <ImportMetric label="Warnings" value={batch.metadata.warningCount} />
          <ImportMetric label="Errors" value={batch.errorCount} />
          <ImportMetric
            label="Started"
            value={
              <span className="inline-flex items-center gap-2">
                <Clock aria-hidden="true" className="size-4 text-muted-foreground" />
                {formatDateTime(batch.startedAt)}
              </span>
            }
          />
          <ImportMetric label="Completed" value={formatDateTime(batch.finishedAt)} />
          <ImportMetric label="Scope" value={batch.ingestionScope} />
          <ImportMetric label="Status" value={titleCase(batch.status)} />
        </div>
        <div
          className={cn(
            "rounded-md border p-4",
            batch.displayState === "warning" && "border-amber-500/40",
            batch.displayState === "error" && "border-destructive/50",
          )}
        >
          <SafeMetadataSummary batch={batch} />
        </div>
      </CardContent>
    </Card>
  );
}
