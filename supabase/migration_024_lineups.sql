-- Migration 024: Aufstellung (Formation) fuer Spieltermine
-- Im Supabase SQL Editor ausfuehren.
--
-- Eine Aufstellung pro Termin (nur relevant bei type = 'game'): gewaehlte
-- Formation (z.B. '1-3-2-1', 6 Feldspieler + Torwart) sowie die Zuordnung
-- Positions-Slot -> Spieler als JSON, z.B.
-- {"gk": "<player-uuid>", "def-0": "<player-uuid>", ...}.

create table if not exists lineups (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  formation text not null,
  assignments jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists lineups_event_id_key on lineups(event_id);

alter table lineups enable row level security;

create policy "authenticated read lineups" on lineups
  for select to authenticated using (true);
create policy "authenticated write lineups" on lineups
  for insert to authenticated with check (is_trainer());
create policy "authenticated update lineups" on lineups
  for update to authenticated using (is_trainer());
create policy "authenticated delete lineups" on lineups
  for delete to authenticated using (is_trainer());
