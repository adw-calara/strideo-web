import {
  OpportunityHiddenInternalsNotice,
  TrackedOpportunitiesHeader,
  TrackedOpportunityCard,
  TrackedOpportunityEmptyState,
} from "@/components/opportunities/opportunity-feed-display";
import { listTrackedOpportunityFeed } from "@/lib/opportunities/data-access";

export default async function TrackedOpportunitiesPage() {
  const result = await listTrackedOpportunityFeed();

  if (result.status === "empty") {
    return (
      <div className="flex flex-col gap-6">
        <TrackedOpportunitiesHeader summary={result.summary} />
        <OpportunityHiddenInternalsNotice />
        <TrackedOpportunityEmptyState message={result.message} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <TrackedOpportunitiesHeader summary={result.summary} />
      <OpportunityHiddenInternalsNotice />
      <div className="grid gap-4 lg:grid-cols-2">
        {result.opportunities.map((opportunity) => (
          <TrackedOpportunityCard
            key={`${opportunity.id}:${opportunity.raceDate}`}
            opportunity={opportunity}
          />
        ))}
      </div>
    </div>
  );
}
