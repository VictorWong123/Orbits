"use client";

import { useActionState, useState } from "react";
import { signIn, signUp } from "@backend/actions";

/** Login page — handles both sign-in and sign-up in a single form. */
export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signInError, signInAction] = useActionState(signIn, null);
  const [signUpError, signUpAction] = useActionState(signUp, null);

  const isSignIn = mode === "signin";
  const error = isSignIn ? signInError : signUpError;
  const action = isSignIn ? signInAction : signUpAction;

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#FDFBF7] p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[#1A3021]">Orbit</h1>
          <p className="text-sm text-[var(--color-accent)] mt-1">Your personal relationship manager</p>
        </div>

        {/* Sliding pill mode toggle */}
        <div className="relative flex bg-[var(--color-primary-light)] rounded-full p-1">
          <div
            className="absolute top-1 bottom-1 rounded-full bg-[var(--color-primary)] transition-all duration-200 ease-in-out"
            style={{
              width: "calc(50% - 4px)",
              left: isSignIn ? "4px" : "50%",
            }}
          />
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`relative z-10 flex-1 py-2 text-sm font-semibold rounded-full transition-colors ${
              isSignIn ? "text-white" : "text-[var(--color-primary)]"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`relative z-10 flex-1 py-2 text-sm font-semibold rounded-full transition-colors ${
              !isSignIn ? "text-white" : "text-[var(--color-primary)]"
            }`}
          >
            Sign Up
          </button>
        </div>

        <form key={mode} action={action} className="bg-white rounded-3xl shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--color-accent)] uppercase tracking-wide mb-2" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full bg-[var(--color-primary-light)] rounded-full px-4 py-2.5 text-sm text-[#1A3021] placeholder:text-[var(--color-accent)] border-0 outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--color-accent)] uppercase tracking-wide mb-2" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full bg-[var(--color-primary-light)] rounded-full px-4 py-2.5 text-sm text-[#1A3021] border-0 outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-2xl px-4 py-2.5">{error}</p>
          )}

          <button
            type="submit"
            className="w-full bg-[var(--color-primary)] text-white rounded-full py-2.5 text-sm font-bold hover:bg-[var(--color-primary-dark)] transition-colors"
          >
            {isSignIn ? "Sign In" : "Create Account"}
          </button>
        </form>
      </div>
    </main>
  );
}
