-- Importiert den Uebungskatalog aus Uebungskatalog_Kaderstatistik.xlsx (63 Uebungen).
-- Spalten J (Dauer) und K (Quelle) wurden absprachegemaess nicht uebernommen.
-- Spalte I (Beschreibung) wurde in das Feld 'aufbau' uebernommen; 'ablauf' bleibt leer,
-- da der Katalog dafuer keine eigene Spalte hat.
--
-- Spalte F (Spieler) wurde wie folgt in min_players/max_players umgerechnet:
-- '-' (beliebig) -> 1-99, 'N+' -> N-99, 'N-M' -> N-M, 'N' -> N-N.
--
-- Spalte C (Flaeche) wurde in neue Eintraege unter 'fields' (Flaechenplanung) uebersetzt
-- und per field_id verknuepft. WICHTIG: Fuer Flaechen ohne explizite Masse im Katalog
-- (z.B. 'Kleinfeld', 'Halle', 'Kreis', 'Mini-Feld', ...) wurden plausible Platzhalter-Masse
-- angenommen (siehe Kommentare unten) - bitte unter 'Flaechenplanung' pruefen/anpassen.
--
-- Idempotent: Uebungen/Flaechen mit bereits vorhandenem Namen werden uebersprungen.
-- Im Supabase SQL Editor ausfuehren.

insert into fields (name, length_m, width_m)
select v.name, v.length_m, v.width_m
from (
  values
    ('2 Felder', 15, 25),
    ('2 Kleinfelder', 20, 30),
    ('3 Zonen', 30, 50),
    ('4 Vierecke', 10, 10),
    ('Feld 10x10m', 10, 10),
    ('Feld 10x20m', 10, 20),
    ('Feld 15x25m', 15, 25),
    ('Feld 20x15m (3 Zonen)', 20, 15),
    ('Großfeld', 40, 60),
    ('Halber Platz, 3 Zonen', 30, 50),
    ('Halle', 20, 40),
    ('Kleinfeld', 20, 30),
    ('Kleinfeld/Großfeld', 20, 30),
    ('Kreis', 10, 10),
    ('Mehrere Kleinfelder', 20, 30),
    ('Mini-Feld', 10, 15),
    ('Mini-Feld, 4 Tore', 10, 15),
    ('Viereck', 10, 10),
    ('Viereck 15x25m', 15, 25)
) as v(name, length_m, width_m)
where not exists (select 1 from fields f where f.name = v.name);

insert into exercises (name, aufbau, ablauf, hauptzweck, nebenzweck, min_players, max_players, small_goals, mini_goals, category, field_id)
select v.name, v.aufbau, '', v.hauptzweck, v.nebenzweck, v.min_players, v.max_players, v.small_goals, v.mini_goals, v.category,
  (select id from fields f where f.name = v.flaeche limit 1)
