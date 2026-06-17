import type { AuthProfileContext } from "@/lib/auth/profile-context";

export function canAccessDataImports(profile: AuthProfileContext | null) {
  return Boolean(profile?.isInternal || profile?.isAdmin);
}
