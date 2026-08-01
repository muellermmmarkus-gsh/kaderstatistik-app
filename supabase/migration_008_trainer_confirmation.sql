-- Migration: Vorab-Zusage der Trainer, unabhaengig von der Anwesenheit
-- Im Supabase SQL Editor ausfuehren.

alter table trainer_attendance
  add column if not exists confirmed boolean not null default false;
