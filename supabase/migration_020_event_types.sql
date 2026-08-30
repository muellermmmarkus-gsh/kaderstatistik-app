-- Migration 020: Konfigurierbare Terminarten
-- Im Supabase SQL Editor ausfuehren.
--
-- Ersetzt das feste Enum event_type durch eine Tabelle, damit Trainer unter
-- Einstellungen -> Termine eigene Terminarten anlegen und die Labels der
-- eingebauten Arten (Training/Spiel/Turnier/Event) umbenennen koennen. Die
-- eingebauten "key"-Werte ('training', 'game', 'tournament', 'event')
-- bleiben stabil, da an ihnen App-Logik (Trainingsplanung, Anwesenheit,
-- Gegner-/Ort-Felder, ...) haengt - nur "label" ist frei editierbar. Neu
-- hinzugefuegte Terminarten verhalten sich wie 'event' (nur Bezeichnung,
-- keine Trainingsplanung/Anwesenheit).

create table if not exists event_types (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into event_types (key, label, sort_order) values
  ('training', 'Training', 0),
  ('game', 'Spiel', 1),
  ('tournament', 'Turnier', 2),
  ('event', 'Event', 3)
on conflict (key) do nothing;

alter table events alter column type type text using type::text;
drop type if exists event_type;

alter table events
  add constraint events_type_fkey foreign key (type) references event_types(key);

alter table event_types enable row level security;

create policy "authenticated read event_types" on event_types
  for select to authenticated using (true);
create policy "authenticated write event_types" on event_types
  for insert to authenticated with check (is_trainer());
create policy "authenticated update event_types" on event_types
  for update to authenticated using (is_trainer());
create policy "authenticated delete event_types" on event_types
  for delete to authenticated using (is_trainer());
