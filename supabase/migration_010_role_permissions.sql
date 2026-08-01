-- Migration: Eltern/Spieler auf Nur-Lese-Rechte beschraenken
-- Im Supabase SQL Editor ausfuehren.
-- Setzt migration_009_profiles.sql voraus (Tabelle profiles mit role-Spalte).

create or replace function public.is_trainer()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'trainer'
  );
$$;

-- Bestehende Schreib-Policies (insert/update/delete) auf allen Tabellen
-- loeschen und mit is_trainer()-Bedingung neu anlegen. Lese-Policies
-- (select) bleiben unveraendert -- alle eingeloggten Nutzer duerfen weiter lesen.

drop policy if exists "authenticated write trainer_absences" on trainer_absences;
drop policy if exists "authenticated update trainer_absences" on trainer_absences;
drop policy if exists "authenticated delete trainer_absences" on trainer_absences;
create policy "authenticated write trainer_absences" on trainer_absences
  for insert to authenticated with check (is_trainer());
create policy "authenticated update trainer_absences" on trainer_absences
  for update to authenticated using (is_trainer());
create policy "authenticated delete trainer_absences" on trainer_absences
  for delete to authenticated using (is_trainer());

drop policy if exists "authenticated write seasons" on seasons;
drop policy if exists "authenticated update seasons" on seasons;
drop policy if exists "authenticated delete seasons" on seasons;
create policy "authenticated write seasons" on seasons
  for insert to authenticated with check (is_trainer());
create policy "authenticated update seasons" on seasons
  for update to authenticated using (is_trainer());
create policy "authenticated delete seasons" on seasons
  for delete to authenticated using (is_trainer());

drop policy if exists "authenticated write players" on players;
drop policy if exists "authenticated update players" on players;
drop policy if exists "authenticated delete players" on players;
create policy "authenticated write players" on players
  for insert to authenticated with check (is_trainer());
create policy "authenticated update players" on players
  for update to authenticated using (is_trainer());
create policy "authenticated delete players" on players
  for delete to authenticated using (is_trainer());

drop policy if exists "authenticated write events" on events;
drop policy if exists "authenticated update events" on events;
drop policy if exists "authenticated delete events" on events;
create policy "authenticated write events" on events
  for insert to authenticated with check (is_trainer());
create policy "authenticated update events" on events
  for update to authenticated using (is_trainer());
create policy "authenticated delete events" on events
  for delete to authenticated using (is_trainer());

drop policy if exists "authenticated write attendance" on attendance;
drop policy if exists "authenticated update attendance" on attendance;
drop policy if exists "authenticated delete attendance" on attendance;
create policy "authenticated write attendance" on attendance
  for insert to authenticated with check (is_trainer());
create policy "authenticated update attendance" on attendance
  for update to authenticated using (is_trainer());
create policy "authenticated delete attendance" on attendance
  for delete to authenticated using (is_trainer());

drop policy if exists "authenticated write goals" on goals;
drop policy if exists "authenticated update goals" on goals;
drop policy if exists "authenticated delete goals" on goals;
create policy "authenticated write goals" on goals
  for insert to authenticated with check (is_trainer());
create policy "authenticated update goals" on goals
  for update to authenticated using (is_trainer());
create policy "authenticated delete goals" on goals
  for delete to authenticated using (is_trainer());

drop policy if exists "authenticated write trainers" on trainers;
drop policy if exists "authenticated update trainers" on trainers;
drop policy if exists "authenticated delete trainers" on trainers;
create policy "authenticated write trainers" on trainers
  for insert to authenticated with check (is_trainer());
create policy "authenticated update trainers" on trainers
  for update to authenticated using (is_trainer());
create policy "authenticated delete trainers" on trainers
  for delete to authenticated using (is_trainer());

drop policy if exists "authenticated write trainer_attendance" on trainer_attendance;
drop policy if exists "authenticated update trainer_attendance" on trainer_attendance;
drop policy if exists "authenticated delete trainer_attendance" on trainer_attendance;
create policy "authenticated write trainer_attendance" on trainer_attendance
  for insert to authenticated with check (is_trainer());
create policy "authenticated update trainer_attendance" on trainer_attendance
  for update to authenticated using (is_trainer());
create policy "authenticated delete trainer_attendance" on trainer_attendance
  for delete to authenticated using (is_trainer());
