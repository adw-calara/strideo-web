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

const statusTone: Record<string, StatusTone> = {
  official: "default",
  resulted: "secondary",
  scheduled: "outline",
  open: "secondary",
  closed: "secondary",
  cancelled: "outline",
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
  return race.distanceText ?? (race.distanceYards ? `${race.distanceYards} yards` : "Distance pending");
}

export function RaceStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={statusTone[status] ?? "outline"}>{titleCase(status)}</Badge>
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
        <CardDescription>{message}</CardDescription>
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
          Protected race-card data from the canonical race, entry, odds, and
          result tables.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <RaceMetric label="Race dates" value={dateCount} />
        <RaceMetric label="Race cards" value={raceCount} />
        <RaceMetric label="Data scope" value="Race facts only" />
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
      <Button asChild variant="ghost" size="sm" className="w-fit px-0">
        <Link href="/protected/races">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to races
        </Link>
      </Button>
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

export function RaceEntriesTable({ entries }: { entries: RaceCardEntry[] }) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Entries</CardTitle>
          <CardDescription>No entries are available for this race.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entries</CardTitle>
        <CardDescription>
          Runners, connections, morning line, latest odds, and result position.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
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
                <th className="py-3 font-medium">Result</th>
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
                    {entry.result?.finishPosition
                      ? `${entry.result.finishPosition}`
                      : "Pending"}
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
          <CardTitle>Results</CardTitle>
          <CardDescription>
            Final result data is not available for this race yet.
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
              {results.officialAt ? `, official ${formatRaceTime(results.officialAt)}` : ""}
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
