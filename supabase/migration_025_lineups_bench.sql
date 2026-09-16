-- Migration 025: Ersatzbank-Aufstellung (eigene Formation + Zuordnung)
-- Im Supabase SQL Editor ausfuehren. Setzt migration_024_lineups.sql voraus.

alter table lineups
  add column if not exists bench_formation text,
  add column if not exists bench_assignments jsonb not null default '{}'::jsonb;
