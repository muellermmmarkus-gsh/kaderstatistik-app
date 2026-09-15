"use client";

type Player = {
  first_name: string;
  last_name: string;
  birth_date: string | null;
  passnummer: string | null;
};

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export default function ExportPlayersButton({ players }: { players: Player[] }) {
  function handleExport() {
    const header = ["Name", "Geburtsdatum", "Passnummer"];
    const rows = players.map((p) => [
      `${p.first_name} ${p.last_name}`,
      p.birth_date ?? "",
      p.passnummer ?? "",
    ]);
    // Semikolon als Trennzeichen und BOM, damit die Datei in Excel (DE)
    // direkt mit korrekten Spalten und Umlauten geoeffnet wird.
    const csv = [header, ...rows]
      .map((row) => row.map(csvEscape).join(";"))
      .join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "spieler.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
    >
      Export (CSV)
    </button>
  );
}
