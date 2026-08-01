-- Kaderstatistik-App: Datenbankschema
-- Im Supabase SQL Editor (Projekt -> SQL Editor -> New query) ausfuehren.

-- ─────────────────────────────────────────────
-- Tabellen
-- ─────────────────────────────────────────────

-- Profildaten zu jedem Auth-Nutzer (Vorname, Nachname, Rolle).
-- Wird automatisch per Trigger befuellt, siehe Abschnitt weiter unten.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  role text not null check (role in ('trainer', 'parent_player')),
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  birth_date date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null unique, -- z.B. '2025/2026'
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- stellt sicher, dass hoechstens eine Saison als Standard markiert ist
create unique index if not exists one_default_season
  on seasons (is_default) where is_default = true;

create type event_type as enum ('training', 'game', 'event');

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  type event_type not null,
  event_date date not null,
  opponent text, -- nur relevant bei type = 'game'
  label text, -- nur relevant bei type = 'event'
  season text not null, -- z.B. '2025/2026'
  created_at timestamptz not null default now()
);

create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  present boolean not null default true,
  created_at timestamptz not null default now(),
  unique (player_id, event_id)
);

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  goal_count integer not null default 1 check (goal_count > 0),
  created_at timestamptz not null default now()
);

create table if not exists trainers (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists trainer_attendance (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references trainers(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  present boolean not null default true, -- war der Trainer tatsaechlich da
  confirmed boolean not null default false, -- hat der Trainer vorab zugesagt
  created_at timestamptz not null default now(),
  unique (trainer_id, event_id)
);

create table if not exists trainer_absences (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references trainers(id) on delete cascade,
  reason text not null default 'Abwesenheit',
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists idx_attendance_player on attendance(player_id);
create index if not exists idx_attendance_event on attendance(event_id);
create index if not exists idx_goals_player on goals(player_id);
create index if not exists idx_goals_event on goals(event_id);
create index if not exists idx_trainer_absences_trainer on trainer_absences(trainer_id);
create index if not exists idx_trainer_absences_dates on trainer_absences(start_date, end_date);
create index if not exists idx_events_date on events(event_date);
create index if not exists idx_events_season on events(season);
create index if not exists idx_trainer_attendance_trainer on trainer_attendance(trainer_id);
create index if not exists idx_trainer_attendance_event on trainer_attendance(event_id);

-- ─────────────────────────────────────────────
-- Statistik-Views
-- ─────────────────────────────────────────────

-- Anwesenheit pro Spieler und Monat
create or replace view attendance_by_month as
select
  p.id as player_id,
  p.first_name,
  p.last_name,
  e.season,
  date_trunc('month', e.event_date)::date as month,
  e.type,
  count(*) filter (where a.present) as attended,
  count(*) as total,
  round(
    100.0 * count(*) filter (where a.present) / nullif(count(*), 0), 1
  ) as attendance_pct
from attendance a
join players p on p.id = a.player_id
join events e on e.id = a.event_id
group by p.id, p.first_name, p.last_name, e.season, date_trunc('month', e.event_date), e.type;

-- Anwesenheit pro Spieler und Saison
create or replace view attendance_by_season as
select
  p.id as player_id,
  p.first_name,
  p.last_name,
  e.season,
  e.type,
  count(*) filter (where a.present) as attended,
  count(*) as total,
  round(
    100.0 * count(*) filter (where a.present) / nullif(count(*), 0), 1
  ) as attendance_pct
from attendance a
join players p on p.id = a.player_id
join events e on e.id = a.event_id
group by p.id, p.first_name, p.last_name, e.season, e.type;

-- Torstatistik pro Spieler und Saison
create or replace view goals_by_season as
select
  p.id as player_id,
  p.first_name,
  p.last_name,
  e.season,
  sum(g.goal_count) as goals
from goals g
join players p on p.id = g.player_id
join events e on e.id = g.event_id
group by p.id, p.first_name, p.last_name, e.season;

-- Gesamt-Anwesenheit des Teams (Spieler) pro Saison, ueber Training und Spiel hinweg
create or replace view attendance_overall_by_season as
select
  e.season,
  count(*) filter (where a.present) as attended,
  count(*) as total,
  round(
    100.0 * count(*) filter (where a.present) / nullif(count(*), 0), 1
  ) as attendance_pct
from attendance a
join events e on e.id = a.event_id
group by e.season;

-- Anwesenheit pro Trainer und Saison
create or replace view trainer_attendance_by_season as
select
  t.id as trainer_id,
  t.first_name,
  t.last_name,
  e.season,
  e.type,
  count(*) filter (where ta.present) as attended,
  count(*) as total,
  round(
    100.0 * count(*) filter (where ta.present) / nullif(count(*), 0), 1
  ) as attendance_pct
from trainer_attendance ta
join trainers t on t.id = ta.trainer_id
join events e on e.id = ta.event_id
group by t.id, t.first_name, t.last_name, e.season, e.type;

-- Anwesenheit pro Trainer und Monat
create or replace view trainer_attendance_by_month as
select
  t.id as trainer_id,
  t.first_name,
  t.last_name,
  e.season,
  date_trunc('month', e.event_date)::date as month,
  e.type,
  count(*) filter (where ta.present) as attended,
  count(*) as total,
  round(
    100.0 * count(*) filter (where ta.present) / nullif(count(*), 0), 1
  ) as attendance_pct
from trainer_attendance ta
join trainers t on t.id = ta.trainer_id
join events e on e.id = ta.event_id
group by t.id, t.first_name, t.last_name, e.season, date_trunc('month', e.event_date), e.type;

-- ─────────────────────────────────────────────
-- Trigger: bei Registrierung automatisch ein Profil anlegen
-- Liest Vorname/Nachname/Rolle aus den Metadaten, die die App beim
-- signUp() mitschickt (options.data).
-- ─────────────────────────────────────────────

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
    coalesce(new.raw_user_meta_data->>'role', 'parent_player'),
    new.email
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────
-- Row Level Security
-- Jeder eingeloggte Nutzer (Trainer/Betreuer) darf lesen und schreiben.
-- Fuer den Anfang reicht ein gemeinsames Team-Konto ohne feinere Rollen.
-- ─────────────────────────────────────────────

alter table players enable row level security;
alter table events enable row level security;
alter table attendance enable row level security;
alter table goals enable row level security;
alter table trainers enable row level security;
alter table trainer_attendance enable row level security;
alter table trainer_absences enable row level security;
alter table seasons enable row level security;
alter table profiles enable row level security;

create policy "authenticated read profiles" on profiles
  for select to authenticated using (true);

create policy "authenticated read trainer_absences" on trainer_absences
  for select to authenticated using (true);
create policy "authenticated write trainer_absences" on trainer_absences
  for insert to authenticated with check (true);
create policy "authenticated update trainer_absences" on trainer_absences
  for update to authenticated using (true);
create policy "authenticated delete trainer_absences" on trainer_absences
  for delete to authenticated using (true);

create policy "authenticated read seasons" on seasons
  for select to authenticated using (true);
create policy "authenticated write seasons" on seasons
  for insert to authenticated with check (true);
create policy "authenticated update seasons" on seasons
  for update to authenticated using (true);
create policy "authenticated delete seasons" on seasons
  for delete to authenticated using (true);

create policy "authenticated read players" on players
  for select to authenticated using (true);
create policy "authenticated write players" on players
  for insert to authenticated with check (true);
create policy "authenticated update players" on players
  for update to authenticated using (true);
create policy "authenticated delete players" on players
  for delete to authenticated using (true);

create policy "authenticated read events" on events
  for select to authenticated using (true);
create policy "authenticated write events" on events
  for insert to authenticated with check (true);
create policy "authenticated update events" on events
  for update to authenticated using (true);
create policy "authenticated delete events" on events
  for delete to authenticated using (true);

create policy "authenticated read attendance" on attendance
  for select to authenticated using (true);
create policy "authenticated write attendance" on attendance
  for insert to authenticated with check (true);
create policy "authenticated update attendance" on attendance
  for update to authenticated using (true);
create policy "authenticated delete attendance" on attendance
  for delete to authenticated using (true);

create policy "authenticated read goals" on goals
  for select to authenticated using (true);
create policy "authenticated write goals" on goals
  for insert to authenticated with check (true);
create policy "authenticated update goals" on goals
  for update to authenticated using (true);
create policy "authenticated delete goals" on goals
  for delete to authenticated using (true);

create policy "authenticated read trainers" on trainers
  for select to authenticated using (true);
create policy "authenticated write trainers" on trainers
  for insert to authenticated with check (true);
create policy "authenticated update trainers" on trainers
  for update to authenticated using (true);
create policy "authenticated delete trainers" on trainers
  for delete to authenticated using (true);

create policy "authenticated read trainer_attendance" on trainer_attendance
  for select to authenticated using (true);
create policy "authenticated write trainer_attendance" on trainer_attendance
  for insert to authenticated with check (true);
create policy "authenticated update trainer_attendance" on trainer_attendance
  for update to authenticated using (true);
create policy "authenticated delete trainer_attendance" on trainer_attendance
  for delete to authenticated using (true);
