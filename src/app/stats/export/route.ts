import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

function csvEscape(value: string | number) {
  const str = String(value);
  return /[",\n;]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function toCsvRows(headers: string[], rows: (string | number)[][]) {
  return [headers, ...rows].map((r) => r.map(csvEscape).join(";")).join("\n");
}

export async function GET(request: NextRequest) {
  const season = request.nextUrl.searchParams.get("season");
  if (!season) {
    return NextResponse.json({ error: "season fehlt" }, { status: 400 });
  }

  const supabase = await createClient();

  const [{ data: attendance }, { data: goals }] = await Promise.all([
    supabase
      .from("attendance_by_season")
      .select("first_name, last_name, type, attended, total, attendance_pct")
      .eq("season", season)
      .order("last_name"),
    supabase
      .from("goals_by_season")
      .select("first_name, last_name, goals")
      .eq("season", season)
      .order("goals", { ascending: false }),
  ]);

  const attendanceCsv = toCsvRows(
    ["Spieler", "Art", "Anwesend", "Gesamt", "Prozent"],
    (attendance ?? []).map((r) => [
      `${r.first_name} ${r.last_name}`,
      r.type === "training" ? "Training" : "Spiel",
      r.attended,
      r.total,
      r.attendance_pct,
    ]),
  );

  const goalsCsv = toCsvRows(
    ["Spieler", "Tore"],
    (goals ?? []).map((r) => [`${r.first_name} ${r.last_name}`, r.goals]),
  );

  const csv = [
    `Anwesenheit Saison ${season}`,
    attendanceCsv,
    "",
    `Tore Saison ${season}`,
    goalsCsv,
  ].join("\n");

  return new NextResponse(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kaderstatistik_${season.replace("/", "-")}.csv"`,
    },
  });
}
