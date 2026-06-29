import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn, resetPasswordForEmail } from '../services/authService';

function mensagemDeErro(err) {
  const msg = err?.message || '';
  if (msg.toLowerCase().includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (msg.toLowerCase().includes('email not confirmed')) return 'Esse e-mail ainda não foi confirmado.';
  if (msg.toLowerCase().includes('rate limit')) return 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.';
  if (msg) return msg;
  return 'Não foi possível entrar agora. Tente de novo em alguns instantes.';
}

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      await signIn(email, senha);
      navigate('/dashboard');
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setCarregando(false);
    }
  }

  async function handleEsqueciSenha() {
    if (!email) {
      setErro('Digite seu e-mail acima primeiro, depois clique em "Esqueci minha senha".');
      return;
    }
    try {
      await resetPasswordForEmail(email);
      setErro('');
      alert('Se esse e-mail estiver cadastrado, enviamos um link de redefinição de senha para ele.');
    } catch (err) {
      setErro(mensagemDeErro(err));
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 22 }}>
            VENDEDOR <span style={{ color: 'var(--green)' }}>PRO</span>
          </div>
        </div>

        <form className="panel" onSubmit={handleSubmit}>
          <h2 style={{ fontSize: 18, marginBottom: 4 }}>Bem-vindo de volta!</h2>
          <p style={{ color: 'var(--muted)', fontSize: 12.5, marginBottom: 18 }}>Faça login para continuar</p>

          <div className="field">
            <label>E-mail</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Senha</label>
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
          </div>

          {erro && <p style={{ color: 'var(--red)', fontSize: 12.5, marginBottom: 12 }}>{erro}</p>}

          <button className="btn btn-primary" type="submit" style={{ width: '100%', justifyContent: 'center' }} disabled={carregando}>
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>

          <button
            type="button"
            onClick={handleEsqueciSenha}
            style={{ background: 'none', border: 'none', color: 'var(--green)', fontSize: 12, marginTop: 14, cursor: 'pointer' }}
          >
            Esqueci minha senha
          </button>

          <p className="help-text" style={{ marginTop: 16 }}>
            Não tem conta ainda? Peça a um administrador para te cadastrar em <strong>Configurações → Usuários</strong>,
            dentro do próprio sistema.
          </p>
        </form>
      </div>
    </div>
  );
}
