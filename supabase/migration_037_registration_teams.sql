-- Migration 037: Teamauswahl bei der Registrierung
-- Im Supabase SQL Editor ausfuehren. Setzt migration_036_exercise_usage_all_teams.sql voraus.
--
-- Auf der Registrierungsseite ist noch niemand angemeldet, die Tabelle teams
-- ist per RLS aber nur fuer angemeldete Nutzer lesbar. Diese Funktion liefert
-- deshalb nur Id und Namen aller Teams (keine weiteren Daten) fuer die
-- Auswahlliste "Dein Team".

create or replace function public.registration_teams()
returns table (id uuid, name text)
language sql
security definer set search_path = public
stable
as $$
  select id, name from public.teams order by name;
$$;

revoke all on function public.registration_teams() from public;
grant execute on function public.registration_teams() to anon, authenticated;
