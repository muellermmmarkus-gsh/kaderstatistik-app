-- Importiert die Uebung "Torabschluss mit Tempo 1vs1" in die Uebungsdatenbank und aktiviert
-- sie fuer das Team TVG E1 (entspricht "In Team aktiv"). Erstellerteam = TVG E1, oeffentlich.
-- Kategorie, Schwerpunkte (Torschuss, Zweikampf) und Spielerzahl (2-10) sind Vorschlaege -
-- bei Bedarf in der App unter Uebungen -> Aendern anpassen. 'fields' (Flaeche) bleibt leer.
-- Das Uebungsbild (Uebungsskizzen/07_torabschluss_tempo_1vs1.png) wird danach in der App
-- unter Uebungen -> Aendern hochgeladen (Storage-Upload braucht Login).
--
-- Idempotent: Eine Uebung mit gleichem Namen wird nicht doppelt angelegt.
-- Im Supabase SQL Editor ausfuehren (Projekt "Kaderstatistik App"), nach migration_037.

insert into exercises (name, aufbau, ablauf, hauptzweck, nebenzweck, min_players, max_players, small_goals, mini_goals, category, created_by_team_id)
select
  'Torabschluss mit Tempo 1vs1',
  '2 Minitore, ein Hütchentor aus 2 Hütchen und ein weiteres Hütchen am Start.',
  'Spieler 1 dribbelt mit Ball durch das Hütchentor und dreht dann um. Spieler 2 kommt ihm zeitverzögert entgegen und ist der Verteidiger. Spieler 1 muss mit Tempo vorbeikommen und ein Tor erzielen.',
  'Torschuss',
  'Zweikampf',
  2, 10, 0, 2,
  'ueben',
  (select id from teams where name = 'TVG E1')
where not exists (select 1 from exercises where name = 'Torabschluss mit Tempo 1vs1');

insert into team_exercises (team_id, exercise_id)
select t.id, e.id
from teams t, exercises e
where t.name = 'TVG E1' and e.name = 'Torabschluss mit Tempo 1vs1'
on conflict do nothing;

-- Kontrolle: soll genau 1 Zeile liefern, aktiv_im_team = true
select e.id, e.name, e.category, e.created_by_team_id,
       exists (select 1 from team_exercises te join teams t on t.id = te.team_id
               where te.exercise_id = e.id and t.name = 'TVG E1') as aktiv_im_team
from exercises e
where e.name = 'Torabschluss mit Tempo 1vs1';
