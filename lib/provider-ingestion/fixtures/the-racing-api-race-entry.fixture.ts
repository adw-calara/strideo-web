import type { TheRacingApiRaceEntryPayload } from "../provider-race-entry-adapter-core";

type FixtureOverrides = Partial<
  Omit<TheRacingApiRaceEntryPayload, "race" | "entry" | "horse" | "recent_workout">
> & {
  race?: Partial<TheRacingApiRaceEntryPayload["race"]>;
  entry?: Partial<TheRacingApiRaceEntryPayload["entry"]>;
  horse?: Partial<TheRacingApiRaceEntryPayload["horse"]>;
  recent_workout?:
    | Partial<NonNullable<TheRacingApiRaceEntryPayload["recent_workout"]>>
    | null;
};

export function makeTheRacingApiRaceEntryFixture(
  overrides: FixtureOverrides = {},
): TheRacingApiRaceEntryPayload {
  return {
    provider: "the_racing_api",
    race: {
      id: "tra-race-20260616-bel-7",
      date: "2026-06-16",
      type_code: "MSW",
      surface_code: "D",
      track_condition_code: "FT",
      ...overrides.race,
    },
    entry: {
      id: "tra-entry-20260616-bel-7-3",
      status_code: "RUN",
      medication_code: "L",
      ...overrides.entry,
    },
    horse: {
      id: "tra-horse-9001",
      sex_code: "g",
      color_code: "B",
      ...overrides.horse,
    },
    recent_workout:
      overrides.recent_workout === null
        ? null
        : {
            work_type_code: "B",
            ...overrides.recent_workout,
          },
    links: {
      source_url: "https://example.provider.local/races/tra-race-20260616-bel-7",
      ...overrides.links,
    },
  };
}
