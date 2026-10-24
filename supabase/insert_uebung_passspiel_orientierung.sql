-- Importiert die Uebung "Passspiel mit Orientierung" in die Uebungsdatenbank und aktiviert sie
-- fuer das Team TVG E1 (entspricht "In Team aktiv"). Erstellerteam = TVG E1, oeffentlich.
-- Kategorie (Ueben), Schwerpunkte (Passspiel, Orientierung) und Spielerzahl (5-10) sind
-- Vorschlaege - bei Bedarf in der App unter Uebungen -> Aendern anpassen. 'fields' bleibt leer.
-- Das Uebungsbild (Uebungsskizzen/12_passspiel_orientierung.png) wird danach in der App unter
-- Uebungen -> Aendern hochgeladen (Storage-Upload braucht Login).
--
-- Idempotent: Eine Uebung mit gleichem Namen wird nicht doppelt angelegt.
-- Im Supabase SQL Editor ausfuehren (Projekt "Kaderstatistik App"), nach migration_037.

insert into exercises (name, aufbau, ablauf, hauptzweck, nebenzweck, min_players, max_players, small_goals, mini_goals, category, created_by_team_id)
select
  'Passspiel mit Orientierung',
  '4 Hütchenquadrate aus je 4 Hütchen im Kreuz: oben, rechts, unten, links. In jedem Quadrat steht 1 Anspieler (Spieler 1 unten, 2 links, 3 oben, 4 rechts, also im Uhrzeigersinn nummeriert). In der Mitte steht der Mittelspieler. 3 Bälle: Drei Anspieler haben je einen Ball, ein Anspieler hat keinen.',
  '1. Ein Anspieler passt zum Mittelspieler.
2. Der Mittelspieler nimmt den Ball mit einer Berührung an und spielt ihn zum Anspieler ohne Ball.
3. Jetzt passt der nächste Anspieler, im Uhrzeigersinn neben dem zuletzt Angespielten, zum Mittelspieler.
4. Der Mittelspieler nimmt den Ball wieder mit einer Berührung an und passt zum einzigen Anspieler ohne Ball.
5. So geht es immer weiter: Der Mittelspieler muss sich jedes Mal neu orientieren, wer gerade keinen Ball hat.',
  'Passspiel',
  'Orientierung',
  5, 10, 0, 0,
  'ueben',
  (select id from teams where name = 'TVG E1')
where not exists (select 1 from exercises where name = 'Passspiel mit Orientierung');

insert into team_exercises (team_id, exercise_id)
select t.id, e.id
from teams t, exercises e
where t.name = 'TVG E1' and e.name = 'Passspiel mit Orientierung'
on conflict do nothing;

-- Kontrolle: soll genau 1 Zeile liefern, aktiv_im_team = true
select e.id, e.name, e.category, e.created_by_team_id,
       exists (select 1 from team_exercises te join teams t on t.id = te.team_id
               where te.exercise_id = e.id and t.name = 'TVG E1') as aktiv_im_team
from exercises e
where e.name = 'Passspiel mit Orientierung';
