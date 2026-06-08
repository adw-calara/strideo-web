import { notFound } from "next/navigation";

import {
  RaceDetailHeader,
  RaceEntriesTable,
  RaceResultSection,
} from "@/components/races/race-display";
import { getRaceCard } from "@/lib/races/data-access";

export default async function RaceDetailPage({
  params,
}: {
  params: Promise<{ raceId: string }>;
}) {
  const { raceId } = await params;
  const result = await getRaceCard(raceId);

  if (result.status === "empty" || !result.raceCard) {
    notFound();
  }

  const { race, entries, results } = result.raceCard;

  return (
    <div className="flex flex-col gap-6">
      <RaceDetailHeader race={race} />
      <RaceEntriesTable entries={entries} />
      <RaceResultSection results={results} />
    </div>
  );
}
