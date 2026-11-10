-- Migration 045: Aufstellungen fuer Turniere (Spielmodus) und 3. Formation
-- Im Supabase SQL Editor ausfuehren. Setzt migration_025_lineups_bench.sql voraus.
--
-- game_mode: Anzahl Feldspieler (+ Torwart) - 4, 5 oder 6. Spiele laufen
-- immer 6+1, bei Turnieren wird der Spielmodus vor der Formation gewaehlt.
-- third_formation / third_assignments: dritte Aufstellungsformation (Spiele
-- und Turniere) neben Startaufstellung und Ersatzbank.

begin;

alter table lineups
  add column if not exists game_mode smallint not null default 6,
  add column if not exists third_formation text,
  add column if not exists third_assignments jsonb not null default '{}'::jsonb;

alter table lineups drop constraint if exists lineups_game_mode_check;
alter table lineups add constraint lineups_game_mode_check check (game_mode in (4, 5, 6));

commit;
