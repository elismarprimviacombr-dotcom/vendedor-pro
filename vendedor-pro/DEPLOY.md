# Vendedor Pro — Guia completo de publicação

Tudo em um lugar só: banco de dados, Edge Function e site no ar.
Nenhuma linha de comando necessária — tudo pelo navegador.

---

## Visão geral do que vamos publicar

```
Supabase (banco + Edge Function)    Netlify (o site)
──────────────────────────────────  ──────────────────────────
┌─────────────────────────────┐     ┌──────────────────────────┐
│  Tabelas / RLS              │     │  React (as telas)        │
│  Autenticação (Auth)        │◄────│  Chama o Supabase via    │
│  Edge Function criar-usuario│     │  VITE_SUPABASE_URL e     │
└─────────────────────────────┘     │  VITE_SUPABASE_ANON_KEY  │
                                    └──────────────────────────┘
```

São duas publicações separadas, mas que conversam entre si.
Faça na ordem deste guia.

---

## PARTE 1 — Supabase (banco de dados)

### 1.1 Criar o projeto

1. Acesse **supabase.com** → clique em **"New project"**.
2. Dê um nome (ex: `vendedor-pro`), crie uma senha para o banco
   (guarde em algum lugar seguro) e escolha a região
   **South America (São Paulo)** se aparecer, ou a mais próxima.
3. Aguarde ~2 minutos até o projeto ficar pronto.

---

### 1.2 Executar o schema (criar as tabelas)

1. No menu lateral, clique em **SQL Editor → New query**.
2. Abra o arquivo `src/database/schema.sql` (que está no projeto).
3. Copie todo o conteúdo e cole no editor do Supabase.
4. **Desative a tradução automática do seu navegador** se ela estiver
   ligada — o SQL não pode ser traduzido para português, senão quebra.
5. Clique em **Run** (ou `Ctrl+Enter`).
6. Deve aparecer: `Success. No rows returned` — isso é o esperado.

---

### 1.3 Executar as migrações (na ordem)

Repita o passo 1.2 para cada arquivo abaixo, **nessa ordem**:

| Arquivo | O que faz |
|---|---|
| `src/database/migrations/002_funil_comercial.sql` | Atualiza as etapas do funil (Novo cliente → Fechado → Perdido) |
| `src/database/migrations/003_produto_venda_perdida.sql` | Adiciona o campo "produto" no registro de venda perdida |
| `src/database/migrations/004_protege_ultimo_admin.sql` | Impede que o último administrador seja rebaixado a vendedor |

---

### 1.4 Criar o primeiro usuário administrador

1. No menu lateral do Supabase, clique em **Authentication → Users**.
2. Clique em **"Add user" → "Create new user"**.
3. Preencha o e-mail e a senha (mínimo 6 caracteres). Clique em criar.
4. Copie o **ID** do usuário que apareceu na lista (é um código longo
   tipo `a1b2c3d4-...`).
5. Vá em **SQL Editor → New query** e execute:

   ```sql
   update public.usuarios
   set papel = 'admin'
   where id = 'COLE_O_ID_AQUI';
   ```

6. Esse é o usuário com o qual você vai entrar no sistema pela primeira
   vez. Depois de entrar, pode criar outros usuários direto pelo app
   (Configurações → Usuários).

---

### 1.5 Pegar as credenciais de conexão

Vá em **Project Settings → API** e anote:

| O que anotar | Nome que vamos usar |
|---|---|
| **Project URL** (ex: `https://xxxx.supabase.co`) | `VITE_SUPABASE_URL` |
| Chave **anon public** (começa com `sb_publishable_...` ou `eyJ...`) | `VITE_SUPABASE_ANON_KEY` |

⚠️ **Nunca use a chave `service_role` / `secret`** no site — ela dá
acesso total ao banco e jamais pode aparecer no código do navegador.

---

## PARTE 2 — Edge Function "criar-usuario" (sem instalar nada)

Essa função é o que permite criar novos usuários de dentro do próprio
sistema (em Configurações → Usuários), sem precisar entrar no painel
do Supabase toda vez.

### 2.1 Criar a função pelo navegador

1. No menu lateral do Supabase, clique em **Edge Functions**.
2. Clique em **"Deploy a new function" → "Via Editor"**.
3. No campo de nome, digite exatamente: **`criar-usuario`**
   (tem que ser esse nome — é o que o sistema chama).
