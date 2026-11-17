-- Migration 046: "Mit Vorbehalt zugesagt" bei Trainings
-- Im Supabase SQL Editor ausfuehren. Setzt migration_023_attendance_excused_registered.sql voraus.
--
-- registered_tentative: Zusage unter Vorbehalt. Gilt nur zusammen mit
-- registered = true (eine Zusage mit Vorbehalt zaehlt als Zusage). Im Trainings-
-- termin per Klick auf das Feld "Zugesagt": leer -> zugesagt -> mit Vorbehalt -> leer.

begin;

alter table attendance add column if not exists registered_tentative boolean not null default false;

commit;
