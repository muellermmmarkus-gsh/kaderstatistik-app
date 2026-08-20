-- Migration 017: Trainingsbloecke und Gruppen fuer die Trainingsplanung
-- Im Supabase SQL Editor ausfuehren. Setzt migration_011_exercises_trainings.sql voraus.

alter table training_exercises
  add column if not exists block integer not null default 1 check (block between 1 and 10);

-- Eine Uebung kann mehreren Gruppen zugeordnet werden ("weitere Gruppe").
create table if not exists training_exercise_groups (
  id uuid primary key default gen_random_uuid(),
  training_exercise_id uuid not null references training_exercises(id) on delete cascade,
  group_label text not null check (group_label in ('A', 'B', 'C', 'D', 'E', 'F')),
  created_at timestamptz not null default now()
);

create unique index if not exists training_exercise_groups_unique
  on training_exercise_groups(training_exercise_id, group_label);

-- Gruppeneinteilung der Spieler, je Training separat.
create table if not exists training_player_groups (
  id uuid primary key default gen_random_uuid(),
  training_id uuid not null references trainings(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  group_label text not null check (group_label in ('A', 'B', 'C', 'D', 'E', 'F')),
  created_at timestamptz not null default now()
);

create unique index if not exists training_player_groups_unique
  on training_player_groups(training_id, player_id);

alter table training_exercise_groups enable row level security;
alter table training_player_groups enable row level security;

create policy "authenticated read training_exercise_groups" on training_exercise_groups
  for select to authenticated using (true);
create policy "authenticated write training_exercise_groups" on training_exercise_groups
  for insert to authenticated with check (is_trainer());
create policy "authenticated update training_exercise_groups" on training_exercise_groups
  for update to authenticated using (is_trainer());
create policy "authenticated delete training_exercise_groups" on training_exercise_groups
  for delete to authenticated using (is_trainer());

create policy "authenticated read training_player_groups" on training_player_groups
  for select to authenticated using (true);
create policy "authenticated write training_player_groups" on training_player_groups
  for insert to authenticated with check (is_trainer());
create policy "authenticated update training_player_groups" on training_player_groups
  for update to authenticated using (is_trainer());
create policy "authenticated delete training_player_groups" on training_player_groups
  for delete to authenticated using (is_trainer());
