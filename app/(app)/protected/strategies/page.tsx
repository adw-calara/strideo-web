import { SectionPage } from "@/components/dashboard/section-page";

export default function StrategiesPage() {
  return (
    <SectionPage
      eyebrow="Strategies"
      title="Strategy Workspace"
      status="Scaffolded"
      description="A protected surface for strategy definitions, strategy versions, matches, and resulting Opportunities."
      items={[
        {
          title: "Strategy catalog",
          description:
            "User-owned strategies and versions will stay measurable over time.",
        },
        {
          title: "Strategy matches",
          description:
            "Race and entry matches will connect strategy logic to concrete Opportunities.",
        },
        {
          title: "Wager construction",
          description:
            "Matched Opportunities will become recommended win, place, show, exacta, and trifecta structures.",
        },
      ]}
    />
  );
}
