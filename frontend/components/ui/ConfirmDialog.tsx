"use client";

interface ConfirmDialogProps {
  /** Whether the dialog is visible. */
  open: boolean;
  /** Bold heading shown at the top of the dialog. */
  title: string;
  /** Explanatory message shown below the heading. */
  message: string;
  /** Label for the destructive confirm button. Defaults to "Delete". */
  confirmLabel?: string;
  /** Called when the user clicks the confirm button. */
  onConfirm: () => void;
  /** Called when the user clicks Cancel or the backdrop. */
  onCancel: () => void;
  /** When true, both buttons are disabled and the confirm button shows a loading label. */
  isPending?: boolean;
}

/**
 * A styled modal confirmation dialog.
 *
 * Uses a fixed full-screen backdrop so it sits on top of all content regardless
 * of DOM position. Clicking the backdrop triggers onCancel. The confirm button
 * is styled red to signal a destructive action.
 *
 * Replaces the browser's native window.confirm() for a consistent look and feel.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
  isPending = false,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog card */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        className="relative bg-white rounded-3xl shadow-xl p-6 w-full max-w-sm space-y-4"
      >
        <div className="space-y-1.5">
          <h2
            id="confirm-dialog-title"
            className="text-base font-bold text-[#1A3021]"
          >
            {title}
          </h2>
          <p
            id="confirm-dialog-message"
            className="text-sm text-gray-500 leading-relaxed"
          >
            {message}
          </p>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 py-2.5 rounded-full bg-[var(--color-primary-light)] text-[#1A3021] font-semibold text-sm hover:opacity-80 transition-opacity disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            className="flex-1 py-2.5 rounded-full bg-red-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isPending ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
