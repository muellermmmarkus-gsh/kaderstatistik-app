-- Migration 032: Checklisten
-- Im Supabase SQL Editor ausfuehren. Setzt migration_031_datenschutz.sql voraus
-- (Funktionen is_member() und is_trainer()).
--
-- checklists: eine Checkliste mit Namen (z.B. "Trikots zurueck").
-- checklist_items: je Spieler bzw. Trainer, der beim Anlegen aktiv war, eine
-- Zeile mit "erledigt" und einer Notiz.

begin;

create table if not exists checklists (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

create table if not exists checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references checklists(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  trainer_id uuid references trainers(id) on delete cascade,
  done boolean not null default false,
  note text,
  check ((player_id is null) <> (trainer_id is null))
);

create index if not exists checklist_items_checklist_id_idx on checklist_items(checklist_id);

alter table checklists enable row level security;
alter table checklist_items enable row level security;

drop policy if exists "member read checklists" on checklists;
create policy "member read checklists" on checklists
  for select to authenticated using (is_member());
drop policy if exists "trainer write checklists" on checklists;
create policy "trainer write checklists" on checklists
  for all to authenticated using (is_trainer()) with check (is_trainer());

drop policy if exists "member read checklist_items" on checklist_items;
create policy "member read checklist_items" on checklist_items
  for select to authenticated using (is_member());
drop policy if exists "trainer write checklist_items" on checklist_items;
create policy "trainer write checklist_items" on checklist_items
  for all to authenticated using (is_trainer()) with check (is_trainer());

commit;
