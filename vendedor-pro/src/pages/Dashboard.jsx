import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { numeroOuNull } from '../utils/form';

function fmtMoeda(v) { return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
function fmtData(d) { if(!d) return '—'; return new Date(d+'T00:00:00').toLocaleDateString('pt-BR'); }
function hoje() { return new Date().toISOString().slice(0,10); }

const ETAPAS_CORES = {
  novo_cliente:'#388bfd', contato_feito:'#3fb950', cotacao:'#e3b341',
  negociacao:'#8957e5', fechado:'#2ea043', perdido:'#da3633'
};
const ETAPAS_LABELS = {
  novo_cliente:'Novo contato', contato_feito:'Primeiro atendimento', cotacao:'Proposta enviada',
  negociacao:'Negociação', fechado:'Fechado', perdido:'Perdido'
};

export default function Dashboard() {
  const { perfil } = useAuth();
  const { notifyError } = useToast();
  const navigate = useNavigate();
  const [dados, setDados] = useState({
    totalClientes:0, retornosHoje:[], negAberto:0, vendasMes:0, metaMes:150000,
    orcamentos:[], tarefasHoje:[], ultimasVendas:[], ranking:1, totalRanking:1
  });
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      try {
        const [
          { count: totalClientes },
          { data: clientes },
          { data: orcamentos },
          { data: tarefas },
          { data: vendas },
        ] = await Promise.all([
          supabase.from('clientes').select('id', { count:'exact', head:true }),
          supabase.from('clientes').select('id,nome,empresa,telefone,whatsapp,proxima_acao_data,proxima_acao_nota,ultimo_contato_em').order('proxima_acao_data'),
          supabase.from('orcamentos').select('*,clientes(nome,empresa)').order('created_at',{ascending:false}).limit(200),
          supabase.from('tarefas').select('*,clientes(nome)').order('hora').limit(200),
          supabase.from('vendas').select('*,clientes(nome,empresa)').order('data_venda',{ascending:false}).limit(200),
        ]);

        const hj = hoje();
        const retornosHoje = (clientes||[]).filter(c=>c.proxima_acao_data===hj);
        const negAberto = (orcamentos||[]).filter(o=>!['fechado','perdido'].includes(o.status)).length;
        const inicioMes = hj.slice(0,7)+'-01';
        const vendasMes = (vendas||[]).filter(v=>v.status==='fechada'&&v.data_venda>=inicioMes).reduce((s,v)=>s+Number(v.valor_total||0),0);
        const tarefasHoje = (tarefas||[]).filter(t=>t.data===hj);
        const ultimasVendas = (vendas||[]).slice(0,6);

        setDados({ totalClientes:totalClientes||0, retornosHoje, negAberto, vendasMes, metaMes:150000, orcamentos:orcamentos||[], tarefasHoje, ultimasVendas, ranking:1, totalRanking:1 });
      } catch(err) { notifyError(err,'Erro ao carregar dashboard'); }
      finally { setCarregando(false); }
    }
    carregar();
  }, []);

  const metaPct = Math.min(100, Math.round((dados.vendasMes / dados.metaMes) * 100));

  // Funil
  const ETAPAS_ORD = ['novo_cliente','contato_feito','cotacao','negociacao','fechado'];
  const contagemEtapas = ETAPAS_ORD.reduce((acc,e)=>{ acc[e]=(dados.orcamentos||[]).filter(o=>o.status===e).length; return acc; },{});
  const maxFunil = Math.max(1,...Object.values(contagemEtapas));

  // Donut
  const totalDonut = dados.orcamentos.length;
  let accDonut = 0;
  const donutStops = ETAPAS_ORD.concat(['perdido']).map(e=>{
    const n = (dados.orcamentos||[]).filter(o=>o.status===e).length;
    const pct = totalDonut ? (n/totalDonut)*100 : 0;
    const stop = `${ETAPAS_CORES[e]} ${accDonut}% ${accDonut+pct}%`;
    accDonut += pct;
    return {e, n, pct, stop};
  }).filter(x=>x.n>0);

  // Gráfico de linha
  const vendasPorDia = {};
  (dados.ultimasVendas||[]).forEach(v=>{ if(v.data_venda) vendasPorDia[v.data_venda]=(vendasPorDia[v.data_venda]||0)+Number(v.valor_total||0); });
  const diasGraf = Object.keys(vendasPorDia).sort();
  let acum = 0;
  const pontosGraf = diasGraf.map(d=>{ acum+=vendasPorDia[d]; return {d,v:acum}; });

  if (carregando) return <div style={{padding:40,color:'var(--muted)'}}>Carregando dashboard...</div>;

  return (
    <div className="content">
      {/* Stats */}
      <div className="stats-grid" style={{gridTemplateColumns:'repeat(6,1fr)'}}>
        <div className="stat-card">
          <div className="stat-icon" style={{background:'#1a3a6a'}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#388bfd" strokeWidth="2"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2"/><path d="M16 14c2.3.3 4 2.3 4.5 5"/></svg></div>
          <div className="stat-label">Clientes cadastrados</div>
          <div className="stat-value">{dados.totalClientes.toLocaleString()}</div>
          <div className="stat-sub">+ 0 este mês</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{background:'#3a2a0a'}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e3b341" strokeWidth="2"><path d="M3 4h18l-7 9v6l-4-2v-4L3 4z"/></svg></div>
          <div className="stat-label">Retornos hoje</div>
          <div className="stat-value">{dados.retornosHoje.length}</div>
          <div className="stat-sub muted">Não esqueça de retornar</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{background:'#2a1a4a'}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8957e5" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg></div>
          <div className="stat-label">Negociações em andamento</div>
          <div className="stat-value">{dados.negAberto}</div>
          <div className="stat-sub">+ 0 novas</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{background:'#0d2b1a'}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3fb950" strokeWidth="2"><polyline points="3 17 9 11 13 14 21 6"/><polyline points="14 6 21 6 21 13"/></svg></div>
          <div className="stat-label">Vendas realizadas este mês</div>
          <div className="stat-value" style={{fontSize:16}}>{fmtMoeda(dados.vendasMes)}</div>
          <div className="stat-sub">+ 0% vs mês anterior</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{background:'#3a2a0a'}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e3b341" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 3"/></svg></div>
          <div className="stat-label">Meta do mês</div>
          <div className="stat-value" style={{fontSize:16}}>{fmtMoeda(dados.metaMes)}</div>
          <div className="progress-track"><div className="progress-fill" style={{width:metaPct+'%'}}></div></div>
          <div className="stat-sub muted">{metaPct}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{background:'#1a3a6a'}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#388bfd" strokeWidth="2"><path d="M6 4h15M6 8h15M6 12h10M6 16h6"/></svg></div>
          <div className="stat-label">Ranking de desempenho</div>
          <div className="stat-value">{dados.ranking}° <span style={{fontSize:13,color:'var(--muted)'}}>/ {dados.totalRanking}</span></div>
          <div className="stat-sub" style={{cursor:'pointer',color:'var(--blue)'}} onClick={()=>navigate('/relatorios')}>Ver ranking completo</div>
        </div>
      </div>

      {/* Linha 2: retornos hoje + donut + funil */}
      <div className="grid-3" style={{marginBottom:14}}>
        <div className="panel">
          <div className="panel-head">
            <h2>Clientes para retornar hoje</h2>
            <button className="btn-link" onClick={()=>navigate('/clientes')}>Ver todos</button>
          </div>
          {dados.retornosHoje.length === 0 ? (
            <p className="help-text">Nenhum retorno agendado para hoje.</p>
          ) : (
            <table>
              <thead><tr><th>Cliente</th><th>Empresa</th><th>Telefone</th><th>Últ. contato</th><th>Próxima ação</th></tr></thead>
              <tbody>
                {dados.retornosHoje.slice(0,6).map(c=>(
                  <tr key={c.id} className="clickable" onClick={()=>navigate('/clientes')}>
                    <td><strong>{c.nome}</strong></td>
                    <td style={{color:'var(--muted)',fontSize:11}}>{c.empresa||'—'}</td>
                    <td style={{fontFamily:'monospace',fontSize:11}}>{c.telefone||c.whatsapp||'—'}</td>
                    <td style={{fontSize:11}}>{fmtData(c.ultimo_contato_em?.slice(0,10))}</td>
                    <td><span className="action-badge" style={{background:'var(--green)'}}>{c.proxima_acao_nota||'Retornar'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="panel">
          <div className="panel-head"><h2>Negociações por status</h2></div>
          {totalDonut === 0 ? <p className="help-text">Nenhuma oportunidade ainda.</p> : (
            <div className="donut-wrap">
              <div className="donut" style={{background:`conic-gradient(${donutStops.map(x=>x.stop).join(',')})`}}>
                <div className="donut-hole"><div className="n">{totalDonut}</div><div className="l">Total</div></div>
              </div>
              <div className="legend-list">
                {donutStops.map(({e,n,pct})=>(
                  <div className="legend-row" key={e}>
                    <span className="legend-dot" style={{background:ETAPAS_CORES[e]}}></span>
                    <span style={{fontSize:11}}>{ETAPAS_LABELS[e]}</span>
                    <span className="legend-n">{n} ({Math.round(pct)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-head"><h2>Funil de vendas</h2></div>
          <div className="funnel-stages">
            {ETAPAS_ORD.map(e=>{
              const n = contagemEtapas[e]||0;
              const w = 14 + (n/maxFunil)*80;
              return (
                <div className="funnel-row" key={e}>
                  <div className="funnel-legend">
                    <span className="funnel-dot" style={{background:ETAPAS_CORES[e]}}></span>
                    <span style={{fontSize:11}}>{ETAPAS_LABELS[e]}</span>
                  </div>
                  <div className="funnel-bar" style={{width:`${w}%`,background:ETAPAS_CORES[e]}}></div>
                  <span className="funnel-num">{n}</span>
                </div>
              );
            })}
          </div>
          {(() => {
            const total = contagemEtapas['novo_cliente']||0;
            const fec = contagemEtapas['fechado']||0;
            const taxa = total ? Math.round((fec/total)*100) : 0;
            return <div style={{color:'var(--green-light)',fontSize:12,fontWeight:700,marginTop:10}}>Taxa de conversão: {taxa}%</div>;
          })()}
        </div>
      </div>

      {/* Linha 3: tarefas hoje + gráfico performance */}
      <div className="grid-2-1" style={{marginBottom:14}}>
        <div className="panel">
          <div className="panel-head">
            <h2>Tarefas de hoje</h2>
            <button className="btn-link" onClick={()=>navigate('/tarefas')}>Ver todas</button>
          </div>
          {dados.tarefasHoje.length === 0 ? <p className="help-text">Nenhuma tarefa para hoje.</p> : (
            dados.tarefasHoje.slice(0,6).map(t=>(
              <div className="task-row" key={t.id}>
                <button className="task-check">{t.concluida?'✓':''}</button>
                <div className={`task-title${t.concluida?' done':''}`}>{t.titulo}{t.clientes?.nome?` — ${t.clientes.nome}`:''}</div>
                <div className="task-time">{t.hora||''}</div>
              </div>
            ))
          )}
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>Performance de vendas</h2>
            <button className="btn-link" onClick={()=>navigate('/relatorios')}>Ver relatório</button>
          </div>
          {pontosGraf.length < 2 ? <p className="help-text">Registre vendas para visualizar a performance do mês.</p> : (() => {
            const W=580, H=140, pad=10;
            const maxV = Math.max(...pontosGraf.map(p=>p.v),1);
            const coords = pontosGraf.map((p,i)=>({
              x: pad+(i/(pontosGraf.length-1))*(W-2*pad),
              y: H-pad-(p.v/maxV)*(H-2*pad),
              ...p
            }));
            const path = coords.map((c,i)=>(i===0?'M':'L')+c.x.toFixed(1)+','+c.y.toFixed(1)).join(' ');
            const last = coords[coords.length-1];
            return (
              <div className="line-chart">
                <svg viewBox={`0 0 ${W} ${H+24}`} width="100%" preserveAspectRatio="none" style={{height:160}}>
                  <defs><linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#388bfd" stopOpacity=".15"/><stop offset="100%" stopColor="#388bfd" stopOpacity="0"/></linearGradient></defs>
                  <path d={path+` L${coords[coords.length-1].x} ${H} L${coords[0].x} ${H} Z`} fill="url(#lineGrad)"/>
                  <path d={path} fill="none" stroke="#388bfd" strokeWidth="2.5"/>
                  {coords.map((c,i)=><circle key={i} cx={c.x} cy={c.y} r="4" fill="#388bfd"/>)}
                  {coords.map((c,i)=><text key={i} x={c.x} y={H+18} fontSize="9" fill="var(--muted)" textAnchor="middle">{c.d.slice(5)}</text>)}
                </svg>
                <div className="chart-callout" style={{left:`${(last.x/W)*100}%`,top:`${(last.y/(H+24))*100}%`}}>{fmtMoeda(last.v)}</div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Últimas vendas */}
      <div className="panel">
        <div className="panel-head">
          <h2>Últimas vendas</h2>
          <button className="btn-link" onClick={()=>navigate('/vendas')}>Ver todas</button>
        </div>
        {dados.ultimasVendas.length === 0 ? <p className="help-text">Nenhuma venda registrada ainda.</p> : (
          <table>
            <thead><tr><th>Data</th><th>Cliente</th><th>Produto(s)</th><th>Valor</th><th>Margem</th><th>Comissão</th><th>Vendedor</th><th>Status</th></tr></thead>
            <tbody>
              {dados.ultimasVendas.map(v=>(
                <tr key={v.id}>
                  <td style={{fontFamily:'monospace',fontSize:11}}>{v.data_venda}</td>
                  <td>{v.clientes?.nome||'—'}</td>
                  <td style={{color:'var(--muted)',fontSize:11}}>{v.itens?.map?.(i=>i.nome)?.join(', ')||'—'}</td>
                  <td style={{fontFamily:'monospace'}}>{fmtMoeda(v.valor_total)}</td>
                  <td style={{fontFamily:'monospace'}}>{v.margem||0}%</td>
                  <td style={{fontFamily:'monospace'}}>{fmtMoeda(v.comissao)}</td>
                  <td style={{fontSize:11}}>{perfil?.nome||'—'}</td>
                  <td><span className="badge" style={{background:v.status==='cancelada'?'#3a1c1c':'#0d2b1a',color:v.status==='cancelada'?'var(--red)':'var(--green-light)'}}>{v.status==='cancelada'?'Cancelada':'Fechada'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
