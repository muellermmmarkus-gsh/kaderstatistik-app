-- Migration 041: Kapitaen und Torwart je Spieler und Spiel
-- Im Supabase SQL Editor ausfuehren.
--
-- In Spielterminen zwei zusaetzliche Haekchen-Spalten rechts neben "Tore".
-- Gespeichert in der Anwesenheit (eine Zeile je Spieler und Termin).

begin;

alter table attendance add column if not exists is_captain boolean not null default false;
alter table attendance add column if not exists is_goalkeeper boolean not null default false;

commit;
