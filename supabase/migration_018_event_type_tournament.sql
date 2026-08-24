-- Migration 018: Terminart "Turnier" ergaenzen
-- Im Supabase SQL Editor ausfuehren.

alter type event_type add value if not exists 'tournament';
