import { createClient } from "@/lib/supabase/server";
import { isTrainer } from "@/lib/supabase/profile";
import BackButton from "@/components/BackButton";
import FieldPlanner, { type PlanSummary } from "./FieldPlanner";
import { sanitizeItems } from "./model";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default async function FieldPlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; new?: string }>;
}) {
  const { plan: planParam, new: newParam } = await searchParams;
  const supabase = await createClient();
  const [{ data }, canWrite] = await Promise.all([
    supabase
      .from("field_plans")
      .select("id, name, items, updated_at, teams(name)")
      .order("name"),
    isTrainer(),
  ]);

  const rows = (data ?? []).map((row) => {
    const team = (Array.isArray(row.teams) ? row.teams[0] : row.teams) as { name: string } | null;
    return { ...row, teamName: team?.name ?? null };
  });
  const plans: PlanSummary[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    updatedAt: r.updated_at,
    teamName: r.teamName,
  }));

  // Ohne Auswahl wird der zuletzt geaenderte Plan geoeffnet.
  const latest = [...rows].sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
  const current = newParam ? undefined : (rows.find((r) => r.id === planParam) ?? latest);
  const lastChange = current
    ? `Zuletzt geändert ${formatDate(current.updated_at)}${current.teamName ? ` von ${current.teamName}` : ""}.`
    : null;

  return (
    <div className="mx-auto w-full max-w-screen-2xl flex-1 px-4 py-8">
      <BackButton href="/" />
      <h1 className="mb-2 text-xl font-semibold">Trainingsplatzplanung</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Aufteilung des Großfelds auf gleichzeitig trainierende Mannschaften. Die Pläne sind für
        alle Teams sichtbar.
        {!canWrite && " Du hast Nur-Lese-Zugriff."}
      </p>
      <FieldPlanner
        key={current?.id ?? "new"}
        plans={plans}
        initialPlan={{
          id: current?.id ?? null,
          name: current?.name ?? "",
          items: sanitizeItems(current?.items),
        }}
        lastChange={lastChange}
        canWrite={canWrite}
      />
    </div>
  );
}
