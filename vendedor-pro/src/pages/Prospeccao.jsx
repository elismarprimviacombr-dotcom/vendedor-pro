import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { numeroOuNull, textoOuNull } from '../utils/form';
import { supabase } from '../services/supabaseClient';

const ETAPAS = [
  {id:'novo_cliente',label:'Novo contato',color:'#388bfd'},
  {id:'contato_feito',label:'Primeiro atendimento',color:'#3fb950'},
  {id:'cotacao',label:'Proposta enviada',color:'#e3b341'},
  {id:'negociacao',label:'Negociação',color:'#8957e5'},
  {id:'fechado',label:'Fechado',color:'#2ea043'},
  {id:'perdido',label:'Perdido',color:'#da3633'},
];

function fmtMoeda(v) { return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }

export default function Prospeccao() {
  const { session } = useAuth();
  const { notify, notifyError } = useToast();
  const location = useLocation();
  const [orcs, setOrcs] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [perdidas, setPerdidas] = useState([]);
  const [modalNovo, setModalNovo] = useState(false);
  const [modalPerda, setModalPerda] = useState(null);
  const [form, setForm] = useState({cliente_id:'',valor_total:''});
  const [formPerda, setFormPerda] = useState({produto:'',valor_estimado:'',motivo:'',concorrente:''});
  const [salvando, setSalvando] = useState(false);

  useEffect(()=>{ if(location.state?.abrirNovo) setModalNovo(true); },[location.state]);

  async function carregar() {
    const [r1,r2,r3] = await Promise.all([
      supabase.from('orcamentos').select('*,clientes(nome,empresa)').order('created_at',{ascending:false}).limit(300),
      supabase.from('clientes').select('id,nome,empresa').order('nome'),
      supabase.from('vendas_perdidas').select('*,clientes(nome)').order('created_at',{ascending:false}).limit(10),
    ]);
    if(r1.error) notifyError(r1.error); else setOrcs(r1.data||[]);
    if(r2.error) notifyError(r2.error); else setClientes(r2.data||[]);
    if(r3.error) notifyError(r3.error); else setPerdidas(r3.data||[]);
  }

  useEffect(()=>{ carregar(); },[]);

  async function criarOrc(e) {
    e.preventDefault(); setSalvando(true);
    const { error } = await supabase.from('orcamentos').insert({
      cliente_id:form.cliente_id, valor_total:numeroOuNull(form.valor_total),
      vendedor_id:session.user.id, status:'novo_cliente'
    });
    if(error) notifyError(error,'Erro ao criar oportunidade');
    else { notify('Oportunidade criada.'); setModalNovo(false); setForm({cliente_id:'',valor_total:''}); carregar(); }
    setSalvando(false);
  }

  async function mudarEtapa(orc, status) {
    if(status===orc.status) return;
    if(status==='perdido') { setFormPerda({produto:'',valor_estimado:orc.valor_total||'',motivo:'',concorrente:''}); setModalPerda(orc); return; }
    const { error } = await supabase.from('orcamentos').update({status}).eq('id',orc.id);
    if(error) notifyError(error); else carregar();
  }

  async function confirmarPerda(e) {
    e.preventDefault(); setSalvando(true);
    const [r1,r2] = await Promise.all([
      supabase.from('vendas_perdidas').insert({
        cliente_id:modalPerda.cliente_id, orcamento_id:modalPerda.id,
        vendedor_id:session.user.id,
        produto:textoOuNull(formPerda.produto), valor_estimado:numeroOuNull(formPerda.valor_estimado),
        motivo:formPerda.motivo, concorrente:textoOuNull(formPerda.concorrente),
      }),
      supabase.from('orcamentos').update({status:'perdido'}).eq('id',modalPerda.id),
    ]);
    if(r1.error||r2.error) notifyError(r1.error||r2.error);
    else { notify('Perda registrada.'); setModalPerda(null); carregar(); }
    setSalvando(false);
  }

  return (
    <div className="content">
      <div className="page-head">
        <div><h1>Prospecção</h1><p>Funil comercial — arraste ou selecione a etapa</p></div>
        <button className="btn btn-primary" onClick={()=>setModalNovo(true)}>+ Nova oportunidade</button>
      </div>

      <div className="kanban">
        {ETAPAS.map(et=>(
          <div className="kcol" key={et.id}>
            <div className="kcol-head">
              <span style={{color:et.color}}>{et.label}</span>
              <span className="kcount">{orcs.filter(o=>o.status===et.id).length}</span>
            </div>
            {orcs.filter(o=>o.status===et.id).map(o=>(
              <div className="card" key={o.id}>
                <strong style={{fontSize:12.5}}>{o.clientes?.nome||'—'}</strong>
                {o.clientes?.empresa&&<div style={{fontSize:11,color:'var(--muted)'}}>{o.clientes.empresa}</div>}
                <div style={{fontFamily:'monospace',fontSize:11,color:'var(--green-light)',marginTop:5}}>{fmtMoeda(o.valor_total)}</div>
                <select value={o.status} onChange={ev=>mudarEtapa(o,ev.target.value)}
                  style={{marginTop:8,width:'100%',fontSize:11,padding:'4px 6px',background:'var(--bg)',color:'var(--text)',border:'1px solid var(--border)',borderRadius:4}}>
                  {ETAPAS.map(et2=><option key={et2.id} value={et2.id}>{et2.label}</option>)}
                </select>
              </div>
            ))}
          </div>
        ))}
      </div>

      {perdidas.length>0 && (
        <div className="panel" style={{marginTop:16}}>
          <div className="panel-head"><h2>Vendas perdidas recentes</h2></div>
          <table>
            <thead><tr><th>Cliente</th><th>Produto</th><th>Valor</th><th>Motivo</th><th>Concorrente</th></tr></thead>
            <tbody>{perdidas.map(p=>(
              <tr key={p.id}>
                <td>{p.clientes?.nome||'—'}</td><td>{p.produto||'—'}</td>
                <td style={{fontFamily:'monospace'}}>{fmtMoeda(p.valor_estimado)}</td>
                <td>{p.motivo||'—'}</td><td>{p.concorrente||'—'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {modalNovo&&(
        <Modal title="Nova oportunidade" onClose={()=>setModalNovo(false)}>
          <form onSubmit={criarOrc}>
            <div className="field"><label>Cliente *</label>
              <select required value={form.cliente_id} onChange={e=>setForm({...form,cliente_id:e.target.value})}>
                <option value="">Selecione...</option>
                {clientes.map(c=><option key={c.id} value={c.id}>{c.nome}{c.empresa?` — ${c.empresa}`:''}</option>)}
              </select>
            </div>
            <div className="field"><label>Valor estimado (R$)</label><input type="number" min="0" value={form.valor_total} onChange={e=>setForm({...form,valor_total:e.target.value})}/></div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={()=>setModalNovo(false)}>Cancelar</button>
              <button className="btn btn-primary" type="submit" disabled={salvando}>{salvando?'Criando...':'Criar'}</button>
            </div>
          </form>
        </Modal>
      )}

      {modalPerda&&(
        <Modal title={`Registrar perda — ${modalPerda.clientes?.nome||''}`} onClose={()=>setModalPerda(null)}>
          <form onSubmit={confirmarPerda}>
            <div className="field"><label>Produto</label><input value={formPerda.produto} onChange={e=>setFormPerda({...formPerda,produto:e.target.value})}/></div>
            <div className="field"><label>Valor estimado (R$)</label><input type="number" min="0" value={formPerda.valor_estimado} onChange={e=>setFormPerda({...formPerda,valor_estimado:e.target.value})}/></div>
            <div className="field"><label>Motivo *</label><input required placeholder="Ex: preço, prazo, concorrência..." value={formPerda.motivo} onChange={e=>setFormPerda({...formPerda,motivo:e.target.value})}/></div>
            <div className="field"><label>Concorrente</label><input value={formPerda.concorrente} onChange={e=>setFormPerda({...formPerda,concorrente:e.target.value})}/></div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={()=>setModalPerda(null)}>Cancelar</button>
              <button className="btn btn-danger" type="submit" disabled={salvando}>{salvando?'Salvando...':'Confirmar perda'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
