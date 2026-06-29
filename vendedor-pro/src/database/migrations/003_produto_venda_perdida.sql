-- =====================================================================
-- Migração 003 — Campo "produto" em vendas_perdidas
-- =====================================================================

alter table public.vendas_perdidas
  add column if not exists produto text;
