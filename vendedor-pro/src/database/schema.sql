-- =====================================================================
-- VENDEDOR PRO — Schema profissional (Supabase / Postgres)
-- Pronto para executar do zero no SQL Editor do Supabase.
-- Pressupõe o uso do Supabase Auth (auth.users) para autenticação real.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. EXTENSÕES
-- ---------------------------------------------------------------------
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. FUNÇÕES DE APOIO
-- ---------------------------------------------------------------------

-- Mantém updated_at sempre atual em qualquer UPDATE
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Verifica se o usuário autenticado atual é administrador
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.usuarios
    where id = auth.uid() and papel = 'admin'
  );
$$;

-- ---------------------------------------------------------------------
-- 2. TABELA: usuarios (perfil estendido de auth.users)
-- ---------------------------------------------------------------------
create table if not exists public.usuarios (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text not null,
  papel       text not null default 'vendedor' check (papel in ('admin','vendedor')),
  ativo       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.usuarios is 'Perfil de cada usuário do sistema, 1:1 com auth.users.';

drop trigger if exists trg_usuarios_updated_at on public.usuarios;
create trigger trg_usuarios_updated_at
  before update on public.usuarios
  for each row execute function public.set_updated_at();

-- Cria automaticamente um perfil em usuarios quando alguém se cadastra
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, nome, papel)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'papel', 'vendedor')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 3. TABELA: clientes
-- ---------------------------------------------------------------------
create table if not exists public.clientes (
  id                  uuid primary key default gen_random_uuid(),
  nome                text not null,
  empresa             text,
  telefone            text,
  whatsapp            text,
  cidade              text,
  segmento            text,
  observacoes         text,
  proxima_acao_data   date,
  proxima_acao_nota   text,
  ultimo_contato_em   timestamptz,
  responsavel_id      uuid references public.usuarios(id) on delete set null,
  criado_por          uuid references public.usuarios(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
comment on table public.clientes is 'Cadastro de clientes/empresas prospectadas.';

drop trigger if exists trg_clientes_updated_at on public.clientes;
create trigger trg_clientes_updated_at
  before update on public.clientes
  for each row execute function public.set_updated_at();

create index if not exists idx_clientes_responsavel on public.clientes(responsavel_id);
create index if not exists idx_clientes_cidade on public.clientes(cidade);
create index if not exists idx_clientes_segmento on public.clientes(segmento);
create index if not exists idx_clientes_proxima_acao on public.clientes(proxima_acao_data);

-- ---------------------------------------------------------------------
-- 4. TABELA: contatos (pessoas dentro da empresa do cliente)
-- ---------------------------------------------------------------------
create table if not exists public.contatos (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references public.clientes(id) on delete cascade,
  nome        text not null,
  cargo       text,
  telefone    text,
  whatsapp    text,
  email       text,
  principal   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.contatos is 'Pessoas de contato dentro da empresa de um cliente.';

drop trigger if exists trg_contatos_updated_at on public.contatos;
create trigger trg_contatos_updated_at
  before update on public.contatos
  for each row execute function public.set_updated_at();

create index if not exists idx_contatos_cliente on public.contatos(cliente_id);

-- ---------------------------------------------------------------------
-- 5. TABELA: produtos
-- ---------------------------------------------------------------------
create table if not exists public.produtos (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null,
  sku             text,
  descricao       text,
  preco           numeric(12,2) not null default 0,
  margem_padrao   numeric(5,2) default 0,
  ativo           boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table public.produtos is 'Catálogo de produtos/serviços vendidos.';

drop trigger if exists trg_produtos_updated_at on public.produtos;
create trigger trg_produtos_updated_at
  before update on public.produtos
  for each row execute function public.set_updated_at();

create index if not exists idx_produtos_sku on public.produtos(sku);
create index if not exists idx_produtos_ativo on public.produtos(ativo);

-- ---------------------------------------------------------------------
-- 6. TABELA: tarefas
-- ---------------------------------------------------------------------
create table if not exists public.tarefas (
  id              uuid primary key default gen_random_uuid(),
  titulo          text not null,
  descricao       text,
  data            date not null,
  hora            time,
  cliente_id      uuid references public.clientes(id) on delete cascade,
  responsavel_id  uuid references public.usuarios(id) on delete set null,
  concluida       boolean not null default false,
  concluida_em    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table public.tarefas is 'Agenda, lembretes e retornos.';

drop trigger if exists trg_tarefas_updated_at on public.tarefas;
create trigger trg_tarefas_updated_at
  before update on public.tarefas
  for each row execute function public.set_updated_at();

create index if not exists idx_tarefas_cliente on public.tarefas(cliente_id);
create index if not exists idx_tarefas_responsavel on public.tarefas(responsavel_id);
create index if not exists idx_tarefas_data on public.tarefas(data);
create index if not exists idx_tarefas_concluida on public.tarefas(concluida);

-- ---------------------------------------------------------------------
-- 7. TABELA: orcamentos
-- ---------------------------------------------------------------------
create table if not exists public.orcamentos (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid not null references public.clientes(id) on delete cascade,
  vendedor_id   uuid references public.usuarios(id) on delete set null,
  status        text not null default 'rascunho'
                check (status in ('rascunho','enviado','aprovado','rejeitado','expirado')),
  itens         jsonb not null default '[]'::jsonb,
  valor_total   numeric(12,2) not null default 0,
  validade      date,
  observacoes   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on table public.orcamentos is 'Propostas/orçamentos enviados a clientes. itens: [{produto_id, nome, quantidade, preco_unitario}]';

drop trigger if exists trg_orcamentos_updated_at on public.orcamentos;
create trigger trg_orcamentos_updated_at
  before update on public.orcamentos
  for each row execute function public.set_updated_at();

create index if not exists idx_orcamentos_cliente on public.orcamentos(cliente_id);
create index if not exists idx_orcamentos_vendedor on public.orcamentos(vendedor_id);
create index if not exists idx_orcamentos_status on public.orcamentos(status);

-- ---------------------------------------------------------------------
-- 8. TABELA: vendas
-- ---------------------------------------------------------------------
create table if not exists public.vendas (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid not null references public.clientes(id) on delete cascade,
  vendedor_id   uuid references public.usuarios(id) on delete set null,
  orcamento_id  uuid references public.orcamentos(id) on delete set null,
  itens         jsonb not null default '[]'::jsonb,
  valor_total   numeric(12,2) not null default 0,
  margem        numeric(5,2) default 0,
  comissao      numeric(12,2) default 0,
  status        text not null default 'fechada' check (status in ('fechada','cancelada')),
  data_venda    date not null default current_date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on table public.vendas is 'Vendas concluídas (cabeçalho da transação).';

drop trigger if exists trg_vendas_updated_at on public.vendas;
create trigger trg_vendas_updated_at
  before update on public.vendas
  for each row execute function public.set_updated_at();

create index if not exists idx_vendas_cliente on public.vendas(cliente_id);
create index if not exists idx_vendas_vendedor on public.vendas(vendedor_id);
create index if not exists idx_vendas_data on public.vendas(data_venda);
create index if not exists idx_vendas_status on public.vendas(status);

-- ---------------------------------------------------------------------
-- 9. TABELA: vendas_perdidas
-- ---------------------------------------------------------------------
create table if not exists public.vendas_perdidas (
  id              uuid primary key default gen_random_uuid(),
  cliente_id      uuid not null references public.clientes(id) on delete cascade,
  vendedor_id     uuid references public.usuarios(id) on delete set null,
  orcamento_id    uuid references public.orcamentos(id) on delete set null,
  motivo          text,
  concorrente     text,
  valor_estimado  numeric(12,2) default 0,
  data_perda      date not null default current_date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table public.vendas_perdidas is 'Oportunidades perdidas, para análise de motivos e concorrência.';

drop trigger if exists trg_vendas_perdidas_updated_at on public.vendas_perdidas;
create trigger trg_vendas_perdidas_updated_at
  before update on public.vendas_perdidas
  for each row execute function public.set_updated_at();

create index if not exists idx_vendas_perdidas_cliente on public.vendas_perdidas(cliente_id);
create index if not exists idx_vendas_perdidas_vendedor on public.vendas_perdidas(vendedor_id);

-- ---------------------------------------------------------------------
-- 10. TABELA: compras_cliente (granularidade por produto, por venda)
-- ---------------------------------------------------------------------
create table if not exists public.compras_cliente (
  id              uuid primary key default gen_random_uuid(),
  cliente_id      uuid not null references public.clientes(id) on delete cascade,
  venda_id        uuid not null references public.vendas(id) on delete cascade,
  produto_id      uuid references public.produtos(id) on delete set null,
  quantidade      numeric(12,2) not null default 1,
  valor_unitario  numeric(12,2) not null default 0,
  valor_total     numeric(12,2) not null default 0,
  data_compra     date not null default current_date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table public.compras_cliente is 'Linha de produto comprado por cliente (1 venda pode gerar várias linhas) — base para análises de recompra.';

drop trigger if exists trg_compras_cliente_updated_at on public.compras_cliente;
create trigger trg_compras_cliente_updated_at
  before update on public.compras_cliente
  for each row execute function public.set_updated_at();

create index if not exists idx_compras_cliente_cliente on public.compras_cliente(cliente_id);
create index if not exists idx_compras_cliente_venda on public.compras_cliente(venda_id);
create index if not exists idx_compras_cliente_produto on public.compras_cliente(produto_id);

-- ---------------------------------------------------------------------
-- 11. TABELA: historico_cliente (timeline, log append-only)
-- ---------------------------------------------------------------------
create table if not exists public.historico_cliente (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references public.clientes(id) on delete cascade,
  usuario_id  uuid references public.usuarios(id) on delete set null,
  tipo        text not null default 'nota'
              check (tipo in ('ligacao','email','whatsapp','reuniao','nota','sistema')),
  descricao   text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.historico_cliente is 'Linha do tempo de interações com o cliente. Não deve ser editada — apenas inserida (log).';

create index if not exists idx_historico_cliente_cliente on public.historico_cliente(cliente_id);
create index if not exists idx_historico_cliente_usuario on public.historico_cliente(usuario_id);
create index if not exists idx_historico_cliente_created on public.historico_cliente(created_at);

-- =====================================================================
-- 12. ROW LEVEL SECURITY
--     Modelo: time compartilhado (todo usuário autenticado vê e edita
--     os dados do CRM), exclusão restrita a administradores, e o
--     histórico (log) nunca pode ser editado por ninguém.
-- =====================================================================

-- usuarios ------------------------------------------------------------
alter table public.usuarios enable row level security;

create policy "usuarios_select" on public.usuarios
  for select to authenticated using (true);

create policy "usuarios_update_self_or_admin" on public.usuarios
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

create policy "usuarios_delete_admin" on public.usuarios
  for delete to authenticated
  using (public.is_admin() and id <> auth.uid());

-- clientes --------------------------------------------------------------
alter table public.clientes enable row level security;

create policy "clientes_select" on public.clientes for select to authenticated using (true);
create policy "clientes_insert" on public.clientes for insert to authenticated with check (true);
create policy "clientes_update" on public.clientes for update to authenticated using (true) with check (true);
create policy "clientes_delete_admin" on public.clientes for delete to authenticated using (public.is_admin());

-- contatos --------------------------------------------------------------
alter table public.contatos enable row level security;

create policy "contatos_select" on public.contatos for select to authenticated using (true);
create policy "contatos_insert" on public.contatos for insert to authenticated with check (true);
create policy "contatos_update" on public.contatos for update to authenticated using (true) with check (true);
create policy "contatos_delete_admin" on public.contatos for delete to authenticated using (public.is_admin());

-- produtos --------------------------------------------------------------
alter table public.produtos enable row level security;

create policy "produtos_select" on public.produtos for select to authenticated using (true);
create policy "produtos_insert" on public.produtos for insert to authenticated with check (true);
create policy "produtos_update" on public.produtos for update to authenticated using (true) with check (true);
create policy "produtos_delete_admin" on public.produtos for delete to authenticated using (public.is_admin());

-- tarefas --------------------------------------------------------------
alter table public.tarefas enable row level security;

create policy "tarefas_select" on public.tarefas for select to authenticated using (true);
create policy "tarefas_insert" on public.tarefas for insert to authenticated with check (true);
create policy "tarefas_update" on public.tarefas for update to authenticated using (true) with check (true);
create policy "tarefas_delete_admin" on public.tarefas for delete to authenticated using (public.is_admin());

-- orcamentos --------------------------------------------------------------
alter table public.orcamentos enable row level security;

create policy "orcamentos_select" on public.orcamentos for select to authenticated using (true);
create policy "orcamentos_insert" on public.orcamentos for insert to authenticated with check (true);
create policy "orcamentos_update" on public.orcamentos for update to authenticated using (true) with check (true);
create policy "orcamentos_delete_admin" on public.orcamentos for delete to authenticated using (public.is_admin());

-- vendas --------------------------------------------------------------
alter table public.vendas enable row level security;

create policy "vendas_select" on public.vendas for select to authenticated using (true);
create policy "vendas_insert" on public.vendas for insert to authenticated with check (true);
create policy "vendas_update" on public.vendas for update to authenticated using (true) with check (true);
create policy "vendas_delete_admin" on public.vendas for delete to authenticated using (public.is_admin());

-- vendas_perdidas --------------------------------------------------------------
alter table public.vendas_perdidas enable row level security;

create policy "vendas_perdidas_select" on public.vendas_perdidas for select to authenticated using (true);
create policy "vendas_perdidas_insert" on public.vendas_perdidas for insert to authenticated with check (true);
create policy "vendas_perdidas_update" on public.vendas_perdidas for update to authenticated using (true) with check (true);
create policy "vendas_perdidas_delete_admin" on public.vendas_perdidas for delete to authenticated using (public.is_admin());

-- compras_cliente --------------------------------------------------------------
alter table public.compras_cliente enable row level security;

create policy "compras_cliente_select" on public.compras_cliente for select to authenticated using (true);
create policy "compras_cliente_insert" on public.compras_cliente for insert to authenticated with check (true);
create policy "compras_cliente_update" on public.compras_cliente for update to authenticated using (true) with check (true);
create policy "compras_cliente_delete_admin" on public.compras_cliente for delete to authenticated using (public.is_admin());

-- historico_cliente -----------------------------------------------------
-- Só SELECT, INSERT e exclusão por admin. Não existe policy de UPDATE
-- de propósito: com RLS ativo e sem policy de update, nenhuma edição
-- é permitida a ninguém — preserva a integridade do log.
alter table public.historico_cliente enable row level security;

create policy "historico_cliente_select" on public.historico_cliente for select to authenticated using (true);
create policy "historico_cliente_insert" on public.historico_cliente for insert to authenticated with check (true);
create policy "historico_cliente_delete_admin" on public.historico_cliente for delete to authenticated using (public.is_admin());

-- =====================================================================
-- FIM DO SCRIPT
-- =====================================================================
