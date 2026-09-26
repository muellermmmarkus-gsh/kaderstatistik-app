"use client";

/**
 * Kontrolliertes Bestaetigungs-Popup fuer Client-Komponenten, die eine
 * Server Action direkt (ohne umschliessendes <form>) aufrufen.
 */
export default function ConfirmDialog({
  open,
  message,
  confirmLabel,
  cancelLabel = "Abbrechen",
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900"
      >
        <p className="mb-4 text-sm font-medium">{message}</p>
        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={
              danger
                ? "rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
                : "rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
