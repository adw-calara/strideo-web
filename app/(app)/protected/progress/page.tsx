import { ProgressDashboard } from "@/components/progress/progress-dashboard";
import { loadProgressDashboard } from "@/lib/progress/data-access";

export default async function ProgressPage() {
  const data = await loadProgressDashboard();

  return <ProgressDashboard data={data} />;
}
