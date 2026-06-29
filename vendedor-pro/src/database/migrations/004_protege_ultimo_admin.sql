-- =====================================================================
-- Migração 004 — Proteger contra remover o último administrador
-- Sem isso, o último admin poderia trocar seu próprio papel (ou ser
-- trocado) para "vendedor", deixando o time sem ninguém com acesso
-- administrativo. Essa trava fica no banco, não só na tela — vale
-- mesmo que alguém edite a linha direto pelo painel do Supabase.
-- =====================================================================

create or replace function public.impedir_remover_ultimo_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.papel = 'admin' and new.papel <> 'admin' then
    if (select count(*) from public.usuarios where papel = 'admin' and id <> old.id) = 0 then
      raise exception 'Não é possível remover o último administrador do sistema.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_impedir_remover_ultimo_admin on public.usuarios;
create trigger trg_impedir_remover_ultimo_admin
  before update on public.usuarios
  for each row execute function public.impedir_remover_ultimo_admin();
