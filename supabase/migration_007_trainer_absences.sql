-- Migration: Trainer-Abwesenheiten ergaenzen
-- Im Supabase SQL Editor ausfuehren.

create table if not exists trainer_absences (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references trainers(id) on delete cascade,
  reason text not null default 'Abwesenheit',
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists idx_trainer_absences_trainer on trainer_absences(trainer_id);
create index if not exists idx_trainer_absences_dates on trainer_absences(start_date, end_date);

alter table trainer_absences enable row level security;

create policy "authenticated read trainer_absences" on trainer_absences
  for select to authenticated using (true);
create policy "authenticated write trainer_absences" on trainer_absences
  for insert to authenticated with check (true);
create policy "authenticated update trainer_absences" on trainer_absences
  for update to authenticated using (true);
create policy "authenticated delete trainer_absences" on trainer_absences
  for delete to authenticated using (true);
