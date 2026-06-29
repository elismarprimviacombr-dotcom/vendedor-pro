// Supabase Edge Function: criar-usuario
// Roda no servidor do Supabase — é o único lugar seguro pra usar a
// chave "service_role" (ela NUNCA pode ir para o código do navegador).
//
// Recebe: { email, senha, nome, papel }
// Confere que quem está chamando é um administrador antes de criar
// qualquer coisa.

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
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    // Cliente "do chamador" — usado só para descobrir quem está pedindo
    const clienteChamador = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await clienteChamador.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Sessão inválida.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cliente "admin" — só esse tem permissão de criar usuários
    const clienteAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: perfilChamador, error: perfilError } = await clienteAdmin
      .from('usuarios')
      .select('papel')
      .eq('id', userData.user.id)
      .single();

    if (perfilError || perfilChamador?.papel !== 'admin') {
      return new Response(JSON.stringify({ error: 'Apenas administradores podem criar usuários.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { email, senha, nome, papel } = await req.json();

    if (!email || !senha || !nome) {
      return new Response(JSON.stringify({ error: 'Preencha nome, e-mail e senha.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (senha.length < 6) {
      return new Response(JSON.stringify({ error: 'A senha precisa ter pelo menos 6 caracteres.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const papelFinal = papel === 'admin' ? 'admin' : 'vendedor';

    const { data: novoUsuario, error: criarError } = await clienteAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome, papel: papelFinal },
    });

    if (criarError) {
      return new Response(JSON.stringify({ error: criarError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ usuario: novoUsuario.user }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Erro inesperado.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
