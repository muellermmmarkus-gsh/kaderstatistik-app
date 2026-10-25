-- Importiert die Uebung "Agilität und Ballkontrolle" in die Uebungsdatenbank und aktiviert sie
-- fuer das Team TVG E1 (entspricht "In Team aktiv"). Erstellerteam = TVG E1, oeffentlich.
-- Kategorie (Aufwaermen), Schwerpunkte (Koordination, Dribbling) und Spielerzahl (8, zwei Stationen)
-- sind Vorschlaege - bei Bedarf in der App unter Uebungen -> Aendern anpassen. 'fields' bleibt leer.
-- Das Uebungsbild (Uebungsskizzen/16_agilitaet_ballkontrolle.png) wird danach in der App
-- unter Uebungen -> Aendern hochgeladen (Storage-Upload braucht Login).
--
-- Mehrfach ausfuehrbar: Existiert die Uebung schon, werden nur Aufbau und Ablauf aktualisiert;
-- sonst wird sie neu angelegt.
-- Im Supabase SQL Editor ausfuehren (Projekt "Kaderstatistik App"), nach migration_037.

update exercises
set aufbau = 'Zwei identische Stationen nebeneinander (gespiegelt aufgebaut), je Station 4 Spieler. Pro Station: 4 Hütchen, 2 Stangen, 2 Bälle. Start oben: Spieler 1 steht am Starthütchen, daneben liegt ein Ball; Spieler 3 wartet hinter ihm. Seitlich links ein Hütchen, darunter Stange 1, rechts davon höher Stange 2. Rechts unten ein Hütchen mit dem zweiten Ball daneben. Unten: Spieler 2 steht hinter dem unteren Hütchen, Spieler 4 wartet hinter ihm. Zwischen den Hütchen/Stangen der Reihenfolge nach (Start, linkes Hütchen, Stange 1, Stange 2, Hütchen rechts unten, unteres Hütchen) jeweils ca. 5 m Abstand.',
    ablauf = '1. Spieler 1 lässt den Ball am Start liegen und läuft ohne Ball zum linken Hütchen.
2. Spieler 1 läuft im Slalom um die beiden Stangen (unten um Stange 1, dann zwischen den Stangen hoch und um Stange 2 herum) zum Ball am Hütchen rechts unten.
3. Spieler 1 passt den Ball zu Spieler 2 am unteren Hütchen.
4. Spieler 2 dribbelt bis zum Hütchen rechts und legt den Ball dort ab.
5. Spieler 2 läuft ohne Ball den Parcours zurück: rechts außen nach oben, im Slalom um die Stangen zurück und zum linken Hütchen.
6. Spieler 2 passt den von Spieler 1 liegen gelassenen Ball zu Spieler 3 am Start und läuft dem Pass hinterher zum Start.
Danach startet Spieler 3 als Nächster (ohne Ball, der Ball liegt wieder am Start). Beide Stationen laufen gleichzeitig.'
where name = 'Agilität und Ballkontrolle';

insert into exercises (name, aufbau, ablauf, hauptzweck, nebenzweck, min_players, max_players, small_goals, mini_goals, category, created_by_team_id)
select
  'Agilität und Ballkontrolle',
  'Zwei identische Stationen nebeneinander (gespiegelt aufgebaut), je Station 4 Spieler. Pro Station: 4 Hütchen, 2 Stangen, 2 Bälle. Start oben: Spieler 1 steht am Starthütchen, daneben liegt ein Ball; Spieler 3 wartet hinter ihm. Seitlich links ein Hütchen, darunter Stange 1, rechts davon höher Stange 2. Rechts unten ein Hütchen mit dem zweiten Ball daneben. Unten: Spieler 2 steht hinter dem unteren Hütchen, Spieler 4 wartet hinter ihm. Zwischen den Hütchen/Stangen der Reihenfolge nach (Start, linkes Hütchen, Stange 1, Stange 2, Hütchen rechts unten, unteres Hütchen) jeweils ca. 5 m Abstand.',
  '1. Spieler 1 lässt den Ball am Start liegen und läuft ohne Ball zum linken Hütchen.
2. Spieler 1 läuft im Slalom um die beiden Stangen (unten um Stange 1, dann zwischen den Stangen hoch und um Stange 2 herum) zum Ball am Hütchen rechts unten.
3. Spieler 1 passt den Ball zu Spieler 2 am unteren Hütchen.
4. Spieler 2 dribbelt bis zum Hütchen rechts und legt den Ball dort ab.
5. Spieler 2 läuft ohne Ball den Parcours zurück: rechts außen nach oben, im Slalom um die Stangen zurück und zum linken Hütchen.
6. Spieler 2 passt den von Spieler 1 liegen gelassenen Ball zu Spieler 3 am Start und läuft dem Pass hinterher zum Start.
Danach startet Spieler 3 als Nächster (ohne Ball, der Ball liegt wieder am Start). Beide Stationen laufen gleichzeitig.',
  'Koordination',
  'Dribbling',
  8, 8, 0, 0,
  'aufwaermen',
  (select id from teams where name = 'TVG E1')
where not exists (select 1 from exercises where name = 'Agilität und Ballkontrolle');

insert into team_exercises (team_id, exercise_id)
select t.id, e.id
from teams t, exercises e
where t.name = 'TVG E1' and e.name = 'Agilität und Ballkontrolle'
on conflict do nothing;

-- Kontrolle: soll genau 1 Zeile liefern, aktiv_im_team = true
select e.id, e.name, e.category, e.created_by_team_id,
       exists (select 1 from team_exercises te join teams t on t.id = te.team_id
               where te.exercise_id = e.id and t.name = 'TVG E1') as aktiv_im_team
from exercises e
where e.name = 'Agilität und Ballkontrolle';
