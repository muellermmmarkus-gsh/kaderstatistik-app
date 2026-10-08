-- Importiert die Uebung "Aufwärmen FC Bayern Stange Passen" in die Uebungsdatenbank und
-- aktiviert sie fuer das Team TVG E1 (entspricht "In Team aktiv").
-- Erstellerteam = TVG E1, oeffentlich (is_public Standard true). 'fields' (Flaeche) bleibt leer.
-- Das Uebungsbild (Uebungsskizzen/04_aufwaermen_stange_passen.png) wird NICHT per SQL gesetzt,
-- sondern danach in der App unter Uebungen -> Aendern hochgeladen (Storage-Upload braucht Login).
--
-- Idempotent: Eine Uebung mit gleichem Namen wird nicht doppelt angelegt.
-- Im Supabase SQL Editor ausfuehren (Projekt "Kaderstatistik App"), nach migration_037.

insert into exercises (name, aufbau, ablauf, hauptzweck, nebenzweck, min_players, max_players, small_goals, mini_goals, category, created_by_team_id)
select
  'Aufwärmen FC Bayern Stange Passen',
  'Zwei identische Stangenparcours nebeneinander (Gruppe Orange und Gruppe Grün). Pro Bahn eine Reihe aus 5 Stangen, am oberen Ende steht eine Gegnerfigur. Die Spieler jeder Gruppe warten am unteren Ende, Spieler 1 hat den Ball.',
  'Hinweg: Durch die Stangen passen.
Hinter der Figur: Spieler 1 legt den Ball ab, Spieler 2 übernimmt den Ball mit dem Fuß und dribbelt weiter.
Rückweg: Doppelpässe durch die Stangen.',
  'Passspiel',
  'Koordination',
  8, 8, 0, 0,
  'aufwaermen',
  (select id from teams where name = 'TVG E1')
where not exists (select 1 from exercises where name = 'Aufwärmen FC Bayern Stange Passen');

insert into team_exercises (team_id, exercise_id)
select t.id, e.id
from teams t, exercises e
where t.name = 'TVG E1' and e.name = 'Aufwärmen FC Bayern Stange Passen'
on conflict do nothing;

-- Kontrolle: soll genau 1 Zeile liefern, aktiv_im_team = true
select e.id, e.name, e.category, e.created_by_team_id,
       exists (select 1 from team_exercises te join teams t on t.id = te.team_id
               where te.exercise_id = e.id and t.name = 'TVG E1') as aktiv_im_team
from exercises e
where e.name = 'Aufwärmen FC Bayern Stange Passen';
