-- Legt einen neuen Termin vom Typ 'training' fuer den 30.09.2026 an
-- (Saison 2026/2027).
--
-- Im Supabase SQL Editor (Projekt -> SQL Editor -> New query) ausfuehren.
-- Idempotent: mehrfaches Ausfuehren legt keinen Duplikat-Termin an.

insert into seasons (name)
values ('2026/2027')
on conflict (name) do nothing;

insert into events (type, event_date, season)
select 'training'::event_type, date '2026-09-30', '2026/2027'
where not exists (
  select 1 from events
  where type = 'training' and event_date = date '2026-09-30'
);
