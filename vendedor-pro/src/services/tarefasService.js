import { supabase } from './supabaseClient';

export async function listarTarefas() {
  const { data, error } = await supabase
    .from('tarefas')
    .select('*, clientes(nome)')
    .order('data')
    .order('hora')
    .limit(1000); // limite de segurança — paginação de verdade é melhoria futura
  if (error) throw error;
  return data;
}

export async function criarTarefa(payload) {
  const { error } = await supabase.from('tarefas').insert(payload);
  if (error) throw error;
}

export async function alternarConcluida(id, concluida) {
  const { error } = await supabase
    .from('tarefas')
    .update({ concluida, concluida_em: concluida ? new Date().toISOString() : null })
    .eq('id', id);
  if (error) throw error;
}

export async function excluirTarefa(id) {
  const { error } = await supabase.from('tarefas').delete().eq('id', id);
  if (error) throw error;
}

export async function contarTarefasHoje() {
  const hoje = new Date().toISOString().slice(0, 10);
  const { count, error } = await supabase
    .from('tarefas')
    .select('id', { count: 'exact', head: true })
    .eq('data', hoje)
    .eq('concluida', false);
  if (error) throw error;
  return count || 0;
}
