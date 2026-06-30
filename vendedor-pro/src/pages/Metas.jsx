import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../services/supabaseClient';

function fmtMoeda(v){ return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }

export default function Metas() {
  const { session } = useAuth();
  const { notify, notifyError } = useToast();
  const [meta, setMeta] = useState({ meta_diaria:0, meta_semanal:0, meta_mensal:150000 });
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ meta_diaria:'', meta_semanal:'', meta_mensal:'' });
  const [resultados, setResultados] = useState({ dia:0, semana:0, mes:0 });
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    // Busca meta do usuário
    const { data: metaData } = await supabase.from('metas').select('*').eq('usuario_id', session.user.id).single().catch(()=>({data:null}));
    if (metaData) setMeta(metaData);

    // Busca resultados reais
    const hoje = new Date().toISOString().slice(0,10);
    const inicioSemana = new Date(); inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
    const inicioMes = hoje.slice(0,7)+'-01';

    const [r1,r2,r3] = await Promise.all([
      supabase.from('vendas').select('valor_total').eq('status','fechada').eq('data_venda',hoje),
      supabase.from('vendas').select('valor_total').eq('status','fechada').gte('data_venda',inicioSemana.toISOString().slice(0,10)),
      supabase.from('vendas').select('valor_total').eq('status','fechada').gte('data_venda',inicioMes),
    ]);

    setResultados({
      dia: (r1.data||[]).reduce((s,v)=>s+Number(v.valor_total||0),0),
      semana: (r2.data||[]).reduce((s,v)=>s+Number(v.valor_total||0),0),
      mes: (r3.data||[]).reduce((s,v)=>s+Number(v.valor_total||0),0),
    });
  }

  useEffect(() => { carregar(); }, []);

  function abrirEdicao() {
    setForm({ meta_diaria: meta.meta_diaria||'', meta_semanal: meta.meta_semanal||'', meta_mensal: meta.meta_mensal||'' });
    setEditando(true);
  }

  async function salvar(e) {
    e.preventDefault(); setSalvando(true);
    const payload = {
      usuario_id: session.user.id,
      meta_diaria: Number(form.meta_diaria)||0,
      meta_semanal: Number(form.meta_semanal)||0,
      meta_mensal: Number(form.meta_mensal)||0,
    };
    const { error } = await supabase.from('metas').upsert(payload, { onConflict: 'usuario_id' });
    if (error) notifyError(error,'Erro ao salvar meta');
    else { notify('Metas salvas!'); setEditando(false); carregar(); }
    setSalvando(false);
  }

  function pct(real, meta) { return meta ? Math.min(100, Math.round((real/meta)*100)) : 0; }
  function corPct(p) { return p >= 100 ? 'var(--green-light)' : p >= 70 ? 'var(--gold)' : 'var(--red)'; }

  const cards = [
    { label:'Meta Diária', meta: meta.meta_diaria, real: resultados.dia },
    { label:'Meta Semanal', meta: meta.meta_semanal, real: resultados.semana },
    { label:'Meta Mensal', meta: meta.meta_mensal, real: resultados.mes },
  ];

  return (
    <div className="content">
      <div className="page-head">
        <div><h1>Metas</h1><p>Acompanhe seu desempenho em relação às metas configuradas</p></div>
        <button className="btn btn-primary" onClick={abrirEdicao}>✏️ Editar Meta</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:20}}>
        {cards.map(c => {
          const p = pct(c.real, c.meta);
          return (
            <div className="panel" key={c.label}>
              <div className="stat-label" style={{marginBottom:8}}>{c.label}</div>
              <div style={{fontSize:13,color:'var(--muted)',marginBottom:4}}>Meta: <strong style={{color:'var(--text)'}}>{fmtMoeda(c.meta)}</strong></div>
              <div style={{fontSize:13,color:'var(--muted)',marginBottom:10}}>Resultado: <strong style={{color:'var(--green-light)'}}>{fmtMoeda(c.real)}</strong></div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                <span style={{fontSize:20,fontWeight:700,color:corPct(p)}}>{p}%</span>
                <span style={{fontSize:11,color:'var(--muted)'}}>{p>=100?'✅ Meta atingida!':p>=70?'🔥 Quase lá!':'💪 Continue!'}</span>
              </div>
              <div className="progress-track"><div className="progress-fill" style={{width:p+'%',background:corPct(p)}}></div></div>
              {c.meta > 0 && c.real < c.meta && (
                <div style={{fontSize:11,color:'var(--muted)',marginTop:8}}>Faltam: <strong style={{color:'var(--text)'}}>{fmtMoeda(c.meta-c.real)}</strong></div>
              )}
            </div>
          );
        })}
      </div>

      {editando && (
        <div className="panel" style={{maxWidth:480}}>
          <div className="panel-head"><h2>Editar metas</h2></div>
          <form onSubmit={salvar}>
            <div className="field"><label>Meta diária (R$)</label><input type="number" min="0" value={form.meta_diaria} onChange={e=>setForm({...form,meta_diaria:e.target.value})}/></div>
            <div className="field"><label>Meta semanal (R$)</label><input type="number" min="0" value={form.meta_semanal} onChange={e=>setForm({...form,meta_semanal:e.target.value})}/></div>
            <div className="field"><label>Meta mensal (R$)</label><input type="number" min="0" value={form.meta_mensal} onChange={e=>setForm({...form,meta_mensal:e.target.value})}/></div>
            <div style={{display:'flex',gap:8,marginTop:14}}>
              <button type="button" className="btn btn-ghost" onClick={()=>setEditando(false)}>Cancelar</button>
              <button className="btn btn-primary" type="submit" disabled={salvando}>{salvando?'Salvando...':'Salvar metas'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
