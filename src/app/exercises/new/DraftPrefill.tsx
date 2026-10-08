"use client";

import { useEffect, useState } from "react";

// Entwurf aus dem Uebungskonfigurator (public/uebungskonfigurator.html). Der
// Konfigurator legt ihn im localStorage derselben Adresse ab und springt hierher.
const DRAFT_KEY = "uebungsentwurf";

type Draft = {
  name?: string;
  aufbau?: string;
  ablauf?: string;
  minPlayers?: number;
  maxPlayers?: number;
  smallGoals?: number;
  miniGoals?: number;
  bild?: string; // data:-URL (JPEG) der Skizze
};

function setField(id: string, value: string | number | undefined) {
  if (value === undefined || value === "" || value === 0) return;
  const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null;
  if (el) el.value = String(value);
}

/** Fuellt das Formular "Neue Übung" mit dem Entwurf aus dem Konfigurator vor. */
export default function DraftPrefill() {
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let draft: Draft | null = null;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) draft = JSON.parse(raw) as Draft;
      // Nur einmal anwenden, sonst wuerde ein spaeteres "Neue Übung" erneut vorbefuellt.
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      return;
    }
    if (!draft) return;
    const d = draft;

    async function apply() {
      setField("name", d.name);
      setField("aufbau", d.aufbau);
      setField("ablauf", d.ablauf);
      setField("minPlayers", d.minPlayers);
      setField("maxPlayers", d.maxPlayers);
      setField("smallGoals", d.smallGoals);
      setField("miniGoals", d.miniGoals);

      let imageAttached = false;
      const input = document.getElementById("image") as HTMLInputElement | null;
      if (d.bild && input) {
        try {
          const blob = await (await fetch(d.bild)).blob();
          const transfer = new DataTransfer();
          transfer.items.add(new File([blob], "skizze.jpg", { type: blob.type || "image/jpeg" }));
          input.files = transfer.files;
          imageAttached = true;
        } catch {
          // Bild bleibt leer - die Uebung kann auch ohne Bild angelegt werden.
        }
      }
      setNotice(
        `Entwurf aus dem Übungskonfigurator übernommen${imageAttached ? " (inkl. Skizze als Bild)" : ""}. ` +
          "Bitte Kategorie und Übungsschwerpunkt wählen, die Angaben prüfen und die Übung anlegen.",
      );
    }
    void apply();
  }, []);

  if (!notice) return null;
  return (
    <p className="mb-4 rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
      {notice}
    </p>
  );
}
