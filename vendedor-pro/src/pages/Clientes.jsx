import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { listarClientes, criarCliente, atualizarCliente, excluirCliente } from '../services/clientesService';

const CLIENTE_VAZIO = {
  nome: '', empresa: '', telefone: '', whatsapp: '', cidade: '', segmento: '',
  observacoes: '', proxima_acao_data: '', proxima_acao_nota: '',
};

export default function Clientes() {
  const { session, isAdmin } = useAuth();
  const { notify, notifyError } = useToast();
  const location = useLocation();
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(CLIENTE_VAZIO);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  useEffect(() => {
    if (location.state?.abrirNovo) abrirNovo();
  }, [location.state]);

  async function carregar() {
    setCarregando(true);
    try {
      const dados = await listarClientes();
      setClientes(dados);
    } catch (err) {
      notifyError(err, 'Não foi possível carregar os clientes');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function abrirNovo() {
    setEditando(null);
    setForm(CLIENTE_VAZIO);
    setConfirmandoExclusao(false);
    setModalAberto(true);
  }

  function abrirEdicao(cliente) {
    setEditando(cliente);
    setForm({ ...CLIENTE_VAZIO, ...cliente });
    setConfirmandoExclusao(false);
    setModalAberto(true);
  }

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    try {
      if (editando) {
        await atualizarCliente(editando.id, form);
        notify('Cliente atualizado.');
      } else {
        await criarCliente({ ...form, criado_por: session.user.id, responsavel_id: session.user.id });
        notify('Cliente cadastrado.');
      }
      setModalAberto(false);
      carregar();
    } catch (err) {
      notifyError(err, 'Não foi possível salvar o cliente');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    try {
      await excluirCliente(editando.id);
      notify('Cliente excluído.');
      setModalAberto(false);
      setConfirmandoExclusao(false);
      carregar();
    } catch (err) {
      notifyError(err, 'Não foi possível excluir o cliente');
    }
  }

  const filtrados = clientes.filter((c) => {
    const q = busca.toLowerCase();
    return !q || c.nome.toLowerCase().includes(q) || (c.empresa || '').toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Clientes</h1>
          <p>{clientes.length} clientes cadastrados</p>
        </div>
        <button className="btn btn-primary" onClick={abrirNovo}>+ Novo cliente</button>
      </div>

      <div className="field" style={{ maxWidth: 320, marginBottom: 14 }}>
        <input placeholder="Buscar por nome ou empresa" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      <div className="panel">
        {carregando ? (
          <p className="help-text">Carregando...</p>
        ) : filtrados.length === 0 ? (
          <div className="empty-state"><h3>Nenhum cliente encontrado</h3></div>
        ) : (
          <table>
            <thead>
              <tr><th>Nome</th><th>Cidade</th><th>Telefone</th><th>Próxima ação</th></tr>
            </thead>
            <tbody>
              {filtrados.map((c) => (
                <tr key={c.id} className="clickable" onClick={() => abrirEdicao(c)}>
                  <td><strong>{c.nome}</strong><br /><span style={{ color: 'var(--muted)', fontSize: 11 }}>{c.empresa}</span></td>
                  <td>{c.cidade || '—'}</td>
                  <td className="mono">{c.telefone || c.whatsapp || '—'}</td>
                  <td className="mono">
                    {c.proxima_acao_data || '—'}
                    {c.proxima_acao_nota ? <div style={{ color: 'var(--muted)', fontSize: 10.5 }}>{c.proxima_acao_nota}</div> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalAberto && (
        <Modal title={editando ? 'Editar cliente' : 'Novo cliente'} onClose={() => setModalAberto(false)}>
          <form onSubmit={salvar}>
            <div className="field"><label>Nome *</label><input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div className="field"><label>Empresa</label><input value={form.empresa || ''} onChange={(e) => setForm({ ...form, empresa: e.target.value })} /></div>
            <div className="field"><label>Telefone</label><input value={form.telefone || ''} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
            <div className="field"><label>Cidade</label><input value={form.cidade || ''} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></div>
            <div className="field"><label>Próxima ação em</label><input type="date" value={form.proxima_acao_data || ''} onChange={(e) => setForm({ ...form, proxima_acao_data: e.target.value })} /></div>
            <div className="field"><label>Nota da próxima ação</label><input placeholder="Ex: ligar, enviar proposta..." value={form.proxima_acao_nota || ''} onChange={(e) => setForm({ ...form, proxima_acao_nota: e.target.value })} /></div>
            <div className="field"><label>Observações</label><textarea value={form.observacoes || ''} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>

            {confirmandoExclusao && (
              <div style={{ background: '#3a1c1c', border: '1px solid var(--red)', borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 12.5 }}>
                <strong style={{ color: 'var(--red)' }}>Tem certeza?</strong> Isso vai excluir <strong>permanentemente</strong> este
                cliente <strong>e todo o histórico ligado a ele</strong>: vendas, oportunidades, tarefas e anotações. Não tem como desfazer.
              </div>
            )}

            <div className="modal-actions">
              <div style={{ marginRight: 'auto' }}>
                {editando && isAdmin && !confirmandoExclusao && (
                  <button type="button" className="btn btn-danger" onClick={() => setConfirmandoExclusao(true)}>Excluir</button>
                )}
                {editando && isAdmin && confirmandoExclusao && (
                  <button type="button" className="btn btn-danger" onClick={excluir}>Sim, excluir tudo</button>
                )}
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => setModalAberto(false)}>Cancelar</button>
              <button className="btn btn-primary" type="submit" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
