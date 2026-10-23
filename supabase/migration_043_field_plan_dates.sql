-- Migration 043: Trainingsplatzplaene je Trainingstermin
-- Im Supabase SQL Editor ausfuehren. Setzt migration_042_field_plans.sql voraus.
--
-- Pro Trainingsdatum gibt es genau einen teamuebergreifenden Platzplan
-- (field_plans.plan_date), denn Mannschaften, die am selben Tag trainieren,
-- teilen sich den Platz. Plaene ohne Datum bleiben als "weitere Plaene".
--
-- training_dates(): alle Trainingsdaten aller Teams mit den Teamnamen, damit
-- jede Mannschaft im Dropdown auch die Termine der anderen sieht. Liefert nur
-- Datum und Teamname (keine Spieler- oder Termindetails) und nur fuer
-- freigeschaltete Nutzer.

begin;

alter table field_plans add column if not exists plan_date date;
create unique index if not exists field_plans_plan_date_key on field_plans (plan_date);

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
  where e.type = 'training'
    and e.deleted_at is null
    and public.is_member()
  group by e.event_date
  order by e.event_date;
$$;

revoke all on function public.training_dates() from public;
grant execute on function public.training_dates() to authenticated;

commit;
