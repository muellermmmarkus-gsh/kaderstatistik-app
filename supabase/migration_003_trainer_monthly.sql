-- Migration: Monatsansicht fuer Trainer-Anwesenheit ergaenzen
-- Setzt migration_002_trainers.sql voraus (Tabelle trainer_attendance).
-- Im Supabase SQL Editor ausfuehren.

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
