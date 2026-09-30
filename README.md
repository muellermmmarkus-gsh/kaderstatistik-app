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

### Registrierung mit E-Mail-Bestätigung

Neue Nutzer registrieren sich selbst unter `/register` (Vorname, Nachname,
E-Mail, Rolle, Passwort) und müssen den Bestätigungslink aus der
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
bekommen keine Daten. Ein Trainer schaltet sie auf der ADMIN-Seite als
„Eltern/Spieler" oder „Trainer" frei – siehe Abschnitt "Rechte" unten.

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

- **Trainer**: voller Lese-/Schreibzugriff auf alle Bereiche, vergeben
  Rollen auf der ADMIN-Seite.
- **Eltern/Spieler**: nur Lesezugriff, und **ohne** Geburtsdaten,
  Passnummern, Trainingsbewertungen und Performance-Noten der Kinder
  (Menüpunkt „Performance" ist ausgeblendet).
- **Nicht freigeschaltet** (`pending`): kein Datenzugriff.

Alles ist in der Datenbank per Row-Level-Security durchgesetzt (Funktionen
`is_trainer()` und `is_member()`), das UI blendet zusätzlich aus. Views laufen
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

- **profiles** – Vorname, Nachname, Rolle (`pending`/`parent_player`/`trainer`) je registriertem Auth-Nutzer (automatisch per Trigger aus `auth.users` befuellt, startet immer als `pending`)
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
- **login_events** – ein Eintrag pro erfolgreichem Login (Nutzer, Zeitpunkt), Grundlage fuer die Admin-Uebersicht (siehe unten). Nur Trainer duerfen die Eintraege lesen, jeder Nutzer darf beim Login seinen eigenen Eintrag anlegen.

Ausfuehren fuer bestehende Projekte der Reihe nach: [`supabase/migration_011_exercises_trainings.sql`](supabase/migration_011_exercises_trainings.sql), [`supabase/migration_012_fields_categories_images.sql`](supabase/migration_012_fields_categories_images.sql), [`supabase/migration_013_trainings_linked_to_events.sql`](supabase/migration_013_trainings_linked_to_events.sql), [`supabase/migration_014_attendance_assessment.sql`](supabase/migration_014_attendance_assessment.sql), [`supabase/migration_015_events_time_location.sql`](supabase/migration_015_events_time_location.sql), [`supabase/migration_016_trainer_birthdate.sql`](supabase/migration_016_trainer_birthdate.sql), [`supabase/migration_017_exercise_source_url.sql`](supabase/migration_017_exercise_source_url.sql), [`supabase/migration_018_event_type_tournament.sql`](supabase/migration_018_event_type_tournament.sql), [`supabase/migration_030_login_events.sql`](supabase/migration_030_login_events.sql), [`supabase/migration_031_datenschutz.sql`](supabase/migration_031_datenschutz.sql). Lesen duerfen freigeschaltete Nutzer (ausser den nur fuer Trainer lesbaren Daten, siehe "Rechte"), anlegen/aendern/loeschen koennen nur Trainer.

### Admin-Uebersicht

Trainer sehen oben rechts neben „Abmelden" einen Button „ADMIN", der zur Seite
`/admin` fuehrt (fuer Eltern/Spieler nicht sichtbar und serverseitig
geschuetzt). Dort stehen alle registrierten Nutzer (Name, E-Mail, Rolle,
Registrierungsdatum, Logins gesamt, letzter Login) sowie die Login-Historie
je Datum, Woche und Monat. Die Rolle anderer Nutzer laesst sich dort aendern
(Freischaltung neuer Nutzer); die eigene Rolle ist gesperrt.

### Geburtstage im Kalender

Geburtstage von aktiven Spielern und Trainern (`player_private.birth_date` / `trainers.birth_date`; Spieler-Geburtstage sehen nur Trainer) werden **nicht** als eigene Termine gespeichert, sondern im Kalender bei jedem Aufruf live aus den Stammdaten berechnet (jahresunabhaengig anhand von Monat/Tag) und in Gelb/Amber dargestellt. Dadurch erscheinen neu angelegte Spieler/Trainer automatisch im Kalender, und geloeschte bzw. deaktivierte Spieler/Trainer verschwinden automatisch wieder – ganz ohne zusaetzliche Pflege.

### Navigation

Jede ueber das Menue erreichbare Seite hat oben links einen „← Zurück"-Button, der zur naechsthoeheren Menueebene zurueckfuehrt (Detailseite → zugehoerige Liste, Liste → Dashboard).

**Trainings anlegen:** Ein neues Training wird ausschliesslich unter „Termine" (Termin vom Typ „Training") angelegt. Unter „Trainingsplanung" erscheinen automatisch alle so angelegten Trainings; ein Klick auf ein Training oeffnet die Detailplanung (Schwerpunkt, Uebungen, Dauer je Uebung). Loeschen eines Trainings erfolgt ebenfalls unter „Termine" – dabei wird die zugehoerige Uebungsplanung automatisch mit geloescht (`on delete cascade`).

Migration_012 legt zusaetzlich einen **Supabase-Storage-Bucket** `exercise-images` an (public, fuer die Bild-Vorschau/den Bild-Link bei Uebungen). Hochladen/Aendern/Loeschen von Bildern ist per Storage-Policy auf Trainer beschraenkt, Lesen ist oeffentlich ueber die Bild-URL moeglich.

Statistiken (Anwesenheit pro Monat/Saison, Tore pro Saison) stehen als SQL-Views zur Verfuegung: `attendance_by_month`, `attendance_by_season`, `goals_by_season` (Spieler), `trainer_attendance_by_season` (Trainer) sowie `attendance_overall_by_season` (Team-Gesamtwert fuers Dashboard).

### Hinweis zu Next.js 16

Dieses Projekt nutzt Next.js 16. Die frueher `middleware.ts` genannte Datei heisst jetzt [`src/proxy.ts`](src/proxy.ts) (Konvention seit v16).
