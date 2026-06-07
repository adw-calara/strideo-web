import { createClient } from "@/lib/supabase/server";

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

  const [profileResult, rolesResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name,email,status,default_plan")
      .eq("user_id", claims.sub)
      .maybeSingle<ProfileRow>(),
    supabase
      .from("profile_roles")
      .select("role")
      .eq("user_id", claims.sub)
      .returns<RoleRow[]>(),
  ]);

  const hasReadError = Boolean(profileResult.error || rolesResult.error);

  if (hasReadError) {
    return {
      ...baseContext,
      loadStatus: "unavailable",
      loadMessage:
        "Profile and role tables are present, but the current session cannot read them yet.",
    };
  }

  const roles = rolesResult.data?.map((row) => row.role) ?? [];
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
      ? "Profile and role data loaded through existing owner-scoped policies."
      : "No app profile exists yet. Bootstrap needs an approved insert path before the app can create one.",
  };
}
