import React,{useEffect,useState} from 'react';
import{supabase}from'../services/supabaseClient';
import{useToast}from'../context/ToastContext';

const ETAPAS=[
  {id:'novo_cliente',label:'Novo contato'},{id:'contato_feito',label:'Primeiro atendimento'},
  {id:'cotacao',label:'Proposta enviada'},{id:'negociacao',label:'Negociação'},
];
function fmtMoeda(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}

export default function Negociacoes(){
  const{notifyError}=useToast();
  const[orcs,setOrcs]=useState([]);
  const[loading,setLoading]=useState(true);

  useEffect(()=>{
    supabase.from('orcamentos').select('*,clientes(nome,empresa)').in('status',['novo_cliente','contato_feito','cotacao','negociacao']).order('updated_at',{ascending:false}).limit(200)
    .then(({data,error})=>{if(error)notifyError(error);else setOrcs(data||[]);setLoading(false);});
  },[]);

  async function avancar(orc){
    const idx=ETAPAS.findIndex(e=>e.id===orc.status);
    if(idx>=ETAPAS.length-1)return;
    const{error}=await supabase.from('orcamentos').update({status:ETAPAS[idx+1].id}).eq('id',orc.id);
    if(error)notifyError(error);
    else{const{data}=await supabase.from('orcamentos').select('*,clientes(nome,empresa)').in('status',['novo_cliente','contato_feito','cotacao','negociacao']).order('updated_at',{ascending:false}).limit(200);setOrcs(data||[]);}
  }

  return(
    <div className="content">
      <div className="page-head"><div><h1>Negociações</h1><p>Oportunidades em andamento</p></div></div>
      <div className="panel">
        {loading?<p className="help-text">Carregando...</p>:orcs.length===0?<div className="empty-state"><h3>Nenhuma negociação em andamento</h3></div>:(
          <table>
            <thead><tr><th>Cliente</th><th>Empresa</th><th>Etapa</th><th>Valor</th><th>Aberto em</th><th></th></tr></thead>
            <tbody>{orcs.map(o=>{
              const et=ETAPAS.find(e=>e.id===o.status);
              return(<tr key={o.id}>
                <td><strong>{o.clientes?.nome||'—'}</strong></td>
                <td style={{color:'var(--muted)',fontSize:11}}>{o.clientes?.empresa||'—'}</td>
                <td><span className="badge" style={{background:'var(--surface-2)',border:'1px solid var(--border)'}}>{et?.label||o.status}</span></td>
                <td style={{fontFamily:'monospace'}}>{fmtMoeda(o.valor_total)}</td>
                <td style={{fontSize:11}}>{o.created_at?.slice(0,10)}</td>
                <td><button className="btn btn-ghost btn-sm" onClick={()=>avancar(o)}>Avançar etapa</button></td>
              </tr>);
            })}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
