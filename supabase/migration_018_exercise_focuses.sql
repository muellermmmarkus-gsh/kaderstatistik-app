-- Migration 018: Uebungsschwerpunkte fuer die Uebungsplanung
-- Im Supabase SQL Editor ausfuehren.

create table if not exists exercise_focuses (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists exercise_focuses_label_unique on exercise_focuses (label);

alter table exercise_focuses enable row level security;

create policy "authenticated read exercise_focuses" on exercise_focuses
  for select to authenticated using (true);
create policy "authenticated write exercise_focuses" on exercise_focuses
  for insert to authenticated with check (is_trainer());
create policy "authenticated update exercise_focuses" on exercise_focuses
  for update to authenticated using (is_trainer());
create policy "authenticated delete exercise_focuses" on exercise_focuses
  for delete to authenticated using (is_trainer());
