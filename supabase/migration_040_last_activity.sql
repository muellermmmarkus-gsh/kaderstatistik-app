-- Migration 040: "Letzte Aktivitaet" je Nutzer fuer die Admin-Uebersicht
-- Im Supabase SQL Editor ausfuehren. Setzt migration_039_training_exercise_overrides.sql voraus.
--
-- profiles.last_activity_at: Zeitpunkt, zu dem der Nutzer zuletzt etwas
-- gespeichert, geaendert oder geloescht hat. Gesetzt per Trigger an allen
-- Tabellen, in die Trainer schreiben (Logins zaehlen nicht). Hoechstens einmal
-- pro Minute aktualisiert, damit ein Speichervorgang mit vielen Einzelschritten
-- nicht jedes Mal das Profil schreibt.

begin;

alter table profiles add column if not exists last_activity_at timestamptz;

create or replace function public.touch_last_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    update public.profiles
    set last_activity_at = now()
    where id = auth.uid()
      and (last_activity_at is null or last_activity_at < now() - interval '1 minute');
  end if;
  return null;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'players', 'player_private', 'trainers', 'trainer_absences', 'seasons',
    'events', 'attendance', 'attendance_assessments', 'trainer_attendance', 'goals',
    'trainings', 'training_exercises', 'training_exercise_groups', 'training_player_groups',
    'lineups', 'match_results', 'match_goal_entries',
    'performance_updates', 'performance_ratings', 'checklists', 'checklist_items',
    'exercises', 'team_exercises', 'fields', 'exercise_focuses', 'event_types'
  ] loop
    execute format('drop trigger if exists touch_last_activity on public.%I', t);
    execute format(
      'create trigger touch_last_activity after insert or update or delete on public.%I '
      'for each statement execute function public.touch_last_activity()', t);
  end loop;
end $$;

commit;
