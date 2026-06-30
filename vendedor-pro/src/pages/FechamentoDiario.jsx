import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../services/supabaseClient';

const FORM_VAZIO = { data:new Date().toISOString().slice(0,10), total_vendido:'', qtd_vendas:'', dinheiro:'', pix:'', cartao:'', outros:'', observacao:'' };

function fmtMoeda(v){ return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
function fmtData(d){ if(!d) return '—'; return new Date(d+'T00:00:00').toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit'}); }

export default function FechamentoDiario() {
  const { session } = useAuth();
  const { notify, notifyError } = useToast();
  const [lista, setLista] = useState([]);
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);

  async function carregar() {
    setLoading(true);
    const { data, error } = await supabase.from('fechamento_diario').select('*').order('data',{ascending:false}).limit(90);
    if (error) notifyError(error); else setLista(data||[]);
    setLoading(false);
  }
  useEffect(() => { carregar(); }, []);

  async function salvar(e) {
    e.preventDefault(); setSalvando(true);
    const total = Number(form.total_vendido)||0;
    const qtd = Number(form.qtd_vendas)||0;
    const ticket = qtd ? total/qtd : 0;
    const { error } = await supabase.from('fechamento_diario').upsert({
      data: form.data,
      total_vendido: total,
      qtd_vendas: qtd,
      ticket_medio: ticket,
      dinheiro: Number(form.dinheiro)||0,
      pix: Number(form.pix)||0,
      cartao: Number(form.cartao)||0,
      outros: Number(form.outros)||0,
      observacao: form.observacao||null,
      usuario_id: session.user.id,
    }, { onConflict: 'data' });
    if (error) notifyError(error,'Erro ao salvar fechamento');
    else { notify('Fechamento registrado!'); setForm(FORM_VAZIO); setModal(false); carregar(); }
    setSalvando(false);
  }

  const totalMes = lista.filter(f=>f.data?.slice(0,7)===new Date().toISOString().slice(0,7)).reduce((s,f)=>s+Number(f.total_vendido||0),0);
  const mediaTicket = lista.length ? lista.reduce((s,f)=>s+Number(f.ticket_medio||0),0)/lista.length : 0;
  const maxDia = Math.max(1,...lista.map(f=>Number(f.total_vendido||0)));

  return (
    <div className="content">
      <div className="page-head">
        <div><h1>Fechamento Diário</h1><p>Registre o resultado do dia sem lançar venda por venda</p></div>
        <button className="btn btn-primary" onClick={()=>{setForm(FORM_VAZIO);setModal(true);}}>+ Registrar fechamento</button>
      </div>

      <div className="stats-grid" style={{gridTemplateColumns:'repeat(3,1fr)',marginBottom:20}}>
        <div className="stat-card"><div className="stat-label">Total do mês</div><div className="stat-value" style={{fontSize:18}}>{fmtMoeda(totalMes)}</div></div>
        <div className="stat-card"><div className="stat-label">Dias registrados</div><div className="stat-value">{lista.length}</div></div>
        <div className="stat-card"><div className="stat-label">Ticket médio geral</div><div className="stat-value" style={{fontSize:18}}>{fmtMoeda(mediaTicket)}</div></div>
      </div>

      {/* Comparação entre dias - gráfico de barras simples */}
      <div className="panel" style={{marginBottom:14}}>
        <div className="panel-head"><h2>Comparação entre dias (últimos 14)</h2></div>
        {lista.length===0 ? <p className="help-text">Nenhum fechamento registrado ainda.</p> : (
          <div style={{display:'flex',alignItems:'flex-end',gap:6,height:140,paddingTop:10}}>
            {lista.slice(0,14).reverse().map(f=>{
              const h = Math.max(4,(Number(f.total_vendido||0)/maxDia)*120);
              return (
                <div key={f.id} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                  <div style={{fontSize:9,color:'var(--muted)'}}>{fmtMoeda(f.total_vendido).replace('R$','').trim()}</div>
                  <div style={{width:'100%',height:h,background:'var(--green)',borderRadius:'4px 4px 0 0'}}></div>
                  <div style={{fontSize:9,color:'var(--muted)'}}>{fmtData(f.data)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lista de fechamentos */}
      <div className="panel">
        <div className="panel-head"><h2>Resultado por dia</h2></div>
        {loading ? <p className="help-text">Carregando...</p> : lista.length===0 ? <div className="empty-state"><h3>Nenhum fechamento registrado</h3></div> : (
          <table>
            <thead><tr><th>Data</th><th>Total vendido</th><th>Qtd vendas</th><th>Ticket médio</th><th>Dinheiro</th><th>Pix</th><th>Cartão</th><th>Outros</th></tr></thead>
            <tbody>{lista.map(f=>(
              <tr key={f.id}>
                <td style={{fontFamily:'monospace',fontSize:11}}>{f.data}</td>
                <td style={{fontFamily:'monospace',fontWeight:700,color:'var(--green-light)'}}>{fmtMoeda(f.total_vendido)}</td>
                <td style={{fontFamily:'monospace'}}>{f.qtd_vendas}</td>
                <td style={{fontFamily:'monospace'}}>{fmtMoeda(f.ticket_medio)}</td>
                <td style={{fontFamily:'monospace',fontSize:11}}>{fmtMoeda(f.dinheiro)}</td>
                <td style={{fontFamily:'monospace',fontSize:11}}>{fmtMoeda(f.pix)}</td>
                <td style={{fontFamily:'monospace',fontSize:11}}>{fmtMoeda(f.cartao)}</td>
                <td style={{fontFamily:'monospace',fontSize:11}}>{fmtMoeda(f.outros)}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="overlay" onClick={(e)=>{if(e.target===e.currentTarget)setModal(false);}}>
          <div className="modal">
            <h2 style={{fontSize:17,marginBottom:16}}>Registrar fechamento do dia</h2>
            <form onSubmit={salvar}>
              <div className="row2">
                <div className="field"><label>Data</label><input type="date" value={form.data} onChange={e=>setForm({...form,data:e.target.value})}/></div>
                <div className="field"><label>Qtd de vendas</label><input type="number" min="0" value={form.qtd_vendas} onChange={e=>setForm({...form,qtd_vendas:e.target.value})}/></div>
              </div>
              <div className="field"><label>Total vendido no dia (R$) *</label><input type="number" min="0" required value={form.total_vendido} onChange={e=>setForm({...form,total_vendido:e.target.value})}/></div>
              <div style={{fontSize:11,color:'var(--muted)',marginBottom:14}}>Formas de pagamento (opcional, para conferência de caixa):</div>
              <div className="row2">
                <div className="field"><label>💵 Dinheiro</label><input type="number" min="0" value={form.dinheiro} onChange={e=>setForm({...form,dinheiro:e.target.value})}/></div>
                <div className="field"><label>📱 Pix</label><input type="number" min="0" value={form.pix} onChange={e=>setForm({...form,pix:e.target.value})}/></div>
              </div>
              <div className="row2">
                <div className="field"><label>💳 Cartão</label><input type="number" min="0" value={form.cartao} onChange={e=>setForm({...form,cartao:e.target.value})}/></div>
                <div className="field"><label>Outros</label><input type="number" min="0" value={form.outros} onChange={e=>setForm({...form,outros:e.target.value})}/></div>
              </div>
              <div className="field"><label>Observação</label><input value={form.observacao} onChange={e=>setForm({...form,observacao:e.target.value})}/></div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={()=>setModal(false)}>Cancelar</button>
                <button className="btn btn-primary" type="submit" disabled={salvando}>{salvando?'Salvando...':'Salvar fechamento'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
