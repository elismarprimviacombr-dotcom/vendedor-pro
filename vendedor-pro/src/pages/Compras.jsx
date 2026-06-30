import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../services/supabaseClient';
import * as XLSX from 'xlsx';

const FORM_VAZIO = { codigo_produto:'', descricao:'', fornecedor:'', custo_unitario:'', quantidade:'1' };

function fmtMoeda(v){ return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
function fmtData(d){ if(!d) return '—'; return new Date(d+'T00:00:00').toLocaleDateString('pt-BR'); }

export default function Compras() {
  const { session } = useAuth();
  const { notify, notifyError } = useToast();
  const [lista, setLista] = useState([]);
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filtroCodigo, setFiltroCodigo] = useState('');
  const [historicoCodigo, setHistoricoCodigo] = useState(null);
  const fileRef = useRef();

  async function carregar() {
    setLoading(true);
    const { data, error } = await supabase.from('compras_historico').select('*').order('created_at',{ascending:false}).limit(1000);
    if (error) notifyError(error); else setLista(data||[]);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  async function salvar(e) {
    e.preventDefault();
    if (!form.codigo_produto.trim()) { notify('Informe o código do produto.','erro'); return; }
    setSalvando(true);
    const { error } = await supabase.from('compras_historico').insert({
      codigo_produto: form.codigo_produto.trim(),
      descricao: form.descricao||null,
      fornecedor: form.fornecedor||null,
      custo_unitario: Number(form.custo_unitario)||0,
      quantidade: Number(form.quantidade)||1,
      data: new Date().toISOString().slice(0,10),
      usuario_id: session.user.id,
    });
    if (error) notifyError(error,'Erro ao registrar compra');
    else { notify('Compra registrada!'); setForm(FORM_VAZIO); carregar(); }
    setSalvando(false);
  }

  function calcularCustoMedio(codigo) {
    const compras = lista.filter(c => c.codigo_produto === codigo);
    if (!compras.length) return 0;
    const totalQtd = compras.reduce((s,c)=>s+Number(c.quantidade||1),0);
    const totalCusto = compras.reduce((s,c)=>s+(Number(c.custo_unitario||0)*Number(c.quantidade||1)),0);
    return totalQtd ? totalCusto/totalQtd : 0;
  }

  function verHistorico(codigo) {
    setHistoricoCodigo(historicoCodigo===codigo ? null : codigo);
  }

  function exportar() {
    const linhas = filtrados.map(r=>({
      Data: r.data, Código: r.codigo_produto, Descrição: r.descricao,
      Fornecedor: r.fornecedor, 'Custo Unit.': r.custo_unitario,
      Quantidade: r.quantidade, 'Custo Total': r.custo_total,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(linhas.length?linhas:[{}]), 'Compras');
    XLSX.writeFile(wb, 'historico-compras.xlsx');
  }

  function importar(e) {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const wb = XLSX.read(ev.target.result,{type:'binary'});
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      let ok=0;
      for (const r of rows) {
        const { error } = await supabase.from('compras_historico').insert({
          codigo_produto: String(r.Código||r.codigo_produto||''),
          descricao: r.Descrição||r.descricao||'',
          fornecedor: r.Fornecedor||r.fornecedor||'',
          custo_unitario: Number(r['Custo Unit.']||r.custo_unitario||0),
          quantidade: Number(r.Quantidade||r.quantidade||1),
          data: r.Data||new Date().toISOString().slice(0,10),
          usuario_id: session.user.id,
        });
        if (!error) ok++;
      }
      notify(`${ok} registros importados.`); carregar();
    };
    reader.readAsBinaryString(file);
    e.target.value='';
  }

  const filtrados = lista.filter(r => !filtroCodigo || r.codigo_produto?.toLowerCase().includes(filtroCodigo.toLowerCase()));

  // Agrupado por código para comparativo
  const codigos = [...new Set(lista.map(c=>c.codigo_produto))];

  return (
    <div className="content">
      <div className="page-head">
        <div><h1>Compras / Histórico de Custo</h1><p>Controle de custos e custo médio automático</p></div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-ghost" onClick={exportar}>Exportar Excel</button>
          <button className="btn btn-ghost" onClick={()=>fileRef.current.click()}>Importar Excel</button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{display:'none'}} onChange={importar}/>
        </div>
      </div>

      {/* Formulário */}
      <div className="panel" style={{marginBottom:14}}>
        <div className="panel-head"><h2>Registrar compra</h2></div>
        <form onSubmit={salvar}>
          <div className="row3">
            <div className="field"><label>Código do produto *</label><input value={form.codigo_produto} onChange={e=>setForm({...form,codigo_produto:e.target.value})} placeholder="Ex: 98765"/></div>
            <div className="field"><label>Descrição</label><input value={form.descricao} onChange={e=>setForm({...form,descricao:e.target.value})}/></div>
            <div className="field"><label>Fornecedor</label><input value={form.fornecedor} onChange={e=>setForm({...form,fornecedor:e.target.value})}/></div>
          </div>
          <div className="row2">
            <div className="field"><label>Custo unitário (R$) *</label><input type="number" min="0" step="0.0001" value={form.custo_unitario} onChange={e=>setForm({...form,custo_unitario:e.target.value})}/></div>
            <div className="field"><label>Quantidade</label><input type="number" min="1" value={form.quantidade} onChange={e=>setForm({...form,quantidade:e.target.value})}/></div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={salvando}>{salvando?'Salvando...':'Registrar compra'}</button>
        </form>
      </div>

      {/* Comparativo de preços por código */}
      <div className="panel" style={{marginBottom:14}}>
        <div className="panel-head"><h2>Comparativo de preços por produto</h2></div>
        {codigos.length===0?<p className="help-text">Nenhuma compra registrada ainda.</p>:(
          <table>
            <thead><tr><th>Código</th><th>Descrição</th><th>Último custo</th><th>Custo médio</th><th>Compras</th><th></th></tr></thead>
            <tbody>{codigos.map(cod=>{
              const comprasDoCod = lista.filter(c=>c.codigo_produto===cod);
              const ultima = comprasDoCod[0];
              const media = calcularCustoMedio(cod);
              return (
                <React.Fragment key={cod}>
                  <tr className="clickable" onClick={()=>verHistorico(cod)}>
                    <td style={{fontFamily:'monospace',fontWeight:700}}>{cod}</td>
                    <td>{ultima?.descricao||'—'}</td>
                    <td style={{fontFamily:'monospace'}}>{fmtMoeda(ultima?.custo_unitario)}</td>
                    <td style={{fontFamily:'monospace',color:'var(--green-light)'}}>{fmtMoeda(media)}</td>
                    <td style={{fontFamily:'monospace'}}>{comprasDoCod.length}x</td>
                    <td style={{fontSize:11,color:'var(--blue)'}}>{historicoCodigo===cod?'▲ fechar':'▼ histórico'}</td>
                  </tr>
                  {historicoCodigo===cod && comprasDoCod.map(c=>(
                    <tr key={c.id} style={{background:'var(--surface-2)'}}>
                      <td></td>
                      <td style={{fontSize:11}}>{fmtData(c.data)} — {c.fornecedor||'sem fornecedor'}</td>
                      <td style={{fontFamily:'monospace',fontSize:11}}>{fmtMoeda(c.custo_unitario)}</td>
                      <td style={{fontSize:11,color:'var(--muted)'}}>qtd: {c.quantidade}</td>
                      <td></td><td></td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}</tbody>
          </table>
        )}
      </div>

      {/* Histórico completo */}
      <div className="panel">
        <div className="panel-head">
          <h2>Histórico completo</h2>
          <input placeholder="Filtrar por código" value={filtroCodigo} onChange={e=>setFiltroCodigo(e.target.value)} style={{padding:'5px 10px',border:'1px solid var(--border)',borderRadius:6,background:'var(--bg)',color:'var(--text)',fontSize:12,width:180}}/>
        </div>
        {loading?<p className="help-text">Carregando...</p>:filtrados.length===0?<div className="empty-state"><h3>Nenhum registro</h3></div>:(
          <table>
            <thead><tr><th>Data</th><th>Código</th><th>Descrição</th><th>Fornecedor</th><th>Custo unit.</th><th>Qtd</th><th>Total</th></tr></thead>
            <tbody>{filtrados.map(r=>(
              <tr key={r.id}>
                <td style={{fontFamily:'monospace',fontSize:11}}>{fmtData(r.data)}</td>
                <td style={{fontFamily:'monospace',fontWeight:700}}>{r.codigo_produto}</td>
                <td>{r.descricao||'—'}</td>
                <td>{r.fornecedor||'—'}</td>
                <td style={{fontFamily:'monospace'}}>{fmtMoeda(r.custo_unitario)}</td>
                <td style={{fontFamily:'monospace'}}>{r.quantidade}</td>
                <td style={{fontFamily:'monospace',color:'var(--green-light)'}}>{fmtMoeda(r.custo_total)}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
