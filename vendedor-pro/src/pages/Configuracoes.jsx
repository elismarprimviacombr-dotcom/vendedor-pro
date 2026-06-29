import React, { useEffect, useState } from 'react';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { listarUsuarios, atualizarNome, atualizarPapel, criarUsuario } from '../services/usuariosService';

const USUARIO_VAZIO = { nome: '', email: '', senha: '', papel: 'vendedor' };

export default function Configuracoes() {
  const { perfil, isAdmin } = useAuth();
  const { notify, notifyError } = useToast();
  const [nome, setNome] = useState(perfil?.nome || '');
  const [usuarios, setUsuarios] = useState([]);
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);

  const [modalNovo, setModalNovo] = useState(false);
  const [formUsuario, setFormUsuario] = useState(USUARIO_VAZIO);
  const [criando, setCriando] = useState(false);

  async function carregarUsuarios() {
    try {
      setUsuarios(await listarUsuarios());
    } catch (err) {
      notifyError(err, 'Não foi possível carregar os usuários');
    }
  }

  useEffect(() => {
    if (isAdmin) carregarUsuarios();
  }, [isAdmin]);

  async function salvarPerfil(e) {
    e.preventDefault();
    if (!perfil) return;
    setSalvandoPerfil(true);
    try {
      await atualizarNome(perfil.id, nome);
      notify('Nome atualizado.');
    } catch (err) {
      notifyError(err, 'Não foi possível atualizar seu nome');
    } finally {
      setSalvandoPerfil(false);
    }
  }

  async function mudarPapel(usuario, papel) {
    try {
      await atualizarPapel(usuario.id, papel);
      notify('Papel atualizado.');
      carregarUsuarios();
    } catch (err) {
      // O banco bloqueia remover o último administrador — essa mensagem
      // chega exatamente assim quando isso acontece.
      notifyError(err, 'Não foi possível atualizar o papel');
      carregarUsuarios(); // garante que o select volte a refletir o valor real
    }
  }

  async function salvarNovoUsuario(e) {
    e.preventDefault();
    setCriando(true);
    try {
      await criarUsuario(formUsuario);
      notify(`Usuário ${formUsuario.nome} criado. Avise a senha por um canal seguro.`);
      setModalNovo(false);
      setFormUsuario(USUARIO_VAZIO);
      carregarUsuarios();
    } catch (err) {
      notifyError(err, 'Não foi possível criar o usuário');
    } finally {
      setCriando(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Configurações</h1>
          <p>Sua conta e, se você for administrador, o time</p>
        </div>
      </div>

      <div className="panel" style={{ maxWidth: 420, marginBottom: 16 }}>
        <h2 style={{ fontSize: 14.5, marginBottom: 12 }}>Minha conta</h2>
        <form onSubmit={salvarPerfil}>
          <div className="field"><label>Nome</label><input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
          <button className="btn btn-primary" type="submit" disabled={salvandoPerfil}>{salvandoPerfil ? 'Salvando...' : 'Salvar'}</button>
        </form>
        <p className="help-text" style={{ marginTop: 12 }}>
          Para trocar de senha, use o link "Esqueci minha senha" na tela de login.
        </p>
      </div>

      {isAdmin && (
        <div className="panel">
          <div className="page-head" style={{ marginBottom: 12 }}>
            <h2 style={{ fontSize: 14.5 }}>Usuários</h2>
            <button className="btn btn-primary btn-sm" onClick={() => setModalNovo(true)}>+ Novo usuário</button>
          </div>
          <table>
            <thead><tr><th>Nome</th><th>Papel</th></tr></thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td>{u.nome}</td>
                  <td>
                    <select value={u.papel} onChange={(e) => mudarPapel(u, e.target.value)}>
                      <option value="vendedor">Vendedor</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="help-text" style={{ marginTop: 12 }}>
            O sistema não deixa remover o papel de administrador da última pessoa que tiver esse acesso — sempre vai
            sobrar pelo menos um admin.
          </p>
        </div>
      )}

      {modalNovo && (
        <Modal title="Novo usuário" onClose={() => setModalNovo(false)}>
          <form onSubmit={salvarNovoUsuario}>
            <div className="field"><label>Nome *</label><input required value={formUsuario.nome} onChange={(e) => setFormUsuario({ ...formUsuario, nome: e.target.value })} /></div>
            <div className="field"><label>E-mail *</label><input type="email" required value={formUsuario.email} onChange={(e) => setFormUsuario({ ...formUsuario, email: e.target.value })} /></div>
            <div className="field"><label>Senha provisória *</label><input type="text" required minLength={6} value={formUsuario.senha} onChange={(e) => setFormUsuario({ ...formUsuario, senha: e.target.value })} /></div>
            <div className="field">
              <label>Papel</label>
              <select value={formUsuario.papel} onChange={(e) => setFormUsuario({ ...formUsuario, papel: e.target.value })}>
                <option value="vendedor">Vendedor</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <p className="help-text">A pessoa já pode entrar com esse e-mail e senha. Avise por um canal seguro (não por aqui).</p>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setModalNovo(false)}>Cancelar</button>
              <button className="btn btn-primary" type="submit" disabled={criando}>{criando ? 'Criando...' : 'Criar usuário'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