from (
  values
    ('Schatzjäger', 'Lauf-/Fangspiel mit Ball zur Aktivierung.', 'Koordination', 'Ballgefühl', 1, 99, 0, 0, 'aufwaermen', 'Feld 15x25m'),
    ('Kleinfeld Balldribbling Wandspieler außen', 'Dribbeln im Feld, 4-8 Außenspieler fungieren als Wandspieler. Hinweis: existiert bereits in der App.', 'Dribbling', 'Passspiel', 4, 8, 0, 0, 'aufwaermen', 'Viereck 15x25m'),
    ('Handball im Kleinfeld', 'Handball-Variante als Aufwärmspiel; Variante: Ballbesitzer darf nur im Stehen spielen.', 'Koordination', 'Ballgefühl', 1, 99, 0, 0, 'aufwaermen', 'Feld 15x25m'),
    ('Freund, Feind, Tor', 'Reaktionsspiel: Zuordnung von Mit-/Gegenspielern und Toren.', 'Koordination', 'Spielintelligenz', 1, 99, 0, 0, 'aufwaermen', 'Feld 15x25m'),
    ('Farbenspiel Aktivieren', '4 Farben Leibchen/Hütchen; bei Pfiff zum passenden Hütchen sprinten.', 'Koordination', 'Reaktionsschnelligkeit', 1, 99, 0, 0, 'aufwaermen', 'Feld 15x25m'),
    ('Hasenjagd mit Ball', 'Fangspiel mit Ball im Kleinfeld.', 'Dribbling', 'Koordination', 1, 99, 0, 0, 'aufwaermen', 'Feld 15x25m'),
    ('Dribbeln im Viereck mit Torschuss', 'Dribbling mit Stoppaktionen, Abschluss aufs Tor.', 'Dribbling', 'Torschuss', 1, 99, 0, 0, 'aufwaermen', 'Viereck'),
    ('Passwettbewerb', 'Wettbewerbsform im Passspiel.', 'Passspiel', 'Schnelligkeit', 1, 99, 0, 0, 'aufwaermen', null),
    ('Versteinern', 'Fangspielvariante ''Freeze Tag''.', 'Koordination', 'Reaktionsschnelligkeit', 1, 99, 0, 0, 'aufwaermen', 'Feld 10x20m'),
    ('Zusammenpassen Pärchen', 'Passen in Paaren auf kurzer Distanz.', 'Passspiel', 'Ballkontrolle', 2, 2, 0, 0, 'aufwaermen', 'Feld 10x20m'),
    ('Fussball-Bingo', 'Bingo-Aufwärmspiel.', 'Koordination', 'Aktivierung', 1, 99, 0, 0, 'aufwaermen', null),
    ('Power-Aufwärmen', 'Konditionelles Wettbewerbs-Aufwärmen.', 'Athletik', 'Schnelligkeit', 1, 99, 0, 0, 'aufwaermen', null),
    ('Dribbeln durch Vierecke', 'Dribbling durch mehrere Vierecke.', 'Dribbling', 'Koordination', 1, 99, 0, 0, 'aufwaermen', '4 Vierecke'),
    ('Spiel auf 4 Tore', 'Freies Spiel mit 4 Minitoren.', 'Spielform', 'Orientierung', 1, 99, 0, 4, 'aufwaermen', 'Kleinfeld'),
    ('Passspiel Gegenüber', 'Passen im Gegenüber.', 'Passspiel', 'Ballkontrolle', 2, 2, 0, 0, 'aufwaermen', null),
    ('Dribbeln und Schießen', 'Einfache Kombination Dribbling + Abschluss; bei mehr als 5 Spielern 2 Tore.', 'Dribbling', 'Torschuss', 1, 99, 0, 1, 'aufwaermen', null),
    ('4 gegen 2 (Aufwärmen)', 'Ballbesitzspiel als Aufwärmen.', 'Passspiel', 'Spielintelligenz', 4, 6, 0, 0, 'aufwaermen', null),
    ('Dribbeln über den ganzen Platz', 'Dribbling über die volle Feldlänge mit Zusatzaufgaben.', 'Dribbling', 'Koordination', 1, 99, 0, 0, 'aufwaermen', 'Großfeld'),
    ('Dribbelbolognese', 'Verspieltes Dribbel-Parcours-Aufwärmen.', 'Dribbling', 'Koordination', 1, 99, 0, 0, 'aufwaermen', null),
    ('Dribbling-Wettbewerb', 'Wettbewerbsform im Dribbling.', 'Dribbling', 'Schnelligkeit', 1, 99, 0, 0, 'aufwaermen', null),
    ('Dribbeln im Kreis mit Torschuss', 'Dribbeln im Kreis (Außenseite/Innenseite/Sohle) mit anschließendem Torschuss.', 'Dribbling', 'Torschuss', 1, 99, 0, 1, 'aufwaermen', 'Kreis'),
    ('Passwettbewerb mit Hinterherlaufen', 'Passwettbewerb, Passgeber läuft dem Ball hinterher.', 'Passspiel', 'Schnelligkeit', 1, 99, 0, 0, 'aufwaermen', null),
    ('Dribbeln an der Wand mit Torschuss (Halle)', 'Dribbeln an der Wand, Hütchen ausspielen, anschließend Torschuss.', 'Dribbling', 'Torschuss', 12, 13, 0, 1, 'aufwaermen', 'Halle'),
    ('Spielaufbau Zonenspiel', 'Theorie (Anbieten kurz/lang) + Praxis: 2 Teams greifen an, 1 Team verteidigt passiv, max. 3 Ballkontakte.', 'Spielaufbau', 'Taktik', 6, 8, 0, 0, 'ueben', 'Halber Platz, 3 Zonen'),
    ('Torschuss nach Grundlinienpass', 'Pass von der Grundlinie, Ballannahme, Abschluss gegen passiven Verteidiger.', 'Torschuss', 'Ballannahme', 2, 2, 1, 0, 'ueben', null),
    ('Passspiel auf Distanz', 'Zusammenpassen auf 1, 3 und 5 Meter Distanz.', 'Passspiel', 'Technik', 2, 2, 0, 0, 'ueben', null),
    ('Dribbling mit Torschuss auf kleine Tore', 'Dribbeln durch Hütchen mit Abschluss; Varianten mit Ablage/Dreieck und Doppelpass.', 'Dribbling', 'Torschuss', 2, 4, 2, 0, 'ueben', null),
    ('Überzahlspiel 4/5 gegen 2', 'Überzahlspiel in 3 Feldern, Torwarttraining separat.', 'Spielform', 'Spielintelligenz', 6, 7, 0, 0, 'ueben', 'Feld 10x10m'),
    ('Turnier mit Taktikschulung', '3 Mannschaften à 6 Spieler; 7 gegen 7 mit Taktikanweisungen + Torschuss-Station mit Torwart.', 'Taktik', 'Stellungsspiel', 18, 18, 0, 0, 'ueben', 'Kleinfeld'),
    ('Torschuss-Parcours (3 Stationen)', '3 Stationen: Dribbeln+Ablage+Schuss / Koordinationsleiter+Schuss / Dribbeln durch Stangen+Sprung+Schuss.', 'Torschuss', 'Koordination', 6, 99, 2, 1, 'ueben', null),
    ('Kleinfeldturnier 2 gegen 2', 'Kleinfeldturnier auf kleine Tore, parallel Torschussstation mit Torwart.', 'Spielform', 'Zweikampf', 4, 99, 0, 2, 'ueben', 'Kleinfeld'),
    ('Passübung Spielaufbau', 'Passübung mit Fokus Spielaufbau.', 'Passspiel', 'Spielaufbau', 1, 99, 0, 0, 'ueben', null),
    ('Spielaufbau mit Flügelspiel', 'Doppelpass mit Einbindung der Außenspieler.', 'Spielaufbau', 'Passspiel', 8, 8, 0, 0, 'ueben', null),
    ('Zweikampf Verfolgungsjagd', '1 gegen 1 Verfolgungsjagd.', 'Zweikampf', 'Schnelligkeit', 2, 2, 0, 0, 'ueben', null),
    ('Zweikampf mit Abschluss', 'Verteidiger ausspielen (allein bzw. zu zweit) und abschließen.', 'Zweikampf', 'Torschuss', 2, 2, 0, 1, 'ueben', null),
    ('Schneller Torabschluss nach Dribbling', 'Schneller Abschluss nach Dribbling gegen Gegenspieler.', 'Dribbling', 'Torschuss', 2, 99, 0, 1, 'ueben', null),
    ('Schneller Torabschluss nach Doppelpass', 'Schneller Abschluss nach Doppelpass gegen Gegenspieler.', 'Passspiel', 'Torschuss', 3, 99, 0, 1, 'ueben', null),
    ('1 gegen 1 auf ein Tor', 'Zeitlimit 30 Sekunden; bei mehr als 5 Spielern 2x parallel.', 'Zweikampf', 'Torschuss', 2, 2, 0, 1, 'ueben', null),
    ('Spielintelligenz im 3-Zonen-Feld', 'Geteiltes Feld in 3 Zonen mit Torabschluss.', 'Spielintelligenz', 'Torschuss', 9, 99, 0, 1, 'ueben', 'Feld 20x15m (3 Zonen)'),
    ('4 gegen 2 mit 2 Jokern', 'Ballbesitzspiel mit 2 neutralen Jokerspielern.', 'Passspiel', 'Spielintelligenz', 8, 8, 0, 0, 'ueben', null),
    ('Spielaufbau ab Torwart (Station)', 'Station: Spielaufbau ausgehend vom Torwart.', 'Spielaufbau', 'Torwartspiel', 9, 10, 0, 0, 'ueben', null),
    ('4 gegen 4 auf 4 Minitore', '4 gegen 4 auf vier Minitore.', 'Spielform', 'Torschuss', 8, 8, 0, 4, 'ueben', 'Mini-Feld'),
    ('Kreatives 3-Zonen-Spiel', 'Freies Spiel im 3-Zonen-Aufbau.', 'Spielaufbau', 'Kreativität', 1, 99, 0, 0, 'ueben', '3 Zonen'),
    ('Schussübung stationär/mit Ablage', 'Torschuss stationär bzw. nach Ablage.', 'Torschuss', 'Technik', 1, 99, 1, 0, 'ueben', null),
    ('Doppelpass mit Torschuss', 'Doppelpass mit anschließendem Torschuss.', 'Passspiel', 'Torschuss', 2, 2, 1, 0, 'ueben', null),
    ('Spielaufbau Kleinfeld mit Torabschluss (Station)', 'Stationstraining: Spielaufbau im Kleinfeld mit Torabschluss.', 'Spielaufbau', 'Torschuss', 4, 9, 1, 0, 'ueben', 'Kleinfeld'),
    ('Rondo 4 gegen 1', '5 Pässe = 1 Punkt, danach 2 Spieler je 5 Torschüsse.', 'Passspiel', 'Ballkontrolle', 5, 5, 0, 0, 'ueben', 'Halle'),
    ('Spiel quer auf 4 Minitore (Halle)', 'Freies Spiel quer über das Hallenfeld auf 4 Minitore.', 'Spielform', 'Orientierung', 1, 99, 0, 4, 'ueben', 'Halle'),
    ('5 gegen 3 auf ein Tor', '5 gegen 3 mit durchwechselnden Stürmern, sporadisch wechselnden Verteidigern.', 'Spielform', 'Torschuss', 8, 8, 1, 0, 'ueben', 'Halle'),
    ('Steil-Klatsch-Steil mit Torschuss', 'Kombination steil-klatsch-steil mit Torabschluss.', 'Passspiel', 'Torschuss', 3, 99, 1, 0, 'ueben', 'Halle'),
    ('3 gegen 3 auf Minitore', '3 gegen 3 auf zwei Minitore.', 'Spielform', 'Zweikampf', 6, 6, 0, 2, 'ueben', 'Halle'),
    ('Torwarttraining (separat)', 'Separates Torwarttraining parallel zum Feldspielertraining.', 'Torwartspiel', 'Reaktionsschnelligkeit', 1, 3, 0, 0, 'ueben', null),
    ('Mini-WM', 'Mehrere parallele Kleinfeldspiele (2vs2 / 3vs3, teils mit Außenspielern).', 'Spielform', 'Spielintelligenz', 8, 12, 1, 3, 'spielen', 'Mehrere Kleinfelder'),
    ('Mini-Spiel mit Wandspielern', '2 Spielfelder je 1 Kleinfeldtor und 2 Minitore; Wandspieler an der hinteren Linie.', 'Spielform', 'Ballannahme', 8, 8, 2, 4, 'spielen', '2 Kleinfelder'),
    ('Spiel mit Anspielern an der Grundlinie', '2 Spielfelder mit je 4 Minitoren, Anspieler an hinterer Grundlinie (starke/schwache Gruppe).', 'Spielform', 'Ballannahme', 10, 14, 0, 8, 'spielen', '2 Kleinfelder'),
    ('Ballannahme und Abschluss', '2 Spielfelder je 1 Kleinfeldtor und 2 Minitore, Anspieler an hinterer Linie.', 'Ballannahme', 'Torschuss', 10, 14, 2, 4, 'spielen', '2 Kleinfelder'),
    ('Orientierungsspiel', '4-Tore-Spiel mit Farbregeln (starke Gruppe) bzw. einfaches 4-Tore-Spiel (schwache Gruppe).', 'Spielintelligenz', 'Orientierung', 10, 12, 0, 4, 'spielen', 'Mini-Feld, 4 Tore'),
    ('Tschechen-Rolle', 'Überzahlspiel mit 3 Teams à 4-5 Spielern; Team ohne Tor wechselt raus. 4. Team schießt parallel aufs Kleinfeldtor.', 'Spielform', 'Torschuss', 15, 15, 1, 2, 'spielen', 'Kleinfeld'),
    ('Spielaufbau Überzahl 2 gegen 1', '2 Teams in Überzahl gegen 1 Team; 4. Team schießt parallel aufs Tor.', 'Spielaufbau', 'Torschuss', 9, 9, 0, 0, 'spielen', null),
    ('4 gegen 4 auf 4 Minitore (Halle)', 'Parallel zur Rondo-Station: 4 gegen 4 auf 4 Minitore.', 'Spielform', 'Torschuss', 12, 13, 0, 4, 'spielen', 'Halle'),
    ('5+1 gegen 5+1 (Drei-Kontakte-Regel)', '5+1 gegen 5+1 mit 2 Torhütern; Tor zählt nur nach mindestens 3 Ballberührungen.', 'Spielform', 'Ballkontrolle', 12, 12, 0, 3, 'spielen', '2 Felder'),
    ('Abschlussspiel 7 gegen 7', '2 Teams, 7 gegen 7, mit Coaching zu Spielaufbau und Außenspielern; parallel Schusswettbewerb für Auswechselspieler.', 'Spielform', 'Spielaufbau', 14, 14, 0, 0, 'spielen', 'Kleinfeld/Großfeld'),
    ('Wettbewerb Spieler gegen Trainer', 'Abschlusswettbewerb zum Trainingsende (Torschusswettbewerb) mit Abschlussrunde.', 'Torschuss', 'Motivation', 1, 99, 0, 0, 'spielen', null)
) as v(name, aufbau, hauptzweck, nebenzweck, min_players, max_players, small_goals, mini_goals, category, flaeche)
where not exists (select 1 from exercises e where e.name = v.name);
