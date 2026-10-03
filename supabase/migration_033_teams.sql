-- Migration 033: Plattform fuer mehrere Teams
-- Im Supabase SQL Editor ausfuehren. Setzt migration_032_checklists.sql voraus.
--
-- * teams: jedes Team (name = Anzeige in der App, match_name = Mannschaftsname
--   im Spielbetrieb/Live-Ergebnis). Das bestehende Team wird "TVG E1".
-- * Teamdaten (Kader, Termine, Training, Performance, Checklisten ...) sind
--   ueber team_id bzw. ihren Termin/Spieler/Trainer einem Team zugeordnet und
--   nur fuer dessen freigegebene Trainer sichtbar. Neue Datensaetze bekommen
--   automatisch das Team des angemeldeten Nutzers (default current_team_id()).
-- * Gemeinsam fuer alle Teams: exercises (Uebungsdatenbank), fields,
--   exercise_focuses (Skills), event_types (Terminarten). Welche Uebung ein
--   Team unter "Uebungen" sieht, steht in team_exercises.
-- * profiles.is_admin: Plattform-Admin, gibt neue Trainer und Teams frei.
--   profiles.requested_team: bei der Registrierung beantragtes Team.

begin;

-- 1. Teams und Profile ---------------------------------------------------------

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(trim(name)) > 0),
  match_name text not null check (char_length(trim(match_name)) > 0),
  created_at timestamptz not null default now()
);

insert into teams (name, match_name) values ('TVG E1', 'TV Geisenhausen E7 1')
on conflict (name) do nothing;

alter table profiles add column if not exists team_id uuid references teams(id) on delete set null;
alter table profiles add column if not exists is_admin boolean not null default false;
alter table profiles add column if not exists requested_team text;

update profiles
set team_id = (select id from teams where name = 'TVG E1')
where role in ('trainer', 'parent_player') and team_id is null;

-- Plattform-Admin: die Konten des Betreibers. Falls hier eine andere
-- E-Mail-Adresse noetig ist, vor dem Ausfuehren anpassen.
update profiles set is_admin = true
where lower(email) in ('mueller.mm.markus@gmail.com', 'markus.mueller.gsh@gmail.com');

do $$
begin
  if not exists (select 1 from profiles where is_admin) then
    raise exception 'Kein Admin-Konto gefunden - bitte E-Mail-Adressen in migration_033 (Abschnitt 1) anpassen.';
  end if;
end $$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, role, email, requested_team)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    'pending',
    new.email,
    nullif(trim(new.raw_user_meta_data->>'requested_team'), '')
  );
  return new;
end;
$$;

-- 2. Hilfsfunktionen fuer die Row-Level-Security ----------------------------

create or replace function public.current_team_id()
returns uuid language sql security definer set search_path = public stable as $$
  select team_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Freigegebener Trainer eines Teams.
create or replace function public.is_trainer()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'trainer' and team_id is not null
  );
$$;

-- Wer Daten lesen darf. Eltern/Spieler haben vorerst KEINEN Zugriff; um sie
-- spaeter zuzulassen: role in ('trainer', 'parent_player').
create or replace function public.is_member()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'trainer' and team_id is not null
  );
$$;

-- 3. team_id an den Team-Tabellen ---------------------------------------------

do $$
declare
  t text;
  tvg uuid := (select id from teams where name = 'TVG E1');
begin
  foreach t in array array['players', 'trainers', 'seasons', 'events', 'performance_updates', 'checklists'] loop
    execute format('alter table public.%I add column if not exists team_id uuid references public.teams(id) on delete cascade', t);
    execute format('update public.%I set team_id = %L where team_id is null', t, tvg);
    execute format('alter table public.%I alter column team_id set not null', t);
    execute format('alter table public.%I alter column team_id set default public.current_team_id()', t);
    execute format('create index if not exists %I on public.%I(team_id)', t || '_team_id_idx', t);
  end loop;
end $$;

-- Saisonnamen und Standard-Saison je Team statt global eindeutig.
alter table seasons drop constraint if exists seasons_name_key;
drop index if exists seasons_name_key;
create unique index if not exists seasons_team_name_key on seasons(team_id, name);
drop index if exists one_default_season;
create unique index if not exists one_default_season on seasons(team_id) where is_default;

-- 4. Uebungen je Team aktivieren -----------------------------------------------

