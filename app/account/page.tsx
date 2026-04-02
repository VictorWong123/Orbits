"use client";

import { useDataStore } from "@frontend/lib/store/StoreProvider";
import AccountForm from "@frontend/components/AccountForm";
import AccountManagement from "@frontend/components/AccountManagement";

/**
 * Optional account page — not required to use the app.
 *
 * Unauthenticated users see the sign-in / sign-up form.
 * Authenticated users see an account management view (email, settings, sign out).
 * Renders nothing while the session is being resolved to avoid a flash.
 */
export default function AccountPage() {
  const { userEmail } = useDataStore();

  if (userEmail === undefined) return null;

  return userEmail ? <AccountManagement /> : <AccountForm />;
}
