-- Migration 038: BFV-Wettbewerbs-Widget je Team
-- Im Supabase SQL Editor ausfuehren. Setzt migration_033_teams.sql voraus.
--
-- teams.bfv_competition_id: ID des Wettbewerbs aus dem BFV-Widget-Code
-- (BFVWidget.HTML5.zeigeWettbewerb("<ID>", ...)). Wird unter
-- "Spielbetrieb -> Wettbewerbe" angezeigt und vom Admin unter ADMIN -> Teams
-- gepflegt.

begin;

alter table teams add column if not exists bfv_competition_id text;

alter table teams drop constraint if exists teams_bfv_competition_id_check;
alter table teams add constraint teams_bfv_competition_id_check
  check (bfv_competition_id is null or bfv_competition_id ~ '^[A-Za-z0-9-]{10,64}$');

update teams
set bfv_competition_id = '031PJ4D7T4000005VS5489BTVT8K11BC-G'
where name = 'TVG E1' and bfv_competition_id is null;

commit;
