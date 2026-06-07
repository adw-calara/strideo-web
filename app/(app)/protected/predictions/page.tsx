import { SectionPage } from "@/components/dashboard/section-page";

export default function PredictionsPage() {
  return (
    <SectionPage
      eyebrow="Predictions"
      title="Prediction Workspace"
      status="Scaffolded"
      description="A protected surface for rankings, model probabilities, confidence scores, and value calculations."
      items={[
        {
          title: "Model output",
          description:
            "Prediction runs will produce rankings and win probabilities for each race entry.",
        },
        {
          title: "Value comparison",
          description:
            "Market probability and model probability will combine into edge and value scores.",
        },
        {
          title: "Learning loop",
          description:
            "Future model performance views will connect prediction quality to verified outcomes.",
        },
      ]}
    />
  );
}
