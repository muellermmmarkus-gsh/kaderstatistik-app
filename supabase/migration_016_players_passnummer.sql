-- Migration 016: Passnummer fuer Spieler
-- Im Supabase SQL Editor ausfuehren.

alter table players add column if not exists passnummer text;
