-- Migration: Trainingsplanung an Termine (events) koppeln, Schwerpunkt hinzufuegen
-- Im Supabase SQL Editor ausfuehren. Setzt migration_012_fields_categories_images.sql voraus.
--
-- Ab jetzt wird ein Training ausschliesslich unter "Termine und Verwaltung"
-- angelegt (events mit type = 'training'). Die Trainingsplanung (Uebungen,
-- Dauer, Schwerpunkt) haengt sich darauf per event_id und wird beim ersten
-- Speichern in der Detailplanung automatisch angelegt (upsert per event_id).
--
-- Achtung: bereits vorhandene, eigenstaendig unter der alten "Trainingsplanung
-- -> Neues Training" angelegte trainings-Zeilen (ohne zugehoerigen Termin)
-- werden dadurch nicht mehr in der Uebersicht angezeigt, da diese jetzt von
-- den Terminen ausgeht. Die Daten bleiben in der Datenbank erhalten.

alter table trainings
  add column if not exists event_id uuid references events(id) on delete cascade,
  add column if not exists focus text;

alter table trainings alter column training_date drop not null;

create unique index if not exists trainings_event_id_key on trainings(event_id);
