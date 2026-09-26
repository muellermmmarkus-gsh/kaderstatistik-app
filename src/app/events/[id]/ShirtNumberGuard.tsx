"use client";

import { useEffect, useRef } from "react";

const SELECTOR = 'select[name^="shirt_"]';

/**
 * Verhindert doppelt vergebene Rueckennummern im Spieltermin: Nummern, die
 * bereits ein anderer Spieler hat, sind in allen anderen Dropdowns
 * ausgegraut ("vergeben"). Muss als Kind des Anwesenheits-<form> gerendert
 * werden und arbeitet direkt auf dessen Rueckennummer-Selects, damit die
 * Tabellenzeilen Server-gerendert bleiben koennen.
 */
export default function ShirtNumberGuard() {
  const markerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const form = markerRef.current?.closest("form");
    if (!form) return;

    function update() {
      const selects = [...form!.querySelectorAll<HTMLSelectElement>(SELECTOR)];
      for (const select of selects) {
        const usedElsewhere = new Set(
          selects.filter((s) => s !== select && s.value).map((s) => s.value),
        );
        for (const option of select.options) {
          if (!option.value) continue;
          const taken = usedElsewhere.has(option.value);
          option.disabled = taken;
          option.textContent = taken ? `${option.value} (vergeben)` : option.value;
        }
      }
    }

    function blockDuplicates(event: SubmitEvent) {
      const values = [...form!.querySelectorAll<HTMLSelectElement>(SELECTOR)]
        .map((s) => s.value)
        .filter(Boolean);
      if (new Set(values).size !== values.length) {
        event.preventDefault();
        window.alert("Jede Rückennummer darf nur einmal vergeben werden.");
      }
    }

    update();
    form.addEventListener("change", update);
    form.addEventListener("submit", blockDuplicates);
    return () => {
      form.removeEventListener("change", update);
      form.removeEventListener("submit", blockDuplicates);
    };
  }, []);

  return <span ref={markerRef} hidden />;
}
