"use client";

import { Suspense, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Zeigt ein "Speichern erfolgreich"-Popup, wenn die Seite mit ?saved=1
 * aufgerufen wurde (z.B. nach einem redirect() aus einer Server Action).
 * Entfernt den Query-Parameter danach aus der URL.
 */
function SavedQueryNoticeInner() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const open = !dismissed && searchParams.get("saved") === "1";

  function close() {
    setDismissed(true);
    router.replace(pathname);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900">
        <p className="mb-4 text-sm font-medium">Speichern erfolgreich</p>
        <button
          type="button"
          onClick={close}
          className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          OK
        </button>
      </div>
    </div>
  );
}

export default function SavedQueryNotice() {
  return (
    <Suspense fallback={null}>
      <SavedQueryNoticeInner />
    </Suspense>
  );
}
