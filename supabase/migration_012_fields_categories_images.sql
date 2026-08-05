-- Migration: Flaechenplanung, Kategorie und Bild bei Uebungen
-- Im Supabase SQL Editor ausfuehren. Setzt migration_011_exercises_trainings.sql voraus.

create table if not exists fields (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  length_m integer not null check (length_m > 0),
  width_m integer not null check (width_m > 0),
  created_at timestamptz not null default now()
);

alter table exercises
  add column if not exists category text not null default 'ueben'
    check (category in ('aufwaermen', 'spielen', 'ueben', 'cooldown')),
  add column if not exists field_id uuid references fields(id) on delete set null,
  add column if not exists image_url text;

create index if not exists idx_exercises_field on exercises(field_id);

alter table fields enable row level security;

create policy "authenticated read fields" on fields
  for select to authenticated using (true);
create policy "authenticated write fields" on fields
  for insert to authenticated with check (is_trainer());
create policy "authenticated update fields" on fields
  for update to authenticated using (is_trainer());
create policy "authenticated delete fields" on fields
  for delete to authenticated using (is_trainer());

-- ─────────────────────────────────────────────
-- Storage: Bucket fuer Uebungsbilder
-- Bucket ist "public", d.h. Bilder sind ueber ihre oeffentliche URL ohne
-- Login abrufbar (fuer die Vorschaubilder/Links in der App). Hoch-/Aendern/
-- Loeschen bleibt ueber die Storage-Policies auf Trainer beschraenkt.
-- ─────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('exercise-images', 'exercise-images', true)
on conflict (id) do nothing;

create policy "public read exercise-images" on storage.objects
  for select to public
  using (bucket_id = 'exercise-images');

create policy "trainer write exercise-images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'exercise-images' and is_trainer());

create policy "trainer update exercise-images" on storage.objects
  for update to authenticated
  using (bucket_id = 'exercise-images' and is_trainer());

create policy "trainer delete exercise-images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'exercise-images' and is_trainer());
