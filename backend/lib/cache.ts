import { revalidatePath } from "next/cache";

const DASHBOARD_PATH = "/dashboard";
const PROFILE_BASE_PATH = "/profile";

/**
 * Invalidates the Next.js cache for a specific profile page so server
 * components re-fetch their data on the next request.
 *
 * @param profileId - The UUID of the profile whose page should be revalidated.
 */
export function invalidateProfileCache(profileId: string): void {
  revalidatePath(`${PROFILE_BASE_PATH}/${profileId}`);
}

/**
 * Invalidates the Next.js cache for the dashboard page so the profile list
 * reflects the latest state on the next request.
 */
export function invalidateDashboardCache(): void {
  revalidatePath(DASHBOARD_PATH);
}
