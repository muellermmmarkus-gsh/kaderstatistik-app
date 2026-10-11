-- Migration 039: Uebungsflaeche/Kleinfeldtore/Minitore je Trainingsplan anpassbar
-- Im Supabase SQL Editor ausfuehren.
--
-- In der Detailplanung eines Trainings sind Uebungsflaeche, Kleinfeldtore und
-- Minitore Freitextfelder. Vorschlag sind die Werte der Uebung; nur wenn sie
-- im Plan geaendert werden, steht hier ein eigener Text (null = Wert der Uebung).

begin;

alter table training_exercises add column if not exists field_text text
  check (field_text is null or char_length(field_text) <= 100);
alter table training_exercises add column if not exists small_goals_text text
  check (small_goals_text is null or char_length(small_goals_text) <= 50);
alter table training_exercises add column if not exists mini_goals_text text
  check (mini_goals_text is null or char_length(mini_goals_text) <= 50);

commit;
