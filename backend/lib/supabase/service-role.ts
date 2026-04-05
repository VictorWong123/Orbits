import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@backend/lib/supabase/config";

/**
 * Supabase client with the service role key. Server-only — never import from Client Components.
 * Used for cron jobs that must read across users (e.g. event email reminders).
 */
export function createServiceRoleClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createClient(SUPABASE_URL, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
