"use client";

import { Suspense } from "react";
import { useDataStore } from "@frontend/lib/store/StoreProvider";
import AccountForm from "@frontend/components/AccountForm";
import AccountManagement from "@frontend/components/AccountManagement";

/** Placeholder while `AccountForm` resolves search params (Next.js `useSearchParams` boundary). */
function AccountFormFallback() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#FDFBF7] p-6">
      <div
        className="w-full max-w-sm h-48 rounded-3xl bg-[var(--color-primary-light)] animate-pulse"
        aria-hidden
      />
    </main>
  );
}

/**
 * Optional account page — not required to use the app.
 *
 * Unauthenticated users see the sign-in / sign-up form.
 * Authenticated users see an account management view (email, settings, sign out).
 * Renders nothing while the session is being resolved to avoid a flash.
 */
export default function AccountPage() {
  const { userEmail } = useDataStore();

  // Show AccountManagement for authenticated users; AccountForm otherwise.
  // When undefined (session still resolving), default to AccountForm — the
  // middleware already redirects authenticated users away from this page, so
  // any unauthenticated user should see the form immediately.
  return userEmail ? (
    <AccountManagement />
  ) : (
    <Suspense fallback={<AccountFormFallback />}>
      <AccountForm />
    </Suspense>
  );
}
