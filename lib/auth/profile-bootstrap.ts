import "server-only";

import { hasServerBootstrapEnv } from "@/lib/env/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createClient as createUserClient } from "@/lib/supabase/server";

export type ProfileBootstrapStatus = "ensured" | "unavailable" | "error";

export type ProfileBootstrapResult = {
  status: ProfileBootstrapStatus;
  message: string;
};

type AuthClaims = {
  sub?: string;
  email?: string | null;
};

export async function ensureCurrentUserProfileBootstrap(): Promise<ProfileBootstrapResult> {
  const userClient = await createUserClient();
  const { data, error } = await userClient.auth.getClaims();
  const claims = data?.claims as AuthClaims | undefined;

  if (error || !claims?.sub || !claims.email) {
    return {
      status: "unavailable",
      message: "Profile bootstrap requires an authenticated server session.",
    };
  }

  if (!hasServerBootstrapEnv()) {
    return {
      status: "unavailable",
      message:
        "Profile bootstrap is configured, but server bootstrap environment variables are unavailable.",
    };
  }

  const adminClient = createServiceRoleClient();

  const { error: profileError } = await adminClient.from("profiles").upsert(
    {
      user_id: claims.sub,
      email: claims.email,
    },
    {
      ignoreDuplicates: true,
      onConflict: "user_id",
    },
  );

  if (profileError) {
    return {
      status: "error",
      message: "Profile bootstrap could not create the app profile.",
    };
  }

  const { error: roleError } = await adminClient.from("profile_roles").upsert(
    {
      user_id: claims.sub,
      role: "user",
    },
    {
      ignoreDuplicates: true,
      onConflict: "user_id,role",
    },
  );

  if (roleError) {
    return {
      status: "error",
      message: "Profile bootstrap could not assign the baseline user role.",
    };
  }

  return {
    status: "ensured",
    message:
      "Baseline profile and user role were ensured by the server bootstrap path.",
  };
}
