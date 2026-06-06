import { AuthButton } from "@/components/auth-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { isFoundationEnvReady } from "@/lib/env/server";
import Link from "next/link";
import { Suspense } from "react";

export function FoundationNav({ href = "/" }: { href?: string }) {
  return (
    <nav className="flex h-16 w-full justify-center border-b border-border">
      <div className="flex w-full max-w-5xl items-center justify-between px-5 py-3 text-sm">
        <Link href={href} className="font-semibold tracking-normal">
          Strideo
        </Link>
        {!isFoundationEnvReady() ? (
          <EnvVarWarning />
        ) : (
          <Suspense fallback={null}>
            <AuthButton />
          </Suspense>
        )}
      </div>
    </nav>
  );
}
