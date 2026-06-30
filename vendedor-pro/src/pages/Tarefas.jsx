import React,{useEffect,useState}from'react';
import Modal from'../components/Modal';
import{useAuth}from'../context/AuthContext';
import{useToast}from'../context/ToastContext';
import{dataOuNull}from'../utils/form';
import{supabase}from'../services/supabaseClient';

export default function Tarefas(){
  const{session}=useAuth();
  const{notify,notifyError}=useToast();
  const[tarefas,setTarefas]=useState([]);
  const[clientes,setClientes]=useState([]);
  const[modal,setModal]=useState(false);
  const[form,setForm]=useState({titulo:'',data:new Date().toISOString().slice(0,10),hora:'',cliente_id:''});
  const[salvando,setSalvando]=useState(false);

  async function carregar(){
    const[r1,r2]=await Promise.all([
      supabase.from('tarefas').select('*,clientes(nome)').order('data').order('hora').limit(500),
      supabase.from('clientes').select('id,nome').order('nome').limit(500),
    ]);
    if(r1.data)setTarefas(r1.data);
    if(r2.data)setClientes(r2.data);
  }
  useEffect(()=>{carregar();},[]);

  async function salvar(e){
    e.preventDefault();setSalvando(true);
    const{error}=await supabase.from('tarefas').insert({
      titulo:form.titulo,data:form.data,hora:form.hora||null,
      cliente_id:form.cliente_id||null,responsavel_id:session.user.id
    });
    if(error)notifyError(error,'Erro ao salvar tarefa');
    else{notify('Tarefa adicionada.');setModal(false);setForm({titulo:'',data:new Date().toISOString().slice(0,10),hora:'',cliente_id:''});carregar();}
    setSalvando(false);
  }

  async function toggle(t){
    const{error}=await supabase.from('tarefas').update({concluida:!t.concluida,concluida_em:!t.concluida?new Date().toISOString():null}).eq('id',t.id);
    if(error)notifyError(error);else carregar();
  }

  const hoje=new Date().toISOString().slice(0,10);
  const pendentes=tarefas.filter(t=>!t.concluida);
  const concluidas=tarefas.filter(t=>t.concluida);

  return(
    <div className="content">
      <div className="page-head">
        <div><h1>Tarefas</h1><p>{pendentes.length} pendentes · {concluidas.length} concluídas</p></div>
        <button className="btn btn-primary" onClick={()=>setModal(true)}>+ Nova tarefa</button>
      </div>
      <div className="panel">
        {tarefas.length===0?<div className="empty-state"><h3>Nenhuma tarefa cadastrada</h3></div>:(
          tarefas.map(t=>(
            <div className="task-row" key={t.id}>
              <button className={`task-check${t.concluida?' done':''}`} onClick={()=>toggle(t)}>{t.concluida?'✓':''}</button>
              <div className={`task-title${t.concluida?' done':''}`}>
                {t.titulo}{t.clientes?.nome?` — ${t.clientes.nome}`:''}
                {t.data===hoje&&!t.concluida&&<span style={{marginLeft:8,fontSize:10,background:'var(--orange)',color:'#000',padding:'1px 6px',borderRadius:4}}>Hoje</span>}
              </div>
              <div className="task-time">{t.data} {t.hora||''}</div>
            </div>
          ))
        )}
      </div>
      {modal&&(
        <Modal title="Nova tarefa" onClose={()=>setModal(false)}>
          <form onSubmit={salvar}>
            <div className="field"><label>Título *</label><input required value={form.titulo} onChange={e=>setForm({...form,titulo:e.target.value})}/></div>
            <div className="row2">
              <div className="field"><label>Data</label><input type="date" value={form.data} onChange={e=>setForm({...form,data:e.target.value})}/></div>
              <div className="field"><label>Hora</label><input type="time" value={form.hora} onChange={e=>setForm({...form,hora:e.target.value})}/></div>
            </div>
            <div className="field"><label>Cliente (opcional)</label>
              <select value={form.cliente_id} onChange={e=>setForm({...form,cliente_id:e.target.value})}>
                <option value="">Nenhum</option>
                {clientes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={()=>setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" type="submit" disabled={salvando}>{salvando?'Salvando...':'Adicionar'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
