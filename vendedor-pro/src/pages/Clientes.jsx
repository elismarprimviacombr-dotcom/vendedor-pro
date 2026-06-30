import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { textoOuNull, dataOuNull } from '../utils/form';
import { supabase } from '../services/supabaseClient';

const VAZIO = { nome:'',empresa:'',telefone:'',whatsapp:'',cidade:'',segmento:'',observacoes:'',proxima_acao_data:'',proxima_acao_nota:'' };

export default function Clientes() {
  const { session, isAdmin } = useAuth();
  const { notify, notifyError } = useToast();
  const location = useLocation();
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState('');
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(VAZIO);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  useEffect(() => { if (location.state?.abrirNovo) abrir(); }, [location.state]);

  async function carregar() {
    setCarregando(true);
    const { data, error } = await supabase.from('clientes').select('*').order('created_at',{ascending:false}).limit(500);
    if (error) notifyError(error,'Erro ao carregar clientes');
    else setClientes(data||[]);
    setCarregando(false);
  }

  useEffect(() => { carregar(); }, []);

  function abrir(c=null) {
    setEditando(c);
    setForm(c ? {...VAZIO,...c} : VAZIO);
    setConfirmarExclusao(false);
    setModal(true);
  }

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    const payload = {
      nome: form.nome, empresa: textoOuNull(form.empresa),
      telefone: textoOuNull(form.telefone), whatsapp: textoOuNull(form.whatsapp),
      cidade: textoOuNull(form.cidade), segmento: textoOuNull(form.segmento),
      observacoes: textoOuNull(form.observacoes),
      proxima_acao_data: dataOuNull(form.proxima_acao_data),
      proxima_acao_nota: textoOuNull(form.proxima_acao_nota),
    };
    try {
      if (editando) {
        const { error } = await supabase.from('clientes').update(payload).eq('id',editando.id);
        if (error) throw error;
        notify('Cliente atualizado.');
      } else {
        const { error } = await supabase.from('clientes').insert({...payload, criado_por:session.user.id, responsavel_id:session.user.id});
        if (error) throw error;
        notify('Cliente cadastrado.');
      }
      setModal(false); carregar();
    } catch(err) { notifyError(err,'Erro ao salvar cliente'); }
    finally { setSalvando(false); }
  }

  async function excluir() {
    try {
      const { error } = await supabase.from('clientes').delete().eq('id',editando.id);
      if (error) throw error;
      notify('Cliente excluído.'); setModal(false); carregar();
    } catch(err) { notifyError(err,'Erro ao excluir'); }
  }

  const filtrados = clientes.filter(c => {
    const q = busca.toLowerCase();
    return !q || c.nome.toLowerCase().includes(q) || (c.empresa||'').toLowerCase().includes(q);
  });

  return (
    <div className="content">
      <div className="page-head">
        <div><h1>Clientes</h1><p>{clientes.length} clientes cadastrados</p></div>
        <button className="btn btn-primary" onClick={()=>abrir()}>+ Novo cliente</button>
      </div>
      <div className="filters">
        <input placeholder="Buscar por nome ou empresa" value={busca} onChange={e=>setBusca(e.target.value)} style={{minWidth:260}} />
      </div>
      <div className="panel">
        {carregando ? <p className="help-text">Carregando...</p> : filtrados.length===0 ? (
          <div className="empty-state"><h3>Nenhum cliente encontrado</h3></div>
        ) : (
          <table>
            <thead><tr><th>Cliente</th><th>Cidade</th><th>Telefone</th><th>Segmento</th><th>Último contato</th><th>Próxima ação</th></tr></thead>
            <tbody>
              {filtrados.map(c=>(
                <tr key={c.id} className="clickable" onClick={()=>abrir(c)}>
                  <td><strong>{c.nome}</strong>{c.empresa&&<div style={{color:'var(--muted)',fontSize:11}}>{c.empresa}</div>}</td>
                  <td>{c.cidade||'—'}</td>
                  <td style={{fontFamily:'monospace',fontSize:11}}>{c.telefone||c.whatsapp||'—'}</td>
                  <td>{c.segmento||'—'}</td>
                  <td style={{fontSize:11}}>{c.ultimo_contato_em?.slice(0,10)||'—'}</td>
                  <td style={{fontSize:11,color:c.proxima_acao_data&&c.proxima_acao_data<new Date().toISOString().slice(0,10)?'var(--red)':'inherit'}}>
                    {c.proxima_acao_data||'—'}{c.proxima_acao_nota&&<div style={{color:'var(--muted)',fontSize:10}}>{c.proxima_acao_nota}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {modal && (
        <Modal title={editando?'Editar cliente':'Novo cliente'} onClose={()=>setModal(false)}>
          <form onSubmit={salvar}>
            <div className="row2">
              <div className="field"><label>Nome *</label><input required value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})}/></div>
              <div className="field"><label>Empresa</label><input value={form.empresa||''} onChange={e=>setForm({...form,empresa:e.target.value})}/></div>
            </div>
            <div className="row3">
              <div className="field"><label>Telefone</label><input value={form.telefone||''} onChange={e=>setForm({...form,telefone:e.target.value})}/></div>
              <div className="field"><label>WhatsApp</label><input value={form.whatsapp||''} onChange={e=>setForm({...form,whatsapp:e.target.value})}/></div>
              <div className="field"><label>Cidade</label><input value={form.cidade||''} onChange={e=>setForm({...form,cidade:e.target.value})}/></div>
            </div>
            <div className="row2">
              <div className="field"><label>Segmento</label><input value={form.segmento||''} onChange={e=>setForm({...form,segmento:e.target.value})}/></div>
              <div className="field"><label>Próxima ação em</label><input type="date" value={form.proxima_acao_data||''} onChange={e=>setForm({...form,proxima_acao_data:e.target.value})}/></div>
            </div>
            <div className="field"><label>Nota da próxima ação</label><input value={form.proxima_acao_nota||''} onChange={e=>setForm({...form,proxima_acao_nota:e.target.value})} placeholder="Ex: Ligar, enviar proposta..."/></div>
            <div className="field"><label>Observações</label><textarea value={form.observacoes||''} onChange={e=>setForm({...form,observacoes:e.target.value})}/></div>
            {confirmarExclusao && (
              <div style={{background:'#3a1c1c',border:'1px solid var(--red)',borderRadius:6,padding:10,marginBottom:12,fontSize:12}}>
                <strong style={{color:'var(--red)'}}>Atenção!</strong> Isso vai excluir o cliente e todo seu histórico (vendas, tarefas, oportunidades). Não tem como desfazer.
              </div>
            )}
            <div className="modal-actions">
              <div style={{marginRight:'auto'}}>
                {editando && isAdmin && !confirmarExclusao && <button type="button" className="btn btn-danger" onClick={()=>setConfirmarExclusao(true)}>Excluir</button>}
                {editando && isAdmin && confirmarExclusao && <button type="button" className="btn btn-danger" onClick={excluir}>Confirmar exclusão</button>}
              </div>
              <button type="button" className="btn btn-ghost" onClick={()=>setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" type="submit" disabled={salvando}>{salvando?'Salvando...':'Salvar'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
