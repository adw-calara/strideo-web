import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock,
  Flag,
  MapPin,
  Trophy,
} from "lucide-react";

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
  RaceCardEntry,
  RaceDetail,
  RaceListGroup,
  RaceListItem,
  RaceResults,
} from "@/lib/races/data-access";
import { cn } from "@/lib/utils";

type StatusTone = "default" | "secondary" | "outline";

const raceStatusDisplay: Record<
  string,
  { label: string; helper: string; tone: StatusTone }
> = {
  official: {
    label: "Official result",
    helper: "Results are final",
    tone: "default",
  },
  resulted: {
    label: "Completed",
    helper: "Results are posted",
    tone: "secondary",
  },
  scheduled: {
    label: "Scheduled",
    helper: "Results pending",
    tone: "outline",
  },
  open: {
    label: "Open",
    helper: "Race card is active",
    tone: "secondary",
  },
  closed: {
    label: "Closed",
    helper: "Awaiting result",
    tone: "secondary",
  },
  cancelled: {
    label: "Cancelled",
    helper: "Not active",
    tone: "outline",
  },
};

function titleCase(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatRaceDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export function formatRaceTime(value: string | null) {
  if (!value) {
    return "Time pending";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}

export function formatCurrency(value: number | null) {
  if (value === null) {
    return "Not listed";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatRaceTitle(race: RaceDetail) {
  return race.name ?? `Race ${race.raceNumber}`;
}

function formatDistance(race: RaceDetail) {
  return (
    race.distanceText ??
    (race.distanceYards ? `${race.distanceYards} yards` : "Distance pending")
  );
}

export function RaceStatusBadge({ status }: { status: string }) {
  const display = raceStatusDisplay[status] ?? {
    label: titleCase(status),
    helper: "Status available",
    tone: "outline" as StatusTone,
  };

  return (
    <Badge variant={display.tone} title={display.helper}>
      {display.label}
    </Badge>
  );
}

function RaceMetric({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
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

export function RaceEmptyState({ message }: { message: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>No race cards yet</CardTitle>
        <CardDescription>
          {message} Race cards will appear here after Dev fixture or provider
          data is available.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

export function RaceListHeader({
  raceCount,
  dateCount,
}: {
  raceCount: number;
  dateCount: number;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm font-medium uppercase tracking-normal text-muted-foreground">
          Races
        </p>
        <Badge>{raceCount} loaded</Badge>
      </div>
      <div className="max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-normal">
          Race Cards
        </h1>
        <p className="mt-2 text-muted-foreground">
          Review protected race facts, runners, market snapshots, and results
          before Strideo adds prediction and Opportunity workflows.
        </p>
      </div>
      <div className="grid gap-3 rounded-md border bg-muted/30 p-4 sm:grid-cols-3">
        <RaceMetric label="Race dates" value={dateCount} />
        <RaceMetric label="Race cards" value={raceCount} />
        <RaceMetric label="Current scope" value="Race facts only" />
      </div>
    </section>
  );
}

export function RaceListGroupSection({ group }: { group: RaceListGroup }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div>
          <h2 className="text-xl font-semibold tracking-normal">
            {formatRaceDate(group.raceDate)}
          </h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin aria-hidden="true" className="size-4" />
            {group.track?.name ?? "Track pending"}
            {group.track?.code ? ` (${group.track.code})` : ""}
          </p>
        </div>
        <Badge variant="outline">
          {group.races.length} race{group.races.length === 1 ? "" : "s"}
        </Badge>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {group.races.map((race) => (
          <RaceListCard key={race.id} race={race} />
        ))}
      </div>
    </section>
  );
}

function RaceListCard({ race }: { race: RaceListItem }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">
              Race {race.raceNumber}: {formatRaceTitle(race)}
            </CardTitle>
            <CardDescription className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              <span>{race.track?.name ?? "Track pending"}</span>
              <span>{race.surface?.name ?? "Surface pending"}</span>
              <span>{formatDistance(race)}</span>
            </CardDescription>
          </div>
          <RaceStatusBadge status={race.status} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <RaceMetric
            label="Scheduled"
            value={
              <span className="inline-flex items-center gap-2">
                <Clock aria-hidden="true" className="size-4 text-muted-foreground" />
                {formatRaceTime(race.scheduledAt)}
              </span>
            }
          />
          <RaceMetric label="Entries" value={race.entryCount} />
          <RaceMetric label="Purse" value={formatCurrency(race.purse)} />
        </div>
        <Button asChild variant="outline" className="w-full justify-between">
          <Link href={`/protected/races/${race.id}`}>
            View race card
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function RaceDetailHeader({ race }: { race: RaceDetail }) {
  return (
    <section className="flex flex-col gap-5">
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-2 text-sm"
      >
        <Link
          href="/protected"
          className="text-muted-foreground hover:text-foreground"
        >
          Dashboard
        </Link>
        <span className="text-muted-foreground">/</span>
        <Link
          href="/protected/races"
          className="text-muted-foreground hover:text-foreground"
        >
          Races
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium">Race {race.raceNumber}</span>
      </nav>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <p className="text-sm font-medium uppercase tracking-normal text-muted-foreground">
              Race {race.raceNumber}
            </p>
            <RaceStatusBadge status={race.status} />
          </div>
          <h1 className="text-3xl font-semibold tracking-normal">
            {formatRaceTitle(race)}
          </h1>
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
            <span>{formatRaceDate(race.raceDate)}</span>
            <span>{race.track?.name ?? "Track pending"}</span>
            <span>{race.surface?.name ?? "Surface pending"}</span>
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link href="/protected/races">
            <ArrowLeft aria-hidden="true" className="size-4" />
            Race list
          </Link>
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <RaceMetric
          label="Scheduled"
          value={
            <span className="inline-flex items-center gap-2">
              <CalendarDays aria-hidden="true" className="size-4 text-muted-foreground" />
              {formatRaceTime(race.scheduledAt)}
            </span>
          }
        />
        <RaceMetric
          label="Off time"
          value={
            <span className="inline-flex items-center gap-2">
              <Flag aria-hidden="true" className="size-4 text-muted-foreground" />
              {formatRaceTime(race.offAt)}
            </span>
          }
        />
        <RaceMetric label="Distance" value={formatDistance(race)} />
        <RaceMetric label="Purse" value={formatCurrency(race.purse)} />
      </div>
    </section>
  );
}

function RaceEntryResultBadge({ entry }: { entry: RaceCardEntry }) {
  return entry.result?.finishPosition ? (
    <Badge variant="secondary">Finish {entry.result.finishPosition}</Badge>
  ) : (
    <Badge variant="outline">Pending result</Badge>
  );
}

function RaceEntryMobileField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 break-words text-sm font-medium">{value}</div>
    </div>
  );
}

function RaceEntryMobileCard({ entry }: { entry: RaceCardEntry }) {
  return (
    <div className="rounded-md border bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              Program {entry.programNumber ?? "-"}
            </Badge>
            <Badge variant="outline">Post {entry.postPosition ?? "-"}</Badge>
          </div>
          <p className="mt-3 break-words text-base font-semibold">
            {entry.horse?.name ?? "Horse pending"}
          </p>
        </div>
        <RaceEntryResultBadge entry={entry} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <RaceEntryMobileField
          label="Jockey"
          value={entry.jockey?.name ?? "Jockey pending"}
        />
        <RaceEntryMobileField
          label="Trainer"
          value={entry.trainer?.name ?? "Trainer pending"}
        />
        <RaceEntryMobileField
          label="Morning line"
          value={entry.morningLineOdds ?? "-"}
        />
        <RaceEntryMobileField
          label="Latest odds"
          value={entry.latestOdds?.oddsFractional ?? "No odds"}
        />
        <RaceEntryMobileField
          label="Entry status"
          value={titleCase(entry.status)}
        />
      </div>
    </div>
  );
}

function RaceEntriesMobileList({ entries }: { entries: RaceCardEntry[] }) {
  return (
    <div className="flex flex-col gap-3 md:hidden" aria-label="Race entries">
      {entries.map((entry) => (
        <RaceEntryMobileCard key={entry.id} entry={entry} />
      ))}
    </div>
  );
}

export function RaceEntriesTable({ entries }: { entries: RaceCardEntry[] }) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Entries</CardTitle>
          <CardDescription>
            No entries are available for this race.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entries</CardTitle>
        <CardDescription>
          Runners, connections, morning line, latest odds, and result status.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RaceEntriesMobileList entries={entries} />
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-normal text-muted-foreground">
                <th className="py-3 pr-4 font-medium">Program</th>
                <th className="py-3 pr-4 font-medium">Post</th>
                <th className="py-3 pr-4 font-medium">Horse</th>
                <th className="py-3 pr-4 font-medium">Jockey</th>
                <th className="py-3 pr-4 font-medium">Trainer</th>
                <th className="py-3 pr-4 font-medium">M/L</th>
                <th className="py-3 pr-4 font-medium">Latest odds</th>
                <th className="py-3 pr-4 font-medium">Status</th>
                <th className="py-3 font-medium">Result status</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b last:border-b-0">
                  <td className="py-3 pr-4 font-medium">
                    {entry.programNumber ?? "-"}
                  </td>
                  <td className="py-3 pr-4">{entry.postPosition ?? "-"}</td>
                  <td className="py-3 pr-4 font-medium">
                    {entry.horse?.name ?? "Horse pending"}
                  </td>
                  <td className="py-3 pr-4">
                    {entry.jockey?.name ?? "Jockey pending"}
                  </td>
                  <td className="py-3 pr-4">
                    {entry.trainer?.name ?? "Trainer pending"}
                  </td>
                  <td className="py-3 pr-4">{entry.morningLineOdds ?? "-"}</td>
                  <td className="py-3 pr-4">
                    {entry.latestOdds?.oddsFractional ?? "No odds"}
                  </td>
                  <td className="py-3 pr-4">{titleCase(entry.status)}</td>
                  <td className="py-3">
                    <RaceEntryResultBadge entry={entry} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function RaceResultSection({
  results,
}: {
  results: RaceResults | null;
}) {
  if (!results) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Results pending</CardTitle>
          <CardDescription>
            Official result rows are not available for this race yet.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy aria-hidden="true" className="size-5 text-muted-foreground" />
              Results
            </CardTitle>
            <CardDescription>
              Version {results.resultVersion} from {results.source}
              {results.officialAt
                ? `, official ${formatRaceTime(results.officialAt)}`
                : ""}
            </CardDescription>
          </div>
          <RaceStatusBadge status={results.status} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {results.entries
            .filter((entry) => entry.finishPosition !== null)
            .slice(0, 4)
            .map((entry) => (
              <div
                key={entry.id}
                className={cn(
                  "rounded-md border p-3",
                  entry.finishPosition === 1 && "border-foreground",
                )}
              >
                <p className="text-xs uppercase tracking-normal text-muted-foreground">
                  Finish
                </p>
                <p className="mt-1 text-xl font-semibold">
                  {entry.finishPosition}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Beaten lengths: {entry.beatenLengths ?? 0}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Win/place/show: {entry.payoutWin ?? "-"} /{" "}
                  {entry.payoutPlace ?? "-"} / {entry.payoutShow ?? "-"}
                </p>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
