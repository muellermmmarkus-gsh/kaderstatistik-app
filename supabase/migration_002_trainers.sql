-- Migration: Trainer-Verwaltung und -Anwesenheit ergaenzen
-- Im Supabase SQL Editor ausfuehren (einmalig, zusaetzlich zu schema.sql).

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
  present boolean not null default true,
  created_at timestamptz not null default now(),
  unique (trainer_id, event_id)
);

create index if not exists idx_trainer_attendance_trainer on trainer_attendance(trainer_id);
create index if not exists idx_trainer_attendance_event on trainer_attendance(event_id);

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

alter table trainers enable row level security;
alter table trainer_attendance enable row level security;

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
