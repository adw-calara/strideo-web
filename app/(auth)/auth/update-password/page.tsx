import { UpdatePasswordForm } from "@/components/update-password-form";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

async function UpdatePasswordContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/forgot-password?reason=recovery-session-required");
  }

  return (
    <UpdatePasswordForm />
  );
}

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense
          fallback={
            <p className="text-sm text-muted-foreground">
              Checking your reset session.
            </p>
          }
        >
          <UpdatePasswordContent />
        </Suspense>
      </div>
    </div>
  );
}
