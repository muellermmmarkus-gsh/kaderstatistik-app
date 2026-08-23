-- Importiert den Uebungskatalog aus Uebungskatalog_Spielaufbau_Kleinfeld.xlsx (20 Uebungen,
-- Schwerpunkt Spielaufbau/Kleinfeld). Gleiches Mapping wie beim vorherigen Uebungsimport:
-- Spalte 'Beschreibung' -> 'aufbau', 'ablauf' bleibt leer, 'Dauer (Min)' wird ignoriert.
-- Spalte 'Fläche' wurde in neue Eintraege unter 'fields' (Flaechenplanung) uebersetzt und
-- per field_id verknuepft; bei Flaechen ohne explizite Masse (z.B. 'Kleinfeld, 9 Zonen',
-- 'Großfeld-Ausschnitt') wurden wie beim letzten Mal plausible Platzhalter-Masse angenommen -
-- bitte unter 'Flaechenplanung' pruefen/anpassen.
-- Spalte 'Spieler' wurde wie folgt umgerechnet: Zusatzangaben zu Torhuetern ('+ 2 TW', '+ TW')
-- und Klammer-Erlaeuterungen wurden entfernt, danach wie gehabt '-' -> 1-99, 'N+' -> N-99,
-- 'N-M' -> N-M, 'N' -> N-N (bezieht sich auf Feldspieler, TW-Angaben gehen nicht mit ein).
-- Spalte 'Link zur Uebung' wurde in das neue Feld 'source_url' uebernommen; die Spalte
-- 'Quelle' (Kurztext, z.B. Website-Name) wird nicht separat gespeichert, da source_url den
-- Link bereits abdeckt. Die im Katalog enthaltenen Erklaerbilder (Spalte 'Erklärbild')
-- wurden NICHT importiert, da kein Datenbankzugriff mit Trainer-Rechten fuer den Upload in
-- den Supabase-Storage-Bucket besteht - liegen stattdessen lokal bereit, siehe Chat.
--
-- Idempotent: Uebungen/Flaechen mit bereits vorhandenem Namen werden uebersprungen.
-- Im Supabase SQL Editor ausfuehren (nach migration_017_exercise_source_url.sql).

insert into fields (name, length_m, width_m)
select v.name, v.length_m, v.width_m
from (
  values
    ('Feld 15x15m', 15, 15),
    ('Feld 15x20m', 15, 20),
    ('Feld 30x50m', 30, 50),
    ('Feld 40x40m', 40, 40),
    ('Feld 6x6m', 6, 6),
    ('Feld 80x20m (3 Zonen)', 80, 20),
    ('Feld 8x8m', 8, 8),
    ('Großfeld-Ausschnitt', 30, 40),
    ('Kleinfeld, 4 Minitore', 20, 30),
    ('Kleinfeld, 9 Zonen', 20, 30)
) as v(name, length_m, width_m)
where not exists (select 1 from fields f where f.name = v.name);

insert into exercises (name, aufbau, ablauf, hauptzweck, nebenzweck, min_players, max_players, small_goals, mini_goals, category, field_id, source_url)
select v.name, v.aufbau, '', v.hauptzweck, v.nebenzweck, v.min_players, v.max_players, v.small_goals, v.mini_goals, v.category,
  (select id from fields f where f.name = v.flaeche limit 1), v.source_url
