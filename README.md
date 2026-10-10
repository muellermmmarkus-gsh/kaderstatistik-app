## Kaderstatistik-App

Web-App zur Erfassung von Trainings-/Spielanwesenheit und Toren der E-Jugend-Mannschaft. Mehrere Nutzer koennen vom PC und mobil per Browser lesen und schreiben.

### Stack

- [Next.js 16](https://nextjs.org/) (App Router) – Frontend & Server
- [Supabase](https://supabase.com/) – Postgres-Datenbank, Auth, REST-API
- [Vercel](https://vercel.com/) – Hosting

### 1. Supabase-Projekt anlegen

1. Im [Supabase-Dashboard](https://supabase.com/dashboard) ein neues Projekt anlegen (eigenes Projekt fuer diese App, nicht das bestehende wiederverwenden).
2. Unter **SQL Editor** die Datei [`supabase/schema.sql`](supabase/schema.sql) einfuegen und ausfuehren. Das legt Tabellen (`players`, `trainers`, `seasons`, `events`, `attendance`, `trainer_attendance`, `goals`), Statistik-Views und Row-Level-Security-Policies an.
   - Falls du schon ein bestehendes Projekt hast, reichen die passenden `supabase/migration_00X_*.sql`-Dateien der Reihe nach aus, statt das komplette Schema neu auszufuehren.
3. Nutzer registrieren sich jetzt selbst über `/register` (siehe Abschnitt "Registrierung mit E-Mail-Bestätigung" unten) – ein manuelles Anlegen unter **Authentication -> Users** ist nicht mehr noetig.
4. Unter **Project Settings -> API** die **Project URL** und den **anon public key** notieren.

### 2. Lokale Umgebung einrichten

```bash
npm install
cp .env.local.example .env.local
```

`.env.local` mit den Werten aus Supabase befuellen:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Danach starten:

```bash
npm run dev
```

App laeuft unter [http://localhost:3000](http://localhost:3000).

### 3. Deployment (GitHub + Vercel)

1. Neues GitHub-Repository anlegen und dieses Projekt pushen.
2. In [Vercel](https://vercel.com/) ein neues Projekt aus dem Repo erstellen.
3. In den Vercel-Projekteinstellungen unter **Environment Variables** dieselben zwei Variablen (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) eintragen.
4. Deploy anstossen – danach ist die App unter der Vercel-URL fuer alle Nutzer erreichbar (PC und mobil, kein separates Programm noetig).

### Plattform für mehrere Teams

Die App ist eine Plattform: jedes Team (Tabelle `teams`) hat eigene,
voneinander getrennte Daten, die Technik ist für alle Teams identisch.
Grundlage ist [`supabase/migration_033_teams.sql`](supabase/migration_033_teams.sql).

- **Teamdaten** (Kader, Termine, Anwesenheit, Trainingsplanung, Ergebnisse,
  Performance, Checklisten, Abwesenheiten, Saisons) haben eine `team_id`
  bzw. hängen an einem Termin/Spieler/Trainer des Teams. Die
  Row-Level-Security zeigt nur Daten des eigenen Teams
  (`current_team_id()`); neue Datensätze bekommen das Team automatisch
  (`default current_team_id()`). Ein neues Team startet daher leer.
  Manuelle SQL-Importe (z.B. Spielplan) müssen `team_id` selbst setzen.
- **Gemeinsam für alle Teams:** Übungsdatenbank (`exercises`), Flächen,
  Skills und Terminarten. Skills und Terminarten ändert nur der Admin.
- **Übungen:** „Training → Übungsdatenbank" zeigt alle Übungen aller Teams;
  die Checkbox „In Team aktiv" (Tabelle `team_exercises`) bestimmt, welche
  unter „Übungen" und in der Trainingsplanung des Teams erscheinen. Neu
  angelegte Übungen sind automatisch im eigenen Team aktiv und mit dem
  Erstellerteam vermerkt (`exercises.created_by_team_id`, Spalte
  „Erstellt von"). Anlegen und kopieren dürfen alle Trainer. **Ändern und
  löschen:** der Admin alle Übungen, Trainer nur die Übungen ihres eigenen
  Teams (Erstellerteam) – Änderungen und Löschen wirken auch bei Teams, die
  die Übung übernommen haben; Löschen ist nicht möglich, solange die Übung in
  einem Trainingsplan steckt. Fremde Übungen lassen sich per „Kopie erst." als
  eigene, bearbeitbare Variante übernehmen. **Sichtbarkeit:** Umschalter
  „öff"/„n.öff" in „Übungen" (`exercises.is_public`, Standard öffentlich).
  Nicht öffentliche Übungen sehen nur der Admin, das Erstellerteam und Teams,
  die sie schon übernommen oder eingeplant haben
  ([`supabase/migration_037_exercise_public.sql`](supabase/migration_037_exercise_public.sql)). Siehe
  [`supabase/migration_034_exercise_owner_admin_edit.sql`](supabase/migration_034_exercise_owner_admin_edit.sql)
  und [`supabase/migration_035_exercise_edit_own_team.sql`](supabase/migration_035_exercise_edit_own_team.sql).
- **Teamname** (`teams.name`, z.B. „TVG E1") steht oben in der Menüleiste
  und unter „Kaderstatistik"; der **Name im Spielbetrieb**
  (`teams.match_name`, z.B. „TV Geisenhausen E7 1") erkennt die eigene
  Mannschaft im Live-Ergebnis. Beides pflegt der Admin unter ADMIN → Teams.
- **Wettbewerbe:** „Spielbetrieb → Wettbewerbe" zeigt das BFV-Widget
  (Ergebnisse, Tabelle, Torschützen) des Teams. Die Wettbewerbs-ID aus dem
  BFV-Widget-Code (`zeigeWettbewerb("<ID>", …)`) pflegt der Admin unter
  ADMIN → Teams (`teams.bfv_competition_id`,
  [`supabase/migration_038_team_bfv_widget.sql`](supabase/migration_038_team_bfv_widget.sql)).
  Eingebettet wird direkt der iframe von widget-prod.bfv.de statt des
  BFV-Skripts, damit kein fremder Code in der App läuft.
- **Teamwechsel (nur Admin):** In der Menüleiste ist der Teamname für den
  Admin eine Auswahlliste. Ein Wechsel ordnet das eigene Konto dem gewählten
  Team zu (`profiles.team_id`) – danach zeigt die ganze App dieses Team, mit
  Trainerrechten.
- **Neue Teams:** Trainer registrieren sich und geben dabei ihr Team an
  (`profiles.requested_team`). Der Admin (`profiles.is_admin`) ordnet sie auf
  der ADMIN-Seite einem bestehenden oder neuen Team zu und gibt sie als
  Trainer frei.

### Registrierung mit E-Mail-Bestätigung

Neue Nutzer registrieren sich selbst unter `/register` (Vorname, Nachname,
E-Mail, beantragtes Team, Passwort) und müssen den Bestätigungslink aus der
automatisch verschickten E-Mail anklicken, bevor sie sich einloggen können.
Damit das funktioniert, im Supabase-Dashboard einmalig einstellen:

1. **Authentication -> Providers -> Email**: "Confirm email" muss aktiviert
   sein (bei neueren Projekten meist schon Standard).
2. **Authentication -> URL Configuration**: **Site URL** auf die tatsächlich
   genutzte App-URL setzen (z.B. deine Vercel-URL, für lokales Testen
   `http://localhost:3000`).
3. **Authentication -> Email Templates -> Confirm signup**: Der Link im
   Template muss auf unsere eigene Bestätigungs-Route zeigen, damit die
   Bestätigung serverseitig in der App verarbeitet wird. Den Link-`href` im
   Template ändern zu:
   ```
   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
   ```
   (ersetzt die Standard-Variable `{{ .ConfirmationURL }}`).

Bei der Registrierung wird **keine Rolle** gewählt: Neue Nutzer starten als
„nicht freigeschaltet" (`pending`), sehen nur die Warteseite `/pending` und
bekommen keine Daten. Der Admin bekommt bei jeder Registrierung eine E-Mail
und gibt sie auf der ADMIN-Seite frei – siehe Abschnitt "Rechte" unten.

Für die Admin-E-Mail in Vercel (und lokal in `.env.local`) setzen:

- `RESEND_API_KEY` – API-Key von [Resend](https://resend.com) (kostenlos)
- `ADMIN_NOTIFY_EMAIL` – Empfänger; ohne eigene Domain bei Resend muss das
  die E-Mail-Adresse des Resend-Kontos sein
- optional `ADMIN_NOTIFY_FROM` – Absender, nur mit bei Resend verifizierter Domain

Fehlen die Variablen, klappt die Registrierung trotzdem, nur ohne E-Mail.

### Passwort zurücksetzen

Nutzer können ihr Passwort selbst zurücksetzen: Auf `/login` über den Link
„Passwort vergessen?" gelangt man zu `/reset-password`, gibt dort die
E-Mail-Adresse ein und bekommt (falls dazu ein Konto existiert) eine E-Mail
mit einem Link.

Ohne eigenen SMTP-Server lässt Supabase das Anpassen der Link-URL im
"Reset Password"-E-Mail-Template nicht zu (Hinweis im Dashboard: "Set up
custom SMTP to edit templates"). Deshalb wird das Ziel stattdessen direkt
beim Erzeugen des Links gesteuert: `resetPasswordForEmail` in
[`src/app/reset-password/actions.ts`](src/app/reset-password/actions.ts)
übergibt `redirectTo: <Site-URL>/reset-password/update`. Supabase bestätigt
den Link auf seinem eigenen Endpunkt und leitet danach mit der Session als
URL-Fragment (`#access_token=...`) dorthin weiter. Die Seite
`/reset-password/update` liest dieses Fragment clientseitig aus
(`supabase.auth.getSession()`), wodurch die Session in Cookies landet, bevor
das neue Passwort per Server Action gespeichert wird.

Aus demselben Grund (keine Template-Anpassung ohne Custom SMTP möglich)
läuft auch die Registrierungs-Bestätigung über Supabases eigenen
Bestätigungs-Endpunkt statt über `/auth/confirm` – das genügt aber, um die
E-Mail-Adresse zu bestätigen; der Nutzer loggt sich danach ganz normal über
`/login` ein. Die Route [`/auth/confirm`](src/app/auth/confirm/route.ts)
bleibt nutzbar, sobald für dieses Projekt einmal Custom SMTP eingerichtet
wird und die Templates entsprechend umgestellt werden.

### Rechte

- **Admin** (`profiles.is_admin`, Plattform-Betreiber): gibt Trainer und
  Teams auf der ADMIN-Seite frei, pflegt Teams, Skills und Terminarten.
- **Trainer** (mit Team): voller Lese-/Schreibzugriff auf die Daten des
  eigenen Teams und auf die gemeinsame Übungsdatenbank.
- **Eltern/Spieler**: derzeit **kein Zugriff** (wie „nicht freigeschaltet").
  Zum späteren Freischalten mit Lesezugriff (ohne Geburtsdaten, Passnummern,
  Bewertungen und Noten): in `is_member()` wieder `'parent_player'`
  zulassen und in `src/lib/supabase/middleware.ts` sowie
  `src/components/NavBar.tsx` die Rolle wieder berücksichtigen.
- **Nicht freigeschaltet** (`pending`): kein Datenzugriff.

Alles ist in der Datenbank per Row-Level-Security durchgesetzt (Funktionen
`is_trainer()`, `is_member()`, `is_admin()` und `current_team_id()`), das UI
blendet zusätzlich aus. Views laufen
mit `security_invoker`, damit sie die Row-Level-Security nicht umgehen.
Grundlage: [`supabase/migration_010_role_permissions.sql`](supabase/migration_010_role_permissions.sql)
und [`supabase/migration_031_datenschutz.sql`](supabase/migration_031_datenschutz.sql).

### Datenschutz

- Hinweise für Nutzer unter `/datenschutz` (auch ohne Login erreichbar, im
  Seitenfuß verlinkt).
- Verlässt ein Kind die Mannschaft: unter „Spieler" auf **anonymisieren**
  klicken. Name, Geburtsdatum, Passnummer, Bewertungen und Noten werden
  gelöscht, Anwesenheiten/Tore bleiben anonym („Ehemaliger Spieler XXXX")
  für die Mannschaftsstatistik erhalten. „löschen" entfernt dagegen alles
  inkl. Anwesenheiten und Toren.

### Datenmodell

- **teams** – Teams der Plattform (`name`, `match_name` = Name im Spielbetrieb); **team_exercises** – welche Uebung der Datenbank in welchem Team aktiv ist
- **profiles** – Vorname, Nachname, Rolle (`pending`/`parent_player`/`trainer`), Team (`team_id`), beantragtes Team, Admin-Kennzeichen je registriertem Auth-Nutzer (automatisch per Trigger aus `auth.users` befuellt, startet immer als `pending`)
- **players** – Spieler-Stammdaten (Name, aktiv)
- **player_private** – Geburtsdatum (erscheint als Geburtstag im Kalender) und Passnummer je Spieler, nur fuer Trainer lesbar
- **trainers** – Trainer-Stammdaten (inkl. `birth_date`, erscheint als Geburtstag im Kalender)
- **seasons** – auswaehlbare Saisons (inkl. Standard-Markierung), verwaltet unter „Saisonverwaltung"
- **events** – Termine (`type`: `training`/`game`/`tournament`/`event`, `season` als Text passend zu `seasons.name`, `label` fuer die Bezeichnung bei `event`, `event_time`/`location`/`opponent` fuer Uhrzeit/Ort/Gegner bei `game` und `tournament`)
- **attendance** – Anwesenheit pro Spieler und Termin
- **attendance_assessments** – bei Terminen vom Typ `training` Leistung (`stark`/`mittel`/`schwach`), Motivation (`hoch`/`mittel`/`niedrig`), Disziplin (`sehr gut`/`mittel`/`gering`) und ein Freitext-Notizfeld (`player_notes`, max. 50 Zeichen) je Spieler, nur fuer Trainer lesbar
- **trainer_attendance** – Anwesenheit/Zusage pro Trainer und Termin
- **trainer_absences** – Abwesenheitszeitraeume pro Trainer, verwaltet unter „Abwesenheiten", erscheinen automatisch im Kalender
- **goals** – erzielte Tore pro Spieler bei Terminen vom Typ `game`/`tournament`
- **exercises** – Uebungsdatenbank: Aufbau, Ablauf, Haupt-/Nebenzweck, Mindest-/Hoechstzahl Spieler, Anzahl Kleinfeldtore/Mini-Tore, Kategorie (`aufwaermen`/`spielen`/`ueben`/`cooldown`), optionale Spielfeld-Zuordnung (`field_id`), optionales Bild (`image_url`) und optionaler Link zur Ursprungsquelle (`source_url`), verwaltet unter „Übungen"
- **trainings** – die Uebungsplanung (Schwerpunkt, Notizen, ausgewaehlte Uebungen) zu einem Termin vom Typ `training`, 1:1 verknuepft ueber `event_id` (`unique`); wird beim ersten Speichern in der Detailplanung unter „Trainingsplanung" automatisch angelegt (Upsert per `event_id`)
- **training_exercises** – die fuer ein Training ausgewaehlten Uebungen inkl. geplanter Dauer und Reihenfolge (`exercise_id` kann nicht geloescht werden, solange die Uebung noch in einem Trainingsplan verwendet wird)
- **fields** – Spielflaechen/Uebungsflaechen (Name, Laenge, Breite in Metern), verwaltet unter „Flächenplanung"; werden bei Uebungen als „Spielfeld/Übungsfläche" ausgewaehlt
- **checklists** / **checklist_items** – Checklisten unter „Termine und Verwaltung → Checklisten": Name und Erstellungsdatum; je beim Anlegen aktivem Spieler bzw. Trainer eine Zeile mit „erledigt" und Notiz (max. 200 Zeichen). Lesen fuer freigeschaltete Nutzer, Aendern nur Trainer ([`supabase/migration_032_checklists.sql`](supabase/migration_032_checklists.sql))
- **login_events** – ein Eintrag pro erfolgreichem Login (Nutzer, Zeitpunkt), Grundlage fuer die Admin-Uebersicht (siehe unten). Nur Trainer duerfen die Eintraege lesen, jeder Nutzer darf beim Login seinen eigenen Eintrag anlegen.

Ausfuehren fuer bestehende Projekte der Reihe nach: [`supabase/migration_011_exercises_trainings.sql`](supabase/migration_011_exercises_trainings.sql), [`supabase/migration_012_fields_categories_images.sql`](supabase/migration_012_fields_categories_images.sql), [`supabase/migration_013_trainings_linked_to_events.sql`](supabase/migration_013_trainings_linked_to_events.sql), [`supabase/migration_014_attendance_assessment.sql`](supabase/migration_014_attendance_assessment.sql), [`supabase/migration_015_events_time_location.sql`](supabase/migration_015_events_time_location.sql), [`supabase/migration_016_trainer_birthdate.sql`](supabase/migration_016_trainer_birthdate.sql), [`supabase/migration_017_exercise_source_url.sql`](supabase/migration_017_exercise_source_url.sql), [`supabase/migration_018_event_type_tournament.sql`](supabase/migration_018_event_type_tournament.sql), [`supabase/migration_030_login_events.sql`](supabase/migration_030_login_events.sql), [`supabase/migration_031_datenschutz.sql`](supabase/migration_031_datenschutz.sql), [`supabase/migration_032_checklists.sql`](supabase/migration_032_checklists.sql), [`supabase/migration_033_teams.sql`](supabase/migration_033_teams.sql). Lesen duerfen freigeschaltete Nutzer (ausser den nur fuer Trainer lesbaren Daten, siehe "Rechte"), anlegen/aendern/loeschen koennen nur Trainer.

### Admin-Uebersicht

Nur der Admin sieht oben rechts neben „Abmelden" den Button „ADMIN" (Seite
`/admin`, serverseitig geschuetzt). Dort stehen alle registrierten Nutzer
aller Teams (Name, E-Mail, beantragtes Team, Team und Rolle,
Registrierungsdatum, Logins) mit Freigabe/Zuordnung, die Teams (Teamname,
Name im Spielbetrieb) sowie die Login-Historie je Datum, Woche und Monat.
Der eigene Zugang des Admins ist dort gesperrt.

### Geburtstage im Kalender

Geburtstage von aktiven Spielern und Trainern (`player_private.birth_date` / `trainers.birth_date`; Spieler-Geburtstage sehen nur Trainer) werden **nicht** als eigene Termine gespeichert, sondern im Kalender bei jedem Aufruf live aus den Stammdaten berechnet (jahresunabhaengig anhand von Monat/Tag) und in Gelb/Amber dargestellt. Dadurch erscheinen neu angelegte Spieler/Trainer automatisch im Kalender, und geloeschte bzw. deaktivierte Spieler/Trainer verschwinden automatisch wieder – ganz ohne zusaetzliche Pflege.

### Navigation

Jede ueber das Menue erreichbare Seite hat oben links einen „← Zurück"-Button, der zur naechsthoeheren Menueebene zurueckfuehrt (Detailseite → zugehoerige Liste, Liste → Dashboard).

**Trainings anlegen:** Ein neues Training wird ausschliesslich unter „Termine" (Termin vom Typ „Training") angelegt. Unter „Trainingsplanung" erscheinen automatisch alle so angelegten Trainings; ein Klick auf ein Training oeffnet die Detailplanung (Schwerpunkt, Uebungen, Dauer je Uebung). Loeschen eines Trainings erfolgt ebenfalls unter „Termine" – dabei wird die zugehoerige Uebungsplanung automatisch mit geloescht (`on delete cascade`).

Migration_012 legt zusaetzlich einen **Supabase-Storage-Bucket** `exercise-images` an (public, fuer die Bild-Vorschau/den Bild-Link bei Uebungen). Hochladen/Aendern/Loeschen von Bildern ist per Storage-Policy auf Trainer beschraenkt, Lesen ist oeffentlich ueber die Bild-URL moeglich.

Statistiken (Anwesenheit pro Monat/Saison, Tore pro Saison) stehen als SQL-Views zur Verfuegung: `attendance_by_month`, `attendance_by_season`, `goals_by_season` (Spieler), `trainer_attendance_by_season` (Trainer) sowie `attendance_overall_by_season` (Team-Gesamtwert fuers Dashboard).

### Als App installieren (PWA)

Die App ist eine installierbare Web-App „TVG Coach": Manifest in
[`src/app/manifest.ts`](src/app/manifest.ts), Name/Farbe in
[`src/lib/appTheme.ts`](src/lib/appTheme.ts), Icons in `public/icons/`,
`src/app/apple-icon.png` und `src/app/favicon.ico` (aus dem TVG-Coach-Logo
erzeugt; `favicon.ico` muss RGBA-PNGs enthalten, sonst bricht Next.js ab).
Das Manifest ist in [`src/proxy.ts`](src/proxy.ts) vom Login-Zwang ausgenommen.

- **iPhone (Safari):** Seite öffnen → Teilen → „Zum Home-Bildschirm".
- **Android (Chrome):** Seite öffnen → Menü ⋮ → „App installieren" bzw.
  „Zum Startbildschirm hinzufügen".

### Hinweis zu Next.js 16

Dieses Projekt nutzt Next.js 16. Die frueher `middleware.ts` genannte Datei heisst jetzt [`src/proxy.ts`](src/proxy.ts) (Konvention seit v16).
