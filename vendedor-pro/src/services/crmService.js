import { supabase } from './supabaseClient';

export const ETAPAS = [
  { id: 'novo_cliente', label: 'Novo cliente' },
  { id: 'contato_feito', label: 'Contato feito' },
  { id: 'cotacao', label: 'Cotação' },
  { id: 'negociacao', label: 'Negociação' },
  { id: 'fechado', label: 'Fechado' },
  { id: 'perdido', label: 'Perdido' },
];

export async function listarOrcamentos() {
  const { data, error } = await supabase
    .from('orcamentos')
    .select('*, clientes(nome, empresa)')
    .order('created_at', { ascending: false })
    .limit(500); // limite de segurança — paginação de verdade é melhoria futura
  if (error) throw error;
  return data;
}

export async function criarOrcamento(payload) {
  const { data, error } = await supabase
    .from('orcamentos')
    .insert({ status: 'novo_cliente', ...payload })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function atualizarStatus(id, status) {
  const { error } = await supabase.from('orcamentos').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function excluirOrcamento(id) {
  const { error } = await supabase.from('orcamentos').delete().eq('id', id);
  if (error) throw error;
}

export async function contarOportunidadesAbertas() {
  const { count, error } = await supabase
    .from('orcamentos')
    .select('id', { count: 'exact', head: true })
    .not('status', 'in', '(fechado,perdido)');
  if (error) throw error;
  return count || 0;
}

export async function listarEmNegociacaoAntigas(diasLimite = 7) {
  const limite = new Date();
  limite.setDate(limite.getDate() - diasLimite);
  const { data, error } = await supabase
    .from('orcamentos')
    .select('*, clientes(nome)')
    .eq('status', 'negociacao')
    .lt('updated_at', limite.toISOString());
  if (error) throw error;
  return data;
}

