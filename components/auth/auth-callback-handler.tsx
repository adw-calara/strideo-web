"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function AuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const completeAuth = async () => {
      const code = searchParams.get("code");
      const next = searchParams.get("next") ?? "/";

      if (!code) {
        router.replace("/auth/error?error=No auth code");
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        router.replace(
          `/auth/error?error=${encodeURIComponent(error.message)}`,
        );
        return;
      }

      router.replace(next);
      router.refresh();
    };

    void completeAuth();
  }, [router, searchParams]);

  return (
    <p className="text-sm text-muted-foreground">
      Completing your secure sign-in.
    </p>
  );
}
