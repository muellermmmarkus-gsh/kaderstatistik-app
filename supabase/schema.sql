-- Kaderstatistik-App: Datenbankschema
-- Im Supabase SQL Editor (Projekt -> SQL Editor -> New query) ausfuehren.

-- ─────────────────────────────────────────────
-- Tabellen
-- ─────────────────────────────────────────────

-- Profildaten zu jedem Auth-Nutzer (Vorname, Nachname, Rolle).
-- Wird automatisch per Trigger befuellt, siehe Abschnitt weiter unten.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  role text not null check (role in ('trainer', 'parent_player')),
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  birth_date date,
  passnummer text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null unique, -- z.B. '2025/2026'
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- stellt sicher, dass hoechstens eine Saison als Standard markiert ist
create unique index if not exists one_default_season
  on seasons (is_default) where is_default = true;

-- Konfigurierbare Terminarten (Einstellungen -> Termine). Die eingebauten
-- "key"-Werte ('training', 'game', 'tournament', 'event') sind stabil, da an
-- ihnen App-Logik haengt (Trainingsplanung, Anwesenheit, Gegner-/Ort-Felder,
-- ...) - nur "label" ist frei editierbar. Neue Terminarten verhalten sich
-- wie 'event' (nur Bezeichnung, keine Trainingsplanung/Anwesenheit).
create table if not exists event_types (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into event_types (key, label, sort_order) values
  ('training', 'Training', 0),
  ('game', 'Spiel', 1),
  ('tournament', 'Turnier', 2),
  ('event', 'Event', 3),
  -- Fangnetz fuer Termine, deren Terminart geloescht wurde. Erscheint
  -- bewusst nicht in der Terminarten-Verwaltung oder der Auswahl beim
  -- Anlegen eines neuen Termins.
  ('unassigned', 'Keine Zuordnung', 9999)
on conflict (key) do nothing;

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  type text not null references event_types(key),
  event_date date not null,
  opponent text, -- nur relevant bei type = 'game'
  event_time time, -- nur relevant bei type = 'game'
  location text, -- nur relevant bei type = 'game'
  label text, -- nur relevant bei type = 'event'
  season text not null, -- z.B. '2025/2026'
  created_at timestamptz not null default now()
);

-- performance/motivation/discipline/player_notes sind nur bei Terminen vom
-- Typ 'training' im UI sichtbar und relevant.
create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  present boolean not null default true,
  performance text check (performance in ('stark', 'mittel', 'schwach')),
  motivation text check (motivation in ('hoch', 'mittel', 'niedrig')),
  discipline text check (discipline in ('sehr gut', 'mittel', 'gering')),
  player_notes text check (char_length(player_notes) <= 50),
  created_at timestamptz not null default now(),
  unique (player_id, event_id)
);

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  goal_count integer not null default 1 check (goal_count > 0),
  created_at timestamptz not null default now()
);

