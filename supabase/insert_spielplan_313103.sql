-- Traegt die Spiele aus spielplan_313103.pdf (DFBnet, Gruppe Geisenhausen,
-- Saison 26/27, Herbstrunde) fuer TV 1924 Geisenhausen E7 1 als Termine
-- (events, type = 'game') ein.
--
-- Voraussetzung: migration_015_events_time_location.sql wurde bereits
-- ausgefuehrt (Spalten event_time/location vorhanden).
--
-- Im Supabase SQL Editor (Projekt -> SQL Editor -> New query) ausfuehren.
-- Idempotent: mehrfaches Ausfuehren legt keine Duplikate an.

insert into seasons (name)
values ('2026/2027')
on conflict (name) do nothing;

insert into events (type, event_date, opponent, event_time, location, season)
select v.type, v.event_date, v.opponent, v.event_time, v.location, v.season
from (
  values
    ('game'::event_type, date '2026-09-19', 'SpVgg Landshut E7 1 (auswärts)', time '13:00', 'Hammerbachstadion Landshut, Kleinfeld', '2026/2027'),
    ('game'::event_type, date '2026-09-25', 'FC Ergolding E7 1 (heim)', time '17:00', 'Sportanlage Geisenhausen, Kunstrasen', '2026/2027'),
    ('game'::event_type, date '2026-10-03', 'SV Landshut-Münchnerau E7 1 (auswärts)', time '11:30', 'Sportanlage Münchnerau, Kleinfeld 1', '2026/2027'),
    ('game'::event_type, date '2026-10-09', 'SpVgg Landshut E7 1 (heim)', time '17:00', 'Sportanlage Geisenhausen, Kunstrasen', '2026/2027'),
    ('game'::event_type, date '2026-10-17', 'FC Ergolding E7 1 (auswärts)', time '11:30', 'Aristotherm Sportpark, Kleinfeld', '2026/2027'),
    ('game'::event_type, date '2026-10-23', 'SV Landshut-Münchnerau E7 1 (heim)', time '17:00', 'Sportanlage Geisenhausen, Kunstrasen', '2026/2027')
) as v(type, event_date, opponent, event_time, location, season)
where not exists (
  select 1 from events e
  where e.type = v.type and e.event_date = v.event_date and e.opponent = v.opponent
);