from (
  values
    ('Spielaufbau 7 gegen 7 ab Torwart', 'Jede Aktion beginnt beim Torwart. Ziel: sichere, präzise Pässe spielen und Passwege durch die gegnerischen Linien öffnen. Geht der Ball ins Aus, eröffnet der gegnerische Torwart neu.', 'Spielaufbau', 'Passspiel', 12, 14, 2, 0, 'ueben', 'Feld 30x50m', 'https://www.youcoach.de/fussballubungen/taktik/spielform-fuer-den-spielaufbau'),
    ('3-Zonen-Aufbauspiel mit Überzahl', 'Feld in Abwehr-, Mittel- und Angriffszone geteilt. Ein Mittelfeldspieler kippt in die Abwehrzone ab (3 gg 2), im Mittelfeld entsteht so eine 4-gg-3-Überzahl inkl. neutralem Spieler, vorne wird 1 gg 1 oder 2 gg 2 zu Ende gespielt. Ziel: Überzahl erkennen und Linien überspielen.', 'Spielaufbau', 'Taktik', 16, 16, 2, 0, 'ueben', 'Feld 80x20m (3 Zonen)', 'https://www.soccercoachweekly.net/drills-and-games/drills/build-up-into-attack'),
    ('4 gegen 4 mit Aufbauzonen', 'Zwei 4er-Teams spielen mit Torwart auf Tore. Am Spielfeldrand markierte Diagonalzonen: Der Spieler, der dort den Ball erhält, hat nur wenige Sekunden Zeit zum Weiterspielen. Fördert schnelles Freilaufen und das Schaffen von Anspielstationen.', 'Spielaufbau', 'Ballzirkulation', 8, 8, 2, 0, 'ueben', 'Feld 40x40m', 'https://www.youcoach.com/soccer-drills/tactics/4-vs-4-build-back'),
    ('Vierer-Tore-Spiel', 'Freies Spiel auf 4 Minitore. Bei Ausball erfolgt der Einstoß mittig zwischen zwei Toren. Schult das Erkennen freier Räume und das schnelle Verlagern des Spiels.', 'Orientierung', 'Spielverlagerung', 6, 8, 0, 4, 'spielen', 'Feld 15x20m', 'https://soccersourcecoaching.com/playing-out-from-the-back/'),
    ('Bonus-Tor für sauberen Aufbau', 'Normales Kleinfeldspiel; solange das ballbesitzende Team in der eigenen Hälfte aufbaut, dürfen nur die zwei vordersten Verteidiger pressen. Gelingt der Aufbau über die Mittellinie bis zum Torerfolg, zählt das Tor dreifach.', 'Spielaufbau', 'Motivation', 6, 8, 0, 2, 'spielen', 'Feld 15x20m', 'https://soccersourcecoaching.com/playing-out-from-the-back/'),
    ('Fangspiel: Frei bleiben mit Ball', 'Fangspiel mit Ball: Wer den Ball besitzt, kann nicht abgeschlagen werden. Der Ballbesitzer muss sich rechtzeitig anbieten, um den Pass zu bekommen, bevor er selbst gefangen wird.', 'Freilaufen', 'Timing', 6, 6, 0, 0, 'aufwaermen', 'Feld 15x15m', 'https://soccersourcecoaching.com/playing-out-from-the-back/'),
    ('2 gegen 2 mit Anspielstationen', '2 neutrale Anspieler außen, 2 gegen 2 in der Mitte. Punkt für jeden Pass, der von einem Anspieler zum anderen durchs Feld gespielt wird, ebenso für jeden Pass, der die beiden Verteidiger aussticht.', 'Passspiel', 'Raumnutzung', 6, 6, 0, 0, 'ueben', 'Feld 8x8m', 'https://soccersourcecoaching.com/playing-out-from-the-back/'),
    ('Rondo 3 gegen 1', 'Klassisches Positionsspiel: 3 Außenspieler gegen 1 Verteidiger in der Mitte. Ziel: möglichst viele Pässe am Verteidiger vorbei spielen.', 'Ballkontrolle', 'Passspiel', 4, 4, 0, 0, 'aufwaermen', 'Feld 6x6m', 'https://soccersourcecoaching.com/playing-out-from-the-back/'),
    ('Rondo 4 gegen 2 – Linie durchspielen', '4 Außenspieler gegen 2 Verteidiger im Zentrum. Punkt für jeden Pass, der die beiden Verteidiger aussticht (''durch die Linie spielen'') – Kernprinzip des Spielaufbaus im Kleinen geübt.', 'Passspiel', 'Spielaufbau', 6, 6, 0, 0, 'ueben', 'Feld 8x8m', 'https://soccersourcecoaching.com/playing-out-from-the-back/'),
    ('Feldaufteilung 3x3 im Kleinfeld', 'Kleinfeld mit Markierungstellern in 9 gleiche Zonen unterteilt (Abwehr-/Mittelfeld-/Angriffszone je links/Mitte/rechts). Spieler zirkulieren den Ball durch die Zonen und wechseln dabei gezielt in unbesetzte Felder.', 'Raumaufteilung', 'Spielaufbau', 6, 6, 1, 0, 'ueben', 'Kleinfeld, 9 Zonen', 'https://www.soccerdrills.de/theorie-und-wissen/taktiktraining/raumaufteilung-am-beispiel-kleinfeldfussball/'),
    ('Gemeinsames Verschieben gegen passive Angreifer', '3 Angreifer passen sich frei den Ball zu, 6 Verteidiger verschieben zonal zum Ball und dürfen ihre Zone anfangs nicht verlassen. Schult das gemeinsame Verschieben der Abwehrkette als Grundlage für sauberen Ballgewinn und Aufbau.', 'Raumaufteilung', 'Verteidigung', 9, 9, 0, 0, 'ueben', 'Kleinfeld, 9 Zonen', 'https://www.soccerdrills.de/theorie-und-wissen/taktiktraining/raumaufteilung-am-beispiel-kleinfeldfussball/'),
    ('Feldüberbrückung mit Passvorgabe', 'Nach Abstoß/Abwurf des Torwarts soll das Feld mit einer vorgegebenen Anzahl Pässe (z. B. 6, nur Direktspiel) überbrückt und ein Tor erzielt werden – zunächst gegen passive, später gegen aktive Verteidiger.', 'Spielaufbau', 'Passspiel', 6, 11, 1, 0, 'ueben', 'Kleinfeld, 9 Zonen', 'https://www.soccerdrills.de/theorie-und-wissen/taktiktraining/raumaufteilung-am-beispiel-kleinfeldfussball/'),
    ('2 gegen 1 über Außen und Zentrum', 'Zwei Spieler gegen einen Gegner suchen den freien Passweg – außen herum oder durchs Zentrum. Zunächst mit Hütchen als Orientierungshilfe, später mit echtem Gegenspieler unter Druck.', 'Spielaufbau', 'Passspiel', 3, 3, 0, 0, 'ueben', null, 'https://trainerblog.fussball-training.org/kinderfussball/f-jugend-ballkontrolle-spielaufbau-12833.html'),
    ('1 gegen 1 Ballhalten mit Anspielern', '2 Teams mit je einem Innen- und einem Außenspieler stehen sich gegenüber. Die Innenspieler versuchen im 1 gegen 1, den Ball zu ihrem Außenspieler zu sichern und zu halten.', 'Zweikampf', 'Ballsicherung', 4, 4, 0, 0, 'ueben', 'Feld 15x15m', 'https://trainerblog.fussball-training.org/kinderfussball/f-jugend-ballkontrolle-spielaufbau-12833.html'),
    ('Passverlagerung Torwart – Abwehr', 'Wechselseitiges, beidfüßiges Passspiel zwischen Torwart und Abwehrspielern. Schult die erste, sichere Ballverteilung von hinten heraus als Basis jedes Spielaufbaus.', 'Spielaufbau', 'Passspiel', 3, 4, 0, 0, 'ueben', null, 'https://trainerblog.fussball-training.org/kinderfussball/spielaufbau-in-der-e-jugend-7-gegen-7-6779.html'),
    ('Diagonale Ballmitnahme am Flügel', 'Ballannahme mit Mitnahme zur anderen Seite bzw. schräg nach vorne am Flügel. Trainiert die richtige Körperstellung beim Öffnen des Spiels nach dem Erhalt des Balls.', 'Ballkontrolle', 'Spielaufbau', 3, 4, 0, 0, 'ueben', null, 'https://trainerblog.fussball-training.org/kinderfussball/spielaufbau-in-der-e-jugend-7-gegen-7-6779.html'),
    ('Freilaufen mit Gegner im Rücken', 'Spieler bieten sich mit Gegenspieler im Rücken an, drehen auf und nehmen zügig Tempo in Richtung Tor auf – Vorbereitung auf offene Situationen im Spielaufbau.', 'Freilaufen', 'Spielaufbau', 4, 99, 0, 0, 'ueben', null, 'https://trainerblog.fussball-training.org/kinderfussball/spielaufbau-in-der-e-jugend-7-gegen-7-6779.html'),
    ('Diamanten-Klau', 'Spielerisches Aufwärmspiel: Die Kinder erobern und verteidigen Markierungshütchen (''Diamanten'') und lernen dabei nebenbei, Lücken im Raum zu erkennen und zu nutzen.', 'Orientierung', 'Reaktionsschnelligkeit', 6, 99, 0, 0, 'aufwaermen', null, 'https://training.advance.football/pages/uebungen_e-jugend_u11_training'),
    ('FUNiño – 3 gegen 3 auf 4 Minitore', 'Zwei 3er-Teams spielen ohne Schiedsrichter und Torhüter auf je zwei Minitore; Aus- und Foulsituationen regeln die Kinder selbst. Ziel: maximale Ballkontakte, Dribblings und Torabschlüsse für alle – am besten mehrere Felder parallel aufbauen.', 'Spielform', 'Spielintelligenz', 6, 8, 0, 4, 'spielen', 'Kleinfeld, 4 Minitore', 'https://fussballtraining.com/artikeldetail/funino-so-funktioniert-die-spielform-im-kinderfussball'),
    ('4 gegen 4 mit Mittellinienregel', '4 gegen 4 auf je ein großes Tor; eine Sonderregel an der Mittellinie (z. B. Tor zählt nur nach kontrolliertem Aufbau über die Linie) fördert bewusste Spieleröffnung statt langer, ungezielter Bälle.', 'Spielaufbau', 'Spielform', 8, 8, 0, 0, 'spielen', 'Großfeld-Ausschnitt', 'https://training.advance.football/pages/uebungen_e-jugend_u11_training')
) as v(name, aufbau, hauptzweck, nebenzweck, min_players, max_players, small_goals, mini_goals, category, flaeche, source_url)
where not exists (select 1 from exercises e where e.name = v.name);
