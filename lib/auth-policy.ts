import { getOptionalServerEnv } from "@/lib/env/server";

export const DEFAULT_ALLOWED_EMAIL = "adw@calara.ai";

export function getAllowedEmails() {
  return (getOptionalServerEnv().STRIDEO_ALLOWED_EMAILS ?? DEFAULT_ALLOWED_EMAIL)
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedEmail(email?: string | null) {
  if (!email) {
    return false;
  }

  return getAllowedEmails().includes(email.toLowerCase());
}
