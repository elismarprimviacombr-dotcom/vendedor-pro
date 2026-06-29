import { supabase } from './supabaseClient';

export async function listarVendas() {
  const { data, error } = await supabase
    .from('vendas')
    .select('*, clientes(nome, empresa)')
    .order('data_venda', { ascending: false })
    .limit(1000); // limite de segurança — paginação de verdade é melhoria futura
  if (error) throw error;
  return data;
}

export async function criarVenda(payload) {
  const { data, error } = await supabase.from('vendas').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function totalVendidoNoMes() {
  const inicio = new Date();
  inicio.setDate(1);
  const inicioStr = inicio.toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('vendas')
    .select('valor_total')
    .eq('status', 'fechada')
    .gte('data_venda', inicioStr);
  if (error) throw error;
  return data.reduce((soma, v) => soma + Number(v.valor_total || 0), 0);
}

export async function registrarVendaPerdida(payload) {
  const { error } = await supabase.from('vendas_perdidas').insert(payload);
  if (error) throw error;
}

export async function listarVendasPerdidas() {
  const { data, error } = await supabase
    .from('vendas_perdidas')
    .select('*, clientes(nome)')
    .order('data_perda', { ascending: false });
  if (error) throw error;
  return data;
}
