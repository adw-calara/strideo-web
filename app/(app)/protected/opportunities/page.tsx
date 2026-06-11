import {
  OpportunityFeedCard,
  OpportunityFeedEmptyState,
  OpportunityFeedHeader,
  OpportunityHiddenInternalsNotice,
} from "@/components/opportunities/opportunity-feed-display";
import { listOpportunityFeed } from "@/lib/opportunities/data-access";

export default async function OpportunitiesPage() {
  const result = await listOpportunityFeed();

  if (result.status === "empty") {
    return (
      <div className="flex flex-col gap-6">
        <OpportunityFeedHeader summary={result.summary} />
        <OpportunityHiddenInternalsNotice />
        <OpportunityFeedEmptyState message={result.message} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <OpportunityFeedHeader summary={result.summary} />
      <OpportunityHiddenInternalsNotice />
      <div className="grid gap-4 lg:grid-cols-2">
        {result.opportunities.map((opportunity) => (
          <OpportunityFeedCard
            key={opportunity.id}
            opportunity={opportunity}
          />
        ))}
      </div>
    </div>
  );
}
