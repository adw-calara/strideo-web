import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getServerBootstrapEnv } from "@/lib/env/server";

export function createServiceRoleClient() {
  const env = getServerBootstrapEnv();

  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
