import Link from "next/link";
import { createClient } from "@backend/lib/supabase/server";
import { importSharedCard } from "@backend/actions/cards";
import ImportCardForm from "@frontend/components/ImportCardForm";
import type { ShareableCard } from "@backend/types/database";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Public share page for a single shareable card.
 *
 * Fetches the card by its UUID — the "Public read by id" RLS policy on
 * `shareable_cards` allows any role (including anonymous visitors) to SELECT
 * a row when they know its ID. The UUID itself acts as the share secret.
 *
 * If the card is not found, a clean error message is displayed instead of a
 * full 404 page so the user understands what happened.
 *
 * The "Add to my Orbit" button:
 *   - Unauthenticated: links to /account?redirect=/share/[id] so the user can
 *     sign in and return.
 *   - Authenticated: submits a form whose action calls `importSharedCard`,
 *     which creates a new profile and redirects to /profile/[new_id].
 */
export default async function SharePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch the card. Public SELECT RLS policy allows anonymous reads.
  const { data: card } = await supabase
    .from("shareable_cards")
    .select("*")
    .eq("id", id)
    .single();

  if (!card) {
    return <CardNotFound />;
  }

  // Determine auth state to tailor the CTA.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const shareableCard = card as ShareableCard;

  // Bind the card ID so ImportCardForm receives (prevState, formData) → Promise<string>.
  const importAction = importSharedCard.bind(null, id);

  return (
    <main className="min-h-screen bg-[#FDFBF7] flex items-start justify-center p-6 pt-16">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center">
          <p className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-widest mb-1">
            Orbit
          </p>
          <h1 className="text-3xl font-bold text-[#1A3021]">{shareableCard.card_name}</h1>
          <p className="text-sm text-gray-400 mt-1">Shared profile card</p>
        </div>

        {/* Card details — only non-empty fields */}
        <div className="bg-white rounded-3xl shadow-sm p-6 space-y-4">
          <CardFields card={shareableCard} />
        </div>

        {/* Import CTA */}
        <div className="bg-white rounded-3xl shadow-sm p-6 space-y-3">
          <p className="text-xs text-gray-400">
            Save {shareableCard.card_name} to your personal Orbit dashboard to
            track notes and upcoming plans together.
          </p>

          {user ? (
            <ImportCardForm action={importAction} />
          ) : (
            <Link
              href={`/account?redirect=/share/${id}`}
              className="block w-full text-center bg-[var(--color-primary)] text-white font-semibold py-3 rounded-full text-sm hover:opacity-90 transition-opacity"
            >
              Sign in to Add to my Orbit
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

// ── Private helpers ────────────────────────────────────────────────────────────

/**
 * Shown when no shareable card matches the requested UUID — either the link
 * is wrong or the card was deleted by its owner.
 */
function CardNotFound() {
  return (
    <main className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6">
      <div className="text-center space-y-3">
        <p className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-widest">
          Orbit
        </p>
        <h1 className="text-2xl font-bold text-[#1A3021]">Card not found</h1>
        <p className="text-sm text-gray-400">
          This share link may have expired or been removed.
        </p>
        <Link
          href="/dashboard"
          className="inline-block mt-2 text-sm font-semibold text-[var(--color-primary)] hover:opacity-80 transition-opacity"
        >
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}

interface CardFieldsProps {
  card: ShareableCard;
}

/**
 * Renders only the non-empty fields from a shareable card.
 * Shows the preset fields first, followed by any user-defined custom fields.
 * Shows a fallback message if every optional field is blank.
 */
function CardFields({ card }: CardFieldsProps) {
  const presetFields: { label: string; value: string | null }[] = [
    { label: "Phone", value: card.phone },
    { label: "Email", value: card.email },
    { label: "Hobbies", value: card.hobbies },
    { label: "Fun Facts", value: card.fun_facts },
    { label: "Other", value: card.other_notes },
  ];

  const visiblePreset = presetFields.filter((f) => f.value);
  const visibleCustom = (card.custom_fields ?? []).filter(
    (f) => f.label.trim() && f.value.trim()
  );

  if (visiblePreset.length === 0 && visibleCustom.length === 0) {
    return (
      <p className="text-sm text-gray-400">No additional details on this card.</p>
    );
  }

  return (
    <dl className="space-y-3">
      {visiblePreset.map(({ label, value }) => (
        <div key={label}>
          <dt className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-wide">
            {label}
          </dt>
          <dd className="text-sm text-[#1A3021] mt-0.5 whitespace-pre-wrap">{value}</dd>
        </div>
      ))}
      {visibleCustom.map((field, i) => (
        <div key={i}>
          <dt className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-wide">
            {field.label}
          </dt>
          <dd className="text-sm text-[#1A3021] mt-0.5 whitespace-pre-wrap">{field.value}</dd>
        </div>
      ))}
    </dl>
  );
}
