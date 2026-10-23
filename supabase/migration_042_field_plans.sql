-- Migration 042: Trainingsplatzplanung (teamuebergreifend)
-- Im Supabase SQL Editor ausfuehren. Setzt migration_040_last_activity.sql voraus.
--
-- field_plans: Aufteilung eines Grossfelds auf gleichzeitig trainierende
-- Mannschaften (Flaechen mit Mannschaftsname, Tore). Bewusst ohne team_id:
-- alle freigegebenen Trainer aller Teams sehen und bearbeiten dieselben Plaene,
-- damit sich die Teams abstimmen koennen. items = Liste der Elemente (JSON).

begin;

create table if not exists field_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 100),
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by_team_id uuid default public.current_team_id() references teams(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table field_plans enable row level security;

drop policy if exists "member read field_plans" on field_plans;
create policy "member read field_plans" on field_plans
  for select to authenticated using (is_member());
drop policy if exists "trainer write field_plans" on field_plans;
create policy "trainer write field_plans" on field_plans
  for all to authenticated using (is_trainer()) with check (is_trainer());

-- "Letzte Aktivitaet" in der Admin-Uebersicht auch beim Speichern von Plaenen.
drop trigger if exists touch_last_activity on field_plans;
create trigger touch_last_activity after insert or update or delete on field_plans
  for each statement execute function public.touch_last_activity();

commit;
