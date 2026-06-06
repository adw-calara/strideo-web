const publicEnvKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
] as const;

type PublicEnvKey = (typeof publicEnvKeys)[number];
type PublicEnv = Record<PublicEnvKey, string>;

export function getPublicEnv(): PublicEnv {
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };

  const missing = publicEnvKeys.filter((key) => !env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required public environment variables: ${missing.join(", ")}`,
    );
  }

  return env as PublicEnv;
}

export function hasPublicEnv() {
  return publicEnvKeys.every((key) => Boolean(process.env[key]));
}
