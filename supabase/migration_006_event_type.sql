-- Migration: Termin-Typ "Event" und Bezeichnung ergaenzen
-- Im Supabase SQL Editor ausfuehren.
--
-- Hinweis: Falls die naechste Zeile mit "unsafe use of new value of enum
-- type" fehlschlaegt, diese Zeile allein ausfuehren (Button "Run"), danach
-- den Rest der Datei in einem zweiten Durchlauf.

alter type event_type add value if not exists 'event';

alter table events add column if not exists label text;
