-- Migration 016: Geburtsdatum fuer Trainer (fuer Geburtstage im Kalender)
-- Im Supabase SQL Editor ausfuehren.

alter table trainers add column if not exists birth_date date;
