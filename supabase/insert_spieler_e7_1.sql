-- Traegt die Spieler aus TV_1924_Geisenhausen_E7_1-20260819.xlsx ein
-- (Name, Vorname, Geburtsdatum, Passnummer).
--
-- Voraussetzung: migration_016_players_passnummer.sql wurde bereits
-- ausgefuehrt (Spalte passnummer vorhanden).
--
-- Im Supabase SQL Editor (Projekt -> SQL Editor -> New query) ausfuehren.
-- Idempotent: mehrfaches Ausfuehren legt keine Duplikate an (Abgleich ueber Passnummer).

insert into players (first_name, last_name, birth_date, passnummer)
select v.first_name, v.last_name, v.birth_date, v.passnummer
from (
  values
    ('Jakob', 'Brunsch', date '2016-01-04', '0774-0057'),
    ('Leon', 'Fazlic', date '2016-09-13', '0708-6327'),
    ('Ben', 'Gebhart', date '2016-04-02', '0662-3898'),
    ('Johannes', 'Haslbeck', date '2016-06-30', '0667-2325'),
    ('Konstantin', 'Hügel', date '2016-04-09', '0708-3386'),
    ('Jakob', 'Illia', date '2016-01-21', '0708-5181'),
    ('Flori', 'Kastrati', date '2016-10-24', '0708-3141'),
    ('Emir', 'Levent', date '2016-11-02', '0660-4886'),
    ('Samuel', 'Merli', date '2016-05-27', '0741-3361'),
    ('Thomas', 'Müller', date '2016-09-28', '0750-4393'),
    ('Julian', 'Reff', date '2016-01-23', '0683-4802'),
    ('Johannes', 'Schneider', date '2016-06-10', '0687-0660'),
    ('Maximilian', 'Scholz', date '2016-09-01', '0726-1454')
) as v(first_name, last_name, birth_date, passnummer)
where not exists (
  select 1 from players p where p.passnummer = v.passnummer
);
