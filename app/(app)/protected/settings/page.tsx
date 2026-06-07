import { SectionPage } from "@/components/dashboard/section-page";

export default function SettingsPage() {
  return (
    <SectionPage
      eyebrow="Settings"
      title="Workspace Settings"
      status="Ready"
      description="A protected settings surface for account, access, alert, and product configuration."
      items={[
        {
          title: "Account",
          description:
            "Password updates are available through the existing Supabase Auth reset flow.",
        },
        {
          title: "Alerts",
          description:
            "Alert preferences will connect Opportunity thresholds to notification history.",
        },
        {
          title: "Access",
          description:
            "Role-aware controls are deferred until the product access model is explicitly verified.",
        },
      ]}
    />
  );
}
