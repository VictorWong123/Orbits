/**
 * Shared Supabase connection constants derived from Next.js environment
 * variables. Both constants are `NEXT_PUBLIC_` prefixed and therefore safe
 * to use in browser bundles as well as on the server.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
