import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Modal from '../components/Modal';
import { listarVendas, criarVenda } from '../services/vendasService';
import { listarClientes } from '../services/clientesService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { numeroOuNull } from '../utils/form';

const VAZIO = { cliente_id: '', valor_total: '', margem: '', comissao: '', data_venda: new Date().toISOString().slice(0, 10) };

function formatarMoeda(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function Vendas() {
  const { session } = useAuth();
  const { notify, notifyError } = useToast();
  const location = useLocation();
  const [vendas, setVendas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(VAZIO);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (location.state?.abrirNovo) setModalAberto(true);
  }, [location.state]);

  async function carregar() {
    setCarregando(true);
    try {
      const [v, c] = await Promise.all([listarVendas(), listarClientes()]);
      setVendas(v);
      setClientes(c);
    } catch (err) {
      notifyError(err, 'Não foi possível carregar as vendas');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function salvar(e) {
    e.preventDefault();
    if (!form.cliente_id) {
      notify('Selecione um cliente.', 'erro');
      return;
    }
    setSalvando(true);
    try {
      await criarVenda({
        cliente_id: form.cliente_id,
        valor_total: numeroOuNull(form.valor_total),
        margem: numeroOuNull(form.margem),
        comissao: numeroOuNull(form.comissao),
        data_venda: form.data_venda,
        vendedor_id: session.user.id,
        status: 'fechada',
      });
      setModalAberto(false);
      setForm(VAZIO);
      notify('Venda registrada.');
      carregar();
    } catch (err) {
      notifyError(err, 'Não foi possível registrar a venda');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Vendas</h1>
          <p>Histórico de vendas, margem e comissão</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalAberto(true)}>+ Registrar venda</button>
      </div>

      <div className="panel">
        {carregando ? (
          <p className="help-text">Carregando vendas...</p>
        ) : vendas.length === 0 ? (
          <div className="empty-state"><h3>Nenhuma venda registrada ainda</h3></div>
        ) : (
          <table>
            <thead><tr><th>Data</th><th>Cliente</th><th>Valor</th><th>Comissão</th><th>Status</th></tr></thead>
            <tbody>
              {vendas.map((v) => (
                <tr key={v.id}>
                  <td className="mono">{v.data_venda}</td>
                  <td>{v.clientes?.nome || '—'}</td>
                  <td className="mono">{formatarMoeda(v.valor_total)}</td>
                  <td className="mono">{formatarMoeda(v.comissao)}</td>
                  <td>
                    <span className="badge" style={{ background: v.status === 'cancelada' ? '#3a1c1c' : 'var(--green-dim)', color: v.status === 'cancelada' ? 'var(--red)' : 'var(--green)' }}>
                      {v.status === 'cancelada' ? 'Cancelada' : 'Fechada'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalAberto && (
        <Modal title="Registrar venda" onClose={() => setModalAberto(false)}>
          <form onSubmit={salvar}>
            <div className="field">
              <label>Cliente *</label>
              <select required value={form.cliente_id} onChange={(e) => setForm({ ...form, cliente_id: e.target.value })}>
                <option value="">Selecione...</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="field"><label>Valor total (R$)</label><input type="number" min="0" value={form.valor_total} onChange={(e) => setForm({ ...form, valor_total: e.target.value })} /></div>
            <div className="field"><label>Margem (%)</label><input type="number" min="0" max="100" value={form.margem} onChange={(e) => setForm({ ...form, margem: e.target.value })} /></div>
            <div className="field"><label>Comissão (R$)</label><input type="number" min="0" value={form.comissao} onChange={(e) => setForm({ ...form, comissao: e.target.value })} /></div>
            <div className="field"><label>Data</label><input type="date" value={form.data_venda} onChange={(e) => setForm({ ...form, data_venda: e.target.value })} /></div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setModalAberto(false)}>Cancelar</button>
              <button className="btn btn-primary" type="submit" disabled={salvando}>{salvando ? 'Registrando...' : 'Registrar'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
