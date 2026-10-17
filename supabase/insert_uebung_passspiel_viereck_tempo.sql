-- Importiert die Uebung "Passspiel Viereck Tempo" in die Uebungsdatenbank und aktiviert sie
-- fuer das Team TVG E1 (entspricht "In Team aktiv"). Erstellerteam = TVG E1, oeffentlich.
-- Kategorie, Schwerpunkt 2 (Schnelligkeit) und Spielerzahl (3-12, mehrere 3er-Gruppen) sind
-- Vorschlaege - bei Bedarf in der App unter Uebungen -> Aendern anpassen. 'fields' bleibt leer.
-- Das Uebungsbild (Uebungsskizzen/08_passspiel_viereck_tempo.png) wird danach in der App
-- unter Uebungen -> Aendern hochgeladen (Storage-Upload braucht Login).
--
-- Idempotent: Eine Uebung mit gleichem Namen wird nicht doppelt angelegt.
-- Im Supabase SQL Editor ausfuehren (Projekt "Kaderstatistik App"), nach migration_037.

insert into exercises (name, aufbau, ablauf, hauptzweck, nebenzweck, min_players, max_players, small_goals, mini_goals, category, created_by_team_id)
select
  'Passspiel Viereck Tempo',
  'Quadrat ca. 5x5m aus 4 Hütchen, 3 Spieler, ein Ball.',
  'Spieler 3 hat den Ball. Gepasst wird immer rückwärts, gelaufen vorwärts!
Spieler 3 passt zu Spieler 2 und läuft ein Eck weiter. Dann passt Spieler 2 zu Spieler 1 und läuft ein Eck weiter. Und so weiter.',
  'Passspiel',
  'Schnelligkeit',
  3, 12, 0, 0,
  'ueben',
  (select id from teams where name = 'TVG E1')
where not exists (select 1 from exercises where name = 'Passspiel Viereck Tempo');

insert into team_exercises (team_id, exercise_id)
select t.id, e.id
from teams t, exercises e
where t.name = 'TVG E1' and e.name = 'Passspiel Viereck Tempo'
on conflict do nothing;

-- Kontrolle: soll genau 1 Zeile liefern, aktiv_im_team = true
select e.id, e.name, e.category, e.created_by_team_id,
       exists (select 1 from team_exercises te join teams t on t.id = te.team_id
               where te.exercise_id = e.id and t.name = 'TVG E1') as aktiv_im_team
from exercises e
where e.name = 'Passspiel Viereck Tempo';
