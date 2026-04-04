"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useDataStore } from "@frontend/lib/store/StoreProvider";
import FormError from "@frontend/components/ui/FormError";
import type { UpdateMyProfileInput } from "@frontend/lib/store/types";

/**
 * Form for editing the current user's own optional bio/profile info.
 *
 * Loads the existing profile on mount. All fields are optional. Saves via
 * `store.updateMyProfile()`. Shows a brief "Saved" confirmation on success.
 */
export default function UserProfileForm() {
  const { store, isAuthenticated } = useDataStore();

  const [displayName, setDisplayName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [hobbies, setHobbies] = useState("");
  const [bio, setBio] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Populates fields from the store on mount and when auth changes. */
  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    const profile = await store.getMyProfile();
    setDisplayName(profile?.display_name ?? "");
    setBirthday(profile?.birthday ?? "");
    setHobbies(profile?.hobbies ?? "");
    setBio(profile?.bio ?? "");
    setIsLoading(false);
  }, [store]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  /** Clears the "Saved" flash timer when the component unmounts. */
  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  /**
   * Submits the profile form. Calls the store mutation and, on success,
   * briefly shows a "Saved" confirmation in place of the submit button text.
   */
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const input: UpdateMyProfileInput = {
      display_name: displayName,
      birthday,
      hobbies,
      bio,
    };

    startTransition(async () => {
      const result = await store.updateMyProfile(input);
      if (result) {
        setError(result);
      } else {
        setSaved(true);
        savedTimerRef.current = setTimeout(() => setSaved(false), 2500);
      }
    });
  }

  if (!isAuthenticated) return null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field
        label="Display Name"
        hint="Shown to friends instead of your email"
        id="display_name"
        type="text"
        maxLength={100}
        placeholder="e.g. Alex"
        value={displayName}
        onChange={setDisplayName}
        disabled={isLoading || isPending}
      />
      <Field
        label="Birthday"
        id="birthday"
        type="date"
        placeholder=""
        value={birthday}
        onChange={setBirthday}
        disabled={isLoading || isPending}
      />
      <Field
        label="Hobbies"
        hint="What you're into"
        id="hobbies"
        type="text"
        maxLength={500}
        placeholder="e.g. hiking, reading, cooking"
        value={hobbies}
        onChange={setHobbies}
        disabled={isLoading || isPending}
      />

      <div className="space-y-1">
        <label
          htmlFor="bio"
          className="block text-xs font-semibold text-[var(--color-accent)] uppercase tracking-wide"
        >
          Bio
        </label>
        <textarea
          id="bio"
          name="bio"
          maxLength={1000}
          rows={3}
          placeholder="A short description about yourself…"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          disabled={isLoading || isPending}
          className="w-full bg-[var(--color-primary-light)] rounded-2xl px-4 py-2.5 text-sm text-[#1A3021] placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
        />
      </div>

      {error && <FormError error={error} />}

      <button
        type="submit"
        disabled={isLoading || isPending}
        className="w-full bg-[var(--color-primary)] text-white font-semibold py-2.5 rounded-full text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {isPending ? "Saving…" : saved ? "Saved!" : "Save Profile"}
      </button>
    </form>
  );
}

// ── Private helpers ────────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  hint?: string;
  id: string;
  type: string;
  placeholder: string;
  value: string;
  maxLength?: number;
  onChange: (value: string) => void;
  disabled: boolean;
}

/**
 * A labelled text input row used inside UserProfileForm.
 * Extracted to reduce repetition in the form JSX.
 */
function Field({ label, hint, id, type, placeholder, value, maxLength, onChange, disabled }: FieldProps) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="block text-xs font-semibold text-[var(--color-accent)] uppercase tracking-wide"
      >
        {label}
      </label>
      {hint && (
        <p className="text-xs text-gray-400">{hint}</p>
      )}
      <input
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full bg-[var(--color-primary-light)] rounded-full px-4 py-2.5 text-sm text-[#1A3021] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
      />
    </div>
  );
}
