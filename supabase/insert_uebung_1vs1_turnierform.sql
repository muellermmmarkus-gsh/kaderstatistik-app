-- Importiert die Uebung "1vs1 Turnierform" in die Uebungsdatenbank und aktiviert sie fuer
-- das Team TVG E1 (entspricht "In Team aktiv"). Erstellerteam = TVG E1, oeffentlich.
-- Kategorie und Schwerpunkte sind Vorschlaege (Spielen, Zweikampf, Torschuss) - bei Bedarf
-- in der App unter Uebungen -> Aendern anpassen. 'fields' (Flaeche) bleibt leer.
-- Das Uebungsbild (Uebungsskizzen/06_1vs1_turnierform.png) wird danach in der App unter
-- Uebungen -> Aendern hochgeladen (Storage-Upload braucht Login).
--
-- Idempotent: Eine Uebung mit gleichem Namen wird nicht doppelt angelegt.
-- Im Supabase SQL Editor ausfuehren (Projekt "Kaderstatistik App"), nach migration_037.

insert into exercises (name, aufbau, ablauf, hauptzweck, nebenzweck, min_players, max_players, small_goals, mini_goals, category, created_by_team_id)
select
  '1vs1 Turnierform',
  '7 Felder à 10 x 5 m nebeneinander, in jedem Feld an beiden Enden ein Stangentor (2 Stangen). In jedem Feld spielt ein Spieler in Gelb 1 gegen 1 gegen einen Spieler in Grün.',
  '2-5 Minuten',
  'Zweikampf',
  'Torschuss',
  14, 14, 0, 0,
  'spielen',
  (select id from teams where name = 'TVG E1')
where not exists (select 1 from exercises where name = '1vs1 Turnierform');

insert into team_exercises (team_id, exercise_id)
select t.id, e.id
from teams t, exercises e
where t.name = 'TVG E1' and e.name = '1vs1 Turnierform'
on conflict do nothing;

-- Kontrolle: soll genau 1 Zeile liefern, aktiv_im_team = true
select e.id, e.name, e.category, e.created_by_team_id,
       exists (select 1 from team_exercises te join teams t on t.id = te.team_id
               where te.exercise_id = e.id and t.name = 'TVG E1') as aktiv_im_team
from exercises e
where e.name = '1vs1 Turnierform';
