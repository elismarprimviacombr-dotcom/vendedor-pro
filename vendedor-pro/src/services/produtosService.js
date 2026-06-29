import { supabase } from './supabaseClient';

export async function listarProdutos() {
  const { data, error } = await supabase.from('produtos').select('*').eq('ativo', true).order('nome');
  if (error) throw error;
  return data;
}

export async function criarProduto(payload) {
  const { error } = await supabase.from('produtos').insert(payload);
  if (error) throw error;
}
