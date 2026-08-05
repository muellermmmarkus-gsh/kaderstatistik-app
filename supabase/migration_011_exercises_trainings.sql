-- Migration: Uebungsdatenbank und Trainingsplanung
-- Im Supabase SQL Editor ausfuehren. Setzt migration_010_role_permissions.sql voraus.

create table if not exists exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  aufbau text not null default '',
  ablauf text not null default '',
  hauptzweck text not null default '',
  nebenzweck text,
  min_players integer not null check (min_players > 0),
  max_players integer not null check (max_players >= min_players),
  small_goals integer not null default 0 check (small_goals >= 0),
  mini_goals integer not null default 0 check (mini_goals >= 0),
  created_at timestamptz not null default now()
);

create table if not exists trainings (
  id uuid primary key default gen_random_uuid(),
  training_date date not null,
  notes text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- exercise_id bewusst "restrict" statt "cascade": eine Uebung, die in einem
-- gespeicherten Trainingsplan verwendet wird, soll nicht geloescht werden
-- koennen und dabei stillschweigend aus vergangenen Plaenen verschwinden.
create table if not exists training_exercises (
  id uuid primary key default gen_random_uuid(),
  training_id uuid not null references trainings(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete restrict,
  sort_order integer not null default 0,
  duration_minutes integer not null check (duration_minutes > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_training_exercises_training on training_exercises(training_id);
create index if not exists idx_training_exercises_exercise on training_exercises(exercise_id);
create index if not exists idx_trainings_date on trainings(training_date);

alter table exercises enable row level security;
alter table trainings enable row level security;
alter table training_exercises enable row level security;

create policy "authenticated read exercises" on exercises
  for select to authenticated using (true);
create policy "authenticated write exercises" on exercises
  for insert to authenticated with check (is_trainer());
create policy "authenticated update exercises" on exercises
  for update to authenticated using (is_trainer());
create policy "authenticated delete exercises" on exercises
  for delete to authenticated using (is_trainer());

create policy "authenticated read trainings" on trainings
  for select to authenticated using (true);
create policy "authenticated write trainings" on trainings
  for insert to authenticated with check (is_trainer());
create policy "authenticated update trainings" on trainings
  for update to authenticated using (is_trainer());
create policy "authenticated delete trainings" on trainings
  for delete to authenticated using (is_trainer());

create policy "authenticated read training_exercises" on training_exercises
  for select to authenticated using (true);
create policy "authenticated write training_exercises" on training_exercises
  for insert to authenticated with check (is_trainer());
create policy "authenticated update training_exercises" on training_exercises
  for update to authenticated using (is_trainer());
create policy "authenticated delete training_exercises" on training_exercises
  for delete to authenticated using (is_trainer());
