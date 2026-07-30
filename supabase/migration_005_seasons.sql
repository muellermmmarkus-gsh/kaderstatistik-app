-- Migration: Saisonverwaltung ergaenzen
-- Im Supabase SQL Editor ausfuehren.

create table if not exists seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null unique, -- z.B. '2025/2026'
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- stellt sicher, dass hoechstens eine Saison als Standard markiert ist
create unique index if not exists one_default_season
  on seasons (is_default) where is_default = true;

alter table seasons enable row level security;

create policy "authenticated read seasons" on seasons
  for select to authenticated using (true);
create policy "authenticated write seasons" on seasons
  for insert to authenticated with check (true);
create policy "authenticated update seasons" on seasons
  for update to authenticated using (true);
create policy "authenticated delete seasons" on seasons
  for delete to authenticated using (true);

-- Bereits verwendete Saisons aus events automatisch als Auswahl anlegen,
-- damit bestehende Termine weiter mit einer gueltigen Saison uebereinstimmen.
insert into seasons (name)
select distinct season from events
on conflict (name) do nothing;
