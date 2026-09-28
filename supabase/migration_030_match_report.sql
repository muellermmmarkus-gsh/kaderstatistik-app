-- Migration 030: Spielbericht (Freitext des Trainers) zu einem Spielergebnis
-- Im Supabase SQL Editor ausfuehren. Setzt migration_028_match_results.sql voraus.

alter table match_results add column if not exists report text;
