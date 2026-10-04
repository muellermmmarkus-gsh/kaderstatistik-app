-- Spielplan und bisherige Ergebnisse der TV 1924 Geisenhausen E7 3
-- (Team "TVG E3"), U11 (E7-Jun.) Gruppe Vilslern, Saison 2026/2027.
--
-- Im Supabase SQL Editor ausfuehren. Setzt migration_033_teams.sql voraus.
-- Idempotent: mehrfaches Ausfuehren legt keine Duplikate an.
--
-- * Team "TVG E3" wird angelegt, falls es noch nicht existiert. Der Name im
--   Spielbetrieb wird auf "TV 1924 Geisenhausen E7 3" gesetzt - daran erkennt
--   das Live-Ergebnis die eigene Mannschaft.
-- * Saison 2026/2027 fuer das Team (Standard, falls es noch keine hat).
-- * 6 Spieltermine; die beiden gespielten Spiele mit Endstand als beendete
--   Ergebnisse. Torschuetzen und Spielminuten sind nicht bekannt - die Tore
--   stehen ohne Spieler in der Torliste und koennen in der App unter
--   "Spielberichte -> Ändern" ergaenzt werden. Der Halbzeitstand steht im
--   Freitext des Spielberichts.

begin;

insert into teams (name, match_name)
values ('TVG E3', 'TV 1924 Geisenhausen E7 3')
on conflict (name) do update set match_name = excluded.match_name;

insert into seasons (team_id, name, is_default)
select
  t.id,
  '2026/2027',
  not exists (select 1 from seasons s where s.team_id = t.id and s.is_default)
from teams t
where t.name = 'TVG E3'
  and not exists (select 1 from seasons s where s.team_id = t.id and s.name = '2026/2027');

insert into events (team_id, type, event_date, event_time, opponent, location, season)
select t.id, 'game', v.event_date, v.event_time, v.opponent, v.location, '2026/2027'
from teams t
cross join (
  values
    (date '2026-09-19', time '09:30', 'TSV Altfraunhofen E7 1 (heim)',
     'Sportanlage Geisenhausen, Kunstrasen, Rampoldsdorf 64, 84144 Geisenhausen'),
    (date '2026-09-25', time '17:30', '(SG) FC Bonbruck/Bodenkirchen E7 1 (auswärts)',
     'Sportanlage Egglkofen, Platz 2, Harpoldener Str. 2, 84546 Egglkofen'),
    (date '2026-10-09', time '16:45', 'TSV Altfraunhofen E7 1 (auswärts)',
     'Sportplatz Altfraunhofen, Grundschule, Am Kellerberg 7, 84169 Altfraunhofen'),
    (date '2026-10-17', time '09:30', '(SG) FC Bonbruck/Bodenkirchen E7 1 (heim)',
     'Sportanlage Geisenhausen, Kunstrasen, Rampoldsdorf 64, 84144 Geisenhausen'),
    (date '2026-10-23', time '17:00', 'TSV Vilslern E7 (heim)',
     'Sportanlage Geisenhausen, Kunstrasen, Rampoldsdorf 64, 84144 Geisenhausen'),
    (date '2026-10-27', time '18:00', 'TSV Vilslern E7 (auswärts)',
     'Sportanlage Vilslern, Platz 2, Dorfstr. 40, 84149 Velden')
) as v(event_date, event_time, opponent, location)
where t.name = 'TVG E3'
  and not exists (
    select 1 from events e
    where e.team_id = t.id
      and e.type = 'game'
      and e.event_date = v.event_date
      and e.opponent = v.opponent
      and e.deleted_at is null
  );

-- Ergebnisse: home_goals = zuerst genannte (Heim-)Mannschaft.
with results (event_date, opponent, home_goals, away_goals, halftime) as (
  values
    (date '2026-09-19', 'TSV Altfraunhofen E7 1 (heim)', 3, 18, '1:11'),
    (date '2026-09-25', '(SG) FC Bonbruck/Bodenkirchen E7 1 (auswärts)', 12, 0, '6:0')
),
games as (
  select
    e.id as event_id,
    (e.event_date + e.event_time) at time zone 'Europe/Berlin' as finished_at,
    regexp_replace(r.opponent, '\s*\((heim|auswärts)\)\s*$', '') as opponent_name,
    r.opponent like '%(auswärts)' as is_away,
    r.home_goals,
    r.away_goals,
    r.halftime
  from results r
  join events e
    on e.event_date = r.event_date
   and e.opponent = r.opponent
   and e.type = 'game'
   and e.deleted_at is null
  join teams t on t.id = e.team_id and t.name = 'TVG E3'
  where not exists (select 1 from match_results m where m.event_id = e.id)
),
inserted as (
  insert into match_results (event_id, team_a, team_b, finished_at, report)
  select
    event_id,
    case when is_away then opponent_name else 'TV 1924 Geisenhausen E7 3' end,
    case when is_away then 'TV 1924 Geisenhausen E7 3' else opponent_name end,
    finished_at,
    'Halbzeit ' || halftime
  from games
  returning id, event_id
)
insert into match_goal_entries (match_result_id, team, kind)
select i.id, goal.team, 'goal'
from inserted i
join games g on g.event_id = i.event_id
cross join lateral (
  select 'a' as team from generate_series(1, g.home_goals)
  union all
  select 'b' from generate_series(1, g.away_goals)
) as goal;

commit;
