import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Modal from '../components/Modal';
import { listarTarefas, criarTarefa, alternarConcluida } from '../services/tarefasService';
import { listarClientes } from '../services/clientesService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Agenda() {
  const { session } = useAuth();
  const { notify, notifyError } = useToast();
  const location = useLocation();
  const [tarefas, setTarefas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState({ titulo: '', data: new Date().toISOString().slice(0, 10), hora: '', cliente_id: '' });
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (location.state?.abrirNovo) setModalAberto(true);
  }, [location.state]);

  async function carregar() {
    setCarregando(true);
    try {
      const [t, c] = await Promise.all([listarTarefas(), listarClientes()]);
      setTarefas(t);
      setClientes(c);
    } catch (err) {
      notifyError(err, 'Não foi possível carregar a agenda');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function salvar(e) {
    e.preventDefault();
    if (!form.titulo.trim()) {
      notify('Informe o título da tarefa.', 'erro');
      return;
    }
    setSalvando(true);
    try {
      await criarTarefa({ ...form, cliente_id: form.cliente_id || null, responsavel_id: session.user.id });
      setModalAberto(false);
      setForm({ titulo: '', data: new Date().toISOString().slice(0, 10), hora: '', cliente_id: '' });
      notify('Tarefa adicionada.');
      carregar();
    } catch (err) {
      notifyError(err, 'Não foi possível salvar a tarefa');
    } finally {
      setSalvando(false);
    }
  }

  async function toggle(t) {
    try {
      await alternarConcluida(t.id, !t.concluida);
      carregar();
    } catch (err) {
      notifyError(err, 'Não foi possível atualizar a tarefa');
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Agenda</h1>
          <p>Tarefas, lembretes e retornos</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalAberto(true)}>+ Nova tarefa</button>
      </div>

      <div className="panel">
        {carregando ? (
          <p className="help-text">Carregando agenda...</p>
        ) : tarefas.length === 0 ? (
          <div className="empty-state"><h3>Nenhuma tarefa cadastrada</h3></div>
        ) : (
          tarefas.map((t) => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
              <input type="checkbox" checked={t.concluida} onChange={() => toggle(t)} />
              <div style={{ flex: 1, textDecoration: t.concluida ? 'line-through' : 'none', color: t.concluida ? 'var(--muted)' : 'var(--text)' }}>
                {t.titulo} {t.clientes?.nome ? `— ${t.clientes.nome}` : ''}
              </div>
              <div className="mono" style={{ fontSize: 11.5, color: 'var(--muted)' }}>{t.data} {t.hora || ''}</div>
            </div>
          ))
        )}
      </div>

      {modalAberto && (
        <Modal title="Nova tarefa" onClose={() => setModalAberto(false)}>
          <form onSubmit={salvar}>
            <div className="field"><label>Título *</label><input required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
            <div className="field"><label>Data</label><input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
            <div className="field"><label>Hora</label><input type="time" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} /></div>
            <div className="field">
              <label>Cliente (opcional)</label>
              <select value={form.cliente_id} onChange={(e) => setForm({ ...form, cliente_id: e.target.value })}>
                <option value="">Nenhum</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setModalAberto(false)}>Cancelar</button>
              <button className="btn btn-primary" type="submit" disabled={salvando}>{salvando ? 'Adicionando...' : 'Adicionar'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
