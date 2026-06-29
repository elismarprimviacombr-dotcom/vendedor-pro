import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../components/StatCard';
import FunnelChart from '../components/FunnelChart';
import DonutChart from '../components/DonutChart';
import { listarClientes, listarClientesParados } from '../services/clientesService';
import { contarTarefasHoje, listarTarefas } from '../services/tarefasService';
import { listarVendas } from '../services/vendasService';
import { ETAPAS, listarOrcamentos, listarEmNegociacaoAntigas } from '../services/crmService';
import { useToast } from '../context/ToastContext';

const CORES_ETAPA = {
  novo_cliente: '#3B82F6',
  contato_feito: '#34D399',
  cotacao: '#FBBF24',
  negociacao: '#A78BFA',
  fechado: '#22C55E',
  perdido: '#F4574F',
};

const ICONS = {
  clientes: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6" /></svg>,
  tarefa: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>,
  oportunidade: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 4h18l-7 9v6l-4-2v-4L3 4z" /></svg>,
  venda: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 17l5-6 4 3 6-8" /><path d="M14 6h4v4" /></svg>,
};

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function Dashboard() {
  const { notifyError } = useToast();
  const [totalClientes, setTotalClientes] = useState(0);
  const [tarefasHoje, setTarefasHoje] = useState(0);
  const [vendasMes, setVendasMes] = useState(0);
  const [orcamentos, setOrcamentos] = useState([]);
  const [proximasTarefas, setProximasTarefas] = useState([]);
  const [ultimasVendas, setUltimasVendas] = useState([]);

  const [clientesParados, setClientesParados] = useState([]);
  const [retornosVencendo, setRetornosVencendo] = useState([]);
  const [oportunidadesParadas, setOportunidadesParadas] = useState([]);

  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      try {
        // Busca cada tabela uma única vez e reaproveita os dados em
        // todos os cálculos derivados (carteira, alertas, etc.) em vez
        // de cada cálculo buscar tudo de novo por conta própria.
        const [clientes, tHoje, orcs, tarefas, vendas, negociacaoAntiga] = await Promise.all([
          listarClientes(),
          contarTarefasHoje(),
          listarOrcamentos(),
          listarTarefas(),
          listarVendas(),
          listarEmNegociacaoAntigas(7),
        ]);

        setTotalClientes(clientes.length);
        setTarefasHoje(tHoje);
        setOrcamentos(orcs);
        setProximasTarefas(tarefas.filter((t) => !t.concluida).slice(0, 5));
        setUltimasVendas(vendas.slice(0, 5));

        const vendasFechadas = vendas.filter((v) => v.status === 'fechada');
        const inicioMes = new Date();
        inicioMes.setDate(1);
        const vendasMesAtual = vendasFechadas.filter((v) => v.data_venda >= inicioMes.toISOString().slice(0, 10));
        setVendasMes(vendasMesAtual.reduce((s, v) => s + Number(v.valor_total || 0), 0));

        const parados = await listarClientesParados(45, clientes, vendas);
        setClientesParados(parados.slice(0, 5));

        const em2dias = new Date();
        em2dias.setDate(em2dias.getDate() + 2);
        const limiteStr = em2dias.toISOString().slice(0, 10);
        setRetornosVencendo(
          tarefas.filter((t) => !t.concluida && t.data <= limiteStr).sort((a, b) => a.data.localeCompare(b.data)).slice(0, 5)
        );
        setOportunidadesParadas(negociacaoAntiga.slice(0, 5));
      } catch (err) {
        notifyError(err, 'Não foi possível carregar o dashboard');
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  const oportunidadesAbertas = orcamentos.filter((o) => !['fechado', 'perdido'].includes(o.status)).length;

  const etapasFunil = ETAPAS.map((e) => ({
    ...e,
    color: CORES_ETAPA[e.id],
    count: orcamentos.filter((o) => o.status === e.id).length,
  }));

  const donutSegmentos = ETAPAS.map((e) => ({
    label: e.label,
    color: CORES_ETAPA[e.id],
    value: orcamentos.filter((o) => o.status === e.id).length,
  }));

  if (carregando) return <p className="help-text">Carregando dashboard...</p>;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p>Tudo que você precisa ver hoje, num único lugar</p>
        </div>
      </div>

      {/* Atalhos rápidos — um clique até a ação */}
      <div className="quick-actions">
        <Link className="quick-action" to="/clientes" state={{ abrirNovo: true }}>
          <span className="ico">{ICONS.clientes}</span> Novo cliente
        </Link>
        <Link className="quick-action" to="/crm" state={{ abrirNovo: true }}>
          <span className="ico">{ICONS.oportunidade}</span> Nova oportunidade
        </Link>
        <Link className="quick-action" to="/agenda" state={{ abrirNovo: true }}>
          <span className="ico">{ICONS.tarefa}</span> Nova tarefa
        </Link>
        <Link className="quick-action" to="/vendas" state={{ abrirNovo: true }}>
          <span className="ico">{ICONS.venda}</span> Registrar venda
        </Link>
      </div>

      <div className="stats-grid">
        <StatCard label="Clientes cadastrados" value={totalClientes} iconBg="#3B82F61F" iconColor="#3B82F6" icon={ICONS.clientes} />
        <StatCard label="Tarefas pendentes hoje" value={tarefasHoje} iconBg="#F59E0B1F" iconColor="#F59E0B" icon={ICONS.tarefa} />
        <StatCard label="Oportunidades em aberto" value={oportunidadesAbertas} iconBg="#A78BFA1F" iconColor="#A78BFA" icon={ICONS.oportunidade} />
        <StatCard label="Vendido este mês" value={formatarMoeda(vendasMes)} iconBg="#34D3991F" iconColor="#34D399" icon={ICONS.venda} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14, marginBottom: 14 }}>
        <div className="panel">
          <div className="panel-title">Funil comercial</div>
          <FunnelChart etapas={etapasFunil} />
        </div>
        <div className="panel">
          <div className="panel-title">Distribuição das oportunidades</div>
          <DonutChart segmentos={donutSegmentos} />
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 14 }}>
        <div className="panel-title">⚠ Alertas</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18 }}>
          <div>
            <div className="alert-col-title" style={{ color: 'var(--red)' }}>Clientes parados ({clientesParados.length})</div>
            {clientesParados.length === 0 && <p className="help-text">Nenhum cliente esfriando. 🎉</p>}
            {clientesParados.map((c) => (
              <div className="alert-item" key={c.id}>
                {c.nome} <span style={{ color: 'var(--muted)' }}>{c.diasSemComprar === null ? '· nunca comprou' : `· ${c.diasSemComprar}d`}</span>
              </div>
            ))}
          </div>
          <div>
            <div className="alert-col-title" style={{ color: 'var(--orange)' }}>Retornos vencendo ({retornosVencendo.length})</div>
            {retornosVencendo.length === 0 && <p className="help-text">Nada vencendo nos próximos dias.</p>}
            {retornosVencendo.map((t) => (
              <div className="alert-item" key={t.id}>{t.titulo} <span style={{ color: 'var(--muted)' }}>· {t.data}</span></div>
            ))}
          </div>
          <div>
            <div className="alert-col-title" style={{ color: 'var(--purple)' }}>Oportunidades paradas ({oportunidadesParadas.length})</div>
            {oportunidadesParadas.length === 0 && <p className="help-text">Nenhuma negociação parada.</p>}
            {oportunidadesParadas.map((o) => (
              <div className="alert-item" key={o.id}>{o.clientes?.nome || '—'} <span style={{ color: 'var(--muted)' }}>· em negociação</span></div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="panel">
          <div className="panel-title">Próximas tarefas</div>
          {proximasTarefas.length === 0 && <p className="help-text">Nenhuma tarefa pendente.</p>}
          {proximasTarefas.map((t) => (
            <div key={t.id} className="alert-item">
              {t.titulo} {t.clientes?.nome ? `— ${t.clientes.nome}` : ''}
              <div style={{ color: 'var(--muted)', fontSize: 11 }}>{t.data} {t.hora || ''}</div>
            </div>
          ))}
        </div>
        <div className="panel">
          <div className="panel-title">Últimas vendas</div>
          {ultimasVendas.length === 0 && <p className="help-text">Nenhuma venda registrada ainda.</p>}
          {ultimasVendas.map((v) => (
            <div key={v.id} className="alert-item">
              {v.clientes?.nome || 'Cliente removido'} — <span className="mono">{formatarMoeda(v.valor_total)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
