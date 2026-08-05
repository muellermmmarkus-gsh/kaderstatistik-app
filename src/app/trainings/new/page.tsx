import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createTraining } from "../actions";
import TrainingBuilder from "../TrainingBuilder";

export default async function NewTrainingPage() {
  const supabase = await createClient();
  const { data: exercises } = await supabase
    .from("exercises")
    .select("id, name, hauptzweck, min_players, max_players, image_url")
    .order("name");

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold">Neues Training</h1>
      {!exercises?.length ? (
        <p className="text-sm text-zinc-500">
          Bevor du ein Training planen kannst, lege unter{" "}
          <Link href="/exercises/new" className="underline">
            Übungen
          </Link>{" "}
          mindestens eine Übung an.
        </p>
      ) : (
        <TrainingBuilder
          exercises={exercises}
          action={createTraining}
          submitLabel="Training speichern"
        />
      )}
    </div>
  );
}
