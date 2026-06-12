import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { EnvVarWarning } from "@/components/env-var-warning";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadCurrentProfileContext } from "@/lib/auth/profile-context";
import { isFoundationEnvReady } from "@/lib/env/server";
import { createClient } from "@/lib/supabase/server";

function AuthGateFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Loading Strideo</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Checking your authenticated workspace session...
        </CardContent>
      </Card>
    </main>
  );
}

async function AuthenticatedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isFoundationEnvReady()) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Configuration required</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
            <p>
              The protected Strideo app shell needs Supabase browser/SSR
              environment variables before authenticated routes can load.
            </p>
            <EnvVarWarning />
          </CardContent>
        </Card>
      </main>
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const email = data?.claims?.email;

  if (error || !email) {
    redirect("/auth/login");
  }

  const profile = await loadCurrentProfileContext();

  if (!profile) {
    redirect("/auth/login");
  }

  return <AppShell profile={profile}>{children}</AppShell>;
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<AuthGateFallback />}>
      <AuthenticatedAppLayout>{children}</AuthenticatedAppLayout>
    </Suspense>
  );
}
