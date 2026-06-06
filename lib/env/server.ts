import { hasPublicEnv } from "./public";

const serverEnvKeys = ["STRIDEO_ALLOWED_EMAILS"] as const;

type ServerEnvKey = (typeof serverEnvKeys)[number];
type ServerEnv = Record<ServerEnvKey, string>;

export function getServerEnv(): ServerEnv {
  const env = {
    STRIDEO_ALLOWED_EMAILS: process.env.STRIDEO_ALLOWED_EMAILS,
  };

  const missing = serverEnvKeys.filter((key) => !env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required server environment variables: ${missing.join(", ")}`,
    );
  }

  return env as ServerEnv;
}

export function getOptionalServerEnv() {
  return {
    STRIDEO_ALLOWED_EMAILS: process.env.STRIDEO_ALLOWED_EMAILS,
  };
}

export function isFoundationEnvReady() {
  return hasPublicEnv();
}
