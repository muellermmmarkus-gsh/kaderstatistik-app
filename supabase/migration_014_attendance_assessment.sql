-- Migration: Leistungsbewertung bei Trainings-Anwesenheit
-- Im Supabase SQL Editor ausfuehren. Setzt migration_013_trainings_linked_to_events.sql voraus.
--
-- Neue Spalten auf attendance, nur relevant und im UI sichtbar bei
-- Terminen vom Typ 'training': Leistung, Motivation, Disziplin je Spieler
-- sowie ein kurzes Freitext-Notizfeld (max. 50 Zeichen).

alter table attendance
  add column if not exists performance text check (performance in ('stark', 'mittel', 'schwach')),
  add column if not exists motivation text check (motivation in ('hoch', 'mittel', 'niedrig')),
  add column if not exists discipline text check (discipline in ('sehr gut', 'mittel', 'gering')),
  add column if not exists player_notes text check (char_length(player_notes) <= 50);
