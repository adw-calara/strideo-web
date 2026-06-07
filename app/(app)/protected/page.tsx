import { Activity, Clock, ShieldCheck, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const statusCards = [
  {
    title: "Opportunity Feed",
    value: "Ready for data",
    description: "Central surface for races, strategy matches, and wagers.",
    icon: Target,
  },
  {
    title: "Auth Shell",
    value: "Protected",
    description: "Supabase SSR cookies protect the app workspace.",
    icon: ShieldCheck,
  },
  {
    title: "Today",
    value: "Awaiting imports",
    description: "Race cards and odds will appear after data ingestion.",
    icon: Clock,
  },
  {
    title: "Performance",
    value: "No workload yet",
    description: "ROI and hit-rate tracking will activate with wager results.",
    icon: Activity,
  },
] as const;

export default function ProtectedPage() {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-medium uppercase tracking-normal text-muted-foreground">
            Dashboard
          </p>
          <Badge>Authenticated</Badge>
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">
            Find the Edge. Improve Every Race.
          </h1>
          <p className="mt-2 text-muted-foreground">
            The Phase 2A shell is ready for database-backed Strideo workflows:
            opportunities, races, predictions, strategies, imports, and
            settings.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statusCards.map((card) => {
          const Icon = card.icon;

          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
                <CardTitle className="text-base">{card.title}</CardTitle>
                <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold">{card.value}</p>
                <CardDescription className="mt-2">
                  {card.description}
                </CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Next product surfaces</CardTitle>
            <CardDescription>
              These sections are scaffolded so database-backed workflows can be
              added without changing the authenticated shell.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <p>Races: today&apos;s cards, entries, odds, and results.</p>
            <p>Predictions: rankings, probability, confidence, and edge.</p>
            <p>Strategies: strategy definitions, matches, and opportunities.</p>
            <p>Data Imports: provider ingestion and validation status.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Access posture</CardTitle>
            <CardDescription>
              Role-aware UI remains deferred until product table grants and
              policy tests are explicitly approved.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            The shell uses Supabase Auth only. No RLS access was broadened.
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
