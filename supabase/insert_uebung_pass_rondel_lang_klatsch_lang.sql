-- Importiert die Uebung "Pass-Rondel Lang-klatsch-Lang" in die Uebungsdatenbank und aktiviert sie
-- fuer das Team TVG E1 (entspricht "In Team aktiv"). Erstellerteam = TVG E1, oeffentlich.
-- Kategorie (Ueben), Schwerpunkte (Passspiel, Ballannahme) und Spielerzahl (8-16) sind
-- Vorschlaege - bei Bedarf in der App unter Uebungen -> Aendern anpassen. 'fields' bleibt leer.
-- Das Uebungsbild (Uebungsskizzen/14_pass_rondel_lang_klatsch_lang.png) wird danach in der App
-- unter Uebungen -> Aendern hochgeladen (Storage-Upload braucht Login).
--
-- Mehrfach ausfuehrbar: Existiert die Uebung schon, werden nur Aufbau und Ablauf aktualisiert;
-- sonst wird sie neu angelegt.
-- Im Supabase SQL Editor ausfuehren (Projekt "Kaderstatistik App"), nach migration_037.

update exercises
set aufbau = '4 Stationen im Viereck: oben, links, unten, rechts. An jeder Station stehen 2 Hütchen und 2 Spieler, je einer hinter einem Hütchen: ein Annehmer und ein Passgeber. Aufstellung: oben Spieler 1 (Annehmer) und 2 (Passgeber, mit dem Ball), links 3 (Passgeber, oben) und 4 (Annehmer, unten), unten 5 (Passgeber, links) und 6 (Annehmer, rechts), rechts 7 (Passgeber, unten) und 8 (Annehmer, oben). 1 Ball, Start oben bei Spieler 2.',
    ablauf = 'Lang – Klatsch – Lang: Der Ball wandert gegen den Uhrzeigersinn von Station zu Station (oben, links, unten, rechts, oben).
1. Lang: Spieler 2 (oben) spielt einen langen Pass zu Spieler 4 an der linken Station und läuft dem Pass hinterher auf dessen Platz.
2. Klatsch: Spieler 4 spielt den Ball direkt (ein Kontakt) zu seinem Stationspartner Spieler 3 und rückt auf dessen Platz.
3. Lang: Spieler 3 spielt einen langen Pass zu Spieler 6 an der unteren Station und läuft hinterher.
4. Klatsch: Spieler 6 spielt direkt zu Spieler 5 und rückt nach.
5. Lang: Spieler 5 spielt lang zu Spieler 8 an der rechten Station und läuft hinterher.
6. Klatsch: Spieler 8 spielt direkt zu Spieler 7 und rückt nach.
7. Lang: Spieler 7 spielt lang zu Spieler 1 an der oberen Station und läuft hinterher.
8. Klatsch: Spieler 1 spielt direkt zu Spieler 2 und rückt nach. Danach beginnt der Kreislauf von vorn.'
where name = 'Pass-Rondel Lang-klatsch-Lang';

insert into exercises (name, aufbau, ablauf, hauptzweck, nebenzweck, min_players, max_players, small_goals, mini_goals, category, created_by_team_id)
select
  'Pass-Rondel Lang-klatsch-Lang',
  '4 Stationen im Viereck: oben, links, unten, rechts. An jeder Station stehen 2 Hütchen und 2 Spieler, je einer hinter einem Hütchen: ein Annehmer und ein Passgeber. Aufstellung: oben Spieler 1 (Annehmer) und 2 (Passgeber, mit dem Ball), links 3 (Passgeber, oben) und 4 (Annehmer, unten), unten 5 (Passgeber, links) und 6 (Annehmer, rechts), rechts 7 (Passgeber, unten) und 8 (Annehmer, oben). 1 Ball, Start oben bei Spieler 2.',
  'Lang – Klatsch – Lang: Der Ball wandert gegen den Uhrzeigersinn von Station zu Station (oben, links, unten, rechts, oben).
1. Lang: Spieler 2 (oben) spielt einen langen Pass zu Spieler 4 an der linken Station und läuft dem Pass hinterher auf dessen Platz.
2. Klatsch: Spieler 4 spielt den Ball direkt (ein Kontakt) zu seinem Stationspartner Spieler 3 und rückt auf dessen Platz.
3. Lang: Spieler 3 spielt einen langen Pass zu Spieler 6 an der unteren Station und läuft hinterher.
4. Klatsch: Spieler 6 spielt direkt zu Spieler 5 und rückt nach.
5. Lang: Spieler 5 spielt lang zu Spieler 8 an der rechten Station und läuft hinterher.
6. Klatsch: Spieler 8 spielt direkt zu Spieler 7 und rückt nach.
7. Lang: Spieler 7 spielt lang zu Spieler 1 an der oberen Station und läuft hinterher.
8. Klatsch: Spieler 1 spielt direkt zu Spieler 2 und rückt nach. Danach beginnt der Kreislauf von vorn.',
  'Passspiel',
  'Ballannahme',
  8, 16, 0, 0,
  'ueben',
  (select id from teams where name = 'TVG E1')
where not exists (select 1 from exercises where name = 'Pass-Rondel Lang-klatsch-Lang');

insert into team_exercises (team_id, exercise_id)
select t.id, e.id
from teams t, exercises e
where t.name = 'TVG E1' and e.name = 'Pass-Rondel Lang-klatsch-Lang'
on conflict do nothing;

-- Kontrolle: soll genau 1 Zeile liefern, aktiv_im_team = true
select e.id, e.name, e.category, e.created_by_team_id,
       exists (select 1 from team_exercises te join teams t on t.id = te.team_id
               where te.exercise_id = e.id and t.name = 'TVG E1') as aktiv_im_team
from exercises e
where e.name = 'Pass-Rondel Lang-klatsch-Lang';
