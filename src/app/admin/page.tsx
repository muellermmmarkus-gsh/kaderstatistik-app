import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isTrainer } from "@/lib/supabase/profile";
import BackButton from "@/components/BackButton";

type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  created_at: string;
};

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
  trainer: "Trainer",
  parent_player: "Eltern/Spieler",
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

export default async function AdminPage() {
  if (!(await isTrainer())) {
    redirect("/");
  }

  const supabase = await createClient();
  const [{ data: profiles }, { data: loginEvents }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, first_name, last_name, email, role, created_at")
      .order("created_at", { ascending: true }),
    supabase
      .from("login_events")
      .select("user_id, created_at")
      .order("created_at", { ascending: false }),
  ]);

  const users = (profiles ?? []) as Profile[];
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
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <BackButton href="/" />
      <h1 className="mb-6 text-xl font-semibold">Admin</h1>

      <section className="mb-10">
        <h2 className="mb-3 font-medium">Registrierte Nutzer</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="py-2">Name</th>
              <th className="py-2">E-Mail</th>
              <th className="py-2">Rolle</th>
              <th className="py-2">Registriert am</th>
              <th className="py-2">Logins gesamt</th>
              <th className="py-2">Letzter Login</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-zinc-100 dark:border-zinc-900">
                <td className="py-2">
                  {u.first_name} {u.last_name}
                </td>
                <td className="py-2">{u.email}</td>
                <td className="py-2">{ROLE_LABELS[u.role] ?? u.role}</td>
                <td className="py-2">{formatDate(u.created_at)}</td>
                <td className="py-2">{loginCountByUser.get(u.id) ?? 0}</td>
                <td className="py-2">
                  {lastLoginByUser.has(u.id)
                    ? formatDateTime(lastLoginByUser.get(u.id)!)
                    : "–"}
                </td>
              </tr>
            ))}
            {!users.length && (
              <tr>
                <td colSpan={6} className="py-4 text-zinc-500">
                  Noch keine Nutzer registriert.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
