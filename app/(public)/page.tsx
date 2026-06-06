import { FoundationShell } from "@/components/layout/foundation-shell";
import Link from "next/link";

export default function Home() {
  return (
    <FoundationShell>
      <div className="flex flex-1 items-center">
        <section className="flex max-w-2xl flex-col gap-6">
          <h1 className="text-4xl font-semibold tracking-normal">Strideo</h1>
          <p className="text-lg text-muted-foreground">
            Private Phase 0 workspace access is handled by Supabase Auth and
            limited to the approved Calara account.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/auth/login"
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Sign in
            </Link>
            <Link
              href="/auth/sign-up"
              className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium"
            >
              Create access
            </Link>
          </div>
        </section>
      </div>
    </FoundationShell>
  );
}
