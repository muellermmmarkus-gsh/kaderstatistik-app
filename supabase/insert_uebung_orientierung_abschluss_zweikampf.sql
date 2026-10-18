-- Importiert die Uebung "Orientierung+schneller Abschluss+Zweikampf" in die Uebungsdatenbank
-- und aktiviert sie fuer das Team TVG E1 (entspricht "In Team aktiv"). Erstellerteam = TVG E1,
-- oeffentlich. Kategorie (Ueben), Schwerpunkte (Orientierung, Torschuss) und Spielerzahl (6-14,
-- 2 Teams a 3-7) sind Vorschlaege - bei Bedarf in der App unter Uebungen -> Aendern anpassen.
-- 'fields' (Flaeche) bleibt leer, Masse sind nicht bekannt.
-- Das Uebungsbild (Uebungsskizzen/09_orientierung_abschluss_zweikampf.png) wird danach in der
-- App unter Uebungen -> Aendern hochgeladen (Storage-Upload braucht Login).
--
-- Idempotent: Eine Uebung mit gleichem Namen wird nicht doppelt angelegt.
-- Im Supabase SQL Editor ausfuehren (Projekt "Kaderstatistik App"), nach migration_037.

insert into exercises (name, aufbau, ablauf, hauptzweck, nebenzweck, min_players, max_players, small_goals, mini_goals, category, created_by_team_id)
select
  'Orientierung+schneller Abschluss+Zweikampf',
  '4 Minitore an den beiden Stirnseiten, je 2 pro Seite und farblich unterschieden: oben orange (links) und gelb (rechts), unten gelb (links) und orange (rechts). Hinter jedem Tor steht ein Hütchen in der Torfarbe.
2 Zielvierecke nebeneinander in der Mitte, jedes aus 4 grünen Hütchen.
Je Team 1 Spieler an seiner Stirnseite zwischen den beiden Toren, mit Ball (oben Blau, unten Orange).
Der Trainer steht seitlich auf Höhe der Zielvierecke und hat weitere Bälle.',
  '1. Start: 2 Teams, aus jedem Team geht 1 Spieler in die Übung (1 gegen 1). Beide stehen mit Ball an ihrer Stirnseite.
2. Dribbling: Auf Pfiff dribbeln beide los in ihr Zielviereck. Während des Dribbelns ruft der Trainer eine Farbe: orange oder gelb.
3. Abschluss: Im Zielviereck angekommen, schließt jeder sofort auf das Minitor in der gerufenen Farbe ab (auf der gegenüberliegenden Stirnseite).
4. Nachschub: Der Trainer passt einen weiteren Ball zu dem Spieler, der schneller abgeschlossen hat.
5. Zweikampf: Jetzt spielen beide 1 gegen 1.',
  'Orientierung',
  'Torschuss',
  6, 14, 0, 4,
  'ueben',
  (select id from teams where name = 'TVG E1')
where not exists (select 1 from exercises where name = 'Orientierung+schneller Abschluss+Zweikampf');

insert into team_exercises (team_id, exercise_id)
select t.id, e.id
from teams t, exercises e
where t.name = 'TVG E1' and e.name = 'Orientierung+schneller Abschluss+Zweikampf'
on conflict do nothing;

-- Kontrolle: soll genau 1 Zeile liefern, aktiv_im_team = true
select e.id, e.name, e.category, e.created_by_team_id,
       exists (select 1 from team_exercises te join teams t on t.id = te.team_id
               where te.exercise_id = e.id and t.name = 'TVG E1') as aktiv_im_team
from exercises e
where e.name = 'Orientierung+schneller Abschluss+Zweikampf';
