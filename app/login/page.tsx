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
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-bold text-center">Orbit</h1>

        <div className="flex border rounded overflow-hidden">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`flex-1 py-2 text-sm font-medium ${isSignIn ? "bg-black text-white" : "bg-white text-black"}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 py-2 text-sm font-medium ${!isSignIn ? "bg-black text-white" : "bg-white text-black"}`}
          >
            Sign Up
          </button>
        </div>

        <form key={mode} action={action} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="password"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full bg-black text-white rounded py-2 text-sm font-medium"
          >
            {isSignIn ? "Sign In" : "Create Account"}
          </button>
        </form>
      </div>
    </main>
  );
}
