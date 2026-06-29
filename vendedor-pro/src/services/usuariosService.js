import { supabase } from './supabaseClient';

export async function listarUsuarios() {
  const { data, error } = await supabase.from('usuarios').select('*').order('nome');
  if (error) throw error;
  return data;
}

export async function atualizarNome(id, nome) {
  const { error } = await supabase.from('usuarios').update({ nome }).eq('id', id);
  if (error) throw error;
}

export async function atualizarPapel(id, papel) {
  const { error } = await supabase.from('usuarios').update({ papel }).eq('id', id);
  if (error) throw error;
}

/* Cria um novo usuário (login + senha) através de uma Edge Function —
   nunca direto do navegador, porque isso exige a chave "service_role",
   que jamais pode aparecer no código do front-end. Só funciona para
   quem já é administrador (a função confere isso no servidor). */
export async function criarUsuario({ email, senha, nome, papel }) {
  const { data, error } = await supabase.functions.invoke('criar-usuario', {
    body: { email, senha, nome, papel },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data?.usuario;
}
