-- Migration 027: Anwesenheitsstatistik zaehlt nur stattgefundene Termine
-- Im Supabase SQL Editor ausfuehren. Setzt migration_026_events_soft_delete.sql voraus.
--
-- Bisher flossen alle Anwesenheitszeilen in die Statistik ein - auch die
-- von zukuenftigen Terminen (z.B. angelegt durch "Angemeldet" bei einem
-- kommenden Spiel, present = false). Dadurch stieg "Gesamt" schon vor dem
-- Termin und Spieler galten als abwesend. Jetzt zaehlen nur Termine bis
-- einschliesslich heute (wie auf der Startseite).

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
join events e on e.id = a.event_id and e.deleted_at is null and e.event_date <= current_date
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
join events e on e.id = a.event_id and e.deleted_at is null and e.event_date <= current_date
group by p.id, p.first_name, p.last_name, e.season, e.type;

create or replace view attendance_overall_by_season as
select
  e.season,
  count(*) filter (where a.present) as attended,
  count(*) as total,
  round(
    100.0 * count(*) filter (where a.present) / nullif(count(*), 0), 1
  ) as attendance_pct
from attendance a
join events e on e.id = a.event_id and e.deleted_at is null and e.event_date <= current_date
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
join events e on e.id = ta.event_id and e.deleted_at is null and e.event_date <= current_date
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
join events e on e.id = ta.event_id and e.deleted_at is null and e.event_date <= current_date
group by t.id, t.first_name, t.last_name, e.season, date_trunc('month', e.event_date), e.type;
