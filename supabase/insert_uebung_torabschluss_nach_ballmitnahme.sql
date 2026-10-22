-- Importiert die Uebung "Torabschluss nach Ballmitnahme" in die Uebungsdatenbank und aktiviert
-- sie fuer das Team TVG E1 (entspricht "In Team aktiv"). Erstellerteam = TVG E1, oeffentlich.
-- Kategorie (Ueben), Schwerpunkte (Torschuss, Ballannahme) und Spielerzahl (2-12) sind
-- Vorschlaege - bei Bedarf in der App unter Uebungen -> Aendern anpassen. 'fields' bleibt leer.
-- Das Uebungsbild (Uebungsskizzen/10_torabschluss_nach_ballmitnahme.png) wird danach in der
-- App unter Uebungen -> Aendern hochgeladen (Storage-Upload braucht Login).
--
-- Idempotent: Eine Uebung mit gleichem Namen wird nicht doppelt angelegt.
-- Im Supabase SQL Editor ausfuehren (Projekt "Kaderstatistik App"), nach migration_037.

insert into exercises (name, aufbau, ablauf, hauptzweck, nebenzweck, min_players, max_players, small_goals, mini_goals, category, created_by_team_id)
select
  'Torabschluss nach Ballmitnahme',
  'Ein Kleinfeldtor am oberen Ende. Davor in der Mitte ein Hindernis aus 4 Hütchen in Rautenform, das oberste Hütchen ist gelb und markiert den Start. Der Trainer steht am unteren Ende mit den Bällen, ein weiteres Hütchen markiert seine Anspielposition.',
  '1. Start: Der Spieler startet am gelben Hütchen oberhalb des Hindernisses.
2. Entgegenkommen: Er läuft um das Hindernis herum dem Trainer entgegen.
3. Anspiel: Der Trainer passt den Ball zum Spieler.
4. Ballmitnahme: Gegen die Torrichtung mit einem Ballkontakt.
5. Abschluss: Maximal 3 Ballkontakte, dann Torschuss.',
  'Torschuss',
  'Ballannahme',
  2, 12, 1, 0,
  'ueben',
  (select id from teams where name = 'TVG E1')
where not exists (select 1 from exercises where name = 'Torabschluss nach Ballmitnahme');

insert into team_exercises (team_id, exercise_id)
select t.id, e.id
from teams t, exercises e
where t.name = 'TVG E1' and e.name = 'Torabschluss nach Ballmitnahme'
on conflict do nothing;

-- Kontrolle: soll genau 1 Zeile liefern, aktiv_im_team = true
select e.id, e.name, e.category, e.created_by_team_id,
       exists (select 1 from team_exercises te join teams t on t.id = te.team_id
               where te.exercise_id = e.id and t.name = 'TVG E1') as aktiv_im_team
from exercises e
where e.name = 'Torabschluss nach Ballmitnahme';
