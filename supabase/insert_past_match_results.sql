-- Traegt alle bereits vergangenen Spiele (events, type = 'game', vor heute)
-- als beendete Spiele unter "Spielergebnis -> Letzte Ergebnisse" ein.
--
-- Voraussetzung: migration_028_match_results.sql wurde bereits ausgefuehrt.
-- Im Supabase SQL Editor ausfuehren. Idempotent: Spiele, die schon ein
-- Ergebnis haben, werden uebersprungen.
--
-- Die unter "Termine" erfassten Tore eigener Spieler (Tabelle goals) werden
-- als Tor-Eintraege der eigenen Mannschaft uebernommen (Spielername als
-- Notiz). Gegentore sind nicht bekannt und muessen in der App ueber
-- "Letzte Ergebnisse -> Ändern" nachgetragen werden.

with past_games as (
  select
    e.id as event_id,
    coalesce(
      nullif(trim(regexp_replace(e.opponent, '\s*\((heim|auswärts|auswaerts)\)\s*$', '', 'i')), ''),
      'Gegner'
    ) as opponent_name,
    coalesce(e.opponent ~* '\((auswärts|auswaerts)\)\s*$', false) as is_away,
    (e.event_date + coalesce(e.event_time, time '12:00')) at time zone 'Europe/Berlin' as finished_at
  from events e
  where e.type = 'game'
    and e.deleted_at is null
    and e.event_date < current_date
    and not exists (select 1 from match_results r where r.event_id = e.id)
),
inserted as (
  insert into match_results (event_id, team_a, team_b, finished_at)
  select
    event_id,
    case when is_away then opponent_name else 'TV Geisenhausen E7 1' end,
    case when is_away then 'TV Geisenhausen E7 1' else opponent_name end,
    finished_at
  from past_games
  returning id, event_id
)
insert into match_goal_entries (match_result_id, team, kind, note)
select
  i.id,
  case when pg.is_away then 'b' else 'a' end,
  'goal',
  p.first_name || ' ' || p.last_name
from inserted i
join past_games pg on pg.event_id = i.event_id
join goals g on g.event_id = i.event_id
join players p on p.id = g.player_id
cross join generate_series(1, g.goal_count);
