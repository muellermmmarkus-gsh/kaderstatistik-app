-- Migration 029: Rueckennummern pro Spiel + Tor-Eintraege mit Spielern verknuepfen
-- Im Supabase SQL Editor ausfuehren. Setzt migration_028_match_results.sql voraus.
--
-- attendance.shirt_number: Rueckennummer (1-100) eines Spielers in einem
-- Spieltermin. Wird im Spieltermin gepflegt und im Live-Ergebnis zur
-- Auswahl des Torschuetzen verwendet.
--
-- match_goal_entries.player_id: Torschuetze der eigenen Mannschaft. Aus
-- diesen Eintraegen wird die Tabelle goals (Tore pro Spieler und Spiel,
-- Grundlage der Statistik) automatisch befuellt.

alter table attendance
  add column if not exists shirt_number int check (shirt_number between 1 and 100);

-- Jede Rueckennummer pro Spiel nur einmal. "deferrable initially deferred",
-- damit zwei Spieler ihre Nummern in einem Speichervorgang tauschen koennen
-- (geprueft wird erst am Ende der Transaktion).
alter table attendance drop constraint if exists attendance_event_shirt_number_key;
alter table attendance
  add constraint attendance_event_shirt_number_key
  unique (event_id, shirt_number) deferrable initially deferred;

alter table match_goal_entries
  add column if not exists player_id uuid references players(id) on delete set null;

alter table match_goal_entries
  drop constraint if exists match_goal_entries_shirt_number_check;
alter table match_goal_entries
  add constraint match_goal_entries_shirt_number_check check (shirt_number between 1 and 100);

-- Beim Nachtrag vergangener Spiele (insert_past_match_results.sql) wurde der
-- Spielername als Notiz gespeichert - jetzt dem Spieler zuordnen.
update match_goal_entries m
set player_id = p.id, note = null
from match_results r, players p
where m.match_result_id = r.id
  and m.player_id is null
  and m.kind = 'goal'
  and m.team = case when r.team_a = 'TV Geisenhausen E7 1' then 'a' else 'b' end
  and m.note = p.first_name || ' ' || p.last_name;