create table if not exists trainers (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  birth_date date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists trainer_attendance (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references trainers(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  present boolean not null default true, -- war der Trainer tatsaechlich da
  confirmed boolean not null default false, -- hat der Trainer vorab zugesagt
  created_at timestamptz not null default now(),
  unique (trainer_id, event_id)
);

create table if not exists trainer_absences (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references trainers(id) on delete cascade,
  reason text not null default 'Abwesenheit',
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table if not exists fields (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  length_m integer not null check (length_m > 0),
  width_m integer not null check (width_m > 0),
  created_at timestamptz not null default now()
);

create table if not exists exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  aufbau text not null default '',
  ablauf text not null default '',
  coaching text,
  hauptzweck text not null default '',
  nebenzweck text,
  min_players integer not null check (min_players > 0),
  max_players integer not null check (max_players >= min_players),
  small_goals integer not null default 0 check (small_goals >= 0),
  mini_goals integer not null default 0 check (mini_goals >= 0),
  category text not null default 'ueben'
    check (category in ('aufwaermen', 'spielen', 'ueben', 'cooldown')),
  field_id uuid references fields(id) on delete set null,
  image_url text,
  source_url text,
  created_at timestamptz not null default now()
);

-- Auswaehlbare Werte fuer die Uebungsschwerpunkte 1/2 einer Uebung
-- (frei gepflegt unter Training -> Uebungsplanung).
create table if not exists exercise_focuses (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists exercise_focuses_label_unique on exercise_focuses (label);

-- Ein gespeichertes Update im Performance-Tracking (Datum + Grund).
create table if not exists performance_updates (
  id uuid primary key default gen_random_uuid(),
  update_date date not null,
  reason text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- focus wird als Text (nicht als Fremdschluessel auf exercise_focuses)
-- gespeichert, da die Schwerpunktliste unter Uebungsplanung beim Speichern
-- komplett geloescht und neu angelegt wird (neue IDs) - gleiche Konvention
-- wie bei exercises.hauptzweck/nebenzweck.
create table if not exists performance_ratings (
  id uuid primary key default gen_random_uuid(),
  update_id uuid not null references performance_updates(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  focus text not null,
  grade integer not null check (grade between 1 and 6),
  created_at timestamptz not null default now(),
  unique (update_id, player_id, focus)
);

-- Ein Training wird als Termin (events, type = 'training') angelegt; die
-- Trainingsplanung (Uebungen, Dauer, Schwerpunkt) haengt per event_id daran
-- und wird beim ersten Speichern in der Detailplanung automatisch angelegt.
create table if not exists trainings (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  training_date date,
  notes text,
  focus text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists trainings_event_id_key on trainings(event_id);

-- exercise_id bewusst "restrict" statt "cascade": eine Uebung, die in einem
-- gespeicherten Trainingsplan verwendet wird, soll nicht geloescht werden
-- koennen und dabei stillschweigend aus vergangenen Plaenen verschwinden.
create table if not exists training_exercises (
  id uuid primary key default gen_random_uuid(),
  training_id uuid not null references trainings(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete restrict,
  sort_order integer not null default 0,
  duration_minutes integer not null check (duration_minutes > 0),
  block integer not null default 1 check (block between 1 and 10),
  created_at timestamptz not null default now()
);

-- Eine Uebung kann mehreren Gruppen zugeordnet werden ("weitere Gruppe").
create table if not exists training_exercise_groups (
  id uuid primary key default gen_random_uuid(),
  training_exercise_id uuid not null references training_exercises(id) on delete cascade,
  group_label text not null check (group_label in ('A', 'B', 'C', 'D', 'E', 'F')),
  created_at timestamptz not null default now()
);

create unique index if not exists training_exercise_groups_unique
  on training_exercise_groups(training_exercise_id, group_label);

-- Gruppeneinteilung der Spieler, je Training separat.
create table if not exists training_player_groups (
  id uuid primary key default gen_random_uuid(),
  training_id uuid not null references trainings(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  group_label text not null check (group_label in ('A', 'B', 'C', 'D', 'E', 'F')),
  created_at timestamptz not null default now()
);

create unique index if not exists training_player_groups_unique
  on training_player_groups(training_id, player_id);

create index if not exists idx_attendance_player on attendance(player_id);
create index if not exists idx_attendance_event on attendance(event_id);
create index if not exists idx_goals_player on goals(player_id);
create index if not exists idx_goals_event on goals(event_id);
create index if not exists idx_trainer_absences_trainer on trainer_absences(trainer_id);
create index if not exists idx_trainer_absences_dates on trainer_absences(start_date, end_date);
create index if not exists idx_events_date on events(event_date);
create index if not exists idx_events_season on events(season);
create index if not exists idx_trainer_attendance_trainer on trainer_attendance(trainer_id);
create index if not exists idx_trainer_attendance_event on trainer_attendance(event_id);
create index if not exists idx_training_exercises_training on training_exercises(training_id);
create index if not exists idx_training_exercises_exercise on training_exercises(exercise_id);
create index if not exists idx_trainings_date on trainings(training_date);
create index if not exists idx_exercises_field on exercises(field_id);
create index if not exists idx_performance_updates_date on performance_updates(update_date);
create index if not exists idx_performance_ratings_update on performance_ratings(update_id);
create index if not exists idx_performance_ratings_player on performance_ratings(player_id);

-- ─────────────────────────────────────────────
-- Statistik-Views
-- ─────────────────────────────────────────────

-- Anwesenheit pro Spieler und Monat
create or replace view attendance_by_month as
select
  p.id as player_id,
  p.first_name,
  p.last_name,
  e.season,
  date_trunc('month', e.event_date)::date as month,
  e.type,
  count(*) filter (where a.present) as attended,
  count(*) as total,
  round(
    100.0 * count(*) filter (where a.present) / nullif(count(*), 0), 1
  ) as attendance_pct
from attendance a
join players p on p.id = a.player_id
join events e on e.id = a.event_id
group by p.id, p.first_name, p.last_name, e.season, date_trunc('month', e.event_date), e.type;

-- Anwesenheit pro Spieler und Saison
create or replace view attendance_by_season as
select
  p.id as player_id,
  p.first_name,
  p.last_name,
  e.season,
  e.type,
  count(*) filter (where a.present) as attended,
  count(*) as total,
  round(
    100.0 * count(*) filter (where a.present) / nullif(count(*), 0), 1
  ) as attendance_pct
from attendance a
join players p on p.id = a.player_id
join events e on e.id = a.event_id
group by p.id, p.first_name, p.last_name, e.season, e.type;

-- Torstatistik pro Spieler und Saison
create or replace view goals_by_season as
select
  p.id as player_id,
  p.first_name,
  p.last_name,
  e.season,
  sum(g.goal_count) as goals
from goals g
join players p on p.id = g.player_id
join events e on e.id = g.event_id
group by p.id, p.first_name, p.last_name, e.season;

-- Gesamt-Anwesenheit des Teams (Spieler) pro Saison, ueber Training und Spiel hinweg
create or replace view attendance_overall_by_season as
select
  e.season,
  count(*) filter (where a.present) as attended,
  count(*) as total,
  round(
    100.0 * count(*) filter (where a.present) / nullif(count(*), 0), 1
  ) as attendance_pct
from attendance a
join events e on e.id = a.event_id
group by e.season;

-- Anwesenheit pro Trainer und Saison
create or replace view trainer_attendance_by_season as
select
  t.id as trainer_id,
  t.first_name,
  t.last_name,
  e.season,
  e.type,
  count(*) filter (where ta.present) as attended,
  count(*) as total,
  round(
    100.0 * count(*) filter (where ta.present) / nullif(count(*), 0), 1
  ) as attendance_pct
from trainer_attendance ta
join trainers t on t.id = ta.trainer_id
join events e on e.id = ta.event_id
group by t.id, t.first_name, t.last_name, e.season, e.type;

-- Anwesenheit pro Trainer und Monat
create or replace view trainer_attendance_by_month as
select
  t.id as trainer_id,
  t.first_name,
  t.last_name,
  e.season,
  date_trunc('month', e.event_date)::date as month,
  e.type,
  count(*) filter (where ta.present) as attended,
  count(*) as total,
  round(
    100.0 * count(*) filter (where ta.present) / nullif(count(*), 0), 1
  ) as attendance_pct
from trainer_attendance ta
join trainers t on t.id = ta.trainer_id
join events e on e.id = ta.event_id
group by t.id, t.first_name, t.last_name, e.season, date_trunc('month', e.event_date), e.type;

-- Aktuellste Note je Spieler und Schwerpunkt (aus dem jeweils neuesten Update).
-- Dient als Vorbelegung der Dropdowns unter Performance -> Update.
create or replace view performance_latest as
select distinct on (pr.player_id, pr.focus)
  pr.player_id,
  pr.focus,
  pr.grade,
  pu.update_date
from performance_ratings pr
join performance_updates pu on pu.id = pr.update_id
order by pr.player_id, pr.focus, pu.update_date desc, pr.created_at desc;

-- ─────────────────────────────────────────────
-- Trigger: bei Registrierung automatisch ein Profil anlegen
-- Liest Vorname/Nachname/Rolle aus den Metadaten, die die App beim
-- signUp() mitschickt (options.data).
-- ─────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, role, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'parent_player'),
    new.email
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Prueft, ob der aktuell eingeloggte Nutzer die Rolle 'trainer' hat.
-- security definer, damit die Abfrage nicht selbst an der RLS von
-- profiles scheitert.
create or replace function public.is_trainer()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'trainer'
  );
$$;

-- ─────────────────────────────────────────────
-- Row Level Security
-- Alle eingeloggten Nutzer duerfen lesen. Schreiben (anlegen, aendern,
-- loeschen) duerfen nur Nutzer mit der Rolle 'trainer'; 'parent_player'
-- hat reinen Lesezugriff.
-- ─────────────────────────────────────────────

alter table players enable row level security;
alter table event_types enable row level security;
alter table events enable row level security;
alter table attendance enable row level security;
alter table goals enable row level security;
alter table trainers enable row level security;
alter table trainer_attendance enable row level security;
alter table trainer_absences enable row level security;
alter table seasons enable row level security;
alter table profiles enable row level security;
alter table exercises enable row level security;
alter table trainings enable row level security;
alter table training_exercises enable row level security;
alter table training_exercise_groups enable row level security;
alter table training_player_groups enable row level security;
alter table fields enable row level security;
alter table exercise_focuses enable row level security;
alter table performance_updates enable row level security;
alter table performance_ratings enable row level security;

create policy "authenticated read profiles" on profiles
  for select to authenticated using (true);

create policy "authenticated read trainer_absences" on trainer_absences
  for select to authenticated using (true);
create policy "authenticated write trainer_absences" on trainer_absences
  for insert to authenticated with check (is_trainer());
create policy "authenticated update trainer_absences" on trainer_absences
  for update to authenticated using (is_trainer());
create policy "authenticated delete trainer_absences" on trainer_absences
  for delete to authenticated using (is_trainer());

create policy "authenticated read seasons" on seasons
  for select to authenticated using (true);
create policy "authenticated write seasons" on seasons
  for insert to authenticated with check (is_trainer());
create policy "authenticated update seasons" on seasons
  for update to authenticated using (is_trainer());
create policy "authenticated delete seasons" on seasons
  for delete to authenticated using (is_trainer());

create policy "authenticated read players" on players
  for select to authenticated using (true);
create policy "authenticated write players" on players
  for insert to authenticated with check (is_trainer());
create policy "authenticated update players" on players
  for update to authenticated using (is_trainer());
create policy "authenticated delete players" on players
  for delete to authenticated using (is_trainer());

create policy "authenticated read event_types" on event_types
  for select to authenticated using (true);
create policy "authenticated write event_types" on event_types
  for insert to authenticated with check (is_trainer());
create policy "authenticated update event_types" on event_types
  for update to authenticated using (is_trainer());
create policy "authenticated delete event_types" on event_types
  for delete to authenticated using (is_trainer());

create policy "authenticated read events" on events
  for select to authenticated using (true);
create policy "authenticated write events" on events
  for insert to authenticated with check (is_trainer());
create policy "authenticated update events" on events
  for update to authenticated using (is_trainer());
create policy "authenticated delete events" on events
  for delete to authenticated using (is_trainer());

create policy "authenticated read attendance" on attendance
  for select to authenticated using (true);
create policy "authenticated write attendance" on attendance
  for insert to authenticated with check (is_trainer());
create policy "authenticated update attendance" on attendance
  for update to authenticated using (is_trainer());
create policy "authenticated delete attendance" on attendance
  for delete to authenticated using (is_trainer());

create policy "authenticated read goals" on goals
  for select to authenticated using (true);
create policy "authenticated write goals" on goals
  for insert to authenticated with check (is_trainer());
create policy "authenticated update goals" on goals
  for update to authenticated using (is_trainer());
create policy "authenticated delete goals" on goals
  for delete to authenticated using (is_trainer());

create policy "authenticated read trainers" on trainers
  for select to authenticated using (true);
create policy "authenticated write trainers" on trainers
  for insert to authenticated with check (is_trainer());
create policy "authenticated update trainers" on trainers
  for update to authenticated using (is_trainer());
create policy "authenticated delete trainers" on trainers
  for delete to authenticated using (is_trainer());

create policy "authenticated read trainer_attendance" on trainer_attendance
  for select to authenticated using (true);
create policy "authenticated write trainer_attendance" on trainer_attendance
  for insert to authenticated with check (is_trainer());
create policy "authenticated update trainer_attendance" on trainer_attendance
  for update to authenticated using (is_trainer());
create policy "authenticated delete trainer_attendance" on trainer_attendance
  for delete to authenticated using (is_trainer());

create policy "authenticated read exercises" on exercises
  for select to authenticated using (true);
create policy "authenticated write exercises" on exercises
  for insert to authenticated with check (is_trainer());
create policy "authenticated update exercises" on exercises
  for update to authenticated using (is_trainer());
create policy "authenticated delete exercises" on exercises
  for delete to authenticated using (is_trainer());

create policy "authenticated read trainings" on trainings
  for select to authenticated using (true);
create policy "authenticated write trainings" on trainings
  for insert to authenticated with check (is_trainer());
create policy "authenticated update trainings" on trainings
  for update to authenticated using (is_trainer());
create policy "authenticated delete trainings" on trainings
  for delete to authenticated using (is_trainer());

create policy "authenticated read training_exercises" on training_exercises
  for select to authenticated using (true);
create policy "authenticated write training_exercises" on training_exercises
  for insert to authenticated with check (is_trainer());
create policy "authenticated update training_exercises" on training_exercises
  for update to authenticated using (is_trainer());
create policy "authenticated delete training_exercises" on training_exercises
  for delete to authenticated using (is_trainer());

create policy "authenticated read training_exercise_groups" on training_exercise_groups
  for select to authenticated using (true);
create policy "authenticated write training_exercise_groups" on training_exercise_groups
  for insert to authenticated with check (is_trainer());
create policy "authenticated update training_exercise_groups" on training_exercise_groups
  for update to authenticated using (is_trainer());
create policy "authenticated delete training_exercise_groups" on training_exercise_groups
  for delete to authenticated using (is_trainer());

create policy "authenticated read training_player_groups" on training_player_groups
  for select to authenticated using (true);
create policy "authenticated write training_player_groups" on training_player_groups
  for insert to authenticated with check (is_trainer());
create policy "authenticated update training_player_groups" on training_player_groups
  for update to authenticated using (is_trainer());
create policy "authenticated delete training_player_groups" on training_player_groups
  for delete to authenticated using (is_trainer());

create policy "authenticated read fields" on fields
  for select to authenticated using (true);
create policy "authenticated write fields" on fields
  for insert to authenticated with check (is_trainer());
create policy "authenticated update fields" on fields
  for update to authenticated using (is_trainer());
create policy "authenticated delete fields" on fields
  for delete to authenticated using (is_trainer());

create policy "authenticated read exercise_focuses" on exercise_focuses
  for select to authenticated using (true);
create policy "authenticated write exercise_focuses" on exercise_focuses
  for insert to authenticated with check (is_trainer());
create policy "authenticated update exercise_focuses" on exercise_focuses
  for update to authenticated using (is_trainer());
create policy "authenticated delete exercise_focuses" on exercise_focuses
  for delete to authenticated using (is_trainer());

create policy "authenticated read performance_updates" on performance_updates
  for select to authenticated using (true);
create policy "authenticated write performance_updates" on performance_updates
  for insert to authenticated with check (is_trainer());
create policy "authenticated update performance_updates" on performance_updates
  for update to authenticated using (is_trainer());
create policy "authenticated delete performance_updates" on performance_updates
  for delete to authenticated using (is_trainer());

create policy "authenticated read performance_ratings" on performance_ratings
  for select to authenticated using (true);
create policy "authenticated write performance_ratings" on performance_ratings
  for insert to authenticated with check (is_trainer());
create policy "authenticated update performance_ratings" on performance_ratings
  for update to authenticated using (is_trainer());
create policy "authenticated delete performance_ratings" on performance_ratings
  for delete to authenticated using (is_trainer());

-- ─────────────────────────────────────────────
-- Storage: Bucket fuer Uebungsbilder
-- Bucket ist "public", d.h. Bilder sind ueber ihre oeffentliche URL ohne
-- Login abrufbar (fuer die Vorschaubilder/Links in der App). Hoch-/Aendern/
-- Loeschen bleibt ueber die Storage-Policies auf Trainer beschraenkt.
-- ─────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('exercise-images', 'exercise-images', true)
on conflict (id) do nothing;

create policy "public read exercise-images" on storage.objects
  for select to public
  using (bucket_id = 'exercise-images');

create policy "trainer write exercise-images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'exercise-images' and is_trainer());

create policy "trainer update exercise-images" on storage.objects
  for update to authenticated
  using (bucket_id = 'exercise-images' and is_trainer());

create policy "trainer delete exercise-images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'exercise-images' and is_trainer());
