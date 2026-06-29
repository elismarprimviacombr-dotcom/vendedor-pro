import { supabase } from './supabaseClient';

export async function listarClientes() {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500); // limite de segurança — paginação de verdade é melhoria futura
  if (error) throw error;
  return data;
}

export async function buscarCliente(id) {
  const { data, error } = await supabase.from('clientes').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function criarCliente(payload) {
  const { data, error } = await supabase.from('clientes').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function atualizarCliente(id, payload) {
  const { error } = await supabase.from('clientes').update(payload).eq('id', id);
  if (error) throw error;
}

export async function excluirCliente(id) {
  const { error } = await supabase.from('clientes').delete().eq('id', id);
  if (error) throw error;
}

export async function contarClientes() {
  const { count, error } = await supabase.from('clientes').select('id', { count: 'exact', head: true });
  if (error) throw error;
  return count || 0;
}

/* Lógica pura de cálculo da carteira, separada da busca no banco —
   permite reaproveitar clientes/vendas já carregados em outra parte da
   tela (ex: Dashboard) em vez de buscar tudo de novo. */
export function calcularCarteira(clientes, vendas) {
  const hoje = new Date();
  const vendasFechadas = vendas.filter((v) => v.status === 'fechada');

  return clientes.map((cliente) => {
    const vendasDoCliente = vendasFechadas.filter((v) => v.cliente_id === cliente.id);
    const numCompras = vendasDoCliente.length;

    if (numCompras === 0) {
      return { ...cliente, ultimaCompra: null, diasSemComprar: null, valorMedio: 0, potencial: 'Novo' };
    }

    const datas = vendasDoCliente.map((v) => new Date(v.data_venda));
    const ultimaCompra = new Date(Math.max(...datas));
    const diasSemComprar = Math.floor((hoje - ultimaCompra) / (1000 * 60 * 60 * 24));
    const valorMedio = vendasDoCliente.reduce((s, v) => s + Number(v.valor_total || 0), 0) / numCompras;

    let potencial = 'Médio';
    if (diasSemComprar > 90) potencial = 'Baixo';
    else if (valorMedio >= 5000 && diasSemComprar <= 60) potencial = 'Alto';

    return {
      ...cliente,
      ultimaCompra: ultimaCompra.toISOString().slice(0, 10),
      diasSemComprar,
      valorMedio,
      potencial,
    };
  });
}

/* Carteira de clientes: cruza clientes com o histórico de vendas
   (client-side, pelo volume esperado de uma equipe pequena/média).
   Busca os dados do banco e aplica calcularCarteira(). */
export async function listarCarteira() {
  const [{ data: clientes, error: e1 }, { data: vendas, error: e2 }] = await Promise.all([
    supabase.from('clientes').select('id, nome, empresa'),
    supabase.from('vendas').select('cliente_id, valor_total, data_venda, status'),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  return calcularCarteira(clientes, vendas);
}

/* Clientes "parados": sem compra (ou nunca compraram) há mais de
   `diasLimite` dias. Aceita clientes/vendas já carregados (evita
   buscar tudo de novo, por exemplo quando chamado a partir do
   Dashboard, que já tem essas listas em memória). */
export async function listarClientesParados(diasLimite = 45, clientesJaCarregados = null, vendasJaCarregadas = null) {
  let carteira;
  if (clientesJaCarregados && vendasJaCarregadas) {
    carteira = calcularCarteira(clientesJaCarregados, vendasJaCarregadas);
  } else {
    carteira = await listarCarteira();
  }
  return carteira.filter((c) => c.diasSemComprar === null || c.diasSemComprar > diasLimite);
}

export async function listarHistorico(clienteId) {
  const { data, error } = await supabase
    .from('historico_cliente')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function adicionarHistorico(clienteId, usuarioId, descricao, tipo = 'nota') {
  const { error } = await supabase
    .from('historico_cliente')
    .insert({ cliente_id: clienteId, usuario_id: usuarioId, descricao, tipo });
  if (error) throw error;
}
