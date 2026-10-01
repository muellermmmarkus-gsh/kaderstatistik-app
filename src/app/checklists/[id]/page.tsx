import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isTrainer } from "@/lib/supabase/profile";
import BackButton from "@/components/BackButton";
import ChecklistEditor, { type ChecklistEntry } from "./ChecklistEditor";

type Person = { first_name: string; last_name: string } | null;

type ItemRow = {
  id: string;
  done: boolean;
  note: string | null;
  players: Person;
  trainers: Person;
};

function byName(a: ChecklistEntry, b: ChecklistEntry) {
  return a.lastName.localeCompare(b.lastName, "de") || a.firstName.localeCompare(b.firstName, "de");
}

export default async function ChecklistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: checklist }, canWrite] = await Promise.all([
    supabase
      .from("checklists")
      .select(
        "id, name, created_at, checklist_items(id, done, note, players(first_name, last_name), trainers(first_name, last_name))",
      )
      .eq("id", id)
      .maybeSingle(),
    isTrainer(),
  ]);
  if (!checklist) notFound();

  const entries = ((checklist.checklist_items as unknown as ItemRow[]) ?? []).map((item) => {
    const person = item.players ?? item.trainers;
    return {
      id: item.id,
      done: item.done,
      note: item.note ?? "",
      kind: item.players ? ("player" as const) : ("trainer" as const),
      firstName: person?.first_name ?? "",
      lastName: person?.last_name ?? "",
    };
  });

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <BackButton href="/checklists" />
      <ChecklistEditor
        checklistId={checklist.id}
        initialName={checklist.name}
        players={entries.filter((e) => e.kind === "player").sort(byName)}
        trainers={entries.filter((e) => e.kind === "trainer").sort(byName)}
        canWrite={canWrite}
      />
    </div>
  );
}
