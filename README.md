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

Rolle ("Trainer" oder "Eltern/Spieler") wird bei der Registrierung erfasst
und in der Tabelle `profiles` gespeichert. **Eltern/Spieler haben reinen
Lesezugriff**, nur Trainer dürfen Daten anlegen/ändern/löschen – siehe
Abschnitt "Rechte" unten.

### Rechte

- **Trainer**: voller Lese-/Schreibzugriff auf alle Bereiche.
- **Eltern/Spieler**: nur Lesezugriff. Schreibgeschützt sowohl in der
  Datenbank (Row-Level-Security anhand der Rolle in `profiles`) als auch
  im UI (Formulare/Buttons werden ausgeblendet bzw. Felder deaktiviert).

Damit das greift, [`supabase/migration_010_role_permissions.sql`](supabase/migration_010_role_permissions.sql)
ausführen (setzt `migration_009_profiles.sql` voraus).

### Datenmodell

- **profiles** – Vorname, Nachname, Rolle je registriertem Auth-Nutzer (automatisch per Trigger aus `auth.users` befuellt)
- **players** – Spieler-Stammdaten
- **trainers** – Trainer-Stammdaten
- **seasons** – auswaehlbare Saisons (inkl. Standard-Markierung), verwaltet unter „Saisonverwaltung"
- **events** – Termine (`type`: `training`/`game`/`event`, `season` als Text passend zu `seasons.name`, `label` fuer die Bezeichnung bei `event`)
- **attendance** – Anwesenheit pro Spieler und Termin
- **trainer_attendance** – Anwesenheit/Zusage pro Trainer und Termin
- **trainer_absences** – Abwesenheitszeitraeume pro Trainer, verwaltet unter „Abwesenheiten", erscheinen automatisch im Kalender
- **goals** – erzielte Tore pro Spieler und Spiel
- **exercises** – Uebungsdatenbank: Aufbau, Ablauf, Haupt-/Nebenzweck, Mindest-/Hoechstzahl Spieler, Anzahl Kleinfeldtore/Mini-Tore, Kategorie (`aufwaermen`/`spielen`/`ueben`/`cooldown`), optionale Spielfeld-Zuordnung (`field_id`) und optionales Bild (`image_url`), verwaltet unter „Übungen"
- **trainings** – die Uebungsplanung (Schwerpunkt, Notizen, ausgewaehlte Uebungen) zu einem Termin vom Typ `training`, 1:1 verknuepft ueber `event_id` (`unique`); wird beim ersten Speichern in der Detailplanung unter „Trainingsplanung" automatisch angelegt (Upsert per `event_id`)
- **training_exercises** – die fuer ein Training ausgewaehlten Uebungen inkl. geplanter Dauer und Reihenfolge (`exercise_id` kann nicht geloescht werden, solange die Uebung noch in einem Trainingsplan verwendet wird)
- **fields** – Spielflaechen/Uebungsflaechen (Name, Laenge, Breite in Metern), verwaltet unter „Flächenplanung"; werden bei Uebungen als „Spielfeld/Übungsfläche" ausgewaehlt

Ausfuehren fuer bestehende Projekte der Reihe nach: [`supabase/migration_011_exercises_trainings.sql`](supabase/migration_011_exercises_trainings.sql), [`supabase/migration_012_fields_categories_images.sql`](supabase/migration_012_fields_categories_images.sql), [`supabase/migration_013_trainings_linked_to_events.sql`](supabase/migration_013_trainings_linked_to_events.sql). Wie bei allen anderen Bereichen duerfen alle eingeloggten Nutzer lesen, anlegen/aendern/loeschen koennen nur Trainer.

**Trainings anlegen:** Ein neues Training wird ausschliesslich unter „Termine" (Termin vom Typ „Training") angelegt. Unter „Trainingsplanung" erscheinen automatisch alle so angelegten Trainings; ein Klick auf ein Training oeffnet die Detailplanung (Schwerpunkt, Uebungen, Dauer je Uebung). Loeschen eines Trainings erfolgt ebenfalls unter „Termine" – dabei wird die zugehoerige Uebungsplanung automatisch mit geloescht (`on delete cascade`).

Migration_012 legt zusaetzlich einen **Supabase-Storage-Bucket** `exercise-images` an (public, fuer die Bild-Vorschau/den Bild-Link bei Uebungen). Hochladen/Aendern/Loeschen von Bildern ist per Storage-Policy auf Trainer beschraenkt, Lesen ist oeffentlich ueber die Bild-URL moeglich.

Statistiken (Anwesenheit pro Monat/Saison, Tore pro Saison) stehen als SQL-Views zur Verfuegung: `attendance_by_month`, `attendance_by_season`, `goals_by_season` (Spieler), `trainer_attendance_by_season` (Trainer) sowie `attendance_overall_by_season` (Team-Gesamtwert fuers Dashboard).

### Hinweis zu Next.js 16

Dieses Projekt nutzt Next.js 16. Die frueher `middleware.ts` genannte Datei heisst jetzt [`src/proxy.ts`](src/proxy.ts) (Konvention seit v16).
