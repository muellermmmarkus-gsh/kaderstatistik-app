-- Migration 028: Spielergebnisse (Live-Ergebnis + Letzte Ergebnisse)
-- Im Supabase SQL Editor ausfuehren. Setzt migration_026_events_soft_delete.sql voraus.
--
-- match_results: ein Ergebnis pro Spieltermin. team_a/team_b sind die beiden
-- Mannschaften in der angezeigten Reihenfolge (Heimmannschaft zuerst).
-- finished_at ist gesetzt, sobald das Spiel ueber "Spiel beendet"
-- archiviert wurde - dann erscheint es unter "Letzte Ergebnisse".
--
-- match_goal_entries: einzelne Eintraege (Tor oder Eigentor) waehrend des
-- Spiels. team = 'a' | 'b' ist die Mannschaft, deren Spieler den Eintrag
-- verursacht hat. Ein Eigentor eines Spielers von Mannschaft A zaehlt
-- also fuer Mannschaft B.

create table if not exists match_results (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  team_a text not null,
  team_b text not null,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists match_results_event_id_key on match_results(event_id);

create table if not exists match_goal_entries (
  id uuid primary key default gen_random_uuid(),
  match_result_id uuid not null references match_results(id) on delete cascade,
  minute text,
  team text not null check (team in ('a', 'b')),
  kind text not null default 'goal' check (kind in ('goal', 'own_goal')),
  shirt_number int check (shirt_number between 1 and 20),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_match_goal_entries_result on match_goal_entries(match_result_id);

alter table match_results enable row level security;
alter table match_goal_entries enable row level security;

create policy "authenticated read match_results" on match_results
  for select to authenticated using (true);
create policy "authenticated write match_results" on match_results
  for insert to authenticated with check (is_trainer());
create policy "authenticated update match_results" on match_results
  for update to authenticated using (is_trainer());
create policy "authenticated delete match_results" on match_results
  for delete to authenticated using (is_trainer());

create policy "authenticated read match_goal_entries" on match_goal_entries
  for select to authenticated using (true);
create policy "authenticated write match_goal_entries" on match_goal_entries
  for insert to authenticated with check (is_trainer());
create policy "authenticated update match_goal_entries" on match_goal_entries
  for update to authenticated using (is_trainer());
create policy "authenticated delete match_goal_entries" on match_goal_entries
  for delete to authenticated using (is_trainer());
