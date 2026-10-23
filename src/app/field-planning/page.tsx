import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, isTrainer } from "@/lib/supabase/profile";
import BackButton from "@/components/BackButton";
import FieldPlanner, { type PlanOption } from "./FieldPlanner";
import { sanitizeItems } from "./model";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/** "2026-09-12" -> "Sa 12.09.2026" */
const formatDay = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("de-DE", {
    timeZone: "UTC",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const todayBerlin = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });

export default async function FieldPlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; date?: string; new?: string }>;
}) {
  const { plan: planParam, date: dateParam, new: newParam } = await searchParams;
  const supabase = await createClient();
  const [{ data: planRows }, { data: dateRows }, canWrite, profile] = await Promise.all([
    supabase
      .from("field_plans")
      .select("id, name, items, updated_at, plan_date, teams(name)")
      .order("name"),
    supabase.rpc("training_dates"),
    isTrainer(),
    getCurrentProfile(),
  ]);

  const plans = (planRows ?? []).map((row) => {
    const team = (Array.isArray(row.teams) ? row.teams[0] : row.teams) as { name: string } | null;
    return { ...row, teamName: team?.name ?? null };
  });
  const planByDate = new Map(plans.filter((p) => p.plan_date).map((p) => [p.plan_date as string, p]));
  const trainingDates = (dateRows ?? []) as { event_date: string; teams: string | null }[];
  const knownDates = new Set(trainingDates.map((d) => d.event_date));

  // Auswahl: ?date= (Trainingstermin), ?plan= (Plan ohne Datum), ?new=1, sonst
  // der naechste anstehende Trainingstermin bzw. der zuletzt geaenderte Plan.
  let date: string | null = null;
  let current: (typeof plans)[number] | undefined;
  if (dateParam && DATE_RE.test(dateParam)) {
    date = dateParam;
  } else if (planParam) {
    current = plans.find((p) => p.id === planParam);
    date = current?.plan_date ?? null;
  } else if (!newParam) {
    const today = todayBerlin();
    date = trainingDates.find((d) => d.event_date >= today)?.event_date ?? trainingDates.at(-1)?.event_date ?? null;
    if (!date) current = [...plans].sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
  }
  if (date) current = planByDate.get(date);

  const options: PlanOption[] = [
    ...trainingDates.map((d) => ({
      value: `date:${d.event_date}`,
      label: `${formatDay(d.event_date)}${d.teams ? ` – ${d.teams}` : ""}${planByDate.has(d.event_date) ? " ✓" : ""}`,
      group: "Trainingstermine" as const,
    })),
    // Plaene, deren Termin geloescht wurde, bleiben erreichbar.
    ...plans
      .filter((p) => p.plan_date && !knownDates.has(p.plan_date))
      .map((p) => ({ value: `date:${p.plan_date}`, label: `${formatDay(p.plan_date!)} (kein Termin mehr) ✓`, group: "Trainingstermine" as const })),
    ...plans
      .filter((p) => !p.plan_date)
      .map((p) => ({ value: p.id, label: p.name, group: "Weitere Pläne" as const })),
  ];
  if (date && !options.some((o) => o.value === `date:${date}`)) {
    options.unshift({ value: `date:${date}`, label: formatDay(date), group: "Trainingstermine" });
  }
  const selection = date ? `date:${date}` : (current?.id ?? "new");

  // Eigener Trainingstermin an diesem Tag fuer den Button "Zurück zum Termin".
  let eventHref: string | null = null;
  if (date && profile?.teamId) {
    const { data: ownEvent } = await supabase
      .from("events")
      .select("id")
      .eq("type", "training")
      .eq("event_date", date)
      .eq("team_id", profile.teamId)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();
    if (ownEvent) eventHref = `/events/${ownEvent.id}`;
  }

  const lastChange = current
    ? `Zuletzt geändert ${formatDateTime(current.updated_at)}${current.teamName ? ` von ${current.teamName}` : ""}.`
    : null;

  return (
    <div className="mx-auto w-full max-w-screen-2xl flex-1 px-4 py-8">
      <BackButton href="/" />
      <h1 className="mb-2 text-xl font-semibold">Trainingsplatzplanung</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Aufteilung des Großfelds auf gleichzeitig trainierende Mannschaften. Für jeden
        Trainingstermin (aller Teams) gibt es einen gemeinsamen Plan.
        {!canWrite && " Du hast Nur-Lese-Zugriff."}
      </p>
      <FieldPlanner
        key={selection}
        options={options}
        selection={selection}
        planDate={date}
        eventHref={eventHref}
        initialPlan={{
          id: current?.id ?? null,
          name: date ? `Training ${formatDay(date)}` : (current?.name ?? ""),
          items: sanitizeItems(current?.items),
        }}
        lastChange={lastChange}
        canWrite={canWrite}
      />
    </div>
  );
}
