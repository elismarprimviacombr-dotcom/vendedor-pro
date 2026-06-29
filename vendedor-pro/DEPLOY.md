# Publicar o Vendedor Pro em produção

Este guia parte do zero: do código no seu computador até o sistema rodando
num link de produção, sem nenhuma chave exposta.

---

## 0. Checklist antes de começar

- [ ] O banco no Supabase já está com `schema.sql` e as migrações
      (`002_funil_comercial.sql`, `003_produto_venda_perdida.sql`) executadas.
- [ ] Existe pelo menos um usuário admin criado (veja `src/database/README.md`).
- [ ] Você tem uma conta no GitHub (ou GitLab/Bitbucket) e uma na Netlify
      (ambas gratuitas).

---

## 1. Colocar o código no GitHub

1. Crie um repositório novo no GitHub (pode ser privado).
2. Na pasta do projeto, no terminal:

   ```bash
   git init
   git add .
   git commit -m "Vendedor Pro - versão inicial"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/vendedor-pro.git
   git push -u origin main
   ```

   O arquivo `.gitignore` já garante que `node_modules/`, `dist/` e o seu
   `.env` real **não** sejam enviados ao GitHub.

---

## 2. Criar o site na Netlify

1. Acesse **app.netlify.com** e faça login.
2. Clique em **"Add new site" → "Import an existing project"**.
3. Escolha **GitHub** e selecione o repositório `vendedor-pro`.
4. A Netlify vai detectar automaticamente as configurações do arquivo
   `netlify.toml` (comando de build `npm run build`, pasta `dist`, versão do
   Node). Não precisa alterar nada aqui.
5. **Antes de clicar em "Deploy"**, vá para o próximo passo e configure as
   variáveis de ambiente — sem elas o build conclui, mas o app não vai
   conseguir falar com o banco.

---

## 3. Configurar as variáveis de ambiente

Ainda na tela de configuração do site (ou depois, em **Site settings →
Environment variables**):

| Nome da variável | Onde encontrar o valor |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → **Project URL** |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → chave **anon public** (ou **publishable**, no formato novo) |

⚠️ **Nunca** coloque a chave `service_role` / `secret` aqui — essa é apenas
para uso em backend, nunca em um app que roda no navegador.

Depois de adicionar as duas variáveis, clique em **"Deploy site"**.

---

## 4. Primeiro deploy

A Netlify vai instalar as dependências, rodar `npm run build` e publicar a
pasta `dist`. Isso leva 1–2 minutos. Ao final, você recebe um link como:

```
https://nome-aleatorio-123.netlify.app
```

Acesse esse link e teste o login.

---

## 5. Ajustar o Supabase para o domínio de produção

Isso é importante para o **"Esqueci minha senha"** e os e-mails de
autenticação funcionarem corretamente:

1. No Supabase, vá em **Authentication → URL Configuration**.
2. Em **Site URL**, coloque a URL do Netlify (ou seu domínio próprio, se
   configurar um — veja o passo 7).
3. Em **Redirect URLs**, adicione a mesma URL.

---

## 6. Renomear o site (opcional, recomendado)

Em **Site settings → General → Site details → Change site name**, troque o
nome aleatório por algo como `vendedor-pro` — o link fica
`https://vendedor-pro.netlify.app`, mais fácil de divulgar pro time.

---

## 7. Domínio próprio (opcional)

Se você tiver um domínio (ex: `vendedorpro.com.br`):

1. Em **Site settings → Domain management → Add a custom domain**.
2. Siga as instruções da Netlify para apontar o DNS do seu domínio.
3. A Netlify emite o certificado HTTPS automaticamente, sem custo.
4. Repita o passo 5 (atualizar Site URL/Redirect URLs no Supabase) com o
   novo domínio.

---

## 8. Deploys seguintes

A partir de agora, **todo `git push` na branch `main` gera um novo deploy
automático**. Não é preciso repetir nenhum passo manual — só:

```bash
git add .
git commit -m "descrição da mudança"
git push
```

---

## 9. Checklist final de segurança antes de divulgar o link

- [ ] Conferi que `VITE_SUPABASE_ANON_KEY` usada é a **anon/publishable**,
      nunca a `service_role`.
- [ ] As políticas de RLS do banco estão ativas (rodei o `schema.sql`
      completo, incluindo a seção de Row Level Security).
- [ ] Testei login, criação de cliente, criação de oportunidade e registro
      de venda no link de produção, não só localmente.
- [ ] O usuário admin padrão tem uma senha forte (não é mais `admin123` de
      nenhuma versão anterior do projeto).
- [ ] Se a versão antiga em arquivo único (`vendedor_pro.html`, com chaves
      do Supabase e do Google Maps escritas direto no código) ainda estiver
      em uso ou publicada em algum link, considere desativá-la ou rotacionar
      essas chaves — esta nova versão em React é a que deve ficar em produção.
