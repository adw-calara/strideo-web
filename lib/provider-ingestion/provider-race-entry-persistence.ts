import "server-only";

import type {
  RaceEntryFactRow,
  RaceEntryFactStore,
  RaceEntryPersistenceContext,
  RaceEntryPersistenceResult,
} from "./provider-race-entry-persistence-core";
import { executeRaceEntryWritePlan } from "./provider-race-entry-persistence-core";
import type { ProviderRaceEntryWritePlan } from "./provider-race-entry-adapter-core";

export type {
  RaceEntryFactRow,
  RaceEntryFactStore,
  RaceEntryPersistenceBindings,
  RaceEntryPersistenceContext,
  RaceEntryPersistenceResult,
} from "./provider-race-entry-persistence-core";

type SupabaseRaceEntryClient = {
  from: (table: "race_entries") => {
    upsert: (
      row: RaceEntryFactRow,
      options: { onConflict: "provider,provider_entry_id,race_date" },
    ) => {
      select: (columns: "id,race_date,provider_entry_id") => {
        single: () => Promise<{
          data: { id: string; race_date: string; provider_entry_id: string } | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
};

export function makeSupabaseRaceEntryFactStore(
  client: SupabaseRaceEntryClient,
): RaceEntryFactStore {
  return {
    async upsertRaceEntryFact(row, options) {
      const { data, error } = await client
        .from("race_entries")
        .upsert(row, { onConflict: options.onConflict })
        .select("id,race_date,provider_entry_id")
        .single();

      if (error) {
        throw new Error(`race_entries upsert failed: ${error.message}`);
      }

      if (!data) {
        throw new Error("race_entries upsert returned no row");
      }

      return data;
    },
  };
}

export async function executeProviderRaceEntryPersistence(
  plan: ProviderRaceEntryWritePlan | null,
  context: RaceEntryPersistenceContext,
): Promise<RaceEntryPersistenceResult> {
  return executeRaceEntryWritePlan(plan, context);
}
