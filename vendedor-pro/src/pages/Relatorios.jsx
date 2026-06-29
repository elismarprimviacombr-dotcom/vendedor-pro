import React, { useEffect, useState } from 'react';
import StatCard from '../components/StatCard';
import { listarClientes, listarCarteira } from '../services/clientesService';
import { listarVendas, listarVendasPerdidas } from '../services/vendasService';
import { listarOrcamentos } from '../services/crmService';
import { exportarExcel } from '../services/exportExcel';
import { useToast } from '../context/ToastContext';

export default function Relatorios() {
  const { notifyError } = useToast();
  const [clientes, setClientes] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [orcamentos, setOrcamentos] = useState([]);
  const [perdidas, setPerdidas] = useState([]);
  const [carteira, setCarteira] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    Promise.all([listarClientes(), listarVendas(), listarOrcamentos(), listarVendasPerdidas(), listarCarteira()])
      .then(([c, v, o, p, ca]) => {
        setClientes(c);
        setVendas(v);
        setOrcamentos(o);
        setPerdidas(p);
        setCarteira(ca);
      })
      .catch((err) => notifyError(err, 'Não foi possível carregar os relatórios'))
      .finally(() => setCarregando(false));
  }, []);

  // Só conta vendas com status "fechada" — mesma regra usada no Dashboard,
  // pra não mostrar dois números diferentes de "total vendido" no sistema.
  const vendasFechadas = vendas.filter((v) => v.status === 'fechada');
  const totalVendido = vendasFechadas.reduce((s, v) => s + Number(v.valor_total || 0), 0);
  const totalComissao = vendasFechadas.reduce((s, v) => s + Number(v.comissao || 0), 0);
  const totalPerdido = perdidas.reduce((s, p) => s + Number(p.valor_estimado || 0), 0);

  function exportarTudo() {
    exportarExcel('vendedor-pro-relatorio-completo.xlsx', [
      { nomeAba: 'Clientes', linhas: clientes.map((c) => ({ Nome: c.nome, Empresa: c.empresa, Cidade: c.cidade, Telefone: c.telefone })) },
      { nomeAba: 'Carteira', linhas: carteira.map((c) => ({ Cliente: c.nome, 'Última compra': c.ultimaCompra, 'Dias sem comprar': c.diasSemComprar, 'Valor médio': c.valorMedio, Potencial: c.potencial })) },
      { nomeAba: 'Vendas', linhas: vendas.map((v) => ({ Data: v.data_venda, Cliente: v.clientes?.nome, Valor: v.valor_total, Margem: v.margem, Comissão: v.comissao, Status: v.status })) },
      { nomeAba: 'Vendas Perdidas', linhas: perdidas.map((p) => ({ Data: p.data_perda, Cliente: p.clientes?.nome, Produto: p.produto, Valor: p.valor_estimado, Motivo: p.motivo, Concorrente: p.concorrente })) },
      { nomeAba: 'Funil', linhas: orcamentos.map((o) => ({ Cliente: o.clientes?.nome, Etapa: o.status, Valor: o.valor_total, Criado: o.created_at })) },
    ]);
  }

  if (carregando) return <p className="help-text">Carregando relatórios...</p>;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Relatórios</h1>
          <p>Resumo geral do desempenho</p>
        </div>
        <button className="btn btn-primary" onClick={exportarTudo}>Exportar tudo (Excel)</button>
      </div>

      <div className="stats-grid">
        <StatCard label="Total de clientes" value={clientes.length} />
        <StatCard label="Oportunidades no funil" value={orcamentos.length} />
        <StatCard label="Total vendido (fechadas)" value={totalVendido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
        <StatCard label="Total perdido (R$)" value={totalPerdido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
      </div>

      <div className="panel">
        <h2 style={{ fontSize: 14.5, marginBottom: 12 }}>Exportar separadamente</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={() => exportarExcel('clientes.xlsx', [{ nomeAba: 'Clientes', linhas: clientes }])}>
            Clientes
          </button>
          <button className="btn btn-ghost" onClick={() => exportarExcel('carteira.xlsx', [{ nomeAba: 'Carteira', linhas: carteira }])}>
            Carteira
          </button>
          <button className="btn btn-ghost" onClick={() => exportarExcel('vendas.xlsx', [{ nomeAba: 'Vendas', linhas: vendas }])}>
            Vendas
          </button>
          <button className="btn btn-ghost" onClick={() => exportarExcel('vendas-perdidas.xlsx', [{ nomeAba: 'Perdidas', linhas: perdidas }])}>
            Vendas perdidas
          </button>
        </div>
        <p className="help-text" style={{ marginTop: 12 }}>
          Comissão total acumulada (vendas fechadas): <strong className="mono">{totalComissao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
        </p>
      </div>
    </div>
  );
}
