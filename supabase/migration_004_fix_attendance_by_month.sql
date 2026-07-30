-- Migration: attendance_by_month um season-Spalte ergaenzen
-- Behebt: Monatsansicht der Spieler-Statistik liefert keine Daten, weil
-- die View in der Datenbank noch eine aeltere Version ohne season-Filter ist.
-- Im Supabase SQL Editor ausfuehren.
--
-- Hinweis: "create or replace view" reicht hier nicht, da Postgres keine
-- Spalte mitten in der Spaltenliste einfuegen kann (nur am Ende anhaengen).
-- Deshalb wird die View erst gelöscht und dann neu angelegt.

drop view if exists attendance_by_month;

create view attendance_by_month as
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
