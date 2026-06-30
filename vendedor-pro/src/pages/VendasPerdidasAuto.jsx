import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../services/supabaseClient';
import * as XLSX from 'xlsx';

const MOTIVOS = ['Sem estoque','Preço alto','Comprou em outro lugar','Falta de prazo','Cliente desistiu','Outro'];
const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
const FORM_VAZIO = { codigo_produto:'', descricao_produto:'', estado:'', quantidade:'1', cliente:'', telefone:'', motivo:'Sem estoque', observacao:'' };

function fmtData(d){ if(!d) return '—'; return new Date(d+'T00:00:00').toLocaleDateString('pt-BR'); }

export default function VendasPerdidasAuto() {
  const { session } = useAuth();
  const { notify, notifyError } = useToast();
  const [lista, setLista] = useState([]);
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filtroCodigo, setFiltroCodigo] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroMotivo, setFiltroMotivo] = useState('');
  const [filtroDe, setFiltroDe] = useState('');
  const [filtroAte, setFiltroAte] = useState('');
  const fileRef = useRef();

  async function carregar() {
    setLoading(true);
    let q = supabase.from('vendas_perdidas_autopecas').select('*').order('created_at',{ascending:false}).limit(1000);
    const { data, error } = await q;
    if (error) notifyError(error); else setLista(data||[]);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  async function salvar(e) {
    e.preventDefault();
    if (!form.codigo_produto.trim()) { notify('Informe o código do produto.','erro'); return; }
    setSalvando(true);
    const { error } = await supabase.from('vendas_perdidas_autopecas').insert({
      ...form,
      quantidade: Number(form.quantidade)||1,
      data: new Date().toISOString().slice(0,10),
      usuario_id: session.user.id,
    });
    if (error) notifyError(error,'Erro ao salvar');
    else { notify('Venda perdida registrada!'); setForm(FORM_VAZIO); carregar(); }
    setSalvando(false);
  }

  function exportar() {
    const linhas = filtrados.map(r=>({
      Data: r.data, Código: r.codigo_produto, Descrição: r.descricao_produto,
      Estado: r.estado, Qtd: r.quantidade, Cliente: r.cliente, Telefone: r.telefone,
      Motivo: r.motivo, Observação: r.observacao,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(linhas.length?linhas:[{}]), 'Vendas Perdidas');
    XLSX.writeFile(wb, 'vendas-perdidas-autopecas.xlsx');
  }

  function importar(e) {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const wb = XLSX.read(ev.target.result, {type:'binary'});
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      let ok=0;
      for (const r of rows) {
        const { error } = await supabase.from('vendas_perdidas_autopecas').insert({
          data: r.Data||new Date().toISOString().slice(0,10),
          codigo_produto: String(r.Código||r.codigo_produto||''),
          descricao_produto: r.Descrição||r.descricao_produto||'',
          estado: r.Estado||r.estado||'',
          quantidade: Number(r.Qtd||r.quantidade||1),
          cliente: r.Cliente||r.cliente||'',
          telefone: r.Telefone||r.telefone||'',
          motivo: r.Motivo||r.motivo||'Sem estoque',
          observacao: r.Observação||r.observacao||'',
          usuario_id: session.user.id,
        });
        if (!error) ok++;
      }
      notify(`${ok} registros importados.`); carregar();
    };
    reader.readAsBinaryString(file);
    e.target.value='';
  }

  const filtrados = lista.filter(r => {
    if (filtroCodigo && !r.codigo_produto?.toLowerCase().includes(filtroCodigo.toLowerCase())) return false;
    if (filtroEstado && r.estado !== filtroEstado) return false;
    if (filtroMotivo && r.motivo !== filtroMotivo) return false;
    if (filtroDe && r.data < filtroDe) return false;
    if (filtroAte && r.data > filtroAte) return false;
    return true;
  });

  // Relatórios
  const porCodigo = {};
  filtrados.forEach(r => { porCodigo[r.codigo_produto] = (porCodigo[r.codigo_produto]||0) + Number(r.quantidade||1); });
  const topProdutos = Object.entries(porCodigo).sort((a,b)=>b[1]-a[1]).slice(0,5);

  const porEstado = {};
  filtrados.forEach(r => { if(r.estado) porEstado[r.estado] = (porEstado[r.estado]||0) + 1; });
  const topEstados = Object.entries(porEstado).sort((a,b)=>b[1]-a[1]).slice(0,5);

  const porMotivo = {};
  filtrados.forEach(r => { porMotivo[r.motivo] = (porMotivo[r.motivo]||0) + 1; });

  return (
    <div className="content">
      <div className="page-head">
        <div><h1>Vendas Perdidas — Autopeças</h1><p>Registre rapidamente oportunidades que não viraram venda</p></div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-ghost" onClick={exportar}>Exportar Excel</button>
          <button className="btn btn-ghost" onClick={()=>fileRef.current.click()}>Importar Excel</button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{display:'none'}} onChange={importar}/>
        </div>
      </div>

      {/* Formulário rápido */}
      <div className="panel" style={{marginBottom:14}}>
        <div className="panel-head"><h2>Registro rápido</h2></div>
        <form onSubmit={salvar}>
          <div className="row3">
            <div className="field"><label>Código do produto *</label><input value={form.codigo_produto} onChange={e=>setForm({...form,codigo_produto:e.target.value})} placeholder="Ex: 12345"/></div>
            <div className="field"><label>Descrição</label><input value={form.descricao_produto} onChange={e=>setForm({...form,descricao_produto:e.target.value})} placeholder="Ex: Pastilha de freio dianteira"/></div>
            <div className="field"><label>Motivo *</label>
              <select value={form.motivo} onChange={e=>setForm({...form,motivo:e.target.value})}>
                {MOTIVOS.map(m=><option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="row3">
            <div className="field"><label>Estado/UF</label>
              <select value={form.estado} onChange={e=>setForm({...form,estado:e.target.value})}>
                <option value="">Selecione...</option>
                {ESTADOS.map(uf=><option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
            <div className="field"><label>Quantidade</label><input type="number" min="1" value={form.quantidade} onChange={e=>setForm({...form,quantidade:e.target.value})}/></div>
            <div className="field"><label>Cliente (opcional)</label><input value={form.cliente} onChange={e=>setForm({...form,cliente:e.target.value})}/></div>
          </div>
          <div className="row2">
            <div className="field"><label>Telefone (opcional)</label><input value={form.telefone} onChange={e=>setForm({...form,telefone:e.target.value})}/></div>
            <div className="field"><label>Observação</label><input value={form.observacao} onChange={e=>setForm({...form,observacao:e.target.value})}/></div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={salvando} style={{minWidth:140}}>
            {salvando ? 'Salvando...' : '⚡ Salvar rápido'}
          </button>
        </form>
      </div>

      {/* Relatórios */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:14}}>
        <div className="panel">
          <div className="panel-head"><h2>Top produtos perdidos</h2></div>
          {topProdutos.length===0?<p className="help-text">Sem dados.</p>:topProdutos.map(([cod,qtd])=>(
            <div key={cod} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--border)',fontSize:12}}>
              <span style={{fontFamily:'monospace'}}>{cod}</span><strong>{qtd}x</strong>
            </div>
          ))}
        </div>
        <div className="panel">
          <div className="panel-head"><h2>Estados com mais perdas</h2></div>
          {topEstados.length===0?<p className="help-text">Sem dados.</p>:topEstados.map(([uf,n])=>(
            <div key={uf} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--border)',fontSize:12}}>
              <span><strong>{uf}</strong></span><span>{n} perdas</span>
            </div>
          ))}
        </div>
        <div className="panel">
          <div className="panel-head"><h2>Perdas por motivo</h2></div>
          {Object.keys(porMotivo).length===0?<p className="help-text">Sem dados.</p>:Object.entries(porMotivo).sort((a,b)=>b[1]-a[1]).map(([m,n])=>(
            <div key={m} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--border)',fontSize:12}}>
              <span>{m}</span><strong>{n}</strong>
            </div>
          ))}
        </div>
      </div>

      {/* Filtros + lista */}
      <div className="panel">
        <div className="panel-head"><h2>Registros ({filtrados.length})</h2></div>
        <div className="filters" style={{marginBottom:12}}>
          <input placeholder="Buscar código" value={filtroCodigo} onChange={e=>setFiltroCodigo(e.target.value)} style={{width:150}}/>
          <select value={filtroEstado} onChange={e=>setFiltroEstado(e.target.value)}>
            <option value="">Todos os estados</option>
            {ESTADOS.map(uf=><option key={uf} value={uf}>{uf}</option>)}
          </select>
          <select value={filtroMotivo} onChange={e=>setFiltroMotivo(e.target.value)}>
            <option value="">Todos os motivos</option>
            {MOTIVOS.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
          <input type="date" value={filtroDe} onChange={e=>setFiltroDe(e.target.value)} title="De"/>
          <input type="date" value={filtroAte} onChange={e=>setFiltroAte(e.target.value)} title="Até"/>
        </div>
        {loading?<p className="help-text">Carregando...</p>:filtrados.length===0?<div className="empty-state"><h3>Nenhum registro encontrado</h3></div>:(
          <table>
            <thead><tr><th>Data</th><th>Código</th><th>Descrição</th><th>UF</th><th>Qtd</th><th>Motivo</th><th>Cliente</th></tr></thead>
            <tbody>{filtrados.map(r=>(
              <tr key={r.id}>
                <td style={{fontFamily:'monospace',fontSize:11}}>{fmtData(r.data)}</td>
                <td style={{fontFamily:'monospace',fontWeight:700}}>{r.codigo_produto}</td>
                <td>{r.descricao_produto||'—'}</td>
                <td><span className="badge" style={{background:'var(--surface-2)',border:'1px solid var(--border)'}}>{r.estado||'—'}</span></td>
                <td style={{fontFamily:'monospace'}}>{r.quantidade}</td>
                <td><span className="badge" style={{background:r.motivo==='Sem estoque'?'#3a1c1c':r.motivo==='Preço alto'?'#3a2a0a':'var(--surface-2)',color:r.motivo==='Sem estoque'?'var(--red)':r.motivo==='Preço alto'?'var(--gold)':'var(--text)'}}>{r.motivo}</span></td>
                <td style={{fontSize:11}}>{r.cliente||'—'}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