create table if not exists team_exercises (
  team_id uuid not null default public.current_team_id() references teams(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (team_id, exercise_id)
);

insert into team_exercises (team_id, exercise_id)
select (select id from teams where name = 'TVG E1'), id from exercises
on conflict do nothing;

-- 4b. Team-Pruefungen fuer Tabellen ohne eigene team_id -----------------------
-- (erst hier, weil SQL-Funktionen beim Anlegen gegen die Tabellen geprueft
-- werden und die team_id-Spalten bzw. team_exercises vorher nicht existieren)

create or replace function public.event_in_my_team(p_event_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.events where id = p_event_id and team_id = public.current_team_id());
$$;

create or replace function public.player_in_my_team(p_player_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.players where id = p_player_id and team_id = public.current_team_id());
$$;

create or replace function public.trainer_in_my_team(p_trainer_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.trainers where id = p_trainer_id and team_id = public.current_team_id());
$$;

create or replace function public.training_in_my_team(p_training_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.trainings t join public.events e on e.id = t.event_id
    where t.id = p_training_id and e.team_id = public.current_team_id()
  );
$$;

create or replace function public.training_exercise_in_my_team(p_training_exercise_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.training_exercises te
    join public.trainings t on t.id = te.training_id
    join public.events e on e.id = t.event_id
    where te.id = p_training_exercise_id and e.team_id = public.current_team_id()
  );
$$;

create or replace function public.match_result_in_my_team(p_match_result_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.match_results m join public.events e on e.id = m.event_id
    where m.id = p_match_result_id and e.team_id = public.current_team_id()
  );
$$;

create or replace function public.performance_update_in_my_team(p_update_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.performance_updates where id = p_update_id and team_id = public.current_team_id());
$$;

create or replace function public.checklist_in_my_team(p_checklist_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.checklists where id = p_checklist_id and team_id = public.current_team_id());
$$;

-- In wie vielen Teams eine Uebung aktiv ist (fuer das Loeschen: nur dann
-- endgueltig, wenn kein anderes Team sie nutzt).
create or replace function public.exercise_team_count(p_exercise_id uuid)
returns integer language sql security definer set search_path = public stable as $$
  select count(*)::integer from public.team_exercises where exercise_id = p_exercise_id;
$$;

-- 5. Policies neu aufsetzen ----------------------------------------------------

do $$
declare
  p record;
begin
  for p in
    select tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in (
      'teams', 'profiles', 'login_events', 'team_exercises',
      'players', 'trainers', 'seasons', 'events', 'performance_updates', 'checklists',
      'player_private', 'attendance', 'attendance_assessments', 'trainer_attendance', 'goals',
      'trainings', 'training_exercises', 'training_exercise_groups', 'training_player_groups',
      'lineups', 'match_results', 'match_goal_entries', 'performance_ratings',
      'checklist_items', 'trainer_absences',
      'exercises', 'fields', 'exercise_focuses', 'event_types'
    )
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

alter table teams enable row level security;
alter table team_exercises enable row level security;

-- Teams und Nutzerkonten
create policy "own team or admin read teams" on teams
  for select to authenticated using (id = current_team_id() or is_admin());
create policy "admin write teams" on teams
  for all to authenticated using (is_admin()) with check (is_admin());

create policy "own or admin read profiles" on profiles
  for select to authenticated using (id = auth.uid() or is_admin());
create policy "admin update profiles" on profiles
  for update to authenticated using (is_admin()) with check (is_admin());

create policy "own login insert" on login_events
  for insert to authenticated with check (user_id = auth.uid());
create policy "admin read login_events" on login_events
  for select to authenticated using (is_admin());

-- Tabellen mit eigener team_id
do $$
declare
  t text;
begin
  foreach t in array array['players', 'trainers', 'seasons', 'events', 'performance_updates', 'checklists', 'team_exercises'] loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (is_member() and team_id = current_team_id())',
      'team read ' || t, t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (is_trainer() and team_id = current_team_id()) with check (is_trainer() and team_id = current_team_id())',
      'team trainer write ' || t, t);
  end loop;
end $$;

-- Tabellen, die ueber ihren Termin/Spieler/Trainer/... einem Team gehoeren
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('player_private', 'player_in_my_team(player_id)'),
      ('attendance', 'event_in_my_team(event_id)'),
      ('attendance_assessments', 'event_in_my_team(event_id)'),
      ('trainer_attendance', 'event_in_my_team(event_id)'),
      ('goals', 'event_in_my_team(event_id)'),
      ('trainings', 'event_in_my_team(event_id)'),
      ('lineups', 'event_in_my_team(event_id)'),
      ('match_results', 'event_in_my_team(event_id)'),
      ('training_exercises', 'training_in_my_team(training_id)'),
      ('training_player_groups', 'training_in_my_team(training_id)'),
      ('training_exercise_groups', 'training_exercise_in_my_team(training_exercise_id)'),
      ('match_goal_entries', 'match_result_in_my_team(match_result_id)'),
      ('performance_ratings', 'performance_update_in_my_team(update_id)'),
      ('checklist_items', 'checklist_in_my_team(checklist_id)'),
      ('trainer_absences', 'trainer_in_my_team(trainer_id)')
    ) as v(tbl, cond)
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (is_member() and %s)',
      'team read ' || r.tbl, r.tbl, r.cond);
    execute format(
      'create policy %I on public.%I for all to authenticated using (is_trainer() and %s) with check (is_trainer() and %s)',
      'team trainer write ' || r.tbl, r.tbl, r.cond, r.cond);
  end loop;
end $$;

-- Gemeinsame Daten aller Teams
create policy "member read exercises" on exercises
  for select to authenticated using (is_member());
create policy "trainer write exercises" on exercises
  for all to authenticated using (is_trainer()) with check (is_trainer());

create policy "member read fields" on fields
  for select to authenticated using (is_member());
create policy "trainer write fields" on fields
  for all to authenticated using (is_trainer()) with check (is_trainer());

create policy "member read exercise_focuses" on exercise_focuses
  for select to authenticated using (is_member());
create policy "admin write exercise_focuses" on exercise_focuses
  for all to authenticated using (is_admin()) with check (is_admin());

create policy "member read event_types" on event_types
  for select to authenticated using (is_member());
create policy "admin write event_types" on event_types
  for all to authenticated using (is_admin()) with check (is_admin());

commit;
