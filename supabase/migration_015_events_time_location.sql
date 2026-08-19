-- Migration 015: Uhrzeit und Spielort fuer Termine (insbesondere Spiele)
-- Im Supabase SQL Editor ausfuehren (setzt migration_006_event_type.sql voraus).

alter table events add column if not exists event_time time;
alter table events add column if not exists location text;
