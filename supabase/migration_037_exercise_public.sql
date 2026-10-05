-- Migration 037: Uebungen oeffentlich / nicht oeffentlich
-- Im Supabase SQL Editor ausfuehren. Setzt migration_035_exercise_edit_own_team.sql voraus.
--
-- exercises.is_public (Standard: oeffentlich, auch fuer alle bestehenden
-- Uebungen). Nicht oeffentliche Uebungen sehen nur:
--   * der Admin,
--   * das Team, das sie erstellt hat,
--   * Teams, die sie bereits uebernommen ("In Team aktiv") oder in einem
--     Trainingsplan verwendet haben - damit deren Plaene nicht kaputtgehen.
-- Umschalten darf, wer die Uebung aendern darf (Admin, Erstellerteam).

begin;

alter table exercises add column if not exists is_public boolean not null default true;

create or replace function public.can_see_exercise(
  p_exercise_id uuid,
  p_is_public boolean,
  p_created_by_team_id uuid
)
returns boolean language sql security definer set search_path = public stable as $$
  select
    p_is_public
    or public.is_admin()
    or p_created_by_team_id = public.current_team_id()
    or exists (
      select 1 from public.team_exercises te
      where te.exercise_id = p_exercise_id and te.team_id = public.current_team_id()
    )
    or exists (
      select 1 from public.training_exercises x
      join public.trainings t on t.id = x.training_id
      join public.events e on e.id = t.event_id
      where x.exercise_id = p_exercise_id and e.team_id = public.current_team_id()
    );
$$;

drop policy if exists "member read exercises" on exercises;
create policy "member read exercises" on exercises
  for select to authenticated
  using (is_member() and can_see_exercise(id, is_public, created_by_team_id));

commit;
