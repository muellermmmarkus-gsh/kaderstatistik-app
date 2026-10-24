-- Importiert die Uebung "Passzirkel komplex" (inkl. gespiegeltem 2. Durchgang) in die
-- Uebungsdatenbank und aktiviert sie fuer das Team TVG E1 (entspricht "In Team aktiv").
-- Erstellerteam = TVG E1, oeffentlich. Kategorie (Ueben), Schwerpunkte (Passspiel, Orientierung)
-- und Spielerzahl (5-10) sind Vorschlaege - bei Bedarf in der App unter Uebungen -> Aendern
-- anpassen. 'fields' bleibt leer (die Abstaende stehen im Aufbau-Text).
-- Das Uebungsbild (Uebungsskizzen/13_passzirkel_komplex.png, beide Durchgaenge nebeneinander)
-- wird danach in der App unter Uebungen -> Aendern hochgeladen (Storage-Upload braucht Login).
--
-- Mehrfach ausfuehrbar: Existiert die Uebung schon, werden nur Aufbau und Ablauf aktualisiert;
-- sonst wird sie neu angelegt.
-- Im Supabase SQL Editor ausfuehren (Projekt "Kaderstatistik App"), nach migration_037.

update exercises
set aufbau = '4 Gegnerfiguren: eine in der Mitte, eine unten, je eine links und rechts. Abstände: oben bis Mitte 20 m, Mitte bis unten 20 m, Mitte bis links und Mitte bis rechts je 8 m. 5 Spieler: Spieler 1 steht oben mit dem Ball, Spieler 2 direkt hinter der mittleren Figur, Spieler 3 direkt hinter der unteren Figur, Spieler 4 links und Spieler 5 rechts neben der jeweiligen Figur.',
    ablauf = '1. Durchgang:
1. Spieler 1 passt in die Mitte.
2. Spieler 2 kommt dem Pass entgegen, links um die Mittelfigur herum.
3. Spieler 2 spielt den Ball direkt zurück zu Spieler 1.
4. Spieler 3 läuft rechts um die untere Figur herum.
5. Spieler 1 spielt einen langen Pass zu Spieler 3.
6. Spieler 3 passt zu Spieler 2 (der wieder hinter der Mittelfigur steht).
7. Spieler 3 läuft links um die untere Figur herum.
8. Spieler 2 passt zu Spieler 3.
9. Spieler 3 spielt einen langen Diagonalpass zu Spieler 4.
10. Spieler 4 läuft dem Pass entgegen.

2. Durchgang (auf die rechte Seite gespiegelt):
Nach dem ersten Durchlauf folgt der nächste Durchgang seitenverkehrt, mit denselben Schritten: Spieler 2 kommt rechts um die Mittelfigur herum entgegen, Spieler 3 läuft zuerst links und danach rechts um die untere Figur herum, der lange Diagonalpass geht zu Spieler 5 (rechts), und Spieler 5 läuft dem Pass entgegen. Die übrigen Pässe laufen in der gleichen Reihenfolge, nur seitenverkehrt.'
where name = 'Passzirkel komplex';

insert into exercises (name, aufbau, ablauf, hauptzweck, nebenzweck, min_players, max_players, small_goals, mini_goals, category, created_by_team_id)
select
  'Passzirkel komplex',
  '4 Gegnerfiguren: eine in der Mitte, eine unten, je eine links und rechts. Abstände: oben bis Mitte 20 m, Mitte bis unten 20 m, Mitte bis links und Mitte bis rechts je 8 m. 5 Spieler: Spieler 1 steht oben mit dem Ball, Spieler 2 direkt hinter der mittleren Figur, Spieler 3 direkt hinter der unteren Figur, Spieler 4 links und Spieler 5 rechts neben der jeweiligen Figur.',
  '1. Durchgang:
1. Spieler 1 passt in die Mitte.
2. Spieler 2 kommt dem Pass entgegen, links um die Mittelfigur herum.
3. Spieler 2 spielt den Ball direkt zurück zu Spieler 1.
4. Spieler 3 läuft rechts um die untere Figur herum.
5. Spieler 1 spielt einen langen Pass zu Spieler 3.
6. Spieler 3 passt zu Spieler 2 (der wieder hinter der Mittelfigur steht).
7. Spieler 3 läuft links um die untere Figur herum.
8. Spieler 2 passt zu Spieler 3.
9. Spieler 3 spielt einen langen Diagonalpass zu Spieler 4.
10. Spieler 4 läuft dem Pass entgegen.

2. Durchgang (auf die rechte Seite gespiegelt):
Nach dem ersten Durchlauf folgt der nächste Durchgang seitenverkehrt, mit denselben Schritten: Spieler 2 kommt rechts um die Mittelfigur herum entgegen, Spieler 3 läuft zuerst links und danach rechts um die untere Figur herum, der lange Diagonalpass geht zu Spieler 5 (rechts), und Spieler 5 läuft dem Pass entgegen. Die übrigen Pässe laufen in der gleichen Reihenfolge, nur seitenverkehrt.',
  'Passspiel',
  'Orientierung',
  5, 10, 0, 0,
  'ueben',
  (select id from teams where name = 'TVG E1')
where not exists (select 1 from exercises where name = 'Passzirkel komplex');

insert into team_exercises (team_id, exercise_id)
select t.id, e.id
from teams t, exercises e
where t.name = 'TVG E1' and e.name = 'Passzirkel komplex'
on conflict do nothing;

-- Kontrolle: soll genau 1 Zeile liefern, aktiv_im_team = true
select e.id, e.name, e.category, e.created_by_team_id,
       exists (select 1 from team_exercises te join teams t on t.id = te.team_id
               where te.exercise_id = e.id and t.name = 'TVG E1') as aktiv_im_team
from exercises e
where e.name = 'Passzirkel komplex';
