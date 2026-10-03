-- Migration 034: Uebungen nur vom Admin aenderbar, Erstellerteam je Uebung
-- Im Supabase SQL Editor ausfuehren. Setzt migration_033_teams.sql voraus.
--
-- * exercises.created_by_team_id: Team, das die Uebung angelegt hat. Bestehende
--   Uebungen -> TVG E1, neue automatisch das Team des anlegenden Trainers.
-- * Anlegen (auch Kopien) duerfen alle Trainer - nur mit dem eigenen Team als
--   Ersteller. Aendern und Loeschen nur der Admin.
-- * Teamnamen sind fuer alle freigegebenen Nutzer lesbar, damit die
--   Uebungsdatenbank das Erstellerteam anzeigen kann.

begin;

alter table exercises
  add column if not exists created_by_team_id uuid references teams(id) on delete set null;

update exercises
set created_by_team_id = (select id from teams where name = 'TVG E1')
where created_by_team_id is null;

alter table exercises alter column created_by_team_id set default public.current_team_id();

drop policy if exists "trainer write exercises" on exercises;
drop policy if exists "trainer insert exercises" on exercises;
drop policy if exists "admin update exercises" on exercises;
drop policy if exists "admin delete exercises" on exercises;

create policy "trainer insert exercises" on exercises
  for insert to authenticated
  with check (is_trainer() and created_by_team_id = current_team_id());
create policy "admin update exercises" on exercises
  for update to authenticated using (is_admin()) with check (is_admin());
create policy "admin delete exercises" on exercises
  for delete to authenticated using (is_admin());

drop policy if exists "own team or admin read teams" on teams;
drop policy if exists "member or admin read teams" on teams;
create policy "member or admin read teams" on teams
  for select to authenticated using (is_member() or is_admin());

commit;
