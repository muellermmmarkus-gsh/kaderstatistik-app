-- Migration 036: Einsaetze je Uebung ueber alle Teams (laufende Saison)
-- Im Supabase SQL Editor ausfuehren. Setzt migration_033_teams.sql voraus.
--
-- Die Uebungsdatenbank zeigt in "akt.Sai." die Summe der Einsaetze aller Teams
-- und in "Teams" die Teams, die die Uebung genutzt haben. Fremde Trainings
-- sind per RLS nicht lesbar - diese Funktion gibt deshalb nur Summen heraus
-- (Uebung, Teamname, Anzahl), keine Termine oder Personen.
--
-- Laufende Saison je Team: die als Standard markierte, sonst die neueste.
-- Gezaehlt wird wie in der Uebungshistorie: je Trainingstermin einmal.

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
  where e.type = 'training'
    and e.deleted_at is null
    and public.is_member()
  group by te.exercise_id, cs.team_name;
$$;
