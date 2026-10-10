import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/supabase/profile";
import BackButton from "@/components/BackButton";
import { saveUserAccess, updateTeam } from "./actions";

type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  team_id: string | null;
  requested_team: string | null;
  is_admin: boolean;
  created_at: string;
};

type Team = { id: string; name: string; match_name: string; bfv_competition_id: string | null };

type LoginEvent = {
  user_id: string;
  created_at: string;
};

type PeriodRow = {
  key: string;
  label: string;
  loginCount: number;
  users: { name: string; count: number }[];
};

const ROLE_LABELS: Record<string, string> = {
  pending: "nicht freigeschaltet",
  parent_player: "Eltern/Spieler",
  trainer: "Trainer",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function weekKey(date: Date) {
  // ISO-Woche (Montag als erster Tag).
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNumber);
  return dayKey(d);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function groupLogins(
  events: LoginEvent[],
  namesById: Map<string, string>,
  keyFn: (date: Date) => string,
  labelFn: (key: string) => string,
): PeriodRow[] {
  const byPeriod = new Map<string, Map<string, number>>();

  for (const event of events) {
    const key = keyFn(new Date(event.created_at));
    const usersInPeriod = byPeriod.get(key) ?? new Map<string, number>();
    const name = namesById.get(event.user_id) ?? "Unbekannt";
    usersInPeriod.set(name, (usersInPeriod.get(name) ?? 0) + 1);
    byPeriod.set(key, usersInPeriod);
  }

  return [...byPeriod.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, usersInPeriod]) => ({
      key,
      label: labelFn(key),
      loginCount: [...usersInPeriod.values()].reduce((sum, n) => sum + n, 0),
      users: [...usersInPeriod.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

function formatWeekLabel(key: string) {
  const start = new Date(`${key}T00:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return `${formatDate(start.toISOString())} – ${formatDate(end.toISOString())}`;
}

function formatMonthLabel(key: string) {
  const [year, month] = key.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
  });
}

function PeriodTable({ title, rows }: { title: string; rows: PeriodRow[] }) {
  return (
    <div className="mb-8">
      <h3 className="mb-3 font-medium">{title}</h3>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="py-2">Zeitraum</th>
            <th className="py-2">Logins</th>
            <th className="py-2">Nutzer</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-zinc-100 dark:border-zinc-900">
              <td className="py-2 align-top">{row.label}</td>
              <td className="py-2 align-top">{row.loginCount}</td>
              <td className="py-2 align-top">
                {row.users
                  .map((u) => (u.count > 1 ? `${u.name} (${u.count}x)` : u.name))
                  .join(", ")}
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={3} className="py-4 text-zinc-500">
                Noch keine Logins erfasst.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  if (!(await isAdmin())) {
    redirect("/");
  }

  const supabase = await createClient();
  const [
    {
      data: { user: currentUser },
    },
    { data: profiles },
    { data: loginEvents },
    { data: teamsData },
    { error: errorMessage, saved },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("profiles")
      .select("id, first_name, last_name, email, role, team_id, requested_team, is_admin, created_at")
      .order("created_at", { ascending: true }),
    supabase
      .from("login_events")
      .select("user_id, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("teams").select("id, name, match_name, bfv_competition_id").order("name"),
    searchParams,
  ]);

  const teams = (teamsData ?? []) as Team[];
  const teamNameById = new Map(teams.map((t) => [t.id, t.name]));
  // Beantragtes Team, das es schon gibt (gleicher Name) - wird bei der Freigabe vorausgewaehlt.
  const teamIdByName = new Map(teams.map((t) => [t.name.toLowerCase(), t.id]));
  const requestedTeamId = (u: Profile) => teamIdByName.get((u.requested_team ?? "").toLowerCase());
  // Ohne Zugang (wartend oder noch ohne Team) zuerst, damit Freigaben nicht untergehen.
  const needsApproval = (u: Profile) => u.role !== "trainer" || !u.team_id;
  const users = ((profiles ?? []) as Profile[]).sort(
    (a, b) => Number(needsApproval(b)) - Number(needsApproval(a)),
  );
  const pendingCount = users.filter((u) => u.role === "pending").length;
  const membersByTeam = new Map<string, number>();
  for (const u of users) {
    if (u.team_id) membersByTeam.set(u.team_id, (membersByTeam.get(u.team_id) ?? 0) + 1);
  }
  const events = (loginEvents ?? []) as LoginEvent[];

  const namesById = new Map(users.map((u) => [u.id, `${u.first_name} ${u.last_name}`]));

  const loginCountByUser = new Map<string, number>();
  const lastLoginByUser = new Map<string, string>();
  for (const event of events) {
    loginCountByUser.set(event.user_id, (loginCountByUser.get(event.user_id) ?? 0) + 1);
    if (!lastLoginByUser.has(event.user_id)) {
      lastLoginByUser.set(event.user_id, event.created_at);
    }
  }

  const byDay = groupLogins(events, namesById, dayKey, formatDate).slice(0, 30);
  const byWeek = groupLogins(events, namesById, weekKey, formatWeekLabel).slice(0, 12);
  const byMonth = groupLogins(events, namesById, monthKey, formatMonthLabel).slice(0, 12);

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <BackButton href="/" />
      <h1 className="mb-6 text-xl font-semibold">Admin</h1>

      {errorMessage && (
        <p className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {errorMessage}
        </p>
      )}
      {saved && !errorMessage && (
        <p className="mb-4 rounded border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
          Gespeichert.
        </p>
      )}

      <section className="mb-10">
        <h2 className="mb-1 font-medium">Registrierte Nutzer</h2>
        <p className="mb-3 text-sm text-zinc-500">
          Neue Trainer wählen bei der Registrierung ein bestehendes Team oder
          beantragen ein neues (markiert mit „neu“). Das Team ist zur Freigabe
          schon vorausgewählt – prüfen, Rolle „Trainer“ und speichern. Zugang zur App
          hat nur, wer Trainer ist und ein Team hat – „Eltern/Spieler“ sehen
          vorerst nichts. Schalte nur Personen frei, die du kennst.
        </p>
        {pendingCount > 0 && (
          <p className="mb-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            {pendingCount === 1
              ? "1 Nutzer wartet auf Freischaltung."
              : `${pendingCount} Nutzer warten auf Freischaltung.`}
          </p>
        )}
        <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="py-2 pr-3">Name</th>
              <th className="py-2 pr-3">E-Mail</th>
              <th className="py-2 pr-3">Beantragtes Team</th>
              <th className="py-2 pr-3">Team und Rolle</th>
              <th className="py-2 pr-3">Registriert am</th>
              <th className="py-2 pr-3">Logins</th>
              <th className="py-2">Letzter Login</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-zinc-100 align-top dark:border-zinc-900">
                <td className="py-2 pr-3">
                  {u.first_name} {u.last_name}
                  {u.is_admin && (
                    <span className="ml-1 rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
                      Admin
                    </span>
                  )}
                </td>
                <td className="py-2 pr-3">{u.email}</td>
                <td className="py-2 pr-3 text-zinc-500">
                  {u.requested_team ?? "–"}
                  {u.requested_team && !requestedTeamId(u) && (
                    <span className="ml-1 text-xs text-amber-700 dark:text-amber-400">(neu)</span>
                  )}
                </td>
                <td className="py-2 pr-3">
                  {u.id === currentUser?.id ? (
                    <span>
                      {teamNameById.get(u.team_id ?? "") ?? "kein Team"} ·{" "}
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  ) : (
                    <form action={saveUserAccess.bind(null, u.id)} className="flex flex-wrap items-center gap-1">
                      <select
                        name="team"
                        defaultValue={u.team_id ?? requestedTeamId(u) ?? (u.requested_team ? "__new__" : "")}
                        aria-label={`Team von ${u.first_name} ${u.last_name}`}
                        className="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                      >
                        <option value="">– kein Team –</option>
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                        <option value="__new__">+ Neues Team …</option>
                      </select>
                      <input
                        name="newTeamName"
                        defaultValue={u.team_id || requestedTeamId(u) ? "" : (u.requested_team ?? "")}
                        placeholder="Name neues Team"
                        maxLength={60}
                        aria-label={`Name des neuen Teams für ${u.first_name} ${u.last_name}`}
                        className="w-36 rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                      />
                      <select
                        name="role"
                        defaultValue={u.role === "pending" ? "trainer" : u.role}
                        aria-label={`Rolle von ${u.first_name} ${u.last_name}`}
                        className="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                      >
                        {Object.entries(ROLE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded bg-zinc-900 px-2 py-1 text-xs text-white dark:bg-zinc-100 dark:text-zinc-900"
                      >
                        {needsApproval(u) ? "Freigeben" : "Speichern"}
                      </button>
                    </form>
                  )}
                </td>
                <td className="py-2 pr-3 whitespace-nowrap">{formatDate(u.created_at)}</td>
                <td className="py-2 pr-3">{loginCountByUser.get(u.id) ?? 0}</td>
                <td className="py-2 whitespace-nowrap">
                  {lastLoginByUser.has(u.id)
                    ? formatDateTime(lastLoginByUser.get(u.id)!)
                    : "–"}
                </td>
              </tr>
            ))}
            {!users.length && (
              <tr>
                <td colSpan={7} className="py-4 text-zinc-500">
                  Noch keine Nutzer registriert.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-1 font-medium">Teams</h2>
        <p className="mb-3 text-sm text-zinc-500">
          Der Teamname erscheint oben in der Menüleiste. Der Name im
          Spielbetrieb muss genau so geschrieben sein wie im Spielplan bzw.
          Live-Ergebnis (daran erkennt die App die eigene Mannschaft).
        </p>
        <div className="space-y-2">
          {teams.map((team) => (
            <form
              key={team.id}
              action={updateTeam.bind(null, team.id)}
              className="flex flex-wrap items-end gap-2 rounded border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <label className="text-xs">
                <span className="mb-1 block text-zinc-500">Teamname</span>
                <input
                  name="name"
                  defaultValue={team.name}
                  required
                  maxLength={60}
                  className="w-40 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </label>
              <label className="text-xs">
                <span className="mb-1 block text-zinc-500">Name im Spielbetrieb</span>
                <input
                  name="matchName"
                  defaultValue={team.match_name}
                  required
                  maxLength={80}
                  className="w-56 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </label>
              <label className="text-xs">
                <span className="mb-1 block text-zinc-500" title="Aus dem BFV-Widget-Code: zeigeWettbewerb(&quot;…&quot;, …)">
                  BFV-Wettbewerbs-ID
                </span>
                <input
                  name="bfvCompetitionId"
                  defaultValue={team.bfv_competition_id ?? ""}
                  placeholder="leer = kein Widget"
                  maxLength={66}
                  className="w-72 rounded border border-zinc-300 px-2 py-1 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
                />
              </label>
              <span className="pb-1.5 text-xs text-zinc-500">
                {membersByTeam.get(team.id) ?? 0} Nutzer
              </span>
              <button
                type="submit"
                className="rounded border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700"
              >
                Speichern
              </button>
            </form>
          ))}
          {!teams.length && <p className="text-sm text-zinc-500">Noch keine Teams.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-1 font-medium">Login-Historie</h2>
        <p className="mb-4 text-sm text-zinc-500">
          Logins werden erst ab dem Rollout dieser Funktion erfasst. Angezeigt
          werden jeweils die letzten Zeitraeume mit mindestens einem Login.
        </p>
        <PeriodTable title="Je Datum" rows={byDay} />
        <PeriodTable title="Je Woche" rows={byWeek} />
        <PeriodTable title="Je Monat" rows={byMonth} />
      </section>
    </div>
  );
}
