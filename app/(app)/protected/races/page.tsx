import { SectionPage } from "@/components/dashboard/section-page";

export default function RacesPage() {
  return (
    <SectionPage
      eyebrow="Races"
      title="Race Intelligence"
      status="Scaffolded"
      description="A protected workspace for today's cards, entries, odds, scratches, and results once provider ingestion is wired."
      items={[
        {
          title: "Today's races",
          description:
            "Upcoming cards will anchor the Opportunity feed and race analysis workflow.",
        },
        {
          title: "Entries and odds",
          description:
            "Entries, morning lines, live odds, and scratches will stay tied to immutable race data.",
        },
        {
          title: "Results",
          description:
            "Result versions and corrections remain append-only so performance can be verified over time.",
        },
      ]}
    />
  );
}
