import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { canAccessDataImports } from "@/lib/auth/access-control";
import type { AuthProfileContext, ProfileRole } from "@/lib/auth/profile-context";

function buildProfile(role: ProfileRole): AuthProfileContext {
  return {
    userId: `${role}-user`,
    email: `${role}@example.com`,
    provider: "email",
    displayName: null,
    profileEmail: `${role}@example.com`,
    profileStatus: "active",
    defaultPlan: "free",
    roles: [role],
    primaryRole: role,
    accessLabel: role,
    isInternal: role === "operator" || role === "admin",
    isAdmin: role === "admin",
    loadStatus: "loaded",
    loadMessage: "test profile",
  };
}

describe("data imports access control", () => {
  it("allows operator and admin profiles", () => {
    assert.equal(canAccessDataImports(buildProfile("operator")), true);
    assert.equal(canAccessDataImports(buildProfile("admin")), true);
  });

  it("denies standard or unavailable profiles", () => {
    assert.equal(canAccessDataImports(buildProfile("user")), false);
    assert.equal(canAccessDataImports(null), false);
  });
});
