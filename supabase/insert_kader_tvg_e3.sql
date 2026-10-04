-- Kader der TV 1924 Geisenhausen E7 3 (Team "TVG E3") aus der DFBnet-Liste
-- TV_1924_Geisenhausen_E7_3-20261004.csv.
--
-- Im Supabase SQL Editor ausfuehren. Setzt migration_031_datenschutz.sql und
-- migration_033_teams.sql voraus; das Team "TVG E3" muss existieren
-- (z.B. ueber insert_spielplan_tvg_e3.sql).
--
-- Uebernommen werden nur die Daten, die die App vorsieht: Vorname, Nachname
-- (players) sowie Geburtsdatum und Passnummer (player_private, nur fuer
-- Trainer lesbar). Nationalitaet, Geschlecht, Spielrecht und Registrierdatum
-- werden nicht gespeichert.
--
-- Idempotent: Spieler, die es im Team mit gleichem Vor- und Nachnamen schon
-- gibt, werden uebersprungen.

begin;

do $$
begin
  if not exists (select 1 from teams where name = 'TVG E3') then
    raise exception 'Team "TVG E3" nicht gefunden - bitte zuerst anlegen.';
  end if;
end $$;

with team as (
  select id from teams where name = 'TVG E3'
),
data (first_name, last_name, birth_date, passnummer) as (
  values
    ('Iva', 'Atanasova', date '2016-04-09', '0791-0690'),
    ('Emanuel', 'Banic', date '2016-02-16', '0698-0960'),
    ('Gabriel', 'Banic', date '2016-02-16', '0698-0961'),
    ('Rayan', 'Bennani', date '2017-08-03', '0728-7015'),
    ('Konstantin', 'Bichlmeier', date '2016-01-24', '0781-0209'),
    ('Elyesa-Mahir', 'Cetinkaya', date '2016-12-27', '0773-9990'),
    ('Almuaiad', 'Chaddad', date '2016-05-05', '0750-4390'),
    ('Leonhard', 'Eineichner', date '2017-04-01', '0743-0627'),
    ('Michael', 'Geltinger', date '2017-12-28', '0809-0585'),
    ('Kassem', 'Halloum', date '2016-05-18', '0741-3359'),
    ('Philian', 'Kaspar', date '2017-04-10', '0752-2729'),
    ('Xaver', 'Lechner', date '2017-09-11', '0728-7011'),
    ('Benjamin', 'Mayer', date '2017-11-29', '0783-8591'),
    ('Teodor', 'Otto', date '2017-12-12', '0809-0584'),
    ('August', 'Römelsberger', date '2017-09-28', '0751-2887'),
    ('Jonathan', 'Schultz', date '2017-09-01', '0809-0587'),
    ('Adrian', 'Späth', date '2016-01-30', '0679-5895'),
    ('Vincent', 'Vohberger', date '2017-02-01', '0728-7029'),
    ('Louis', 'Zinke', date '2016-05-14', '0792-8829')
),
new_players as (
  insert into players (team_id, first_name, last_name)
  select team.id, d.first_name, d.last_name
  from data d
  cross join team
  where not exists (
    select 1 from players p
    where p.team_id = team.id and p.first_name = d.first_name and p.last_name = d.last_name
  )
  returning id, first_name, last_name
)
insert into player_private (player_id, birth_date, passnummer)
select np.id, d.birth_date, d.passnummer
from new_players np
join data d on d.first_name = np.first_name and d.last_name = np.last_name;

commit;
