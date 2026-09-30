-- Migration 031: Datenschutz
-- Im Supabase SQL Editor ausfuehren. Setzt migration_030_login_events.sql voraus.
--
-- 1. Neue Nutzer starten als "pending" (ohne Datenzugriff), bis ein Trainer
--    sie in der Admin-Uebersicht freischaltet. Die bei der Registrierung
--    mitgeschickte Rolle wird ignoriert - sie ist vom Client frei waehlbar.
-- 2. Lesen nur noch fuer freigeschaltete Nutzer, Schreiben nur fuer Trainer.
-- 3. Views laufen mit den Rechten des Aufrufers (sonst umgehen sie die
--    Row-Level-Security und waeren sogar ohne Login ueber die API lesbar).
-- 4. Geburtsdatum/Passnummer der Spieler, Trainingsbewertungen und
--    Performance-Noten nur noch fuer Trainer lesbar.

begin;

-- 1. Rollen / Freischaltung ------------------------------------------------

alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('pending', 'parent_player', 'trainer'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, role, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    'pending',
    new.email
  );
  return new;
end;
$$;

create or replace function public.is_member()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('trainer', 'parent_player')
  );
$$;

drop policy if exists "authenticated read profiles" on profiles;
drop policy if exists "own or trainer read profiles" on profiles;
create policy "own or trainer read profiles" on profiles
  for select to authenticated using (id = auth.uid() or is_trainer());

drop policy if exists "trainer update profiles" on profiles;
create policy "trainer update profiles" on profiles
  for update to authenticated using (is_trainer()) with check (is_trainer());

-- 2. Offene Policies absichern ----------------------------------------------

do $$
declare
  p record;
begin
  for p in
    select tablename, policyname, cmd, qual, with_check
    from pg_policies
    where schemaname = 'public' and tablename not in ('profiles', 'login_events')
  loop
    if p.cmd = 'SELECT' and p.qual = 'true' then
      execute format('alter policy %I on public.%I using (public.is_member())',
        p.policyname, p.tablename);
    elsif p.cmd in ('UPDATE', 'DELETE') and p.qual = 'true' then
      execute format('alter policy %I on public.%I using (public.is_trainer())',
        p.policyname, p.tablename);
    elsif p.cmd = 'INSERT' and p.with_check = 'true' then
      execute format('alter policy %I on public.%I with check (public.is_trainer())',
        p.policyname, p.tablename);
    elsif p.qual = 'true' or p.with_check = 'true' then
      raise notice 'Nicht automatisch angepasst: % auf % (%)', p.policyname, p.tablename, p.cmd;
    end if;
  end loop;
end $$;

-- 3. Views mit Rechten des Aufrufers ------------------------------------------

do $$
declare
  v record;
begin
  for v in select viewname from pg_views where schemaname = 'public' loop
    execute format('alter view public.%I set (security_invoker = true)', v.viewname);
  end loop;
end $$;

-- 4a. Geburtsdatum und Passnummer der Spieler -----------------------------------

create table if not exists player_private (
  player_id uuid primary key references players(id) on delete cascade,
  birth_date date,
  passnummer text
);

insert into player_private (player_id, birth_date, passnummer)
select id, birth_date, passnummer
from players
where birth_date is not null or passnummer is not null
on conflict (player_id) do nothing;

alter table players drop column if exists birth_date;
alter table players drop column if exists passnummer;

alter table player_private enable row level security;
drop policy if exists "trainer all player_private" on player_private;
create policy "trainer all player_private" on player_private
  for all to authenticated using (is_trainer()) with check (is_trainer());

-- 4b. Trainingsbewertungen (bisher Spalten in attendance) -----------------------

create table if not exists attendance_assessments (
  event_id uuid not null references events(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  performance text check (performance in ('stark', 'mittel', 'schwach')),
  motivation text check (motivation in ('hoch', 'mittel', 'niedrig')),
  discipline text check (discipline in ('sehr gut', 'mittel', 'gering')),
  player_notes text check (char_length(player_notes) <= 50),
  primary key (event_id, player_id)
);

insert into attendance_assessments (event_id, player_id, performance, motivation, discipline, player_notes)
select event_id, player_id, performance, motivation, discipline, player_notes
from attendance
where coalesce(performance, motivation, discipline, player_notes) is not null
on conflict (event_id, player_id) do nothing;

alter table attendance drop column if exists performance;
alter table attendance drop column if exists motivation;
alter table attendance drop column if exists discipline;
alter table attendance drop column if exists player_notes;

alter table attendance_assessments enable row level security;
drop policy if exists "trainer all attendance_assessments" on attendance_assessments;
create policy "trainer all attendance_assessments" on attendance_assessments
  for all to authenticated using (is_trainer()) with check (is_trainer());

-- 4c. Performance-Noten -----------------------------------------------------------

do $$
declare
  p record;
begin
  for p in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('performance_updates', 'performance_ratings')
      and cmd = 'SELECT'
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

create policy "trainer read performance_updates" on performance_updates
  for select to authenticated using (is_trainer());
create policy "trainer read performance_ratings" on performance_ratings
  for select to authenticated using (is_trainer());

commit;
