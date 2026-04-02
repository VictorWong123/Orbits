import { createClient } from "@backend/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

/** The shape returned by getAuthenticatedSupabase on success. */
interface AuthenticatedSupabase {
  /** A fully initialised Supabase server client tied to the current request. */
  supabase: Awaited<ReturnType<typeof createClient>>;
  /** The authenticated user object. */
  user: User;
}

/**
 * Creates a Supabase server client and verifies that the request belongs to
 * an authenticated user. Returns both the client and the user together so
 * callers avoid duplicating the auth check in every server action.
 *
 * Returns `null` when the user is not authenticated. Callers should handle
 * `null` by returning an appropriate error string to the client.
 *
 * @example
 *   const auth = await getAuthenticatedSupabase();
 *   if (!auth) return "Not authenticated";
 *   const { supabase, user } = auth;
 */
export async function getAuthenticatedSupabase(): Promise<AuthenticatedSupabase | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ? { supabase, user } : null;
}
