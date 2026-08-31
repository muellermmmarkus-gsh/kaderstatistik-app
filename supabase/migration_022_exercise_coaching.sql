-- Migration 022: Coaching-Hinweise fuer Uebungen
-- Im Supabase SQL Editor ausfuehren.

alter table exercises add column if not exists coaching text;
