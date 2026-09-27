-- Migration 030: Login-Historie fuer die Admin-Uebersicht
-- Im Supabase SQL Editor ausfuehren. Setzt migration_010_role_permissions.sql
-- voraus (Funktion is_trainer()).
--
-- login_events: ein Eintrag pro erfolgreichem Login. Wird direkt nach einem
-- erfolgreichen signInWithPassword() aus src/app/login/actions.ts befuellt.
-- Nur Trainer duerfen die Eintraege lesen (Grundlage fuer die Seite /admin),
-- jeder Nutzer darf aber seinen eigenen Login protokollieren.

create table if not exists login_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists login_events_user_id_idx on login_events(user_id);
create index if not exists login_events_created_at_idx on login_events(created_at);

alter table login_events enable row level security;

drop policy if exists "own login insert" on login_events;
create policy "own login insert" on login_events
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "trainer read login_events" on login_events;
create policy "trainer read login_events" on login_events
  for select to authenticated using (is_trainer());
