import { notFound } from "next/navigation";

import { OpportunityDetailDisplay } from "@/components/opportunities/opportunity-detail-display";
import { getOpportunityDetail } from "@/lib/opportunities/data-access";

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ opportunityId: string }>;
}) {
  const { opportunityId } = await params;
  const result = await getOpportunityDetail(opportunityId);

  if (result.status === "empty" || !result.opportunity) {
    notFound();
  }

  return <OpportunityDetailDisplay opportunity={result.opportunity} />;
}
