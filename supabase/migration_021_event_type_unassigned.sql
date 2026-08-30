-- Migration 021: Reservierte Terminart "Keine Zuordnung"
-- Im Supabase SQL Editor ausfuehren (setzt migration_020_event_types.sql voraus).
--
-- Fangnetz fuer Termine, deren Terminart unter Einstellungen -> Termine
-- geloescht wurde: events.type referenziert event_types(key) per
-- Fremdschluessel, braucht also einen gueltigen Zielwert. Erscheint bewusst
-- nicht in der Terminarten-Verwaltung und nicht in der Auswahl beim Anlegen
-- eines neuen Termins - nur als Ergebnis einer Terminart-Loeschung.

insert into event_types (key, label, sort_order) values
  ('unassigned', 'Keine Zuordnung', 9999)
on conflict (key) do nothing;
