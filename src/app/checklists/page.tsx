import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isTrainer } from "@/lib/supabase/profile";
import BackButton from "@/components/BackButton";
import NewChecklistButton from "./NewChecklistButton";

type ChecklistRow = {
  id: string;
  name: string;
  created_at: string;
  checklist_items: { done: boolean }[];
};

export default async function ChecklistsPage() {
  const supabase = await createClient();
  const [{ data }, canWrite] = await Promise.all([
    supabase
      .from("checklists")
      .select("id, name, created_at, checklist_items(done)")
      .order("created_at", { ascending: false }),
    isTrainer(),
  ]);
  const checklists = (data as ChecklistRow[] | null) ?? [];

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <BackButton href="/" />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Checklisten</h1>
        {canWrite && <NewChecklistButton />}
      </div>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Erstellt am</th>
            <th className="py-2 text-right">Vollständig</th>
          </tr>
        </thead>
        <tbody>
          {checklists.map((checklist) => {
            const total = checklist.checklist_items.length;
            const done = checklist.checklist_items.filter((i) => i.done).length;
            const pct = total ? Math.round((done / total) * 100) : 0;
            return (
              <tr key={checklist.id} className="border-b border-zinc-100 dark:border-zinc-900">
                <td className="py-2 pr-4">
                  <Link href={`/checklists/${checklist.id}`} className="font-medium hover:underline">
                    {checklist.name}
                  </Link>
                </td>
                <td className="py-2 pr-4 whitespace-nowrap">
                  {new Date(checklist.created_at).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </td>
                <td className="py-2 text-right whitespace-nowrap tabular-nums">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="h-1.5 w-16 overflow-hidden rounded bg-zinc-200 dark:bg-zinc-800"
                      aria-hidden="true"
                    >
                      <span
                        className="block h-full bg-emerald-600"
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                    {pct} %
                  </span>
                </td>
              </tr>
            );
          })}
          {!checklists.length && (
            <tr>
              <td colSpan={3} className="py-4 text-zinc-500">
                Noch keine Checklisten angelegt.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
