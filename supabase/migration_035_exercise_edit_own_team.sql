-- Migration 035: Trainer duerfen Uebungen ihres eigenen Teams aendern/loeschen
-- Im Supabase SQL Editor ausfuehren. Setzt migration_034_exercise_owner_admin_edit.sql voraus.
--
-- Aendern und Loeschen: der Admin alle Uebungen, Trainer nur Uebungen, die ihr
-- Team erstellt hat (exercises.created_by_team_id). Das Erstellerteam kann ein
-- Trainer dabei nicht auf ein anderes Team umschreiben.

begin;

drop policy if exists "admin update exercises" on exercises;
drop policy if exists "admin delete exercises" on exercises;
drop policy if exists "admin or own team update exercises" on exercises;
drop policy if exists "admin or own team delete exercises" on exercises;

create policy "admin or own team update exercises" on exercises
  for update to authenticated
  using (is_admin() or (is_trainer() and created_by_team_id = current_team_id()))
  with check (is_admin() or (is_trainer() and created_by_team_id = current_team_id()));

create policy "admin or own team delete exercises" on exercises
  for delete to authenticated
  using (is_admin() or (is_trainer() and created_by_team_id = current_team_id()));

commit;
