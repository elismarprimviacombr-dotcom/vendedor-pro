import React,{useEffect,useState}from'react';
import Modal from'../components/Modal';
import{useToast}from'../context/ToastContext';
import{numeroOuNull}from'../utils/form';
import{supabase}from'../services/supabaseClient';

function fmtMoeda(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}

export default function Produtos(){
  const{notify,notifyError}=useToast();
  const[produtos,setProdutos]=useState([]);
  const[modal,setModal]=useState(false);
  const[form,setForm]=useState({nome:'',preco:'',margem_padrao:''});
  const[salvando,setSalvando]=useState(false);

  async function carregar(){
    const{data,error}=await supabase.from('produtos').select('*').order('nome');
    if(error)notifyError(error);else setProdutos(data||[]);
  }
  useEffect(()=>{carregar();},[]);

  async function salvar(e){
    e.preventDefault();setSalvando(true);
    const{error}=await supabase.from('produtos').insert({nome:form.nome,preco:numeroOuNull(form.preco)||0,margem_padrao:numeroOuNull(form.margem_padrao)});
    if(error)notifyError(error,'Erro ao salvar');
    else{notify('Produto adicionado.');setModal(false);setForm({nome:'',preco:'',margem_padrao:''});carregar();}
    setSalvando(false);
  }

  return(
    <div className="content">
      <div className="page-head">
        <div><h1>Produtos</h1><p>Catálogo de produtos e serviços</p></div>
        <button className="btn btn-primary" onClick={()=>setModal(true)}>+ Novo produto</button>
      </div>
      <div className="panel">
        {produtos.length===0?<div className="empty-state"><h3>Nenhum produto cadastrado</h3><p>Cadastre seus produtos para agilizar o registro de vendas.</p></div>:(
          <table>
            <thead><tr><th>Produto</th><th>Preço de referência</th><th>Margem padrão</th></tr></thead>
            <tbody>{produtos.map(p=>(
              <tr key={p.id}>
                <td><strong>{p.nome}</strong></td>
                <td style={{fontFamily:'monospace'}}>{fmtMoeda(p.preco)}</td>
                <td style={{fontFamily:'monospace'}}>{p.margem_padrao||0}%</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
      {modal&&(
        <Modal title="Novo produto" onClose={()=>setModal(false)}>
          <form onSubmit={salvar}>
            <div className="field"><label>Nome *</label><input required value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})}/></div>
            <div className="row2">
              <div className="field"><label>Preço (R$)</label><input type="number" min="0" value={form.preco} onChange={e=>setForm({...form,preco:e.target.value})}/></div>
              <div className="field"><label>Margem padrão (%)</label><input type="number" min="0" max="100" value={form.margem_padrao} onChange={e=>setForm({...form,margem_padrao:e.target.value})}/></div>
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
