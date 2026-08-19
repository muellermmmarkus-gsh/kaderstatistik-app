"use client";

/**
 * Submit-Button fuer Loesch-Formulare, der vor dem Absenden eine
 * Browser-Bestaetigung einholt. Muss als Kind eines <form> mit
 * Server-Action gerendert werden.
 */
export default function DeleteButton({
  confirmMessage,
  className,
  children,
}: {
  confirmMessage: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}
