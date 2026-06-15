"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

const visibleOpportunitySelect = `
  id,
  race_date
`;

const watchlistItemSelect = `
  id,
  deleted_at
`;

function readRequiredFormValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.length === 0) {
    throw new Error("Opportunity tracking request is missing required context.");
  }

  return value;
}

function assertRaceDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Opportunity tracking request has invalid race context.");
  }
}

export async function trackOpportunityAction(formData: FormData) {
  const opportunityId = readRequiredFormValue(formData, "opportunityId");
  const raceDate = readRequiredFormValue(formData, "raceDate");

  assertRaceDate(raceDate);

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Sign in again before tracking this Opportunity.");
  }

  const { data: opportunity, error: opportunityError } = await supabase
    .from("opportunities")
    .select(visibleOpportunitySelect)
    .eq("id", opportunityId)
    .eq("race_date", raceDate)
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .in("state", ["published", "closed", "resulted", "verified"])
    .maybeSingle<{ id: string; race_date: string }>();

  if (opportunityError || !opportunity) {
    throw new Error("This Opportunity is not available for tracking.");
  }

  const { data: existingItem, error: existingError } = await supabase
    .from("watchlist_items")
    .select(watchlistItemSelect)
    .eq("opportunity_id", opportunity.id)
    .eq("opportunity_race_date", opportunity.race_date)
    .maybeSingle<{ id: string; deleted_at: string | null }>();

  if (existingError) {
    throw new Error("Opportunity tracking is temporarily unavailable.");
  }

  const clientMutationId = crypto.randomUUID();

  if (existingItem) {
    if (existingItem.deleted_at) {
      const { error: updateError } = await supabase
        .from("watchlist_items")
        .update({
          workflow_state: "watching",
          deleted_at: null,
          updated_at: new Date().toISOString(),
          client_mutation_id: clientMutationId,
        })
        .eq("id", existingItem.id);

      if (updateError) {
        throw new Error("Unable to track this Opportunity right now.");
      }
    }
  } else {
    const { error: insertError } = await supabase
      .from("watchlist_items")
      .insert({
        user_id: user.id,
        opportunity_id: opportunity.id,
        opportunity_race_date: opportunity.race_date,
        workflow_state: "watching",
        client_mutation_id: clientMutationId,
      });

    if (insertError) {
      throw new Error("Unable to track this Opportunity right now.");
    }
  }

  revalidatePath("/protected/opportunities");
  revalidatePath(`/protected/opportunities/${opportunity.id}`);
}
