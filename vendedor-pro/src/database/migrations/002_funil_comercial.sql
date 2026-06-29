-- =====================================================================
-- Migração 002 — Funil comercial profissional
-- Novas etapas: novo_cliente, contato_feito, cotacao, negociacao,
-- fechado, perdido (substituem rascunho/enviado/aprovado/rejeitado/expirado)
-- =====================================================================

-- 1) Remove a checagem antiga antes de poder migrar os valores
alter table public.orcamentos drop constraint if exists orcamentos_status_check;

-- 2) Migra os valores já existentes para as novas etapas
update public.orcamentos set status = 'novo_cliente' where status = 'rascunho';
update public.orcamentos set status = 'contato_feito' where status = 'enviado';
update public.orcamentos set status = 'fechado'        where status = 'aprovado';
update public.orcamentos set status = 'perdido'        where status in ('rejeitado','expirado');

-- 3) Recria a checagem com as novas etapas
alter table public.orcamentos
  add constraint orcamentos_status_check
  check (status in ('novo_cliente','contato_feito','cotacao','negociacao','fechado','perdido'));

alter table public.orcamentos alter column status set default 'novo_cliente';
