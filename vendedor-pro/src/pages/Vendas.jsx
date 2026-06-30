import React,{useEffect,useState}from'react';
import{useLocation}from'react-router-dom';
import Modal from'../components/Modal';
import{useAuth}from'../context/AuthContext';
import{useToast}from'../context/ToastContext';
import{numeroOuNull,textoOuNull}from'../utils/form';
import{supabase}from'../services/supabaseClient';

function fmtMoeda(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}

export default function Vendas(){
  const{session,perfil}=useAuth();
  const{notify,notifyError}=useToast();
  const location=useLocation();
  const[vendas,setVendas]=useState([]);
  const[clientes,setClientes]=useState([]);
  const[modal,setModal]=useState(false);
  const[form,setForm]=useState({cliente_id:'',valor_total:'',margem:'',comissao:'',data_venda:new Date().toISOString().slice(0,10),descricao:''});
  const[salvando,setSalvando]=useState(false);
  const[loading,setLoading]=useState(true);

  useEffect(()=>{if(location.state?.abrirNovo)setModal(true);},[location.state]);

  async function carregar(){
    setLoading(true);
    const[r1,r2]=await Promise.all([
      supabase.from('vendas').select('*,clientes(nome,empresa)').order('data_venda',{ascending:false}).limit(500),
      supabase.from('clientes').select('id,nome').order('nome').limit(500),
    ]);
    if(r1.data)setVendas(r1.data);
    if(r2.data)setClientes(r2.data);
    setLoading(false);
  }
  useEffect(()=>{carregar();},[]);

  async function salvar(e){
    e.preventDefault();setSalvando(true);
    const{error}=await supabase.from('vendas').insert({
      cliente_id:form.cliente_id,
      valor_total:numeroOuNull(form.valor_total)||0,
      margem:numeroOuNull(form.margem),
      comissao:numeroOuNull(form.comissao),
      data_venda:form.data_venda,
      vendedor_id:session.user.id,
      status:'fechada',
    });
    if(error)notifyError(error,'Erro ao registrar venda');
    else{notify('Venda registrada.');setModal(false);setForm({cliente_id:'',valor_total:'',margem:'',comissao:'',data_venda:new Date().toISOString().slice(0,10),descricao:''});carregar();}
    setSalvando(false);
  }

  return(
    <div className="content">
      <div className="page-head">
        <div><h1>Vendas</h1><p>Histórico de vendas, margem e comissão</p></div>
        <button className="btn btn-primary" onClick={()=>setModal(true)}>+ Registrar venda</button>
      </div>
      <div className="panel">
        {loading?<p className="help-text">Carregando...</p>:vendas.length===0?<div className="empty-state"><h3>Nenhuma venda registrada ainda</h3></div>:(
          <table>
            <thead><tr><th>Data</th><th>Cliente</th><th>Produto(s)</th><th>Valor</th><th>Margem</th><th>Comissão</th><th>Vendedor</th><th>Status</th></tr></thead>
            <tbody>{vendas.map(v=>(
              <tr key={v.id}>
                <td style={{fontFamily:'monospace',fontSize:11}}>{v.data_venda}</td>
                <td>{v.clientes?.nome||'—'}</td>
                <td style={{color:'var(--muted)',fontSize:11}}>—</td>
                <td style={{fontFamily:'monospace'}}>{fmtMoeda(v.valor_total)}</td>
                <td style={{fontFamily:'monospace'}}>{v.margem||0}%</td>
                <td style={{fontFamily:'monospace'}}>{fmtMoeda(v.comissao)}</td>
                <td style={{fontSize:11}}>{perfil?.nome||'—'}</td>
                <td><span className="badge" style={{background:v.status==='cancelada'?'#3a1c1c':'#0d2b1a',color:v.status==='cancelada'?'var(--red)':'var(--green-light)'}}>{v.status==='cancelada'?'Cancelada':'Fechada'}</span></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
      {modal&&(
        <Modal title="Registrar venda" onClose={()=>setModal(false)}>
          <form onSubmit={salvar}>
            <div className="field"><label>Cliente *</label>
              <select required value={form.cliente_id} onChange={e=>setForm({...form,cliente_id:e.target.value})}>
                <option value="">Selecione...</option>
                {clientes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="row2">
              <div className="field"><label>Valor total (R$) *</label><input type="number" min="0" required value={form.valor_total} onChange={e=>setForm({...form,valor_total:e.target.value})}/></div>
              <div className="field"><label>Data</label><input type="date" value={form.data_venda} onChange={e=>setForm({...form,data_venda:e.target.value})}/></div>
            </div>
            <div className="row2">
              <div className="field"><label>Margem (%)</label><input type="number" min="0" max="100" value={form.margem} onChange={e=>setForm({...form,margem:e.target.value})}/></div>
              <div className="field"><label>Comissão (R$)</label><input type="number" min="0" value={form.comissao} onChange={e=>setForm({...form,comissao:e.target.value})}/></div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={()=>setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" type="submit" disabled={salvando}>{salvando?'Registrando...':'Registrar'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
