-- Migration 023: Entschuldigt-Status (Training) und Anmeldung (Spiel)
-- Im Supabase SQL Editor ausfuehren.
--
-- excused: nur bei Terminen vom Typ 'training' im UI sichtbar/relevant -
-- ob eine Abwesenheit entschuldigt war.
-- registered: nur bei Terminen vom Typ 'game' im UI sichtbar/relevant -
-- ob sich der Spieler vorab fuer das Spiel angemeldet hat.
-- Reine ADD COLUMN mit Default - bestehende Anwesenheits-Eintraege
-- (present, performance, motivation, discipline, player_notes) bei
-- vergangenen Terminen bleiben dadurch unveraendert.

alter table attendance
  add column if not exists excused boolean not null default false,
  add column if not exists registered boolean not null default false;
