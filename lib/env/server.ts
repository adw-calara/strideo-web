import "server-only";

import { hasPublicEnv } from "./public";

const serverEnvKeys = ["STRIDEO_ALLOWED_EMAILS"] as const;
const serverBootstrapEnvKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

type ServerEnvKey = (typeof serverEnvKeys)[number];
type ServerBootstrapEnvKey = (typeof serverBootstrapEnvKeys)[number];

type ServerEnv = Record<ServerEnvKey, string>;
export type ServerBootstrapEnv = Record<ServerBootstrapEnvKey, string>;

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

export function hasServerBootstrapEnv() {
  return serverBootstrapEnvKeys.every((key) => Boolean(process.env[key]));
}

export function getServerBootstrapEnv(): ServerBootstrapEnv {
  const missingKey = serverBootstrapEnvKeys.find((key) => !process.env[key]);

  if (missingKey) {
    throw new Error(`Missing required server environment variable: ${missingKey}`);
  }

  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  };
}
