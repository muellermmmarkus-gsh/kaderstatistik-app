-- Kaderstatistik-App: Datenbankschema
-- Im Supabase SQL Editor (Projekt -> SQL Editor -> New query) ausfuehren.

-- ─────────────────────────────────────────────
-- Tabellen
-- ─────────────────────────────────────────────

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  birth_date date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create type event_type as enum ('training', 'game');

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  type event_type not null,
  event_date date not null,
  opponent text, -- nur relevant bei type = 'game'
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

create index if not exists idx_attendance_player on attendance(player_id);
create index if not exists idx_attendance_event on attendance(event_id);
create index if not exists idx_goals_player on goals(player_id);
create index if not exists idx_goals_event on goals(event_id);
create index if not exists idx_events_date on events(event_date);
create index if not exists idx_events_season on events(season);

-- ─────────────────────────────────────────────
-- Statistik-Views
-- ─────────────────────────────────────────────

-- Anwesenheit pro Spieler und Monat
create or replace view attendance_by_month as
select
  p.id as player_id,
  p.first_name,
  p.last_name,
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
group by p.id, p.first_name, p.last_name, date_trunc('month', e.event_date), e.type;

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

-- ─────────────────────────────────────────────
-- Row Level Security
-- Jeder eingeloggte Nutzer (Trainer/Betreuer) darf lesen und schreiben.
-- Fuer den Anfang reicht ein gemeinsames Team-Konto ohne feinere Rollen.
-- ─────────────────────────────────────────────

alter table players enable row level security;
alter table events enable row level security;
alter table attendance enable row level security;
alter table goals enable row level security;

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
