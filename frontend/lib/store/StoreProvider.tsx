"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@frontend/lib/supabase/client";
import { LocalDataStore } from "./LocalDataStore";
import { SupabaseDataStore } from "./SupabaseDataStore";
import MigrationModal from "@frontend/components/ui/MigrationModal";
import type { DataStore } from "./types";

// ── Context shape ─────────────────────────────────────────────────────────────

interface StoreContextValue {
  /** The active DataStore instance (local or Supabase depending on auth). */
  store: DataStore;
  /** True when the user has an authenticated Supabase session. */
  isAuthenticated: boolean;
  /**
   * The authenticated user's email, null when not signed in, or undefined
   * while the initial session check is still in-flight. Components should
   * render nothing (or a skeleton) while this is undefined to avoid a flash
   * of wrong content.
   */
  userEmail: string | null | undefined;
  /**
   * The authenticated user's Supabase UUID (their Orbit ID), null when not
   * signed in, or undefined while the initial session check is in-flight.
   */
  userId: string | null | undefined;
  /** Public URL of the user's uploaded avatar image, or null when not set. */
  avatarUrl: string | null;
  /** Refreshes the avatarUrl from the store (call after upload/delete). */
  refreshAvatar: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

/**
 * Returns the current StoreContext value.
 * Must be called inside a component rendered under StoreProvider.
 */
export function useDataStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useDataStore must be called inside <StoreProvider>");
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────

interface Props {
  children: ReactNode;
}

/**
 * Provides the active DataStore and authenticated user info to the entire app.
 *
 * On mount it checks the existing Supabase session and subscribes to auth
 * state changes so the correct store instance is used at all times:
 * - Unauthenticated → LocalDataStore (localStorage)
 * - Authenticated   → SupabaseDataStore (Supabase browser client)
 *
 * When the user signs in after having local data, a MigrationModal is shown
 * offering to sync their local records into Supabase.
 */
export function StoreProvider({ children }: Props) {
  const [userEmail, setUserEmail] = useState<string | null | undefined>(undefined);
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [migrationPending, setMigrationPending] = useState(false);
  const [localProfileCount, setLocalProfileCount] = useState(0);

  // Keep a stable reference to the Supabase client — never re-create it.
  const supabase = useRef(createClient()).current;

  // Track previous userEmail to detect the null→string transition (sign-in).
  const prevUserEmail = useRef<string | null | undefined>(undefined);

  const pathname = usePathname();

  // Re-check the session on every navigation so that server-side auth changes
  // (e.g. signIn via Server Action → redirect) are picked up by the client.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user?.email ?? null);
      setUserId(data.session?.user?.id ?? null);
    });
  }, [supabase, pathname]);

  // Subscribe once to client-side auth state changes (signOut, token refresh).
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
      setUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Detect the null → string transition (user just signed in from not-authenticated).
  useEffect(() => {
    if (prevUserEmail.current === null && typeof userEmail === "string") {
      try {
        const localProfiles: unknown[] = JSON.parse(
          localStorage.getItem("orbits:profiles") ?? "[]"
        );
        if (localProfiles.length > 0) {
          setLocalProfileCount(localProfiles.length);
          setMigrationPending(true);
        }
      } catch {
        // Malformed JSON in localStorage — skip migration offer.
      }
    }
    prevUserEmail.current = userEmail;
  }, [userEmail]);

  const isAuthenticated = typeof userEmail === "string";

  const store = useMemo<DataStore>(
    () => (isAuthenticated ? new SupabaseDataStore() : new LocalDataStore()),
    [isAuthenticated]
  );

  /** Fetches the user's avatar URL from their profile and updates state. */
  const refreshAvatar = useCallback(() => {
    store.getMyProfile().then((profile) => {
      setAvatarUrl(profile?.avatar_url ?? null);
    });
  }, [store]);

  useEffect(() => {
    if (!isAuthenticated) {
      setAvatarUrl(null);
      return;
    }
    refreshAvatar();
  }, [isAuthenticated, refreshAvatar]);

  return (
    <StoreContext.Provider value={{ store, isAuthenticated, userEmail, userId, avatarUrl, refreshAvatar }}>
      {children}
      {migrationPending && (
        <MigrationModal
          profileCount={localProfileCount}
          onConfirm={() => setMigrationPending(false)}
          onSkip={() => setMigrationPending(false)}
        />
      )}
    </StoreContext.Provider>
  );
}
