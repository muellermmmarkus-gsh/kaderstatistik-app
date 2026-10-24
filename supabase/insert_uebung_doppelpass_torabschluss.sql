-- Importiert die Uebung "Doppelpass mit Torabschluss" (Fassung mit 8 nummerierten Schritten) in
-- die Uebungsdatenbank und aktiviert sie fuer das Team TVG E1 (entspricht "In Team aktiv").
-- Erstellerteam = TVG E1, oeffentlich. Kategorie (Ueben), Schwerpunkte (Passspiel, Torschuss)
-- und Spielerzahl (3-12) sind Vorschlaege - bei Bedarf in der App unter Uebungen -> Aendern
-- anpassen. 'fields' (Flaeche) bleibt leer.
-- Das Uebungsbild (Uebungsskizzen/11_doppelpass_torabschluss.png) wird danach in der App unter
-- Uebungen -> Aendern hochgeladen (Storage-Upload braucht Login).
--
-- Funktioniert auch, wenn die erste Fassung schon in der Datenbank steht: Aufbau und Ablauf
-- werden dann aktualisiert (Schwerpunkte, Spielerzahl usw. bleiben unveraendert), sonst wird
-- die Uebung neu angelegt.
-- Im Supabase SQL Editor ausfuehren (Projekt "Kaderstatistik App"), nach migration_037.

update exercises
set aufbau = 'Ein Kleinfeldtor am oberen Ende. Davor 3 Gegnerfiguren im Dreieck: eine in der Mitte, zwei seitlich weiter hinten. Direkt hinter den beiden seitlichen Gegnerfiguren steht je ein Spieler (Spieler 2 links, Spieler 3 rechts). Spieler 1 steht unten in der Mitte mit dem Ball.',
    ablauf = '1. Spieler 1 passt zu Spieler 3, der dem Ball entgegenkommt.
2. Spieler 3 spielt den Ball direkt zurück zu Spieler 1, der aufgerückt ist (Doppelpass).
3. Spieler 1 passt zu Spieler 2, der ihm entgegenkommt.
4. Spieler 2 passt quer zu Spieler 3.
5. Spieler 3 spielt den Ball direkt zurück zu Spieler 2 (zweiter Doppelpass).
6. Spieler 2 spielt den Ball steil in den Lauf von Spieler 3.
7. Spieler 3 läuft außen an der rechten Gegnerfigur vorbei.
8. Torabschluss von Spieler 3 auf das Kleinfeldtor.'
where name = 'Doppelpass mit Torabschluss';

insert into exercises (name, aufbau, ablauf, hauptzweck, nebenzweck, min_players, max_players, small_goals, mini_goals, category, created_by_team_id)
select
  'Doppelpass mit Torabschluss',
  'Ein Kleinfeldtor am oberen Ende. Davor 3 Gegnerfiguren im Dreieck: eine in der Mitte, zwei seitlich weiter hinten. Direkt hinter den beiden seitlichen Gegnerfiguren steht je ein Spieler (Spieler 2 links, Spieler 3 rechts). Spieler 1 steht unten in der Mitte mit dem Ball.',
  '1. Spieler 1 passt zu Spieler 3, der dem Ball entgegenkommt.
2. Spieler 3 spielt den Ball direkt zurück zu Spieler 1, der aufgerückt ist (Doppelpass).
3. Spieler 1 passt zu Spieler 2, der ihm entgegenkommt.
4. Spieler 2 passt quer zu Spieler 3.
5. Spieler 3 spielt den Ball direkt zurück zu Spieler 2 (zweiter Doppelpass).
6. Spieler 2 spielt den Ball steil in den Lauf von Spieler 3.
7. Spieler 3 läuft außen an der rechten Gegnerfigur vorbei.
8. Torabschluss von Spieler 3 auf das Kleinfeldtor.',
  'Passspiel',
  'Torschuss',
  3, 12, 1, 0,
  'ueben',
  (select id from teams where name = 'TVG E1')
where not exists (select 1 from exercises where name = 'Doppelpass mit Torabschluss');

insert into team_exercises (team_id, exercise_id)
select t.id, e.id
from teams t, exercises e
where t.name = 'TVG E1' and e.name = 'Doppelpass mit Torabschluss'
on conflict do nothing;

-- Kontrolle: soll genau 1 Zeile liefern, aktiv_im_team = true
select e.id, e.name, e.category, e.created_by_team_id,
       exists (select 1 from team_exercises te join teams t on t.id = te.team_id
               where te.exercise_id = e.id and t.name = 'TVG E1') as aktiv_im_team
from exercises e
where e.name = 'Doppelpass mit Torabschluss';
