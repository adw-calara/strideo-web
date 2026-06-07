import { SectionPage } from "@/components/dashboard/section-page";
import { loadCurrentProfileContext } from "@/lib/auth/profile-context";

export default async function SettingsPage() {
  const profile = await loadCurrentProfileContext();

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
          description: profile?.isInternal
            ? "Internal access placeholders are visible for trusted operator/admin roles."
            : "User access is active. Internal controls stay hidden unless trusted roles are assigned.",
        },
        {
          title: "Profile bootstrap",
          description:
            "Profile creation is deferred until an approved insert policy or server bootstrap path exists.",
        },
      ]}
    />
  );
}
