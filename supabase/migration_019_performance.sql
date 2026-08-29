-- Migration 019: Performance-Tracking (Update / Entwicklung)
-- Im Supabase SQL Editor ausfuehren.

create table if not exists performance_updates (
  id uuid primary key default gen_random_uuid(),
  update_date date not null,
  reason text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- focus wird als Text (nicht als Fremdschluessel auf exercise_focuses)
-- gespeichert, da die Schwerpunktliste unter Uebungsplanung beim Speichern
-- komplett geloescht und neu angelegt wird (neue IDs) - gleiche Konvention
-- wie bei exercises.hauptzweck/nebenzweck.
create table if not exists performance_ratings (
  id uuid primary key default gen_random_uuid(),
  update_id uuid not null references performance_updates(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  focus text not null,
  grade integer not null check (grade between 1 and 6),
  created_at timestamptz not null default now(),
  unique (update_id, player_id, focus)
);

create index if not exists idx_performance_updates_date on performance_updates(update_date);
create index if not exists idx_performance_ratings_update on performance_ratings(update_id);
create index if not exists idx_performance_ratings_player on performance_ratings(player_id);

-- Aktuellste Note je Spieler und Schwerpunkt (aus dem jeweils neuesten Update).
-- Dient als Vorbelegung der Dropdowns unter Performance -> Update.
create or replace view performance_latest as
select distinct on (pr.player_id, pr.focus)
  pr.player_id,
  pr.focus,
  pr.grade,
  pu.update_date
from performance_ratings pr
join performance_updates pu on pu.id = pr.update_id
order by pr.player_id, pr.focus, pu.update_date desc, pr.created_at desc;

alter table performance_updates enable row level security;
alter table performance_ratings enable row level security;

create policy "authenticated read performance_updates" on performance_updates
  for select to authenticated using (true);
create policy "authenticated write performance_updates" on performance_updates
  for insert to authenticated with check (is_trainer());
create policy "authenticated update performance_updates" on performance_updates
  for update to authenticated using (is_trainer());
create policy "authenticated delete performance_updates" on performance_updates
  for delete to authenticated using (is_trainer());

create policy "authenticated read performance_ratings" on performance_ratings
  for select to authenticated using (true);
create policy "authenticated write performance_ratings" on performance_ratings
  for insert to authenticated with check (is_trainer());
create policy "authenticated update performance_ratings" on performance_ratings
  for update to authenticated using (is_trainer());
create policy "authenticated delete performance_ratings" on performance_ratings
  for delete to authenticated using (is_trainer());
