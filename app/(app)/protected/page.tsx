import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ShieldCheck,
  Target,
  Trophy,
  UserRound,
} from "lucide-react";

import { loadCurrentProfileContext } from "@/lib/auth/profile-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    title: "Race Cards",
    value: "Available in Dev",
    description: "View seeded cards, entries, odds, and results.",
    icon: Trophy,
  },
  {
    title: "Performance",
    value: "No workload yet",
    description: "ROI and hit-rate tracking will activate with wager results.",
    icon: Activity,
  },
] as const;

function formatList(values: string[]) {
  return values.length > 0 ? values.join(", ") : "None assigned";
}

export default async function ProtectedPage() {
  const profile = await loadCurrentProfileContext();

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
            The protected shell now identifies the authenticated user and
            surfaces the first database-backed race-card workflow.
          </p>
        </div>
      </section>

      {profile ? (
        <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>Profile</CardTitle>
                  <CardDescription>
                    Loaded from Supabase Auth plus existing profile tables when
                    available.
                  </CardDescription>
                </div>
                <Badge
                  variant={
                    profile.loadStatus === "loaded" ? "default" : "outline"
                  }
                >
                  {profile.loadStatus}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium">{profile.email}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Display name</p>
                <p className="font-medium">
                  {profile.displayName ?? "Not set"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Access level</p>
                <p className="font-medium">{profile.accessLabel}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Roles</p>
                <p className="font-medium">{formatList(profile.roles)}</p>
              </div>
              <p className="sm:col-span-2 xl:col-span-4 text-muted-foreground">
                {profile.loadMessage}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <UserRound aria-hidden="true" className="size-5 text-muted-foreground" />
                <CardTitle>Role-aware workspace</CardTitle>
              </div>
              <CardDescription>
                Internal controls appear only when trusted roles are readable
                and assigned.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {profile.isInternal ? (
                <p>
                  Internal placeholders are enabled for {profile.primaryRole}
                  access.
                </p>
              ) : profile.loadStatus === "unavailable" ? (
                <p>
                  Role-aware internal placeholders are hidden until profile role
                  reads are available.
                </p>
              ) : (
                <p>
                  User workspace placeholders are active. Admin/internal
                  sections remain hidden.
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Profile unavailable</CardTitle>
            <CardDescription>
              The authenticated session could not be resolved for profile
              loading.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

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
                {card.title === "Race Cards" ? (
                  <Button asChild variant="outline" className="mt-4 w-full">
                    <Link href="/protected/races">
                      Open races
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </Link>
                  </Button>
                ) : null}
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
            <p>
              Races: protected cards, entries, odds, and results are available
              now.
            </p>
            <p>Predictions: rankings, probability, confidence, and edge.</p>
            <p>Strategies: strategy definitions, matches, and opportunities.</p>
            <p>Data Imports: provider ingestion and validation status.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Access posture</CardTitle>
            <CardDescription>
              Profile bootstrap runs through a server-only path when the
              protected shell loads a missing app profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Existing RLS was not broadened, and service-role credentials stay
            out of browser code.
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
