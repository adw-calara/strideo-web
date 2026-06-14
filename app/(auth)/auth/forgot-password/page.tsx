import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { Suspense } from "react";

async function ForgotPasswordContent({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const params = await searchParams;

  return <ForgotPasswordForm reason={params.reason} />;
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense fallback={<ForgotPasswordForm />}>
          <ForgotPasswordContent searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
