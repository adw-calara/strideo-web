import "server-only";

import { hasPublicEnv } from "./public";

const serverBootstrapEnvKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

type ServerBootstrapEnvKey = (typeof serverBootstrapEnvKeys)[number];

export type ServerBootstrapEnv = Record<ServerBootstrapEnvKey, string>;

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
