import React,{useEffect,useState}from'react';
import{useToast}from'../context/ToastContext';
import{supabase}from'../services/supabaseClient';
import*as XLSX from'xlsx';

function fmtMoeda(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}

function exportarExcel(nome,abas){
  const wb=XLSX.utils.book_new();
  abas.forEach(({nomeAba,linhas})=>XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(linhas.length?linhas:[{}]),nomeAba.slice(0,31)));
  XLSX.writeFile(wb,nome);
}

export default function Relatorios(){
  const{notifyError}=useToast();
  const[dados,setDados]=useState({clientes:[],vendas:[],orcs:[],perdidas:[]});

  useEffect(()=>{
    Promise.all([
      supabase.from('clientes').select('*').limit(1000),
      supabase.from('vendas').select('*,clientes(nome)').limit(1000),
      supabase.from('orcamentos').select('*,clientes(nome)').limit(500),
      supabase.from('vendas_perdidas').select('*,clientes(nome)').limit(500),
    ]).then(([r1,r2,r3,r4])=>{
      setDados({clientes:r1.data||[],vendas:r2.data||[],orcs:r3.data||[],perdidas:r4.data||[]});
    }).catch(err=>notifyError(err));
  },[]);

  const vendFechadas=dados.vendas.filter(v=>v.status==='fechada');
  const totalVendido=vendFechadas.reduce((s,v)=>s+Number(v.valor_total||0),0);
  const totalComissao=vendFechadas.reduce((s,v)=>s+Number(v.comissao||0),0);
  const totalPerdido=dados.perdidas.reduce((s,p)=>s+Number(p.valor_estimado||0),0);

  return(
    <div className="content">
      <div className="page-head">
        <div><h1>Relatórios</h1><p>Resumo geral do desempenho</p></div>
        <button className="btn btn-primary" onClick={()=>exportarExcel('vendedor-pro.xlsx',[
          {nomeAba:'Clientes',linhas:dados.clientes.map(c=>({Nome:c.nome,Empresa:c.empresa,Cidade:c.cidade,Telefone:c.telefone}))},
          {nomeAba:'Vendas',linhas:dados.vendas.map(v=>({Data:v.data_venda,Cliente:v.clientes?.nome,Valor:v.valor_total,Margem:v.margem,Comissão:v.comissao,Status:v.status}))},
          {nomeAba:'Perdas',linhas:dados.perdidas.map(p=>({Data:p.data_perda,Cliente:p.clientes?.nome,Produto:p.produto,Valor:p.valor_estimado,Motivo:p.motivo,Concorrente:p.concorrente}))},
        ])}>Exportar tudo (Excel)</button>
      </div>

      <div className="stats-grid" style={{gridTemplateColumns:'repeat(4,1fr)',marginBottom:20}}>
        <div className="stat-card"><div className="stat-label">Total de clientes</div><div className="stat-value">{dados.clientes.length}</div></div>
        <div className="stat-card"><div className="stat-label">Oportunidades no funil</div><div className="stat-value">{dados.orcs.length}</div></div>
        <div className="stat-card"><div className="stat-label">Total vendido (fechadas)</div><div className="stat-value" style={{fontSize:16}}>{fmtMoeda(totalVendido)}</div></div>
        <div className="stat-card"><div className="stat-label">Total perdido</div><div className="stat-value" style={{fontSize:16,color:'var(--red)'}}>{fmtMoeda(totalPerdido)}</div></div>
      </div>

      <div className="panel">
        <div className="panel-head"><h2>Exportar separado</h2></div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          <button className="btn btn-ghost" onClick={()=>exportarExcel('clientes.xlsx',[{nomeAba:'Clientes',linhas:dados.clientes}])}>Clientes</button>
          <button className="btn btn-ghost" onClick={()=>exportarExcel('vendas.xlsx',[{nomeAba:'Vendas',linhas:dados.vendas}])}>Vendas</button>
          <button className="btn btn-ghost" onClick={()=>exportarExcel('perdas.xlsx',[{nomeAba:'Perdas',linhas:dados.perdidas}])}>Vendas perdidas</button>
        </div>
        <p className="help-text" style={{marginTop:12}}>Comissão acumulada: <strong>{fmtMoeda(totalComissao)}</strong></p>
      </div>
    </div>
  );
}
