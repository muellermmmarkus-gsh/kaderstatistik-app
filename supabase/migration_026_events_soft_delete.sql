-- Migration 026: Termine "loeschen" als Soft-Delete
-- Im Supabase SQL Editor ausfuehren.
--
-- "Loeschen" setzt ab jetzt nur noch deleted_at auf events, statt die Zeile
-- (und per on-delete-cascade alle verknuepften Anwesenheits-, Tor-,
-- Trainings- und Aufstellungsdaten) unwiderruflich zu entfernen. Der Termin
-- verschwindet dadurch ueberall in der App, bleibt aber in der Datenbank
-- erhalten.
--
-- Reaktivierung im Notfall durch einen Admin im Supabase SQL Editor:
--   -- geloeschte Termine auflisten, um die passende id zu finden:
--   select id, type, event_date, opponent, season, deleted_at
--   from events where deleted_at is not null order by deleted_at desc;
--
--   -- Termin wieder aktivieren:
--   update events set deleted_at = null where id = '<event-id>';

alter table events add column if not exists deleted_at timestamptz;

create index if not exists idx_events_not_deleted on events(id) where deleted_at is null;

-- Statistik-Views neu erstellen, damit Daten geloeschter Termine nicht mehr
-- einfliessen.
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
join events e on e.id = a.event_id and e.deleted_at is null
group by p.id, p.first_name, p.last_name, e.season, date_trunc('month', e.event_date), e.type;

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
join events e on e.id = a.event_id and e.deleted_at is null
group by p.id, p.first_name, p.last_name, e.season, e.type;

create or replace view goals_by_season as
select
  p.id as player_id,
  p.first_name,
  p.last_name,
  e.season,
  sum(g.goal_count) as goals
from goals g
join players p on p.id = g.player_id
join events e on e.id = g.event_id and e.deleted_at is null
group by p.id, p.first_name, p.last_name, e.season;

create or replace view attendance_overall_by_season as
select
  e.season,
  count(*) filter (where a.present) as attended,
  count(*) as total,
  round(
    100.0 * count(*) filter (where a.present) / nullif(count(*), 0), 1
  ) as attendance_pct
from attendance a
join events e on e.id = a.event_id and e.deleted_at is null
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
join events e on e.id = ta.event_id and e.deleted_at is null
group by t.id, t.first_name, t.last_name, e.season, e.type;

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
join events e on e.id = ta.event_id and e.deleted_at is null
group by t.id, t.first_name, t.last_name, e.season, date_trunc('month', e.event_date), e.type;
