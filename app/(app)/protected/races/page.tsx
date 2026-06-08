import {
  RaceEmptyState,
  RaceListGroupSection,
  RaceListHeader,
} from "@/components/races/race-display";
import { listRaceDates, listRaces } from "@/lib/races/data-access";

export default async function RacesPage() {
  const [dateResult, raceResult] = await Promise.all([
    listRaceDates(),
    listRaces(),
  ]);
  const raceCount = raceResult.groups.reduce(
    (count, group) => count + group.races.length,
    0,
  );

  if (raceResult.status === "empty") {
    return (
      <div className="flex flex-col gap-6">
        <RaceListHeader raceCount={0} dateCount={0} />
        <RaceEmptyState message={raceResult.message} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <RaceListHeader
        raceCount={raceCount}
        dateCount={dateResult.dates.length}
      />
      <div className="flex flex-col gap-8">
        {raceResult.groups.map((group) => (
          <RaceListGroupSection
            key={`${group.raceDate}:${group.track?.id ?? "unknown"}`}
            group={group}
          />
        ))}
      </div>
    </div>
  );
}
