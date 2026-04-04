"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Copy,
  Check,
  Plus,
  ChevronUp,
  QrCode,
  Pencil,
  X,
  ChevronDown,
  User,
  Trash2,
} from "lucide-react";
import QRCode from "react-qr-code";
import { useDataStore } from "@frontend/lib/store/StoreProvider";
import { useStoreAction } from "@frontend/hooks/useStoreAction";
import SubmitButton from "@frontend/components/ui/SubmitButton";
import FormError from "@frontend/components/ui/FormError";
import ConfirmDialog from "@frontend/components/ui/ConfirmDialog";
import type {
  ShareableCard,
  CreateShareableCardInput,
  CustomField,
  UserProfile,
} from "@frontend/lib/store/types";

/**
 * Account-page section that lets authenticated users create, manage, and share
 * personal profile cards.
 *
 * On mount, loads both the card list and the user's About Me profile so that
 * the create form can offer to pre-fill fields from the profile.
 */
export default function ShareableCardsManager() {
  const { store, isAuthenticated } = useDataStore();
  const [cards, setCards] = useState<ShareableCard[]>([]);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  /** Loads the card list and the user's About Me profile in parallel. */
  const loadData = useCallback(async () => {
    const [cardData, profile] = await Promise.all([
      store.getShareableCards(),
      store.getMyProfile(),
    ]);
    setCards(cardData);
    setMyProfile(profile);
  }, [store]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!isAuthenticated) return null;

  return (
    <div className="bg-white rounded-3xl shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-wide">
            My Shareable Cards
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Share a card ID so anyone can add you to their Orbit.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsFormOpen((v) => !v)}
          aria-label={isFormOpen ? "Cancel new card" : "Create new card"}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] hover:opacity-80 transition-opacity shrink-0"
        >
          {isFormOpen ? <ChevronUp size={14} /> : <Plus size={14} />}
        </button>
      </div>

      {/* Create card form */}
      {isFormOpen && (
        <CreateCardForm
          myProfile={myProfile}
          onSuccess={() => {
            setIsFormOpen(false);
            loadData();
          }}
          onCancel={() => setIsFormOpen(false)}
        />
      )}

      {/* Empty state */}
      {cards.length === 0 && !isFormOpen && (
        <p className="text-sm text-gray-400">No cards yet. Create one above.</p>
      )}

      {/* Card list */}
      {cards.length > 0 && (
        <ul className="space-y-3">
          {cards.map((card) => (
            <CardRow
              key={card.id}
              card={card}
              onUpdate={async (input) => {
                const err = await store.updateShareableCard(card.id, input);
                if (!err) loadData();
                return err;
              }}
              onDelete={async () => {
                const err = await store.deleteShareableCard(card.id);
                if (!err) loadData();
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

// ── CreateCardForm ─────────────────────────────────────────────────────────────

interface CreateCardFormProps {
  /** The user's About Me profile, used to offer pre-fill options. Null if not set. */
  myProfile: UserProfile | null;
  /** Called after the card is successfully created. */
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * Controlled create-card form with dynamic custom fields.
 *
 * Preset fields (name, phone, email, hobbies, fun facts, other) are always
 * shown. Users can also add an unlimited number of custom label+value pairs
 * (e.g. LinkedIn, Portfolio) via the "Add field" button.
 *
 * If the user has an About Me profile, a collapsible "Import from About Me"
 * section lets them selectively pre-fill preset fields from their profile.
 */
function CreateCardForm({ myProfile, onSuccess, onCancel }: CreateCardFormProps) {
  const { store } = useDataStore();

  // Preset field state
  const [cardName, setCardName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [hobbies, setHobbies] = useState("");
  const [funFacts, setFunFacts] = useState("");
  const [otherNotes, setOtherNotes] = useState("");

  // Dynamic custom fields: each entry is {label, value}
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  // Which About Me fields are currently imported
  const [importedFields, setImportedFields] = useState<Set<string>>(new Set());
  const [aboutMeOpen, setAboutMeOpen] = useState(false);

  const action = useCallback(
    (input: CreateShareableCardInput) => store.createShareableCard(input),
    [store]
  );

  const { error, isPending, execute } = useStoreAction(action, onSuccess);

  /**
   * Appends a new empty custom field row to the list.
   */
  function addCustomField() {
    setCustomFields((prev) => [...prev, { label: "", value: "" }]);
  }

  /**
   * Updates a single property on a custom field row by index.
   */
  function updateCustomField(index: number, key: keyof CustomField, val: string) {
    setCustomFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, [key]: val } : f))
    );
  }

  /**
   * Removes a custom field row by index.
   */
  function removeCustomField(index: number) {
    setCustomFields((prev) => prev.filter((_, i) => i !== index));
  }

  /**
   * Toggles an About Me field import.
   * Checking pre-fills the corresponding card field; unchecking clears it.
   */
  function toggleImport(field: string, checked: boolean) {
    setImportedFields((prev) => {
      const next = new Set(prev);
      if (checked) next.add(field);
      else next.delete(field);
      return next;
    });

    if (!myProfile) return;

    switch (field) {
      case "display_name":
        setCardName(checked ? (myProfile.display_name ?? "") : "");
        break;
      case "hobbies":
        setHobbies(checked ? (myProfile.hobbies ?? "") : "");
        break;
      case "bio":
      case "birthday": {
        // Both bio and birthday share other_notes — recompute from scratch
        const bioOn  = field === "bio"      ? checked : importedFields.has("bio");
        const bdayOn = field === "birthday" ? checked : importedFields.has("birthday");
        const parts: string[] = [];
        if (bdayOn && myProfile.birthday) parts.push(`Birthday: ${myProfile.birthday}`);
        if (bioOn  && myProfile.bio)      parts.push(myProfile.bio);
        setOtherNotes(parts.join("\n\n"));
        break;
      }
    }
  }

  /** Assembles the input from controlled state and fires the store action. */
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const validCustom = customFields.filter(
      (f) => f.label.trim() && f.value.trim()
    );
    execute({
      card_name:    cardName.trim(),
      phone:        phone.trim()      || undefined,
      email:        email.trim()      || undefined,
      hobbies:      hobbies.trim()    || undefined,
      fun_facts:    funFacts.trim()   || undefined,
      other_notes:  otherNotes.trim() || undefined,
      custom_fields: validCustom.length ? validCustom : undefined,
    });
  }

  // Determine which About Me fields have data to offer
  const aboutMeOptions: { field: string; label: string; preview: string }[] = [];
  if (myProfile) {
    if (myProfile.display_name) aboutMeOptions.push({ field: "display_name", label: "Display Name", preview: myProfile.display_name });
    if (myProfile.hobbies)      aboutMeOptions.push({ field: "hobbies",      label: "Hobbies",      preview: myProfile.hobbies });
    if (myProfile.bio)          aboutMeOptions.push({ field: "bio",          label: "Bio",          preview: myProfile.bio });
    if (myProfile.birthday)     aboutMeOptions.push({ field: "birthday",     label: "Birthday",     preview: myProfile.birthday });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border-t border-gray-100 pt-4">

      {/* About Me import — only shown when the user has profile data */}
      {aboutMeOptions.length > 0 && (
        <div className="bg-[var(--color-primary-light)] rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => setAboutMeOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-[var(--color-accent)] uppercase tracking-wide"
          >
            <span className="flex items-center gap-1.5">
              <User size={12} />
              Import from About Me
            </span>
            {aboutMeOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {aboutMeOpen && (
            <div className="border-t border-white/50 px-4 pb-3 pt-2 space-y-2">
              {aboutMeOptions.map(({ field, label, preview }) => (
                <label key={field} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importedFields.has(field)}
                    onChange={(e) => toggleImport(field, e.target.checked)}
                    disabled={isPending}
                    className="mt-0.5 accent-[var(--color-primary)] shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#1A3021]">{label}</p>
                    <p className="text-xs text-gray-400 truncate">{preview}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Preset fields */}
      <CardField label="Card Name" required disabled={isPending}>
        <input
          type="text"
          placeholder="e.g. Networking, Personal"
          required
          maxLength={100}
          disabled={isPending}
          value={cardName}
          onChange={(e) => setCardName(e.target.value)}
          className={inputCls}
        />
      </CardField>

      <CardField label="Phone" disabled={isPending}>
        <input
          type="tel"
          placeholder="e.g. +1 555 000 0000"
          maxLength={50}
          disabled={isPending}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={inputCls}
        />
      </CardField>

      <CardField label="Email" disabled={isPending}>
        <input
          type="email"
          placeholder="e.g. you@example.com"
          maxLength={254}
          disabled={isPending}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputCls}
        />
      </CardField>

      <CardField label="Hobbies" disabled={isPending}>
        <input
          type="text"
          placeholder="e.g. hiking, photography"
          maxLength={500}
          disabled={isPending}
          value={hobbies}
          onChange={(e) => setHobbies(e.target.value)}
          className={inputCls}
        />
      </CardField>

      <CardField label="Fun Facts" disabled={isPending}>
        <input
          type="text"
          placeholder="Something interesting about you"
          maxLength={1000}
          disabled={isPending}
          value={funFacts}
          onChange={(e) => setFunFacts(e.target.value)}
          className={inputCls}
        />
      </CardField>

      <CardField label="Other" disabled={isPending}>
        <textarea
          maxLength={2000}
          rows={3}
          placeholder="Anything else you want to share…"
          disabled={isPending}
          value={otherNotes}
          onChange={(e) => setOtherNotes(e.target.value)}
          className="w-full bg-[var(--color-primary-light)] rounded-2xl px-4 py-2.5 text-sm text-[#1A3021] placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
        />
      </CardField>

      {/* Custom (dynamic) fields */}
      {customFields.map((field, index) => (
        <CustomFieldRow
          key={index}
          field={field}
          index={index}
          disabled={isPending}
          background="light"
          onChange={(key, val) => updateCustomField(index, key, val)}
          onRemove={() => removeCustomField(index)}
        />
      ))}

      {/* Add field button */}
      <button
        type="button"
        onClick={addCustomField}
        disabled={isPending}
        className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)] hover:opacity-70 transition-opacity disabled:opacity-50"
      >
        <Plus size={12} />
        Add field
      </button>

      {error && <FormError error={error} />}

      <div className="flex gap-2">
        <SubmitButton
          isPending={isPending}
          label="Create Card"
          pendingLabel="Creating…"
          className="flex-1 bg-[var(--color-primary)] text-white font-semibold py-2.5 rounded-full text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        />
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="flex-1 bg-[var(--color-primary-light)] text-[#1A3021] font-semibold py-2.5 rounded-full text-sm hover:opacity-80 transition-opacity disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Shared field primitives ────────────────────────────────────────────────────

/** Tailwind class shared by all single-line inputs in create/edit forms. */
const inputCls =
  "w-full bg-[var(--color-primary-light)] rounded-full px-4 py-2.5 text-sm text-[#1A3021] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50";

interface CardFieldProps {
  label: string;
  required?: boolean;
  disabled: boolean;
  children: React.ReactNode;
}

/** Label wrapper used by every field in CreateCardForm and EditCardForm. */
function CardField({ label, required, children }: CardFieldProps) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-wide">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </p>
      {children}
    </div>
  );
}

interface CustomFieldRowProps {
  field: CustomField;
  index: number;
  disabled: boolean;
  /** "light" uses --color-primary-light bg; "white" uses white bg. */
  background: "light" | "white";
  onChange: (key: keyof CustomField, val: string) => void;
  onRemove: () => void;
}

/**
 * A single dynamic field row with a label input, a value input, and a remove button.
 * Used in both CreateCardForm and EditCardForm.
 */
function CustomFieldRow({ field, index, disabled, background, onChange, onRemove }: CustomFieldRowProps) {
  const bg = background === "light" ? "var(--color-primary-light)" : "#ffffff";
  const inputStyle = {
    backgroundColor: bg,
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-wide">
          Custom Field {index + 1}
        </p>
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label={`Remove custom field ${index + 1}`}
          className="text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
        >
          <Trash2 size={13} />
        </button>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Label (e.g. LinkedIn)"
          maxLength={50}
          disabled={disabled}
          value={field.label}
          onChange={(e) => onChange("label", e.target.value)}
          style={inputStyle}
          className="w-2/5 rounded-full px-3 py-2 text-sm text-[#1A3021] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
        />
        <input
          type="text"
          placeholder="Value"
          maxLength={500}
          disabled={disabled}
          value={field.value}
          onChange={(e) => onChange("value", e.target.value)}
          style={inputStyle}
          className="flex-1 rounded-full px-3 py-2 text-sm text-[#1A3021] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
        />
      </div>
    </div>
  );
}

// ── CardRow ────────────────────────────────────────────────────────────────────

interface CardRowProps {
  card: ShareableCard;
  onUpdate: (input: CreateShareableCardInput) => Promise<string | null>;
  onDelete: () => Promise<void>;
}

/**
 * A single card row with name, QR code toggle, copy ID, edit, and delete.
 * Edit and QR panels are mutually exclusive — opening one closes the other.
 * Deletion requires confirmation via a styled dialog before the action fires.
 */
function CardRow({ card, onUpdate, onDelete }: CardRowProps) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /** Returns the full share URL (used only for QR encoding). */
  function shareUrl(): string {
    return `${window.location.origin}/share/${card.id}`;
  }

  /** Copies the card UUID to the clipboard. */
  async function handleCopyId() {
    await navigator.clipboard.writeText(card.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  /** Runs the delete action after the user confirms in the dialog. */
  async function handleConfirmDelete() {
    setIsDeleting(true);
    await onDelete();
    setIsDeleting(false);
    setShowDeleteDialog(false);
  }

  function toggleEdit() {
    setIsEditing((v) => !v);
    if (!isEditing) setShowQr(false);
  }

  function toggleQr() {
    setShowQr((v) => !v);
    if (!showQr) setIsEditing(false);
  }

  return (
    <li className="bg-[var(--color-primary-light)] rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 p-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#1A3021] truncate">{card.card_name}</p>
          <p className="text-xs text-gray-400 mt-0.5 font-mono truncate">
            {card.id.slice(0, 8)}…
          </p>
        </div>

        <button
          type="button"
          onClick={toggleEdit}
          aria-label={isEditing ? "Cancel edit" : "Edit card"}
          className={`w-8 h-8 flex items-center justify-center rounded-full bg-white hover:opacity-80 transition-opacity shrink-0 ${
            isEditing ? "text-[var(--color-primary)]" : "text-gray-400"
          }`}
        >
          {isEditing ? <X size={14} /> : <Pencil size={14} />}
        </button>

        <button
          type="button"
          onClick={toggleQr}
          aria-label={showQr ? "Hide QR code" : "Show QR code"}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-[var(--color-primary)] hover:opacity-80 transition-opacity shrink-0"
        >
          <QrCode size={14} />
        </button>

        <button
          type="button"
          onClick={handleCopyId}
          aria-label="Copy card ID"
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-[var(--color-primary)] hover:opacity-80 transition-opacity shrink-0"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>

        <button
          type="button"
          onClick={() => setShowDeleteDialog(true)}
          aria-label={`Delete ${card.card_name}`}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-gray-400 hover:text-red-400 transition-colors shrink-0"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        title="Delete card?"
        message={`"${card.card_name}" will be permanently deleted and its share link will stop working. This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteDialog(false)}
        isPending={isDeleting}
      />

      {isEditing && (
        <EditCardForm
          card={card}
          onUpdate={async (input) => {
            const err = await onUpdate(input);
            if (!err) setIsEditing(false);
            return err;
          }}
          onCancel={() => setIsEditing(false)}
        />
      )}

      {showQr && (
        <div className="border-t border-white/40 px-4 pb-4 pt-3 flex flex-col items-center gap-2">
          <div className="bg-white p-3 rounded-2xl">
            <QRCode value={shareUrl()} size={160} bgColor="#ffffff" fgColor="#1A3021" />
          </div>
          <p className="text-xs text-gray-400 text-center">Scan to open the share page</p>
        </div>
      )}
    </li>
  );
}

// ── EditCardForm ───────────────────────────────────────────────────────────────

interface EditCardFormProps {
  card: ShareableCard;
  onUpdate: (input: CreateShareableCardInput) => Promise<string | null>;
  onCancel: () => void;
}

/**
 * Inline edit form pre-filled with the card's current values.
 * Supports editing preset fields and managing dynamic custom fields.
 */
function EditCardForm({ card, onUpdate, onCancel }: EditCardFormProps) {
  // Controlled state pre-filled from the card
  const [cardName, setCardName] = useState(card.card_name);
  const [phone, setPhone] = useState(card.phone ?? "");
  const [email, setEmail] = useState(card.email ?? "");
  const [hobbies, setHobbies] = useState(card.hobbies ?? "");
  const [funFacts, setFunFacts] = useState(card.fun_facts ?? "");
  const [otherNotes, setOtherNotes] = useState(card.other_notes ?? "");
  const [customFields, setCustomFields] = useState<CustomField[]>(
    card.custom_fields ?? []
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  /** Appends a new empty custom field row. */
  function addCustomField() {
    setCustomFields((prev) => [...prev, { label: "", value: "" }]);
  }

  /** Updates a single property on a custom field row by index. */
  function updateCustomField(index: number, key: keyof CustomField, val: string) {
    setCustomFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, [key]: val } : f))
    );
  }

  /** Removes a custom field row by index. */
  function removeCustomField(index: number) {
    setCustomFields((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    const validCustom = customFields.filter(
      (f) => f.label.trim() && f.value.trim()
    );
    const err = await onUpdate({
      card_name:    cardName.trim(),
      phone:        phone.trim()      || undefined,
      email:        email.trim()      || undefined,
      hobbies:      hobbies.trim()    || undefined,
      fun_facts:    funFacts.trim()   || undefined,
      other_notes:  otherNotes.trim() || undefined,
      custom_fields: validCustom.length ? validCustom : undefined,
    });
    setIsPending(false);
    if (err) setError(err);
  }

  const editInputCls =
    "w-full bg-white rounded-full px-3 py-2 text-sm text-[#1A3021] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50";

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-white/40 px-4 pb-4 pt-3 space-y-3"
    >
      {/* Card Name */}
      <div className="space-y-1">
        <p className="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-wide">
          Card Name<span className="text-red-400 ml-0.5">*</span>
        </p>
        <input type="text" required maxLength={100} disabled={isPending}
          value={cardName} onChange={(e) => setCardName(e.target.value)}
          className={editInputCls}
        />
      </div>

      {/* Phone */}
      <div className="space-y-1">
        <p className="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-wide">Phone</p>
        <input type="tel" maxLength={50} disabled={isPending}
          value={phone} onChange={(e) => setPhone(e.target.value)}
          className={editInputCls}
        />
      </div>

      {/* Email */}
      <div className="space-y-1">
        <p className="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-wide">Email</p>
        <input type="email" maxLength={254} disabled={isPending}
          value={email} onChange={(e) => setEmail(e.target.value)}
          className={editInputCls}
        />
      </div>

      {/* Hobbies */}
      <div className="space-y-1">
        <p className="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-wide">Hobbies</p>
        <input type="text" maxLength={500} disabled={isPending}
          value={hobbies} onChange={(e) => setHobbies(e.target.value)}
          className={editInputCls}
        />
      </div>

      {/* Fun Facts */}
      <div className="space-y-1">
        <p className="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-wide">Fun Facts</p>
        <input type="text" maxLength={1000} disabled={isPending}
          value={funFacts} onChange={(e) => setFunFacts(e.target.value)}
          className={editInputCls}
        />
      </div>

      {/* Other */}
      <div className="space-y-1">
        <p className="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-wide">Other</p>
        <textarea rows={2} maxLength={2000} disabled={isPending}
          value={otherNotes} onChange={(e) => setOtherNotes(e.target.value)}
          className="w-full bg-white rounded-2xl px-3 py-2 text-sm text-[#1A3021] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
        />
      </div>

      {/* Custom fields */}
      {customFields.map((field, index) => (
        <CustomFieldRow
          key={index}
          field={field}
          index={index}
          disabled={isPending}
          background="white"
          onChange={(key, val) => updateCustomField(index, key, val)}
          onRemove={() => removeCustomField(index)}
        />
      ))}

      {/* Add field button */}
      <button
        type="button"
        onClick={addCustomField}
        disabled={isPending}
        className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)] hover:opacity-70 transition-opacity disabled:opacity-50"
      >
        <Plus size={12} />
        Add field
      </button>

      {error && <FormError error={error} />}

      <div className="flex gap-2">
        <SubmitButton
          isPending={isPending}
          label="Save"
          pendingLabel="Saving…"
          className="flex-1 bg-[var(--color-primary)] text-white font-semibold py-2 rounded-full text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        />
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="flex-1 bg-white text-[#1A3021] font-semibold py-2 rounded-full text-sm hover:opacity-80 transition-opacity disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
