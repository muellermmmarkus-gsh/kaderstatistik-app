-- Migration 017: optionaler Link zur Ursprungsquelle einer Uebung
-- Im Supabase SQL Editor ausfuehren.

alter table exercises add column if not exists source_url text;
