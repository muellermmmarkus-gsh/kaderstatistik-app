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
3. Unter **Authentication -> Users** die Nutzer (Trainer/Betreuer) anlegen, die Zugriff bekommen sollen (z.B. per E-Mail-Einladung).
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

### Datenmodell

- **players** – Spieler-Stammdaten
- **trainers** – Trainer-Stammdaten
- **seasons** – auswaehlbare Saisons (inkl. Standard-Markierung), verwaltet unter „Saisonverwaltung"
- **events** – Termine (`type`: `training`/`game`/`event`, `season` als Text passend zu `seasons.name`, `label` fuer die Bezeichnung bei `event`)
- **attendance** – Anwesenheit pro Spieler und Termin
- **trainer_attendance** – Anwesenheit pro Trainer und Termin
- **goals** – erzielte Tore pro Spieler und Spiel

Statistiken (Anwesenheit pro Monat/Saison, Tore pro Saison) stehen als SQL-Views zur Verfuegung: `attendance_by_month`, `attendance_by_season`, `goals_by_season` (Spieler), `trainer_attendance_by_season` (Trainer) sowie `attendance_overall_by_season` (Team-Gesamtwert fuers Dashboard).

### Hinweis zu Next.js 16

Dieses Projekt nutzt Next.js 16. Die frueher `middleware.ts` genannte Datei heisst jetzt [`src/proxy.ts`](src/proxy.ts) (Konvention seit v16).
