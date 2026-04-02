import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@backend/lib/supabase/config";

/**
 * Creates a Supabase client configured for use in Client Components.
 * Uses the public anon key — safe to expose in the browser.
 */
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
