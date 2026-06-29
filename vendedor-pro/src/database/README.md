# Banco de dados — Vendedor Pro

## Como aplicar

1. Crie um projeto em https://supabase.com (ou use o que já existe).
2. Vá em **SQL Editor** → **New query**.
3. Cole o conteúdo de `schema.sql` e clique em **Run**.
4. Depois, rode também os arquivos da pasta `migrations/`, **na ordem**:
   - `migrations/002_funil_comercial.sql` (novas etapas do funil: Novo cliente → Contato feito → Cotação → Negociação → Fechado → Perdido)
   - `migrations/003_produto_venda_perdida.sql` (adiciona o campo "produto" no registro de venda perdida)
   - `migrations/004_protege_ultimo_admin.sql` (impede, no próprio banco, que o último administrador seja rebaixado a vendedor)

## Publicar a Edge Function "criar-usuario"

Essa função é o que permite criar usuários **de dentro do app** (em
Configurações → Usuários), sem precisar abrir o painel do Supabase e sem
nunca expor a chave `service_role` no navegador.

1. Instale a CLI do Supabase (uma vez só): `npm install -g supabase`
2. Faça login: `supabase login`
3. Associe o projeto: `supabase link --project-ref SEU_PROJECT_REF` (o
   project ref aparece na URL do seu projeto no painel do Supabase)
4. Publique a função:

   ```bash
   supabase functions deploy criar-usuario
   ```

Não é preciso configurar nenhuma variável de ambiente extra — o Supabase já
injeta automaticamente `SUPABASE_URL`, `SUPABASE_ANON_KEY` e
`SUPABASE_SERVICE_ROLE_KEY` dentro de toda Edge Function.

Sem publicar essa função, o botão "Novo usuário" em Configurações continua
visível, mas vai mostrar erro ao tentar criar alguém.
4. Em **Authentication → Settings**, confirme se "Enable email confirmations"
   está do jeito que você prefere (desligado facilita testes internos).
5. Crie o primeiro usuário em **Authentication → Users → Add user**, com o
   e-mail e senha que o administrador vai usar. O perfil em `usuarios` é
   criado automaticamente (trigger `handle_new_user`).
6. Para esse primeiro usuário virar administrador, rode no SQL Editor:

   ```sql
   update public.usuarios set papel = 'admin' where id = 'COLE_O_ID_DO_USUARIO_AQUI';
   ```

   (o ID aparece na tela de Authentication → Users, ao lado do e-mail.)

## Variáveis de ambiente do front-end

Em **Project Settings → API**, copie:
- **Project URL** → cole em `VITE_SUPABASE_URL`
- **anon public key** → cole em `VITE_SUPABASE_ANON_KEY`

(arquivo `.env` na raiz do projeto, baseado no `.env.example`)

## Observação de design

As tabelas `orcamentos` e `vendas` guardam os produtos vendidos numa coluna
`itens` (jsonb), em vez de uma tabela separada `itens_venda`. Isso é mais
simples de manter agora; se o relatório por produto vendido se tornar
importante, vale normalizar isso numa tabela própria depois.
