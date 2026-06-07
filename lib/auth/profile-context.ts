import { createClient } from "@/lib/supabase/server";
import { ensureCurrentUserProfileBootstrap } from "./profile-bootstrap";

export type ProfileRole = "user" | "operator" | "admin";
export type ProfileLoadStatus = "loaded" | "missing" | "unavailable";

export type AuthProfileContext = {
  userId: string;
  email: string;
  provider: string | null;
  displayName: string | null;
  profileEmail: string | null;
  profileStatus: "active" | "disabled" | "deleted" | null;
  defaultPlan: "free" | "pro" | "elite" | null;
  roles: ProfileRole[];
  primaryRole: ProfileRole;
  accessLabel: string;
  isInternal: boolean;
  isAdmin: boolean;
  loadStatus: ProfileLoadStatus;
  loadMessage: string;
};

type AuthClaims = {
  sub?: string;
  email?: string | null;
  app_metadata?: {
    provider?: string | null;
  };
};

type ProfileRow = {
  display_name: string | null;
  email: string | null;
  status: "active" | "disabled" | "deleted";
  default_plan: "free" | "pro" | "elite";
};

type RoleRow = {
  role: ProfileRole;
};

type ProfileReadResult = Awaited<ReturnType<typeof readProfileRows>>;

const rolePriority: Record<ProfileRole, number> = {
  user: 0,
  operator: 1,
  admin: 2,
};

function getPrimaryRole(roles: ProfileRole[]): ProfileRole {
  return roles.reduce<ProfileRole>((primary, role) => {
    return rolePriority[role] > rolePriority[primary] ? role : primary;
  }, "user");
}

function getAccessLabel(role: ProfileRole, plan: AuthProfileContext["defaultPlan"]) {
  if (role === "admin") {
    return "Admin";
  }

  if (role === "operator") {
    return "Operator";
  }

  if (plan === "elite") {
    return "Elite";
  }

  if (plan === "pro") {
    return "Pro";
  }

  return "User";
}

async function readProfileRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  return Promise.all([
    supabase
      .from("profiles")
      .select("display_name,email,status,default_plan")
      .eq("user_id", userId)
      .maybeSingle<ProfileRow>(),
    supabase
      .from("profile_roles")
      .select("role")
      .eq("user_id", userId)
      .returns<RoleRow[]>(),
  ]);
}

function hasReadError([profileResult, rolesResult]: ProfileReadResult) {
  return Boolean(profileResult.error || rolesResult.error);
}

function getRoles([, rolesResult]: ProfileReadResult) {
  return rolesResult.data?.map((row) => row.role) ?? [];
}

function needsProfileBootstrap(profileReadResult: ProfileReadResult) {
  const [profileResult] = profileReadResult;
  const roles = getRoles(profileReadResult);

  return !profileResult.data || !roles.includes("user");
}

export async function loadCurrentProfileContext(): Promise<AuthProfileContext | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims as AuthClaims | undefined;

  if (error || !claims?.sub || !claims.email) {
    return null;
  }

  const baseContext = {
    userId: claims.sub,
    email: claims.email,
    provider: claims.app_metadata?.provider ?? null,
    displayName: null,
    profileEmail: null,
    profileStatus: null,
    defaultPlan: null,
    roles: [] as ProfileRole[],
    primaryRole: "user" as ProfileRole,
    accessLabel: "User",
    isInternal: false,
    isAdmin: false,
  };

  let profileReadResult = await readProfileRows(supabase, claims.sub);
  let bootstrapMessage: string | null = null;

  if (!hasReadError(profileReadResult) && needsProfileBootstrap(profileReadResult)) {
    const bootstrapResult = await ensureCurrentUserProfileBootstrap();
    bootstrapMessage = bootstrapResult.message;

    if (bootstrapResult.status === "ensured") {
      profileReadResult = await readProfileRows(supabase, claims.sub);
    } else {
      return {
        ...baseContext,
        loadStatus: "unavailable",
        loadMessage: bootstrapMessage,
      };
    }
  }

  if (hasReadError(profileReadResult)) {
    return {
      ...baseContext,
      loadStatus: "unavailable",
      loadMessage:
        "Profile and role tables are present, but the current session cannot read them yet.",
    };
  }

  const [profileResult] = profileReadResult;
  const roles = getRoles(profileReadResult);
  const primaryRole = getPrimaryRole(roles);
  const defaultPlan = profileResult.data?.default_plan ?? null;
  const accessLabel = getAccessLabel(primaryRole, defaultPlan);

  return {
    ...baseContext,
    displayName: profileResult.data?.display_name ?? null,
    profileEmail: profileResult.data?.email ?? null,
    profileStatus: profileResult.data?.status ?? null,
    defaultPlan,
    roles,
    primaryRole,
    accessLabel,
    isInternal: primaryRole === "operator" || primaryRole === "admin",
    isAdmin: primaryRole === "admin",
    loadStatus: profileResult.data ? "loaded" : "missing",
    loadMessage: profileResult.data
      ? (bootstrapMessage ??
        "Profile and role data loaded through existing owner-scoped policies.")
      : (bootstrapMessage ??
        "No app profile exists yet. Bootstrap needs the server bootstrap path to complete."),
  };
}