4. Apague todo o código de exemplo que aparecer.
5. Cole o código abaixo no editor:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado.' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    const clienteChamador = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await clienteChamador.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Sessão inválida.' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const clienteAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data: perfilChamador, error: perfilError } = await clienteAdmin
      .from('usuarios').select('papel').eq('id', userData.user.id).single();

    if (perfilError || perfilChamador?.papel !== 'admin') {
      return new Response(JSON.stringify({ error: 'Apenas administradores podem criar usuários.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { email, senha, nome, papel } = await req.json();

    if (!email || !senha || !nome) {
      return new Response(JSON.stringify({ error: 'Preencha nome, e-mail e senha.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (senha.length < 6) {
      return new Response(JSON.stringify({ error: 'A senha precisa ter pelo menos 6 caracteres.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const papelFinal = papel === 'admin' ? 'admin' : 'vendedor';
    const { data: novoUsuario, error: criarError } = await clienteAdmin.auth.admin.createUser({
      email, password: senha, email_confirm: true,
      user_metadata: { nome, papel: papelFinal },
    });

    if (criarError) {
      return new Response(JSON.stringify({ error: criarError.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ usuario: novoUsuario.user }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Erro inesperado.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

6. Clique em **"Deploy"**.
7. **Não precisa configurar nenhuma variável extra** — o Supabase já
   injeta `SUPABASE_URL`, `SUPABASE_ANON_KEY` e
   `SUPABASE_SERVICE_ROLE_KEY` automaticamente em toda Edge Function.

### 2.2 Testar se funcionou

Depois de publicar o site (Parte 3), entre no sistema como admin,
vá em **Configurações → Usuários → Novo usuário**, preencha os dados
e clique em criar. Se o usuário aparecer na lista, está funcionando.

---

## PARTE 3 — Netlify (o site)

O arquivo `netlify.toml` já está configurado no projeto com tudo
que a Netlify precisa — build, versão do Node e redirecionamento de
URLs. Você não precisa alterar nada nele.

### 3.1 Colocar o código no GitHub

1. Crie um repositório novo em **github.com** (pode ser privado).
2. No computador, dentro da pasta do projeto, abra o terminal e execute:

   ```bash
   git init
   git add .
   git commit -m "Vendedor Pro — versão inicial"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/vendedor-pro.git
   git push -u origin main
   ```

   O `.gitignore` já garante que `node_modules/`, `dist/` e o `.env`
   real **não** vão pro GitHub.

> **Sem terminal no seu computador?** Você pode subir a pasta direto
> pela interface web do GitHub: no repositório criado, clique em
> **"uploading an existing file"** e arraste a pasta do projeto.
> Não envie a pasta `node_modules` se ela existir.

---

### 3.2 Criar o site na Netlify

1. Acesse **app.netlify.com** e faça login (crie uma conta grátis se
   não tiver).
2. Clique em **"Add new site" → "Import an existing project"**.
3. Escolha **GitHub** e selecione o repositório `vendedor-pro`.
4. A Netlify detecta o `netlify.toml` automaticamente — não mude nada
   nas configurações de build.
5. **Antes de clicar em "Deploy"**, configure as variáveis de ambiente
   (passo 3.3).

---

### 3.3 Configurar as variáveis de ambiente

Na mesma tela (ou depois em **Site settings → Environment variables**):

| Nome da variável | Valor |
|---|---|
| `VITE_SUPABASE_URL` | O **Project URL** que você anotou no passo 1.5 |
| `VITE_SUPABASE_ANON_KEY` | A chave **anon public** do passo 1.5 |

Depois de adicionar as duas, clique em **"Deploy site"**.

---

### 3.4 Primeiro deploy

A Netlify vai instalar as dependências, rodar `npm run build` e
publicar. Isso leva 1–2 minutos. Ao final, você recebe um link:

```
https://nome-aleatorio-123.netlify.app
```

Acesse e faça o primeiro login com o usuário criado no passo 1.4.

---

### 3.5 Ajustar o Supabase para o domínio de produção

Importante para o **"Esqueci minha senha"** e os e-mails de
confirmação funcionarem com o link correto:

1. No Supabase, vá em **Authentication → URL Configuration**.
2. Em **Site URL**, coloque a URL do Netlify que você recebeu.
3. Em **Redirect URLs**, adicione a mesma URL.
4. Clique em **Save**.

---

### 3.6 Renomear o site (recomendado)

Em **Site settings → General → Change site name**, troque o nome
aleatório por algo como `vendedor-pro`. O link fica:

```
https://vendedor-pro.netlify.app
```

---

### 3.7 Domínio próprio (opcional)

Se você tiver um domínio (ex: `vendedorpro.com.br`):

1. **Site settings → Domain management → Add a custom domain**.
2. Siga as instruções da Netlify para apontar o DNS.
3. A Netlify emite o certificado HTTPS automaticamente, sem custo.
4. Repita o passo 3.5 com o novo domínio.

---

### 3.8 Deploys automáticos (daqui pra frente)

A partir de agora, **qualquer `git push` na branch `main` gera um
novo deploy automaticamente** — não precisa repetir nenhum passo:

```bash
git add .
git commit -m "descrição da mudança"
git push
```

---

## Resumo visual — o que publicar onde

```
┌─────────────────────────────────────────────────────────────────┐
│  SUPABASE                                                       │
│  ─────────────────────────────────────────────────────────────  │
│  1. Executar schema.sql                         (SQL Editor)    │
│  2. Executar migrações 002, 003, 004            (SQL Editor)    │
│  3. Criar usuário admin                         (Auth → Users)  │
│  4. Publicar Edge Function "criar-usuario"      (Edge Functions)│
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  NETLIFY                                                        │
│  ─────────────────────────────────────────────────────────────  │
│  1. Subir código no GitHub                                      │
│  2. Conectar repositório na Netlify                             │
│  3. Adicionar VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY       │
│  4. Clicar em Deploy                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Checklist final antes de divulgar o link

- [ ] Schema e as 3 migrações executados sem erro no Supabase
- [ ] Usuário admin criado e testado (conseguiu entrar no sistema)
- [ ] Edge Function `criar-usuario` publicada (testei criar um colega em
      Configurações → Usuários)
- [ ] Migração 004 executada (tentei rebaixar o último admin — o banco
      bloqueou)
- [ ] Site publicado no Netlify com as duas variáveis de ambiente
- [ ] Primeiro login no link de produção funcionou
- [ ] Supabase → Authentication → URL Configuration aponta para o link
      do Netlify
- [ ] A variável usada é a **anon/publishable**, nunca a `service_role`
- [ ] Testei o fluxo completo: novo cliente → nova oportunidade →
      avançar no funil → registrar venda
- [ ] Senha do usuário admin é forte (não é mais `admin123`)
- [ ] Se a versão antiga em arquivo único (`vendedor_pro.html`) ainda
      estiver em algum link compartilhado, desative ou rode as chaves do
      Supabase/Google Maps — esta versão React é a que fica em produção
