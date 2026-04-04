"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, QrCode } from "lucide-react";
import { useDataStore } from "@frontend/lib/store/StoreProvider";
import { useStoreAction } from "@frontend/hooks/useStoreAction";
import PillInput from "@frontend/components/ui/PillInput";
import SubmitButton from "@frontend/components/ui/SubmitButton";
import FormError from "@frontend/components/ui/FormError";

type Mode = "manual" | "card";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Props {
  /** Names of existing profiles, used for duplicate-name detection in manual mode. */
  existingNames: string[];
  /** Called after a profile is successfully created in manual mode. */
  onSuccess?: () => void;
}

/**
 * Combined "add person" panel with a pill toggle between two modes:
 *
 * - **Person** — create a blank profile by typing a name (same as the old AddProfileForm).
 * - **Card ID** — paste a shareable card UUID to navigate to its preview page, where
 *   the user can confirm the import.
 *
 * The two modes share one card so the dashboard stays visually clean.
 */
export default function AddPersonPanel({ existingNames, onSuccess }: Props) {
  const [mode, setMode] = useState<Mode>("manual");

  return (
    <div className="bg-white rounded-3xl shadow-sm p-6 space-y-4">
      {/* Mode toggle — pill style matching the rest of the app */}
      <div className="flex bg-[var(--color-primary-light)] rounded-full p-1 gap-1">
        <ModeButton active={mode === "manual"} onClick={() => setMode("manual")}>
          <UserPlus size={13} className="shrink-0" />
          Add person
        </ModeButton>
        <ModeButton active={mode === "card"} onClick={() => setMode("card")}>
          <QrCode size={13} className="shrink-0" />
          Add by Card ID
        </ModeButton>
      </div>

      {mode === "manual" ? (
        <ManualForm existingNames={existingNames} onSuccess={onSuccess} />
      ) : (
        <CardIdForm />
      )}
    </div>
  );
}

// ── Private helpers ────────────────────────────────────────────────────────────

interface ModeButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

/** A single pill-toggle button used in AddPersonPanel's mode switcher. */
function ModeButton({ active, onClick, children }: ModeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-semibold transition-all ${
        active
          ? "bg-[var(--color-primary)] text-white shadow-sm"
          : "text-[#1A3021] hover:text-[var(--color-primary)]"
      }`}
    >
      {children}
    </button>
  );
}

interface ManualFormProps {
  existingNames: string[];
  onSuccess?: () => void;
}

/**
 * The "Add person" form — creates a blank profile by name.
 * Warns on duplicate names before proceeding.
 */
function ManualForm({ existingNames, onSuccess }: ManualFormProps) {
  const { store } = useDataStore();
  const { error, isPending, formRef, execute } = useStoreAction(
    (input: { full_name: string }) => store.createProfile(input),
    onSuccess
  );

  /** Reads the name field, checks for duplicates, and fires the store action. */
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const full_name = (
      (e.currentTarget.elements.namedItem("full_name") as HTMLInputElement).value
    ).trim();

    const isDuplicate = existingNames.some(
      (n) => n.trim().toLowerCase() === full_name.toLowerCase()
    );
    if (isDuplicate) {
      const confirmed = window.confirm(
        `You already have someone named "${full_name}". Is this a different person?`
      );
      if (!confirmed) return;
    }

    execute({ full_name });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
      <PillInput
        variant="white"
        name="full_name"
        type="text"
        placeholder="Full name"
        required
        disabled={isPending}
        className="w-full px-4 py-2.5"
      />
      <FormError error={error} />
      <SubmitButton
        isPending={isPending}
        label="Add person"
        pendingLabel="Adding…"
        className="bg-[var(--color-primary)] text-white rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
      />
    </form>
  );
}

/**
 * The "Add by Card ID" form — takes a UUID, validates it, and navigates to
 * the share preview page so the user sees the card before confirming.
 */
function CardIdForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  /** Validates the UUID and navigates to /share/[id]. */
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const cardId = (
      (e.currentTarget.elements.namedItem("cardId") as HTMLInputElement).value
    ).trim();

    if (!UUID_REGEX.test(cardId)) {
      setError("Please enter a valid card ID (the full UUID from a share link).");
      return;
    }

    setIsPending(true);
    router.push(`/share/${cardId}`);
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
      <PillInput
        variant="white"
        name="cardId"
        type="text"
        placeholder="Paste card ID…"
        required
        disabled={isPending}
        className="w-full px-4 py-2.5 font-mono text-xs"
      />
      <p className="text-xs text-gray-400">
        Get the card ID from someone&apos;s share link or QR code.
      </p>
      <FormError error={error} />
      <SubmitButton
        isPending={isPending}
        label="Preview card"
        pendingLabel="Opening…"
        className="bg-[var(--color-primary)] text-white rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
      />
    </form>
  );
}
