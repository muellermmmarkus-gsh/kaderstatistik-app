-- Importiert die Uebung "Flügelpasszirkel mit Hinterlaufen" in die Uebungsdatenbank und aktiviert sie
-- fuer das Team TVG E1 (entspricht "In Team aktiv"). Erstellerteam = TVG E1, oeffentlich.
-- Kategorie (Ueben), Schwerpunkte (Passspiel, Torschuss) und Spielerzahl (8-16, zwei Gruppen) sind
-- Vorschlaege - bei Bedarf in der App unter Uebungen -> Aendern anpassen. 'fields' bleibt leer.
-- Das Uebungsbild (Uebungsskizzen/15_fluegelpasszirkel_hinterlaufen.png) wird danach in der App
-- unter Uebungen -> Aendern hochgeladen (Storage-Upload braucht Login).
--
-- Mehrfach ausfuehrbar: Existiert die Uebung schon, werden nur Aufbau und Ablauf aktualisiert;
-- sonst wird sie neu angelegt.
-- Im Supabase SQL Editor ausfuehren (Projekt "Kaderstatistik App"), nach migration_037.

update exercises
set aufbau = 'Lange Bahn mit 2 Kleinfeldtoren: eins oben, eins unten, beide mit Öffnung zum Feld. Zwei Gruppen mit je 4 Spielern. Runde 1 (Gruppe gelb): Flügel links Spieler 2 unten und Spieler 4 oben, jeweils hinter einem Hütchen; Mitte Spieler 1 unten beim unteren Tor (mit dem Ball) und Spieler 3 oben, jeweils mit einem Hütchen daneben. Runde 2 (Gruppe blau) ist der gleiche Aufbau punktgespiegelt: Flügel rechts, Spieler 1 mit dem Ball oben beim oberen Tor. 1 Ball, Start bei Spieler 1 von Gruppe gelb.',
    ablauf = 'Runde 1 (Abschluss aufs obere Tor):
1. Spieler 1 spielt den Ball auf den Flügel zu Spieler 2.
2. Spieler 2 spielt den Ball die Linie entlang steil zu Spieler 4.
3. Spieler 4 spielt den Ball quer in die Mitte zu Spieler 3.
4. Spieler 3 spielt einen diagonalen Pass in den Lauf von Spieler 2.
Gleichzeitig laufen:
5. Spieler 1 läuft seinem Pass hinterher auf den Platz von Spieler 2.
6. Spieler 2 läuft nach seinem Pass außen am Flügel entlang nach vorn (Hinterlaufen) und nimmt den diagonalen Pass an.
7. Spieler 4 läuft nach seinem Pass diagonal Richtung Tor in den Strafraum.
8. Spieler 3 läuft nach seinem Pass Richtung Tor in den Strafraum.
9. Spieler 2 bringt eine Flanke vors Tor.
10. Spieler 3 und 4 versuchen, im Strafraum ein Tor zu erzielen.
Runde 2 (Abschluss aufs untere Tor): Mit dem aufs Tor geschossenen Ball beginnt direkt Runde 2. Die zweite Gruppe spielt die Übung spiegelverkehrt: Flügel rechts, Start oben beim oberen Tor, Abschluss aufs untere Tor. Danach wieder Runde 1 usw.',
    hauptzweck = 'Passspiel', nebenzweck = 'Torschuss', min_players = 8, max_players = 16, small_goals = 2
where name = 'Flügelpasszirkel mit Hinterlaufen';

insert into exercises (name, aufbau, ablauf, hauptzweck, nebenzweck, min_players, max_players, small_goals, mini_goals, category, created_by_team_id)
select
  'Flügelpasszirkel mit Hinterlaufen',
  'Lange Bahn mit 2 Kleinfeldtoren: eins oben, eins unten, beide mit Öffnung zum Feld. Zwei Gruppen mit je 4 Spielern. Runde 1 (Gruppe gelb): Flügel links Spieler 2 unten und Spieler 4 oben, jeweils hinter einem Hütchen; Mitte Spieler 1 unten beim unteren Tor (mit dem Ball) und Spieler 3 oben, jeweils mit einem Hütchen daneben. Runde 2 (Gruppe blau) ist der gleiche Aufbau punktgespiegelt: Flügel rechts, Spieler 1 mit dem Ball oben beim oberen Tor. 1 Ball, Start bei Spieler 1 von Gruppe gelb.',
  'Runde 1 (Abschluss aufs obere Tor):
1. Spieler 1 spielt den Ball auf den Flügel zu Spieler 2.
2. Spieler 2 spielt den Ball die Linie entlang steil zu Spieler 4.
3. Spieler 4 spielt den Ball quer in die Mitte zu Spieler 3.
4. Spieler 3 spielt einen diagonalen Pass in den Lauf von Spieler 2.
Gleichzeitig laufen:
5. Spieler 1 läuft seinem Pass hinterher auf den Platz von Spieler 2.
6. Spieler 2 läuft nach seinem Pass außen am Flügel entlang nach vorn (Hinterlaufen) und nimmt den diagonalen Pass an.
7. Spieler 4 läuft nach seinem Pass diagonal Richtung Tor in den Strafraum.
8. Spieler 3 läuft nach seinem Pass Richtung Tor in den Strafraum.
9. Spieler 2 bringt eine Flanke vors Tor.
10. Spieler 3 und 4 versuchen, im Strafraum ein Tor zu erzielen.
Runde 2 (Abschluss aufs untere Tor): Mit dem aufs Tor geschossenen Ball beginnt direkt Runde 2. Die zweite Gruppe spielt die Übung spiegelverkehrt: Flügel rechts, Start oben beim oberen Tor, Abschluss aufs untere Tor. Danach wieder Runde 1 usw.',
  'Passspiel',
  'Torschuss',
  8, 16, 2, 0,
  'ueben',
  (select id from teams where name = 'TVG E1')
where not exists (select 1 from exercises where name = 'Flügelpasszirkel mit Hinterlaufen');

insert into team_exercises (team_id, exercise_id)
select t.id, e.id
from teams t, exercises e
where t.name = 'TVG E1' and e.name = 'Flügelpasszirkel mit Hinterlaufen'
on conflict do nothing;

-- Kontrolle: soll genau 1 Zeile liefern, aktiv_im_team = true
select e.id, e.name, e.category, e.created_by_team_id,
       exists (select 1 from team_exercises te join teams t on t.id = te.team_id
               where te.exercise_id = e.id and t.name = 'TVG E1') as aktiv_im_team
from exercises e
where e.name = 'Flügelpasszirkel mit Hinterlaufen';
