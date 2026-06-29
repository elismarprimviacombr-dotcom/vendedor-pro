import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ETAPAS, listarOrcamentos, criarOrcamento, atualizarStatus } from '../services/crmService';
import { listarClientes } from '../services/clientesService';
import { registrarVendaPerdida, listarVendasPerdidas } from '../services/vendasService';
import { numeroOuNull, textoOuNull } from '../utils/form';

function formatarMoeda(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function CRM() {
  const { session } = useAuth();
  const { notify, notifyError } = useToast();
  const location = useLocation();
  const [orcamentos, setOrcamentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [perdidas, setPerdidas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [modalNovo, setModalNovo] = useState(false);
  const [form, setForm] = useState({ cliente_id: '', valor_total: '' });

  const [modalPerda, setModalPerda] = useState(null); // orcamento sendo movido para "perdido"
  const [formPerda, setFormPerda] = useState({ produto: '', valor_estimado: '', motivo: '', concorrente: '' });

  useEffect(() => {
    if (location.state?.abrirNovo) setModalNovo(true);
  }, [location.state]);

  async function carregar() {
    setCarregando(true);
    try {
      const [o, c, p] = await Promise.all([listarOrcamentos(), listarClientes(), listarVendasPerdidas()]);
      setOrcamentos(o);
      setClientes(c);
      setPerdidas(p.slice(0, 6));
    } catch (err) {
      notifyError(err, 'Não foi possível carregar o CRM');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function salvarNovo(e) {
    e.preventDefault();
    if (!form.cliente_id) {
      notify('Selecione um cliente.', 'erro');
      return;
    }
    setSalvando(true);
    try {
      await criarOrcamento({
        cliente_id: form.cliente_id,
        valor_total: numeroOuNull(form.valor_total),
        vendedor_id: session.user.id,
      });
      setModalNovo(false);
      setForm({ cliente_id: '', valor_total: '' });
      notify('Oportunidade criada.');
      carregar();
    } catch (err) {
      notifyError(err, 'Não foi possível criar a oportunidade');
    } finally {
      setSalvando(false);
    }
  }

  async function mudarEtapa(orcamento, novoStatus) {
    if (novoStatus === orcamento.status) return;
    if (novoStatus === 'perdido') {
      setFormPerda({ produto: '', valor_estimado: orcamento.valor_total || '', motivo: '', concorrente: '' });
      setModalPerda(orcamento);
      return;
    }
    try {
      await atualizarStatus(orcamento.id, novoStatus);
      carregar();
    } catch (err) {
      notifyError(err, 'Não foi possível mover a oportunidade');
      carregar(); // garante que a tela volte a refletir o estado real do banco
    }
  }

  async function confirmarPerda(e) {
    e.preventDefault();
    if (!formPerda.motivo) {
      notify('Informe o motivo da perda.', 'erro');
      return;
    }
    setSalvando(true);
    try {
      await registrarVendaPerdida({
        cliente_id: modalPerda.cliente_id,
        orcamento_id: modalPerda.id,
        vendedor_id: session.user.id,
        produto: textoOuNull(formPerda.produto),
        valor_estimado: numeroOuNull(formPerda.valor_estimado),
        motivo: formPerda.motivo,
        concorrente: textoOuNull(formPerda.concorrente),
      });
      await atualizarStatus(modalPerda.id, 'perdido');
      setModalPerda(null);
      notify('Perda registrada.');
      carregar();
    } catch (err) {
      notifyError(err, 'Não foi possível registrar a perda');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>CRM</h1>
          <p>Funil comercial — do primeiro contato até o fechamento</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalNovo(true)}>+ Nova oportunidade</button>
      </div>

      {carregando ? (
        <p className="help-text">Carregando funil...</p>
      ) : (
        <div className="kanban">
          {ETAPAS.map((etapa) => (
            <div className="kcol" key={etapa.id}>
              <div className="kcol-head">
                <span>{etapa.label}</span>
                <span className="mono">{orcamentos.filter((o) => o.status === etapa.id).length}</span>
              </div>
              {orcamentos.filter((o) => o.status === etapa.id).map((o) => (
                <div className="card" key={o.id}>
                  <strong>{o.clientes?.nome || 'Cliente removido'}</strong>
                  <div className="mono" style={{ fontSize: 11.5, color: 'var(--green)', marginTop: 4 }}>
                    {formatarMoeda(o.valor_total)}
                  </div>
                  <select
                    value={o.status}
                    onChange={(e) => mudarEtapa(o, e.target.value)}
                    style={{ marginTop: 8, width: '100%', fontSize: 11.5, padding: 4, background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6 }}
                  >
                    {ETAPAS.map((et) => <option key={et.id} value={et.id}>{et.label}</option>)}
                  </select>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="panel" style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 14.5, marginBottom: 12 }}>Perdas recentes</h2>
        {perdidas.length === 0 ? (
          <p className="help-text">Nenhuma venda perdida registrada ainda.</p>
        ) : (
          <table>
            <thead><tr><th>Cliente</th><th>Produto</th><th>Valor</th><th>Motivo</th><th>Concorrente</th></tr></thead>
            <tbody>
              {perdidas.map((p) => (
                <tr key={p.id}>
                  <td>{p.clientes?.nome || '—'}</td>
                  <td>{p.produto || '—'}</td>
                  <td className="mono">{formatarMoeda(p.valor_estimado)}</td>
                  <td>{p.motivo || '—'}</td>
                  <td>{p.concorrente || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalNovo && (
        <Modal title="Nova oportunidade" onClose={() => setModalNovo(false)}>
          <form onSubmit={salvarNovo}>
            <div className="field">
              <label>Cliente *</label>
              <select required value={form.cliente_id} onChange={(e) => setForm({ ...form, cliente_id: e.target.value })}>
                <option value="">Selecione...</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Valor estimado (R$)</label>
              <input type="number" min="0" value={form.valor_total} onChange={(e) => setForm({ ...form, valor_total: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setModalNovo(false)}>Cancelar</button>
              <button className="btn btn-primary" type="submit" disabled={salvando}>{salvando ? 'Criando...' : 'Criar'}</button>
            </div>
          </form>
        </Modal>
      )}

      {modalPerda && (
        <Modal title={`Registrar perda — ${modalPerda.clientes?.nome || ''}`} onClose={() => setModalPerda(null)}>
          <form onSubmit={confirmarPerda}>
            <div className="field"><label>Produto</label><input value={formPerda.produto} onChange={(e) => setFormPerda({ ...formPerda, produto: e.target.value })} /></div>
            <div className="field"><label>Valor (R$)</label><input type="number" min="0" value={formPerda.valor_estimado} onChange={(e) => setFormPerda({ ...formPerda, valor_estimado: e.target.value })} /></div>
            <div className="field"><label>Motivo *</label><input required placeholder="Ex: preço, prazo, perdeu interesse..." value={formPerda.motivo} onChange={(e) => setFormPerda({ ...formPerda, motivo: e.target.value })} /></div>
            <div className="field"><label>Concorrente</label><input value={formPerda.concorrente} onChange={(e) => setFormPerda({ ...formPerda, concorrente: e.target.value })} /></div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setModalPerda(null)}>Cancelar</button>
              <button className="btn btn-danger" type="submit" disabled={salvando} style={{ borderColor: 'var(--red)' }}>{salvando ? 'Salvando...' : 'Confirmar perda'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
