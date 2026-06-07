import { SectionPage } from "@/components/dashboard/section-page";

export default function DataImportsPage() {
  return (
    <SectionPage
      eyebrow="Data Imports"
      title="Provider Data Imports"
      status="Deferred"
      description="A protected operational view for ingestion batches, provider files, validation status, and job runs."
      items={[
        {
          title: "Provider files",
          description:
            "Raw archive objects and source files will document exactly what data entered Strideo.",
        },
        {
          title: "Ingestion batches",
          description:
            "Batch status and validation output will make data quality visible before recommendations are generated.",
        },
        {
          title: "Job history",
          description:
            "Import and model jobs will preserve execution history instead of overwriting operational state.",
        },
      ]}
    />
  );
}
