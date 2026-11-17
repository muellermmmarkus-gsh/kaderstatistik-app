"use client";

import { useEffect, useRef, useState } from "react";

type Counts = { total: number; tentative: number };

/**
 * Summe im Spaltenkopf "Zugesagt"/"Angemeldet": zaehlt live die Zusagen im
 * Anwesenheitsformular (Checkboxen bzw. TriStateRegistration).
 */
export default function RegistrationCount({ initial }: { initial: Counts }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [counts, setCounts] = useState(initial);

  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const recount = () => {
      // Erst nach dem React-Update des geklickten Feldes zaehlen.
      setTimeout(() => {
        let total = 0;
        let tentative = 0;
        for (const input of form.querySelectorAll<HTMLInputElement>('input[name^="registered_player_"]')) {
          if (input.type === "checkbox" ? input.checked : input.value === "on") total++;
        }
        for (const input of form.querySelectorAll<HTMLInputElement>('input[name^="tentative_player_"]')) {
          if (input.value === "on") tentative++;
        }
        setCounts({ total, tentative });
      }, 0);
    };
    form.addEventListener("change", recount);
    return () => form.removeEventListener("change", recount);
  }, []);

  return (
    <span ref={ref} className="block text-xs font-normal text-zinc-500">
      {counts.total} gesamt
      {counts.tentative > 0 && ` · ${counts.tentative} mit Vorbehalt`}
    </span>
  );
}
