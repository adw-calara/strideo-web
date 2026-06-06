import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth-policy";
import { ShieldCheck } from "lucide-react";
import { Suspense } from "react";

async function UserDetails() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims || !isAllowedEmail(data.claims.email)) {
    redirect("/auth/login");
  }

  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-muted-foreground">Signed in as</dt>
        <dd className="font-medium">{data.claims.email}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Auth provider</dt>
        <dd className="font-medium">{data.claims.app_metadata?.provider}</dd>
      </div>
    </dl>
  );
}

export default function ProtectedPage() {
  return (
    <div className="flex-1 w-full flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <div className="bg-emerald-50 text-emerald-950 text-sm p-3 px-5 rounded-md flex gap-3 items-center border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-900">
          <ShieldCheck size="16" strokeWidth={2} />
          Protected by Supabase Auth and restricted to the approved Calara
          account.
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">Strideo</h1>
          <p className="mt-2 text-muted-foreground">
            Phase 0 foundation workspace.
          </p>
        </div>
      </div>

      <div className="rounded-md border p-5">
        <h2 className="text-base font-medium">Session</h2>
        <div className="mt-4">
          <Suspense fallback={<p className="text-sm">Loading session...</p>}>
            <UserDetails />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
