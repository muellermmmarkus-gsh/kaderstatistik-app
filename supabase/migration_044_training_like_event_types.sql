-- Migration 044: Eigene Terminarten "wie Training" (z.B. Hallentraining)
-- Im Supabase SQL Editor ausfuehren. Setzt migration_043_field_plan_dates.sql voraus.
--
-- event_types.is_training: Terminarten mit Haken verhalten sich wie ein
-- Training (Entschuldigt, Bewertungen, Trainingsplan, Trainingsplatzplan,
-- Statistik/Kaderstatistik zaehlen sie als Training). Einstellbar unter
-- "Einstellungen -> Termine". Fuer "Hallentraining" wird der Haken gesetzt.
--
-- Die Statistik-Ansichten melden solche Termine als type = 'training', damit
-- Auswertungen und Export sie mitzaehlen.

begin;

alter table event_types add column if not exists is_training boolean not null default false;
update event_types set is_training = true
where key = 'training' or lower(trim(label)) = 'hallentraining';

create or replace function public.is_training_type(event_type text)
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce((select et.is_training from event_types et where et.key = event_type), event_type = 'training');
$$;

-- Statistik-Ansichten (Stand migration_027), Trainingsarten als 'training'
create or replace view attendance_by_month with (security_invoker = true) as
select
  p.id as player_id,
  p.first_name,
  p.last_name,
  e.season,
  date_trunc('month', e.event_date)::date as month,
  case when public.is_training_type(e.type) then 'training' else e.type end as type,
  count(*) filter (where a.present) as attended,
  count(*) as total,
  round(
    100.0 * count(*) filter (where a.present) / nullif(count(*), 0), 1
  ) as attendance_pct
from attendance a
join players p on p.id = a.player_id
join events e on e.id = a.event_id and e.deleted_at is null and e.event_date <= current_date
group by p.id, p.first_name, p.last_name, e.season, date_trunc('month', e.event_date),
  case when public.is_training_type(e.type) then 'training' else e.type end;

create or replace view attendance_by_season with (security_invoker = true) as
select
  p.id as player_id,
  p.first_name,
  p.last_name,
  e.season,
  case when public.is_training_type(e.type) then 'training' else e.type end as type,
  count(*) filter (where a.present) as attended,
  count(*) as total,
  round(
    100.0 * count(*) filter (where a.present) / nullif(count(*), 0), 1
  ) as attendance_pct
from attendance a
join players p on p.id = a.player_id
join events e on e.id = a.event_id and e.deleted_at is null and e.event_date <= current_date
group by p.id, p.first_name, p.last_name, e.season,
  case when public.is_training_type(e.type) then 'training' else e.type end;

create or replace view trainer_attendance_by_season with (security_invoker = true) as
select
  t.id as trainer_id,
  t.first_name,
  t.last_name,
  e.season,
  case when public.is_training_type(e.type) then 'training' else e.type end as type,
  count(*) filter (where ta.present) as attended,
  count(*) as total,
  round(
    100.0 * count(*) filter (where ta.present) / nullif(count(*), 0), 1
  ) as attendance_pct
from trainer_attendance ta
join trainers t on t.id = ta.trainer_id
join events e on e.id = ta.event_id and e.deleted_at is null and e.event_date <= current_date
group by t.id, t.first_name, t.last_name, e.season,
  case when public.is_training_type(e.type) then 'training' else e.type end;

create or replace view trainer_attendance_by_month with (security_invoker = true) as
select
  t.id as trainer_id,
  t.first_name,
  t.last_name,
  e.season,
  date_trunc('month', e.event_date)::date as month,
  case when public.is_training_type(e.type) then 'training' else e.type end as type,
  count(*) filter (where ta.present) as attended,
  count(*) as total,
  round(
    100.0 * count(*) filter (where ta.present) / nullif(count(*), 0), 1
  ) as attendance_pct
from trainer_attendance ta
join trainers t on t.id = ta.trainer_id
join events e on e.id = ta.event_id and e.deleted_at is null and e.event_date <= current_date
group by t.id, t.first_name, t.last_name, e.season, date_trunc('month', e.event_date),
  case when public.is_training_type(e.type) then 'training' else e.type end;

-- Trainingstermine fuer die Trainingsplatzplanung (Stand migration_043)
create or replace function public.training_dates()
returns table (event_date date, teams text)
language sql
security definer
set search_path = public
stable
as $$
  select e.event_date, string_agg(distinct t.name, ', ' order by t.name)
  from events e
  left join teams t on t.id = e.team_id
  where public.is_training_type(e.type)
    and e.deleted_at is null
    and public.is_member()
  group by e.event_date
  order by e.event_date;
$$;

-- Einsaetze je Uebung in der laufenden Saison (Stand migration_036)
create or replace function public.exercise_usage_current_season()
returns table (exercise_id uuid, team_name text, uses integer)
language sql security definer set search_path = public stable as $$
  with current_season as (
    select
      t.id as team_id,
      t.name as team_name,
      coalesce(
        (select s.name from seasons s where s.team_id = t.id and s.is_default limit 1),
        (select s.name from seasons s where s.team_id = t.id order by s.name desc limit 1)
      ) as season
    from teams t
  )
  select te.exercise_id, cs.team_name, count(distinct e.id)::integer as uses
  from training_exercises te
  join trainings tr on tr.id = te.training_id
  join events e on e.id = tr.event_id
  join current_season cs on cs.team_id = e.team_id and cs.season = e.season
  where public.is_training_type(e.type)
    and e.deleted_at is null
    and public.is_member()
  group by te.exercise_id, cs.team_name;
$$;

commit;
